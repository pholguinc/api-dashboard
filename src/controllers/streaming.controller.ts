import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { sendError, sendOk, sendCreated } from '../utils/response';
import { 
  MetroLiveStreamModel, 
  StreamCommentModel, 
  StreamDonationModel, 
  StreamFollowModel
} from '../models/metro-live.model';
import { UserModel } from '../models/user.model';
import { PointsService } from '../services/points.service';
import { NotificationHelpers } from '../services/notification.service';
import { StreamingServerService } from '../services/streaming-server.service';
import mongoose from 'mongoose';
import crypto from 'crypto';

// Crear nuevo stream
export async function createStream(req: Request, res: Response) {
  try {
    const userId = (req as any).user.id;
    const { 
      title, 
      description, 
      category, 
      tags = [], 
      location, 
      isPrivate = false,
      chatEnabled = true,
      donationsEnabled = true
    } = req.body;

    // Verificar que el usuario sea streamer
    const user = await UserModel.findById(userId);
    if (!user || user.role !== 'metro_streamer') {
      return sendError(res, 'Solo los Metro Streamers pueden crear streams', 403, 'NOT_STREAMER');
    }

    // Verificar que no tenga otro stream activo
    const activeStream = await MetroLiveStreamModel.findOne({
      streamerId: userId,
      status: { $in: ['live', 'starting'] }
    });

    if (activeStream) {
      return sendError(res, 'Ya tienes un stream activo', 400, 'ACTIVE_STREAM_EXISTS');
    }

    // Generar claves de stream
    const streamKey = crypto.randomBytes(16).toString('hex');
    
    // Obtener URLs de streaming usando el servicio
    const streamingUrls = StreamingServerService.getStreamUrls(streamKey);
    const rtmpUrl = streamingUrls.rtmp.fullUrl;
    const hlsUrl = streamingUrls.hls.master;

    // Configurar ubicación si se proporciona
    let locationData;
    if (location && location.coordinates) {
      locationData = {
        type: 'Point',
        coordinates: location.coordinates,
        stationName: location.stationName,
        lineName: location.lineName
      };
    }

    const stream = await MetroLiveStreamModel.create({
      streamerId: userId,
      title,
      description,
      category,
      tags,
      location: locationData,
      chatEnabled,
      donationsEnabled,
      status: 'offline',
      streamKey,
      rtmpUrl,
      hlsUrl,
      quality: {
        resolution: '720p',
        bitrate: 2500,
        fps: 30
      }
    });

    return sendCreated(res, {
      stream: {
        id: stream._id,
        title: stream.title,
        category: stream.category,
        status: stream.status,
        chatEnabled: stream.chatEnabled,
        donationsEnabled: stream.donationsEnabled
      },
      streamingConfig: {
        streamKey,
        rtmpUrl,
        hlsUrl: stream.hlsUrl,
        quality: stream.quality
      }
    }, 'Stream creado exitosamente');
  } catch (error) {
    console.error('Error in createStream:', error);
    return sendError(res, 'Error al crear stream', 500, 'STREAM_CREATE_ERROR');
  }
}

