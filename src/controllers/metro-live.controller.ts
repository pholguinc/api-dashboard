import { Request, Response } from 'express';
import { sendError, sendOk, sendCreated } from '../utils/response';
import { 
  MetroLiveStreamModel, 
  StreamCommentModel, 
  StreamFollowModel,
  StreamDonationModel 
} from '../models/metro-live.model';
import { UserModel } from '../models/user.model';
import { PointsActions, PointsService } from '../services/points.service';
import mongoose from 'mongoose';
import { NotificationHelpers } from '../services/notification.service';

// Obtener streamers activos y destacados
export async function getStreamers(req: Request, res: Response) {
  try {
    const { 
      category, 
      status = 'live', 
      page = 1, 
      limit = 20, 
      featured = false,
      search 
    } = req.query as any;

    const skip = (page - 1) * limit;
    const query: any = {};

    if (category) query.category = category;
    if (status !== 'all') query.status = status;
    if (featured === 'true') query.isFeatured = true;

    // Búsqueda por título o tags
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    const [streams, total] = await Promise.all([
      MetroLiveStreamModel
        .find(query)
        .populate('streamerId', 'displayName avatarUrl streamerProfile')
        .sort({ 
          isFeatured: -1, 
          viewerCount: -1, 
          createdAt: -1 
        } as any)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      MetroLiveStreamModel.countDocuments(query)
    ]);

    // Obtener información adicional de cada streamer
    const enrichedStreams = await Promise.all(
      streams.map(async (stream) => {
        const followersCount = await StreamFollowModel.countDocuments({ 
          streamerId: stream.streamerId._id 
        });

        return {
          ...stream,
          streamer: {
            ...stream.streamerId,
            followersCount,
            isLive: stream.status === 'live'
          }
        };
      })
    );

    return sendOk(res, {
      streams: enrichedStreams,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      },
      filters: {
        category,
        status,
        featured: featured === 'true',
        search
      }
    });
  } catch (error) {
    console.error('Error in getStreamers:', error);
    return sendError(res, 'Error al obtener streamers', 500, 'STREAMERS_GET_ERROR');
  }
}

// Suscribirse/Anular recordatorio de stream programado
export async function toggleStreamReminder(req: Request, res: Response) {
  try {
    const { streamId } = req.params as any;
    const userId = (req as any).user.id;

    const stream = await MetroLiveStreamModel.findById(streamId).select('scheduledStartTime reminderSubscribers streamerId title');
    if (!stream) return sendError(res, 'Stream no encontrado', 404, 'STREAM_NOT_FOUND');
    if (!stream.scheduledStartTime) return sendError(res, 'El stream no está programado', 400, 'STREAM_NOT_SCHEDULED');

    const set = new Set((stream.reminderSubscribers || []).map(id => id.toString()));
    let subscribed: boolean;
    if (set.has(userId)) {
      set.delete(userId);
      subscribed = false;
    } else {
      set.add(userId);
      subscribed = true;
      // Programar recordatorio para la hora programada
      await NotificationHelpers.streamReminder(
        userId,
        (await UserModel.findById(stream.streamerId).select('displayName'))?.displayName || 'Streamer',
        (stream as any).title || 'Stream',
        streamId,
        new Date(stream.scheduledStartTime)
      );
    }

    (stream as any).reminderSubscribers = Array.from(set);
    await stream.save();

    return sendOk(res, { subscribed });
  } catch (error) {
    console.error('Error in toggleStreamReminder:', error);
    return sendError(res, 'Error al procesar recordatorio', 500, 'REMINDER_ERROR');
  }
}