// Iniciar stream
export async function startStream(req: Request, res: Response) {
  try {
    const userId = (req as any).user.id;
    const { streamId } = req.params;

    const stream = await MetroLiveStreamModel.findOne({
      _id: streamId,
      streamerId: userId
    });

    if (!stream) {
      return sendError(res, 'Stream no encontrado', 404, 'STREAM_NOT_FOUND');
    }

    if (stream.status === 'live') {
      return sendError(res, 'El stream ya está en vivo', 400, 'STREAM_ALREADY_LIVE');
    }

    // Actualizar estado a starting primero
    stream.status = 'starting';
    stream.startedAt = new Date();
    await stream.save();

    // Simular proceso de inicio (en producción esto sería manejado por el servidor de streaming)
    setTimeout(async () => {
      try {
        const updatedStream = await MetroLiveStreamModel.findById(streamId);
        if (updatedStream && updatedStream.status === 'starting') {
          updatedStream.status = 'live';
          await updatedStream.save();

          // Notificar a seguidores si pasó a LIVE
          try {
            const [followers, streamer] = await Promise.all([
              StreamFollowModel.find({ streamerId: userId }).select('followerId'),
              UserModel.findById(userId).select('displayName')
            ]);
            if (followers.length > 0 && streamer) {
              const sendPromises = followers.map(f => 
                NotificationHelpers.streamLive(
                  f.followerId.toString(),
                  streamer.displayName || 'Streamer',
                  updatedStream.title,
                  updatedStream._id.toString()
                )
              );
              await Promise.allSettled(sendPromises);
            }
          } catch (notifyErr) {
            console.error('Error notificando seguidores (auto-live):', notifyErr);
          }
        }
      } catch (error) {
        console.error('Error auto-updating stream to live:', error);
      }
    }, 5000); // 5 segundos para simular configuración

    return sendOk(res, {
      stream: {
        id: stream._id,
        title: stream.title,
        status: stream.status,
        startedAt: stream.startedAt,
        hlsUrl: stream.hlsUrl
      },
      message: 'Stream iniciando... Estará en vivo en unos segundos'
    });
  } catch (error) {
    console.error('Error in startStream:', error);
    return sendError(res, 'Error al iniciar stream', 500, 'STREAM_START_ERROR');
  }
}

// Terminar stream
export async function endStream(req: Request, res: Response) {
  try {
    const userId = (req as any).user.id;
    const { streamId } = req.params;

    const stream = await MetroLiveStreamModel.findOne({
      _id: streamId,
      streamerId: userId
    });

    if (!stream) {
      return sendError(res, 'Stream no encontrado', 404, 'STREAM_NOT_FOUND');
    }

    if (stream.status === 'offline') {
      return sendError(res, 'El stream ya está offline', 400, 'STREAM_ALREADY_OFFLINE');
    }

    // Calcular duración
    const duration = stream.startedAt 
      ? Math.floor((Date.now() - stream.startedAt.getTime()) / 1000)
      : 0;

    // Actualizar stream
    stream.status = 'offline';
    stream.endedAt = new Date();
    stream.duration = duration;
    await stream.save();

    // Actualizar estadísticas del streamer
    await UserModel.findByIdAndUpdate(userId, {
      $inc: { 
        'streamerProfile.totalStreams': 1,
        'streamerProfile.streamingHours': Math.floor(duration / 3600),
        'streamerProfile.totalViewers': stream.maxViewers
      },
      $set: {
        'streamerProfile.averageViewers': Math.round(
          (stream.viewerCount + (stream.maxViewers || 0)) / 2
        )
      }
    });

    // Otorgar puntos por streaming
    if (duration > 300) { // Mínimo 5 minutos
      const basePoints = Math.min(Math.floor(duration / 60), 120); // 1 punto por minuto, máximo 120
      const viewerBonus = Math.min(stream.maxViewers * 2, 100); // 2 puntos por viewer, máximo 100
      const donationBonus = Math.min(stream.totalDonations * 0.1, 50); // 10% de las donaciones como puntos bonus
      const totalPoints = basePoints + viewerBonus + donationBonus;

      await PointsService.awardPoints(
        userId,
        'earned_streaming',
        totalPoints,
        `Streaming completado: ${stream.title}`,
        { 
          streamId, 
          duration, 
          maxViewers: stream.maxViewers,
          totalDonations: stream.totalDonations,
          basePoints,
          viewerBonus,
          donationBonus
        }
      );
    }

    return sendOk(res, {
      stream: {
        id: stream._id,
        title: stream.title,
        status: stream.status,
        duration,
        maxViewers: stream.maxViewers,
        totalDonations: stream.totalDonations
      },
      message: 'Stream finalizado exitosamente'
    });
  } catch (error) {
    console.error('Error in endStream:', error);
    return sendError(res, 'Error al finalizar stream', 500, 'STREAM_END_ERROR');
  }
}