// Obtener perfil detallado de un streamer
export async function getStreamerProfile(req: Request, res: Response) {
  try {
    const { streamerId } = req.params;
    const userId = (req as any).user?.id;

    const streamer = await UserModel.findOne({
      _id: streamerId,
      role: 'metro_streamer'
    }).select('displayName avatarUrl streamerProfile phone createdAt');

    if (!streamer) {
      return sendError(res, 'Streamer no encontrado', 404, 'STREAMER_NOT_FOUND');
    }

    // Obtener estadísticas del streamer
    const [
      followersCount,
      currentStream,
      recentStreams,
      totalDonations,
      isFollowing
    ] = await Promise.all([
      StreamFollowModel.countDocuments({ streamerId }),
      MetroLiveStreamModel.findOne({ 
        streamerId, 
        status: { $in: ['live', 'starting'] } 
      }).sort({ createdAt: -1 }),
      MetroLiveStreamModel.find({ streamerId })
        .sort({ createdAt: -1 })
        .limit(10)
        .select('title category viewerCount maxViewers duration createdAt thumbnailUrl isRecorded recordingUrl status'),
      StreamDonationModel.aggregate([
        { $match: { streamerId: new mongoose.Types.ObjectId(streamerId), status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      userId ? StreamFollowModel.findOne({ followerId: userId, streamerId }) : null
    ]);

    const profile = {
      id: streamer._id,
      displayName: streamer.displayName,
      avatarUrl: streamer.avatarUrl,
      bio: streamer.streamerProfile?.bio || '',
      categories: streamer.streamerProfile?.categories || [],
      socialLinks: streamer.streamerProfile?.socialLinks || {},
      streamingEquipment: streamer.streamerProfile?.streamingEquipment || {},
      preferredStations: streamer.streamerProfile?.preferredStations || [],
      streamingSchedule: streamer.streamerProfile?.streamingSchedule || [],
      isVerified: streamer.streamerProfile?.isVerified || false,
      joinedAt: streamer.createdAt,
      stats: {
        followers: followersCount,
        totalStreams: streamer.streamerProfile?.totalStreams || 0,
        totalViewers: streamer.streamerProfile?.totalViewers || 0,
        totalDonations: totalDonations[0]?.total || 0,
        streamingHours: streamer.streamerProfile?.streamingHours || 0,
        averageViewers: streamer.streamerProfile?.averageViewers || 0
      },
      currentStream: currentStream ? {
        id: currentStream._id,
        title: currentStream.title,
        category: currentStream.category,
        viewerCount: currentStream.viewerCount,
        startedAt: currentStream.startedAt,
        thumbnailUrl: currentStream.thumbnailUrl
      } : null,
      recentStreams,
      isFollowing: !!isFollowing
    };

    return sendOk(res, profile);
  } catch (error) {
    console.error('Error in getStreamerProfile:', error);
    return sendError(res, 'Error al obtener perfil del streamer', 500, 'STREAMER_PROFILE_ERROR');
  }
}

// Listado de VODs (streams grabados)
export async function getVODs(req: Request, res: Response) {
  try {
    const { streamerId, page = 1, limit = 20, search } = req.query as any;
    const skip = (page - 1) * limit;

    const query: any = { isRecorded: true, recordingUrl: { $exists: true, $ne: null } };
    if (streamerId) query.streamerId = streamerId;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const [items, total] = await Promise.all([
      MetroLiveStreamModel
        .find(query)
        .populate('streamerId', 'displayName avatarUrl')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .select('title thumbnailUrl recordingUrl duration createdAt category streamerId recordingSize')
        .lean(),
      MetroLiveStreamModel.countDocuments(query)
    ]);

    return sendOk(res, {
      vods: items,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error in getVODs:', error);
    return sendError(res, 'Error al obtener VODs', 500, 'VODS_GET_ERROR');
  }
}

// Seguir/dejar de seguir a un streamer
export async function toggleFollow(req: Request, res: Response) {
  try {
    const { streamerId } = req.params;
    const userId = (req as any).user.id;

    if (userId === streamerId) {
      return sendError(res, 'No puedes seguirte a ti mismo', 400, 'SELF_FOLLOW');
    }

    // Verificar que el streamer existe
    const streamer = await UserModel.findOne({
      _id: streamerId,
      role: 'metro_streamer'
    });

    if (!streamer) {
      return sendError(res, 'Streamer no encontrado', 404, 'STREAMER_NOT_FOUND');
    }

    const existingFollow = await StreamFollowModel.findOne({
      followerId: userId,
      streamerId
    });

    let action;
    let followersCount;

    if (existingFollow) {
      // Dejar de seguir
      await StreamFollowModel.deleteOne({ _id: existingFollow._id });
      action = 'unfollowed';
      followersCount = await StreamFollowModel.countDocuments({ streamerId });
      
      // Actualizar contador en el perfil del streamer
      await UserModel.findByIdAndUpdate(streamerId, {
        $inc: { 'streamerProfile.followers': -1 }
      });
    } else {
      // Seguir
      await StreamFollowModel.create({
        followerId: userId,
        streamerId
      });
      action = 'followed';
      followersCount = await StreamFollowModel.countDocuments({ streamerId });
      
      // Actualizar contador en el perfil del streamer
      await UserModel.findByIdAndUpdate(streamerId, {
        $inc: { 'streamerProfile.followers': 1 }
      });
    }

    return sendOk(res, {
      action,
      followersCount,
      message: action === 'followed' 
        ? `Ahora sigues a ${streamer.displayName}` 
        : `Dejaste de seguir a ${streamer.displayName}`
    });
  } catch (error) {
    console.error('Error in toggleFollow:', error);
    return sendError(res, 'Error al procesar seguimiento', 500, 'FOLLOW_ERROR');
  }
}

// Obtener comentarios de un stream
export async function getStreamComments(req: Request, res: Response) {
  try {
    const { streamId } = req.params;
    const { page = 1, limit = 50, pinned = false } = req.query as any;

    const skip = (page - 1) * limit;
    const query: any = { streamId, isVisible: true };

    if (pinned === 'true') {
      query.isPinned = true;
    }

    const [comments, total] = await Promise.all([
      StreamCommentModel
        .find(query)
        .populate('userId', 'displayName avatarUrl role')
        .sort({ isPinned: -1, createdAt: pinned === 'true' ? -1 : 1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      StreamCommentModel.countDocuments(query)
    ]);

    return sendOk(res, {
      comments,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error in getStreamComments:', error);
    return sendError(res, 'Error al obtener comentarios', 500, 'COMMENTS_GET_ERROR');
  }
}

// Obtener metadatos del stream (para permisos de moderación y streamerId)
export async function getStreamMeta(req: Request, res: Response) {
  try {
    const { streamId } = req.params as any;
    const user = (req as any).user;
    const stream = await MetroLiveStreamModel.findById(streamId).select('streamerId status moderation scheduledStartTime reminderSubscribers title viewerCount');
    if (!stream) {
      return sendError(res, 'Stream no encontrado', 404, 'STREAM_NOT_FOUND');
    }
    const canModerate = !!user && (user.id === stream.streamerId.toString() || user.role === 'admin');
    const isSubscribed = !!stream.reminderSubscribers?.some(id => id.toString() === user.id);
    return sendOk(res, {
      streamId,
      streamerId: stream.streamerId,
      status: stream.status,
      canModerate,
      slowModeSeconds: stream.moderation?.slowModeSeconds || 0,
      scheduledStartTime: stream.scheduledStartTime,
      isReminderSubscribed: isSubscribed,
      title: (stream as any).title,
      viewerCount: (stream as any).viewerCount || 0
    });
  } catch (error) {
    console.error('Error in getStreamMeta:', error);
    return sendError(res, 'Error al obtener metadatos del stream', 500, 'STREAM_META_ERROR');
  }
}

// Enviar comentario a un stream
export async function sendStreamComment(req: Request, res: Response) {
  try {
    const { streamId } = req.params;
    const { message, type = 'text', metadata = {} } = req.body;
    const userId = (req as any).user.id;

    // Verificar que el stream existe y tiene chat habilitado
    const stream = await MetroLiveStreamModel.findById(streamId);
    if (!stream) {
      return sendError(res, 'Stream no encontrado', 404, 'STREAM_NOT_FOUND');
    }

    if (!stream.chatEnabled) {
      return sendError(res, 'El chat está deshabilitado para este stream', 400, 'CHAT_DISABLED');
    }

    // Moderación: ban/mute/slow-mode
    const isBanned = stream.moderation?.bannedUserIds?.some(id => id.toString() === userId);
    if (isBanned) {
      return sendError(res, 'Has sido baneado de este chat', 403, 'CHAT_BANNED');
    }
    const isMuted = stream.moderation?.mutedUserIds?.some(id => id.toString() === userId);
    if (isMuted) {
      return sendError(res, 'Estás silenciado temporalmente', 403, 'CHAT_MUTED');
    }
    const slow = stream.moderation?.slowModeSeconds || 0;
    if (slow > 0) {
      const lastAtIso = (stream.moderation?.lastMessageAtByUser || {})[userId];
      const lastAt = lastAtIso ? new Date(lastAtIso) : undefined;
      if (lastAt && Date.now() - lastAt.getTime() < slow * 1000) {
        const waitMs = slow * 1000 - (Date.now() - lastAt.getTime());
        return sendError(res, `Slow-mode activo. Espera ${Math.ceil(waitMs / 1000)}s`, 429, 'CHAT_SLOW_MODE');
      }
    }

    // Crear comentario
    const comment = await StreamCommentModel.create({
      streamId,
      userId,
      message,
      type,
      metadata
    });

    // Poblar información del usuario
    await comment.populate('userId', 'displayName avatarUrl role');

    // Otorgar puntos por interacción
    await PointsActions.likeContent(userId, streamId, 'stream_comment');

    // Registrar timestamp para slow-mode
    if (!stream.moderation) stream.moderation = { slowModeSeconds: 0, mutedUserIds: [], bannedUserIds: [], lastMessageAtByUser: {} } as any;
    (stream.moderation.lastMessageAtByUser as any)[userId] = new Date();
    await stream.save();

    return sendCreated(res, comment, 'Comentario enviado exitosamente');
  } catch (error) {
    console.error('Error in sendStreamComment:', error);
    return sendError(res, 'Error al enviar comentario', 500, 'COMMENT_SEND_ERROR');
  }
}

// Donar puntos a un streamer
export async function donateToStream(req: Request, res: Response) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { streamId } = req.params;
    const { amount, message = '', isAnonymous = false } = req.body;
    const userId = (req as any).user.id;

    // Verificar que el stream existe y acepta donaciones
    const stream = await MetroLiveStreamModel.findById(streamId);
    if (!stream) {
      return sendError(res, 'Stream no encontrado', 404, 'STREAM_NOT_FOUND');
    }

    if (!stream.donationsEnabled) {
      return sendError(res, 'Las donaciones están deshabilitadas para este stream', 400, 'DONATIONS_DISABLED');
    }

    if (userId === stream.streamerId.toString()) {
      return sendError(res, 'No puedes donarte a ti mismo', 400, 'SELF_DONATION');
    }

    // Verificar que el usuario tiene suficientes puntos
    const user = await UserModel.findById(userId);
    if (!user || user.pointsSmart < amount) {
      return sendError(res, 'Puntos insuficientes', 400, 'INSUFFICIENT_POINTS');
    }

    // Procesar donación
    const donation = await StreamDonationModel.create([{
      streamId,
      streamerId: stream.streamerId,
      donorId: userId,
      amount,
      message,
      isAnonymous,
      status: 'completed',
      processedAt: new Date()
    }], { session });

    // Descontar puntos del donante
    await PointsActions.donateToStream(userId, streamId, amount);

    // Otorgar puntos al streamer (porcentaje de la donación)
    const streamerPoints = Math.round(amount * 0.8); // 80% para el streamer
    await PointsService.awardPoints(
      stream.streamerId.toString(),
      'earned_stream_donation',
      streamerPoints,
      `Donación recibida en stream: ${stream.title}`,
      { donationId: donation[0]._id, originalAmount: amount }
    );

    // Actualizar estadísticas del stream
    await MetroLiveStreamModel.findByIdAndUpdate(
      streamId,
      { 
        $inc: { totalDonations: amount }
      },
      { session }
    );

    // Actualizar estadísticas del streamer
    await UserModel.findByIdAndUpdate(
      stream.streamerId,
      { 
        $inc: { 'streamerProfile.totalDonations': amount }
      },
      { session }
    );

    await session.commitTransaction();

    // Crear comentario de donación si no es anónimo
    if (!isAnonymous) {
      await StreamCommentModel.create({
        streamId,
        userId,
        message: message || `¡Donó ${amount} puntos!`,
        type: 'donation',
        metadata: { donationAmount: amount }
      });
    }

    return sendCreated(res, {
      donation: donation[0],
      streamerPointsAwarded: streamerPoints,
      message: 'Donación enviada exitosamente'
    });
  } catch (error) {
    await session.abortTransaction();
    console.error('Error in donateToStream:', error);
    return sendError(res, 'Error al procesar donación', 500, 'DONATION_ERROR');
  } finally {
    session.endSession();
  }
}

// Obtener streamers que el usuario sigue
export async function getFollowedStreamers(req: Request, res: Response) {
  try {
    const userId = (req as any).user.id;
    const { page = 1, limit = 20 } = req.query as any;

    const skip = (page - 1) * limit;

    const follows = await StreamFollowModel
      .find({ followerId: userId })
      .populate({
        path: 'streamerId',
        select: 'displayName avatarUrl streamerProfile',
        match: { role: 'metro_streamer' }
      })
      .sort({ followedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Obtener streams actuales de los streamers seguidos
    const streamerIds = follows
      .filter(f => f.streamerId)
      .map(f => f.streamerId._id);

    const currentStreams = await MetroLiveStreamModel
      .find({ 
        streamerId: { $in: streamerIds },
        status: { $in: ['live', 'starting'] }
      })
      .lean();

    const enrichedFollows = follows
      .filter(f => f.streamerId)
      .map(follow => {
        const currentStream = currentStreams.find(
          s => s.streamerId.toString() === follow.streamerId._id.toString()
        );

        return {
          streamer: {
            ...follow.streamerId,
            isLive: !!currentStream,
            currentStream: currentStream ? {
              id: currentStream._id,
              title: currentStream.title,
              category: currentStream.category,
              viewerCount: currentStream.viewerCount,
              startedAt: currentStream.startedAt
            } : null
          },
          followedAt: follow.followedAt,
          notificationsEnabled: follow.notificationsEnabled
        };
      });

    const total = await StreamFollowModel.countDocuments({ followerId: userId });

    return sendOk(res, {
      follows: enrichedFollows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error in getFollowedStreamers:', error);
    return sendError(res, 'Error al obtener streamers seguidos', 500, 'FOLLOWED_STREAMERS_ERROR');
  }
}

// Obtener categorías disponibles con conteo de streamers activos
export async function getStreamCategories(req: Request, res: Response) {
  try {
    const categories = await MetroLiveStreamModel.aggregate([
      {
        $match: { status: 'live' }
      },
      {
        $group: {
          _id: '$category',
          activeStreamers: { $sum: 1 },
          totalViewers: { $sum: '$viewerCount' }
        }
      },
      {
        $sort: { activeStreamers: -1 }
      }
    ]);

    const allCategories = [
      'IRL', 'Gaming', 'Music', 'Art', 'Food', 'Tech', 'Dance', 'Freestyle'
    ];

    const enrichedCategories = allCategories.map(category => {
      const stats = categories.find(c => c._id === category);
      return {
        name: category,
        activeStreamers: stats?.activeStreamers || 0,
        totalViewers: stats?.totalViewers || 0
      };
    });

    return sendOk(res, {
      categories: enrichedCategories,
      totalLiveStreams: categories.reduce((sum, cat) => sum + cat.activeStreamers, 0),
      totalViewers: categories.reduce((sum, cat) => sum + cat.totalViewers, 0)
    });
  } catch (error) {
    console.error('Error in getStreamCategories:', error);
    return sendError(res, 'Error al obtener categorías', 500, 'CATEGORIES_ERROR');
  }
}