// Donar puntos a un streamer
export async function donateToStreamer(req: Request, res: Response) {
  try {
    const userId = (req as any).user.id;
    const { streamId } = req.params;
    const { amount, message } = req.body;

    // Validar cantidad mínima y máxima
    if (!amount || amount < 10 || amount > 1000) {
      return sendError(res, 'La donación debe ser entre 10 y 1000 puntos', 400, 'INVALID_DONATION_AMOUNT');
    }

    // Verificar que el usuario tenga suficientes puntos
    const user = await UserModel.findById(userId);
    if (!user || user.pointsSmart < amount) {
      return sendError(res, 'Puntos insuficientes', 400, 'INSUFFICIENT_POINTS');
    }

    // Verificar que el stream existe y está activo
    const stream = await MetroLiveStreamModel.findOne({
      _id: streamId,
      status: 'live'
    }).populate('streamerId', 'displayName pointsSmart');

    if (!stream) {
      return sendError(res, 'Stream no encontrado o no está en vivo', 404, 'STREAM_NOT_FOUND');
    }

    const streamer = stream.streamerId as any;

    // Crear donación
    const donation = new StreamDonationModel({
      streamId,
      streamerId: streamer._id,
      donorId: userId,
      amount,
      message: message || '',
      timestamp: new Date()
    });

    await donation.save();

    // Transferir puntos
    await Promise.all([
      // Descontar puntos del donante
      PointsService.awardPoints(
        userId,
        'spent_stream_donation',
        -amount,
        `Donación a ${streamer.displayName}`,
        { 
          streamId, 
          streamerId: streamer._id,
          donationId: donation._id,
          message 
        }
      ),
      
      // Agregar puntos al streamer (90% de la donación, 10% se queda como comisión)
      PointsService.awardPoints(
        streamer._id,
        'earned_stream_donation',
        Math.floor(amount * 0.9),
        `Donación recibida de usuario`,
        { 
          streamId, 
          donorId: userId,
          donationId: donation._id,
          originalAmount: amount,
          commission: Math.floor(amount * 0.1)
        }
      )
    ]);

    // Actualizar estadísticas del stream
    await MetroLiveStreamModel.findByIdAndUpdate(streamId, {
      $inc: { 
        totalDonations: amount,
        donationsCount: 1
      }
    });

      // Actualizar estadísticas del streamer
      await UserModel.findByIdAndUpdate(streamer._id, {
        $inc: { 
          'streamerProfile.totalDonations': amount,
          'streamerProfile.donationsReceived': 1
        }
      });

      // Notificar al streamer sobre la donación
      await NotificationHelpers.donationReceived(
        streamer._id,
        amount,
        user.displayName || 'Usuario Anónimo',
        message
      );

      return sendCreated(res, {
        message: 'Donación enviada exitosamente',
        donation: {
          id: donation._id,
          amount,
          message,
          streamerName: streamer.displayName,
          timestamp: donation.createdAt
        }
      });

  } catch (error) {
    console.error('Error donating to streamer:', error);
    return sendError(res, 'Error enviando donación', 500, 'DONATION_ERROR');
  }
}

// Obtener donaciones de un stream
export async function getStreamDonations(req: Request, res: Response) {
  try {
    const { streamId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const donations = await StreamDonationModel
      .find({ streamId })
      .populate('donorId', 'displayName avatarUrl')
      .sort({ timestamp: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit))
      .lean();

    const total = await StreamDonationModel.countDocuments({ streamId });
    const totalAmount = await StreamDonationModel.aggregate([
      { $match: { streamId: new mongoose.Types.ObjectId(streamId) } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    return sendOk(res, {
      donations,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      },
      totalAmount: totalAmount[0]?.total || 0
    });

  } catch (error) {
    console.error('Error getting stream donations:', error);
    return sendError(res, 'Error obteniendo donaciones', 500, 'DONATIONS_GET_ERROR');
  }
}

// Actualizar estado del stream
export async function updateStreamStatus(req: Request, res: Response) {
  try {
    const userId = (req as any).user.id;
    const { streamId } = req.params;
    const { status, viewerCount, quality } = req.body;

    const stream = await MetroLiveStreamModel.findOne({
      _id: streamId,
      streamerId: userId
    });

    if (!stream) {
      return sendError(res, 'Stream no encontrado', 404, 'STREAM_NOT_FOUND');
    }

    const previousStatus = stream.status;
    // Actualizar campos
    if (status) stream.status = status;
    if (viewerCount !== undefined) {
      stream.viewerCount = viewerCount;
      if (viewerCount > stream.maxViewers) {
        stream.maxViewers = viewerCount;
      }
    }
    if (quality) {
      stream.quality = { ...stream.quality, ...quality };
    }

    await stream.save();

    // Si cambió a LIVE, notificar a seguidores
    if (status === 'live' && previousStatus !== 'live') {
      try {
        const [followers, streamer] = await Promise.all([
          StreamFollowModel.find({ streamerId: userId }).select('followerId'),
          UserModel.findById(userId).select('displayName')
        ]);
        if (followers.length > 0 && streamer) {
          const sendPromises = followers.map(f => 
            NotificationHelpers.streamLive(
              f.followerId.toString(),
              streamer.displayName || 'Streamer',
              stream.title,
              stream._id.toString()
            )
          );
          await Promise.allSettled(sendPromises);
        }
      } catch (notifyErr) {
        console.error('Error notificando seguidores (update status):', notifyErr);
      }
    }

    return sendOk(res, {
      stream: {
        id: stream._id,
        status: stream.status,
        viewerCount: stream.viewerCount,
        maxViewers: stream.maxViewers,
        quality: stream.quality
      }
    });
  } catch (error) {
    console.error('Error in updateStreamStatus:', error);
    return sendError(res, 'Error al actualizar estado del stream', 500, 'STREAM_UPDATE_ERROR');
  }
}

// Actualizar calidad del stream (bitrate/fps/resolution)
export async function updateStreamQuality(req: Request, res: Response) {
  try {
    const userId = (req as any).user.id;
    const { streamId } = req.params as any;
    const { resolution, bitrate, fps } = req.body as any;

    const stream = await MetroLiveStreamModel.findOne({ _id: streamId, streamerId: userId });
    if (!stream) {
      return sendError(res, 'Stream no encontrado', 404, 'STREAM_NOT_FOUND');
    }

    const quality = { ...(stream.quality as any) } as any;
    if (resolution) quality.resolution = resolution;
    if (bitrate) quality.bitrate = bitrate;
    if (fps) quality.fps = fps;

    stream.quality = quality;
    await stream.save();

    return sendOk(res, { quality: stream.quality });
  } catch (error) {
    console.error('Error in updateStreamQuality:', error);
    return sendError(res, 'Error al actualizar calidad', 500, 'STREAM_QUALITY_ERROR');
  }
}

// Obtener streams en vivo
export async function getLiveStreams(req: Request, res: Response) {
  try {
    const { category, sort = 'viewers', page = 1, limit = 10 } = req.query as any;

    const skip = (page - 1) * limit;
    const query: any = { status: 'live' };

    if (category) query.category = category;

    let sortQuery: any = {};
    switch (sort) {
      case 'recent':
        sortQuery = { startedAt: -1 };
        break;
      case 'featured':
        sortQuery = { isFeatured: -1, viewerCount: -1 };
        break;
      default: // viewers
        sortQuery = { viewerCount: -1, startedAt: -1 };
    }

    const [streams, total] = await Promise.all([
      MetroLiveStreamModel
        .find(query)
        .populate('streamerId', 'displayName avatarUrl streamerProfile')
        .sort(sortQuery)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      MetroLiveStreamModel.countDocuments(query)
    ]);

    return sendOk(res, {
      streams,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error in getLiveStreams:', error);
    return sendError(res, 'Error al obtener streams en vivo', 500, 'LIVE_STREAMS_ERROR');
  }
}

// Obtener detalles de un stream
export async function getStreamDetails(req: Request, res: Response) {
  try {
    const { streamId } = req.params;

    const stream = await MetroLiveStreamModel
      .findById(streamId)
      .populate('streamerId', 'displayName avatarUrl streamerProfile')
      .lean();

    if (!stream) {
      return sendError(res, 'Stream no encontrado', 404, 'STREAM_NOT_FOUND');
    }

    // Obtener comentarios recientes
    const recentComments = await StreamCommentModel
      .find({ streamId, isVisible: true })
      .populate('userId', 'displayName avatarUrl')
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    return sendOk(res, {
      stream,
      recentComments,
      isLive: stream.status === 'live'
    });
  } catch (error) {
    console.error('Error in getStreamDetails:', error);
    return sendError(res, 'Error al obtener detalles del stream', 500, 'STREAM_DETAILS_ERROR');
  }
}

// Dashboard del streamer
export async function getStreamerDashboard(req: Request, res: Response) {
  try {
    const userId = (req as any).user.id;

    // Verificar que sea streamer
    const user = await UserModel.findById(userId);
    if (!user || user.role !== 'metro_streamer') {
      return sendError(res, 'Solo los Metro Streamers pueden acceder al dashboard', 403, 'NOT_STREAMER');
    }

    // Obtener stream actual
    const currentStream = await MetroLiveStreamModel
      .findOne({ 
        streamerId: userId, 
        status: { $in: ['live', 'starting'] } 
      })
      .lean();

    // Obtener estadísticas del último mes
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);

    const [
      monthlyStats,
      recentStreams,
      totalFollowers,
      totalDonations
    ] = await Promise.all([
      MetroLiveStreamModel.aggregate([
        {
          $match: {
            streamerId: new mongoose.Types.ObjectId(userId),
            createdAt: { $gte: lastMonth }
          }
        },
        {
          $group: {
            _id: null,
            totalStreams: { $sum: 1 },
            totalViewers: { $sum: '$maxViewers' },
            totalHours: { $sum: { $divide: ['$duration', 3600] } },
            averageViewers: { $avg: '$viewerCount' }
          }
        }
      ]),
      MetroLiveStreamModel
        .find({ streamerId: userId })
        .sort({ createdAt: -1 })
        .limit(5)
        .select('title category viewerCount maxViewers duration createdAt status')
        .lean(),
      mongoose.model('StreamFollow').countDocuments({ streamerId: userId }),
      StreamDonationModel.aggregate([
        {
          $match: {
            streamerId: new mongoose.Types.ObjectId(userId),
            status: 'completed',
            createdAt: { $gte: lastMonth }
          }
        },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: '$amount' },
            totalDonations: { $sum: 1 }
          }
        }
      ])
    ]);

    const stats = monthlyStats[0] || {
      totalStreams: 0,
      totalViewers: 0,
      totalHours: 0,
      averageViewers: 0
    };

    const donations = totalDonations[0] || {
      totalAmount: 0,
      totalDonations: 0
    };

    return sendOk(res, {
      currentStream,
      stats: {
        ...stats,
        totalHours: Math.round(stats.totalHours * 100) / 100,
        averageViewers: Math.round(stats.averageViewers || 0)
      },
      donations,
      totalFollowers,
      recentStreams,
      streamerProfile: user.streamerProfile
    });
  } catch (error) {
    console.error('Error in getStreamerDashboard:', error);
    return sendError(res, 'Error al obtener dashboard', 500, 'DASHBOARD_ERROR');
  }
}

// Función para obtener streamers destacados (fuera de la clase)
export async function getFeaturedStreamers(req: AuthenticatedRequest, res: Response) {
    try {
      const { limit = 10 } = req.query;

      const streamers = await UserModel.find({
        role: 'metro_streamer',
        'streamerProfile.isVerified': true
      })
      .select('displayName avatarUrl streamerProfile')
      .sort({ 'streamerProfile.followers': -1 })
      .limit(Number(limit));

      return sendOk(res, streamers);
    } catch (error) {
      return sendError(res, 'Error obteniendo streamers', 500);
    }
}
