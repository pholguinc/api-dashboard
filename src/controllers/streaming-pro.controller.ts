import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { sendError, sendOk, sendCreated } from '../utils/response';
import { MetroLiveStreamModel, StreamFollowModel } from '../models/metro-live.model';
import { UserModel } from '../models/user.model';
import { StreamingServerService, WebRTCService, CDNService } from '../services/streaming-server.service';
import { signPublishToken } from '../routes/streaming-auth.routes';
import { NotificationHelpers } from '../services/notification.service';
import crypto from 'crypto';

export class StreamingProController {

  // Endpoint de prueba sin autenticación
  static async createTestStreamNoAuth(req: Request, res: Response) {
    try {
      console.log('🧪 TEST NO AUTH: Creando stream de prueba...');
      const userId = '68c668abb0148145e8ec4677'; // ID fijo para testing
      console.log('👤 User ID fijo:', userId);
      
      // Crear stream básico sin dependencias complejas
      const stream = new MetroLiveStreamModel({
        streamerId: userId,
        title: 'Stream de Prueba No Auth',
        description: 'Stream creado para testing sin auth',
        category: 'gaming',
        tags: ['test', 'no-auth'],
        status: 'scheduled',
        streamKey: 'test_noauth_' + Date.now(),
        rtmpUrl: 'rtmp://localhost:1935/live/test',
        hlsUrl: 'http://localhost:8000/live/test/index.m3u8',
        viewerCount: 0,
        maxViewers: 0,
        totalDonations: 0,
        donationsCount: 0
      });

      console.log('💾 Guardando stream en base de datos...');
      await stream.save();
      console.log('✅ Stream de prueba creado:', stream._id);

      return sendCreated(res, {
        message: 'Stream de prueba creado exitosamente (sin auth)',
        stream: {
          id: stream._id,
          title: stream.title,
          streamKey: stream.streamKey,
          status: stream.status
        }
      });

    } catch (error) {
      console.error('❌ TEST NO AUTH Error:', error);
      console.error('❌ TEST NO AUTH Error stack:', error.stack);
      return sendError(res, 'Error en stream de prueba (sin auth)', 500, 'TEST_ERROR');
    }
  }

  // Endpoint de prueba simplificado
  static async createTestStream(req: AuthenticatedRequest, res: Response) {
    try {
      console.log('🧪 TEST: Creando stream de prueba...');
      const userId = req.user?.id;
      console.log('👤 User ID en test:', userId);
      
      // Crear stream básico sin dependencias complejas
      const stream = new MetroLiveStreamModel({
        streamerId: userId,
        title: 'Stream de Prueba',
        description: 'Stream creado para testing',
        category: 'gaming',
        tags: ['test'],
        status: 'scheduled',
        streamKey: 'test_' + Date.now(),
        rtmpUrl: 'rtmp://localhost:1935/live/test',
        hlsUrl: 'http://localhost:8000/live/test/index.m3u8',
        viewerCount: 0,
        maxViewers: 0,
        totalDonations: 0,
        donationsCount: 0
      });

      console.log('💾 Guardando stream en base de datos...');
      await stream.save();
      console.log('✅ Stream de prueba creado:', stream._id);

      return sendCreated(res, {
        message: 'Stream de prueba creado exitosamente',
        stream: {
          id: stream._id,
          title: stream.title,
          streamKey: stream.streamKey,
          status: stream.status
        }
      });

    } catch (error) {
      console.error('❌ TEST Error:', error);
      console.error('❌ TEST Error stack:', error.stack);
      return sendError(res, 'Error en stream de prueba', 500, 'TEST_ERROR');
    }
  }

  // Crear stream profesional - Versión final funcional
  static async createProfessionalStream(req: AuthenticatedRequest, res: Response) {
    try {
      console.log('🚀 Iniciando creación de stream profesional (FINAL)...');
      const userId = req.user?.id;
      console.log('👤 User ID:', userId);
      
      if (!userId) {
        console.error('❌ User ID no encontrado');
        return sendError(res, 'Usuario no autenticado', 401, 'UNAUTHORIZED');
      }
      
      const {
        title,
        description,
        category,
        tags = [],
        location,
        isPrivate = false,
        chatEnabled = true,
        donationsEnabled = true,
        recordingEnabled = true,
        adaptiveBitrate = true,
        lowLatencyMode = false
      } = req.body;
      
      console.log('📝 Datos recibidos:', { title, category, tags });

      // Validar categoría
      const validCategories = ['IRL', 'Gaming', 'Music', 'Art', 'Food', 'Tech', 'Dance', 'Freestyle', 'Event'];
      const validCategory = validCategories.includes(category) ? category : 'Gaming';
      console.log('📝 Categoría validada:', validCategory);

      // Verificar si el usuario ya tiene un stream activo
      console.log('🔍 Verificando streams existentes...');
      const existingStream = await MetroLiveStreamModel.findOne({
        streamerId: userId,
        status: { $in: ['live', 'starting', 'scheduled'] }
      });
      
      if (existingStream) {
        console.log('❌ Usuario ya tiene un stream activo:', existingStream._id);
        return sendError(res, 'Ya tienes un stream activo', 400, 'ACTIVE_STREAM_EXISTS');
      }

      // Generar stream key único
      console.log('🔑 Generando stream key...');
      const streamKey = 'metro_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
      console.log('🔑 Stream key generado:', streamKey);

      // Crear objeto stream básico
      console.log('💾 Creando stream en base de datos...');
      const streamData = {
        streamerId: userId,
        title: (title && title.trim()) || 'Stream sin título',
        description: (description && description.trim()) || '',
        category: validCategory,
        tags: Array.isArray(tags) ? tags.filter((tag: string) => tag && tag.trim().length > 0) : [],
        location: location || {},
        isPrivate: Boolean(isPrivate),
        chatEnabled: Boolean(chatEnabled),
        donationsEnabled: Boolean(donationsEnabled),
        streamKey: streamKey,
        rtmpUrl: `rtmp://localhost:1935/live/${streamKey}`,
        hlsUrl: `http://localhost:8000/live/${streamKey}/index.m3u8`,
        status: 'scheduled',
        scheduledStartTime: new Date(),
        settings: {
          recordingEnabled: Boolean(recordingEnabled),
          adaptiveBitrate: Boolean(adaptiveBitrate),
          lowLatencyMode: Boolean(lowLatencyMode),
          maxBitrate: lowLatencyMode ? 2500 : 5000,
          targetLatency: lowLatencyMode ? 1 : 3
        },
        quality: {
          resolution: '1920x1080',
          bitrate: 0,
          fps: 30
        },
        viewerCount: 0,
        maxViewers: 0,
        totalDonations: 0,
        donationsCount: 0
      };

      console.log('💾 Guardando stream...');
      const stream = new MetroLiveStreamModel(streamData);
      const savedStream = await stream.save();
      console.log('✅ Stream creado exitosamente:', savedStream._id);

      return sendCreated(res, {
        message: 'Stream profesional creado exitosamente',
        stream: {
          id: savedStream._id,
          title: savedStream.title,
          streamKey: savedStream.streamKey,
          status: savedStream.status,
          rtmpUrl: savedStream.rtmpUrl,
          hlsUrl: savedStream.hlsUrl
        }
      });

    } catch (error) {
      console.error('❌ Error creating professional stream:', error);
      console.error('❌ Error stack:', error.stack);
      console.error('❌ Error message:', error.message);
      console.error('❌ Error name:', error.name);
      
      // Error específico de validación de Mongoose
      if (error.name === 'ValidationError') {
        console.error('❌ Validation errors:', error.errors);
        return sendError(res, 'Error de validación en los datos del stream', 400, 'VALIDATION_ERROR');
      }
      
      // Error de conexión a base de datos
      if (error.name === 'MongoError' || error.name === 'MongooseError') {
        console.error('❌ Database error:', error.message);
        return sendError(res, 'Error de conexión a la base de datos', 500, 'DATABASE_ERROR');
      }
      
      return sendError(res, 'Error creando stream profesional', 500, 'STREAM_CREATE_ERROR');
    }
  }

  // Crear stream profesional - Versión original (comentada)
  static async createProfessionalStreamOriginal(req: AuthenticatedRequest, res: Response) {
    try {
      console.log('🚀 Iniciando creación de stream profesional...');
      const userId = req.user?.id;
      console.log('👤 User ID:', userId);
      
      const {
        title,
        description,
        category,
        tags = [],
        location,
        isPrivate = false,
        chatEnabled = true,
        donationsEnabled = true,
        recordingEnabled = true,
        adaptiveBitrate = true,
        lowLatencyMode = false
      } = req.body;
      
      console.log('📝 Datos recibidos:', { title, category, tags });

      // Verificar que el usuario sea streamer
      console.log('🔍 Verificando usuario...');
      const user = await UserModel.findById(userId);
      console.log('👤 Usuario encontrado:', user ? 'Sí' : 'No');
      if (user) {
        console.log('🎭 Rol del usuario:', user.role);
      }
      if (!user || user.role !== 'metro_streamer') {
        console.log('❌ Usuario no es streamer o no existe');
        return sendError(res, 'Solo los Metro Streamers pueden crear streams', 403, 'NOT_STREAMER');
      }
      console.log('✅ Usuario verificado como streamer');

      // Verificar que no tenga otro stream activo
      console.log('🔍 Verificando streams activos...');
      const activeStream = await MetroLiveStreamModel.findOne({
        streamerId: userId,
        status: { $in: ['live', 'starting', 'scheduled'] }
      });
      console.log('📺 Streams activos encontrados:', activeStream ? 'Sí' : 'No');

      if (activeStream) {
        console.log('❌ Usuario ya tiene stream activo:', activeStream._id);
        return sendError(res, 'Ya tienes un stream activo', 400, 'ACTIVE_STREAM_EXISTS');
      }
      console.log('✅ No hay streams activos');

      // Asegurar que el servidor de streaming esté corriendo
      console.log('🔍 Verificando servidor de streaming...');
      const serverReady = await StreamingServerService.ensureServerRunning();
      console.log('🖥️ Servidor de streaming listo:', serverReady ? 'Sí' : 'No');
      if (!serverReady) {
        console.error('❌ Servidor de streaming no disponible');
        return sendError(res, 'Servidor de streaming no disponible', 503, 'STREAMING_SERVER_DOWN');
      }
      console.log('✅ Servidor de streaming verificado');

      // Generar stream key único
      console.log('🔑 Generando stream key...');
      const streamKey = StreamingServerService.generateStreamKey();
      console.log('🔑 Stream key generado:', streamKey);
      
      // Validar que el stream key se generó correctamente
      if (!streamKey || streamKey.length < 10) {
        console.error('❌ Error generando stream key:', streamKey);
        return sendError(res, 'Error generando stream key', 500, 'STREAM_KEY_GENERATION_ERROR');
      }
      console.log('✅ Stream key válido');
      
      // Obtener URLs de streaming
      const streamUrls = StreamingServerService.getStreamUrls(streamKey);

      // Configurar CDN
      let cdnUrls: string[] = [];
      try {
        cdnUrls = await CDNService.setupCDNDistribution(streamKey);
        console.log('✅ CDN configurado exitosamente:', cdnUrls);
      } catch (cdnError) {
        console.warn('⚠️ Error configurando CDN, continuando sin CDN:', cdnError);
        cdnUrls = [];
      }

      // Crear stream en la base de datos
      const stream = new MetroLiveStreamModel({
        streamerId: userId,
        title: title.trim(),
        description: description?.trim() || '',
        category,
        tags: tags.filter((tag: string) => tag.trim().length > 0),
        location: location || {},
        isPrivate,
        chatEnabled,
        donationsEnabled,
        streamKey,
        rtmpUrl: streamUrls.rtmp.fullUrl,
        hlsUrl: streamUrls.hls.master,
        webrtcUrl: streamUrls.webrtc.offer,
        cdnUrls,
        status: 'scheduled',
        scheduledStartTime: new Date(),
        settings: {
          recordingEnabled,
          adaptiveBitrate,
          lowLatencyMode,
          maxBitrate: lowLatencyMode ? 2500 : 5000,
          targetLatency: lowLatencyMode ? 1 : 3
        },
        quality: {
          resolution: '1920x1080',
          bitrate: 0,
          fps: 30
        },
        viewerCount: 0,
        maxViewers: 0,
        totalDonations: 0,
        donationsCount: 0
      });

      try {
        await stream.save();
        console.log('✅ Stream creado exitosamente:', stream._id, 'StreamKey:', streamKey);
      } catch (saveError) {
        console.error('❌ Error guardando stream en DB:', saveError);
        return sendError(res, 'Error guardando stream en base de datos', 500, 'STREAM_SAVE_ERROR');
      }

      const publishToken = signPublishToken(streamKey, 900);
      const secureHlsUrl = `${req.protocol}://${req.get('host')}/secure-hls/${streamKey}/index.m3u8?token=${publishToken}`;

      return sendCreated(res, {
        message: 'Stream profesional creado exitosamente',
        stream: {
          id: stream._id,
          title: stream.title,
          streamKey: stream.streamKey,
          urls: { ...streamUrls, hls: { ...streamUrls.hls, master: secureHlsUrl } },
          cdnUrls: (stream as any).cdnUrls || [],
          status: stream.status,
          settings: (stream as any).settings || {}
        },
        publishToken,
        streamingInstructions: {
          rtmpServer: streamUrls.rtmp.server,
          streamKey: streamUrls.rtmp.key,
          recommendedSettings: {
            videoCodec: 'H.264',
            audioCodec: 'AAC',
            bitrate: lowLatencyMode ? '2500 kbps' : '5000 kbps',
            resolution: '1920x1080',
            fps: 30,
            keyframeInterval: 2
          }
        }
      });

    } catch (error) {
      console.error('❌ Error creating professional stream:', error);
      console.error('❌ Error stack:', error.stack);
      console.error('❌ Error message:', error.message);
      return sendError(res, 'Error creando stream profesional', 500, 'STREAM_CREATE_ERROR');
    }
  }

  // Rotar stream key (propietario o admin). No permitido si está en vivo
  static async rotateStreamKey(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const { streamId } = req.params as any;

      const stream = await MetroLiveStreamModel.findById(streamId);
      if (!stream) return sendError(res, 'Stream no encontrado', 404, 'STREAM_NOT_FOUND');

      const isOwner = stream.streamerId.toString() === userId;
      const isAdmin = (req.user as any)?.role === 'admin';
      if (!isOwner && !isAdmin) return sendError(res, 'No autorizado', 403, 'FORBIDDEN');

      if (stream.status === 'live') {
        return sendError(res, 'No se puede rotar la clave durante una transmisión en vivo', 400, 'ROTATE_WHILE_LIVE_FORBIDDEN');
      }

      const newKey = StreamingServerService.generateStreamKey();
      const urls = StreamingServerService.getStreamUrls(newKey);

      stream.streamKey = newKey as any;
      stream.rtmpUrl = urls.rtmp.fullUrl;
      stream.hlsUrl = urls.hls.master;
      (stream as any).webrtcUrl = urls.webrtc.offer;
      await stream.save();

      return sendOk(res, {
        message: 'Stream key rotada exitosamente',
        streamId: stream._id,
        streamKey: newKey,
        urls
      });
    } catch (error) {
      console.error('Error rotating stream key:', error);
      return sendError(res, 'Error rotando stream key', 500, 'ROTATE_KEY_ERROR');
    }
  }

  // Emitir token de publicación (RTMP) para OBS/app
  static async issuePublishToken(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const { streamId } = req.params as any;
      const { ttl = 900 } = req.body || {};

      const stream = await MetroLiveStreamModel.findById(streamId).select('streamerId streamKey');
      if (!stream) return sendError(res, 'Stream no encontrado', 404, 'STREAM_NOT_FOUND');
      const isOwner = stream.streamerId.toString() === userId;
      const isAdmin = (req.user as any)?.role === 'admin';
      if (!isOwner && !isAdmin) return sendError(res, 'No autorizado', 403, 'FORBIDDEN');

      const token = signPublishToken(stream.streamKey!, Number(ttl) || 900);
      return sendOk(res, { token, expiresIn: Number(ttl) || 900 });
    } catch (error) {
      console.error('Error issuing publish token:', error);
      return sendError(res, 'Error generando token', 500, 'ISSUE_TOKEN_ERROR');
    }
  }

  // Emitir token de reproducción HLS segura
  static async issueHlsToken(req: AuthenticatedRequest, res: Response) {
    try {
      const { streamId } = req.params as any;
      const { ttl = 600 } = req.body || {};
      const stream = await MetroLiveStreamModel.findById(streamId).select('streamKey');
      if (!stream) return sendError(res, 'Stream no encontrado', 404, 'STREAM_NOT_FOUND');
      const token = signPublishToken(stream.streamKey!, Number(ttl) || 600);
      return sendOk(res, { token, expiresIn: Number(ttl) || 600 });
    } catch (error) {
      console.error('Error issuing HLS token:', error);
      return sendError(res, 'Error generando token HLS', 500, 'ISSUE_HLS_TOKEN_ERROR');
    }
  }

  // Iniciar stream con configuración profesional
  static async startProfessionalStream(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const { streamId } = req.params;
      const { quality, enableRecording = true } = req.body;

      const stream = await MetroLiveStreamModel.findOne({
        _id: streamId,
        streamerId: userId,
        status: { $in: ['scheduled', 'offline'] }
      });

      if (!stream) {
        return sendError(res, 'Stream no encontrado o no tienes permisos', 404, 'STREAM_NOT_FOUND');
      }

      if (stream.status === 'live' || stream.status === 'starting') {
        return sendError(res, 'El stream ya está en vivo o iniciando', 400, 'STREAM_ALREADY_LIVE');
      }

      // Actualizar configuración de calidad si se proporciona
      if (quality) {
        stream.quality = {
          resolution: quality.resolution || '1920x1080',
          bitrate: quality.bitrate || 5000,
          fps: quality.fps || 30
        };
      }

      // Configurar grabación
      if (!(stream as any).settings) (stream as any).settings = {};
      (stream as any).settings.recordingEnabled = enableRecording;
      stream.status = 'starting';
      stream.startedAt = new Date();

      await stream.save();

      // El streaming server detectará automáticamente cuando empiece a recibir datos RTMP

      return sendOk(res, {
        message: 'Stream configurado para inicio',
        stream: {
          id: stream._id,
          status: stream.status,
          rtmpUrl: stream.rtmpUrl,
          streamKey: stream.streamKey,
          quality: stream.quality,
          settings: (stream as any).settings || {}
        },
        instructions: {
          step1: 'Configura tu software de streaming (OBS, XSplit, etc.)',
          step2: `Servidor RTMP: ${stream.rtmpUrl?.split('/')[0]}//${stream.rtmpUrl?.split('//')[1]?.split('/')[0]}/live`,
          step3: `Stream Key: ${stream.streamKey}`,
          step4: 'Inicia la transmisión desde tu software',
          step5: 'El stream aparecerá automáticamente como "live" cuando recibamos datos'
        }
      });

    } catch (error) {
      console.error('Error starting professional stream:', error);
      return sendError(res, 'Error iniciando stream profesional', 500, 'STREAM_START_ERROR');
    }
  }

  // Obtener stream con calidades múltiples
  static async getStreamWithQualities(req: Request, res: Response) {
    try {
      const { streamId } = req.params;
      const { userLocation } = req.query;

      const stream = await MetroLiveStreamModel.findById(streamId)
        .populate('streamerId', 'displayName avatarUrl streamerProfile');

      if (!stream) {
        return sendError(res, 'Stream no encontrado', 404, 'STREAM_NOT_FOUND');
      }

      // Obtener URL óptima de CDN
      let optimalUrl = stream.hlsUrl;
      if (userLocation) {
        try {
          const location = JSON.parse(userLocation as string);
          optimalUrl = CDNService.getOptimalCDNUrl(stream.streamKey, location);
        } catch (e) {
          console.log('Error parsing user location:', e);
        }
      }

      // Generar URL HLS segura firmada
      if (!stream.streamKey) {
        return sendError(res, 'Stream key no encontrado', 400, 'STREAM_KEY_MISSING');
      }
      const secureToken = signPublishToken(stream.streamKey, 900);
      const secureHlsUrl = `${req.protocol}://${req.get('host')}/secure-hls/${stream.streamKey}/index.m3u8?token=${secureToken}`;

      // Obtener estadísticas en tiempo real
      const serverStats = StreamingServerService.getServerStats();
      
      return sendOk(res, {
        stream: {
          ...stream.toObject(),
          optimalUrl,
          secureHlsUrl,
          availableQualities: stream.hlsUrl ? {
            master: secureHlsUrl,
            '1080p': secureHlsUrl.replace('index.m3u8', '1080p.m3u8'),
            '720p': secureHlsUrl.replace('index.m3u8', '720p.m3u8'),
            '480p': secureHlsUrl.replace('index.m3u8', '480p.m3u8'),
            '360p': secureHlsUrl.replace('index.m3u8', '360p.m3u8')
          } : null,
          serverStats: {
            currentViewers: stream.viewerCount,
            maxViewers: stream.maxViewers,
            isServerHealthy: serverStats.isRunning
          }
        }
      });

    } catch (error) {
      console.error('Error getting stream with qualities:', error);
      return sendError(res, 'Error obteniendo stream', 500, 'STREAM_GET_ERROR');
    }
  }

  // Configurar WebRTC para baja latencia
  static async setupWebRTC(req: AuthenticatedRequest, res: Response) {
    try {
      const { streamId } = req.params;
      const { offer, type = 'viewer' } = req.body;

      const stream = await MetroLiveStreamModel.findById(streamId);
      if (!stream || stream.status !== 'live') {
        return sendError(res, 'Stream no disponible para WebRTC', 400, 'STREAM_NOT_AVAILABLE');
      }

      // Crear respuesta WebRTC
      const answer = await WebRTCService.createOffer(stream.streamKey, offer);

      return sendOk(res, {
        answer,
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          {
            urls: 'turn:turn.metro.pe:3478',
            username: 'metro_user',
            credential: 'metro_pass'
          }
        ],
        streamKey: stream.streamKey
      });

    } catch (error) {
      console.error('Error setting up WebRTC:', error);
      return sendError(res, 'Error configurando WebRTC', 500, 'WEBRTC_SETUP_ERROR');
    }
  }

  // Obtener analytics en tiempo real
  static async getStreamAnalytics(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const { streamId } = req.params;

      const stream = await MetroLiveStreamModel.findOne({
        _id: streamId,
        streamerId: userId
      });

      if (!stream) {
        return sendError(res, 'Stream no encontrado', 404, 'STREAM_NOT_FOUND');
      }

      // Obtener estadísticas del servidor
      const serverStats = StreamingServerService.getServerStats();

      // Calcular métricas
      const duration = stream.startedAt 
        ? Math.floor((Date.now() - stream.startedAt.getTime()) / 1000)
        : 0;

      const averageViewers = stream.maxViewers > 0 
        ? Math.round((stream.viewerCount + stream.maxViewers) / 2)
        : 0;

      const engagementRate = stream.viewerCount > 0 
        ? ((stream.totalDonations + ((stream as any).chatMessages || 0)) / stream.viewerCount * 100)
        : 0;

      return sendOk(res, {
        analytics: {
          realtime: {
            currentViewers: stream.viewerCount,
            maxViewers: stream.maxViewers,
            averageViewers,
            duration,
            donationsReceived: stream.totalDonations,
            donationsCount: (stream as any).donationsCount || 0,
            chatMessages: (stream as any).chatMessages || 0,
            engagementRate: Math.round(engagementRate * 100) / 100
          },
          technical: {
            bitrate: stream.quality?.bitrate || 0,
            resolution: stream.quality?.resolution || 'Unknown',
            fps: stream.quality?.fps || 0,
            droppedFrames: 0, // Se obtendría del servidor real
            networkHealth: 'good', // Se calcularía basado en métricas reales
            serverLoad: serverStats.activeStreams
          },
          geographic: {
            // En una implementación real, obtendrías datos de geolocalización de viewers
            topCountries: ['Peru', 'Colombia', 'Ecuador'],
            topCities: ['Lima', 'Bogotá', 'Quito']
          }
        }
      });

    } catch (error) {
      console.error('Error getting stream analytics:', error);
      return sendError(res, 'Error obteniendo analytics', 500, 'ANALYTICS_ERROR');
    }
  }

  // Configurar stream con configuración avanzada
  static async configureAdvancedStream(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const { streamId } = req.params;
      const {
        quality,
        recording,
        transcoding,
        cdn,
        moderation,
        monetization
      } = req.body;

      const stream = await MetroLiveStreamModel.findOne({
        _id: streamId,
        streamerId: userId
      });

      if (!stream) {
        return sendError(res, 'Stream no encontrado', 404, 'STREAM_NOT_FOUND');
      }

      // Actualizar configuración avanzada
      const advancedSettings = {
        quality: {
          maxResolution: quality?.maxResolution || '1920x1080',
          maxBitrate: quality?.maxBitrate || 5000,
          maxFps: quality?.maxFps || 30,
          adaptiveBitrate: quality?.adaptiveBitrate ?? true,
          autoQuality: quality?.autoQuality ?? true
        },
        recording: {
          enabled: recording?.enabled ?? true,
          format: recording?.format || 'mp4',
          quality: recording?.quality || 'high',
          autoUpload: recording?.autoUpload ?? true,
          retention: recording?.retention || 30 // días
        },
        transcoding: {
          enabled: transcoding?.enabled ?? true,
          qualities: transcoding?.qualities || ['1080p', '720p', '480p', '360p'],
          codec: transcoding?.codec || 'h264',
          preset: transcoding?.preset || 'ultrafast'
        },
        cdn: {
          enabled: cdn?.enabled ?? true,
          regions: cdn?.regions || ['us', 'eu', 'sa'],
          caching: cdn?.caching ?? true
        },
        moderation: {
          chatFilter: moderation?.chatFilter ?? true,
          autoModeration: moderation?.autoModeration ?? false,
          bannedWords: moderation?.bannedWords || [],
          slowMode: moderation?.slowMode ?? 0
        },
        monetization: {
          donationsEnabled: monetization?.donationsEnabled ?? true,
          minDonation: monetization?.minDonation || 10,
          maxDonation: monetization?.maxDonation || 1000,
          donationGoal: monetization?.donationGoal || null
        }
      };

      (stream as any).advancedSettings = advancedSettings;
      await stream.save();

      return sendOk(res, {
        message: 'Configuración avanzada actualizada',
        settings: advancedSettings
      });

    } catch (error) {
      console.error('Error configuring advanced stream:', error);
      return sendError(res, 'Error configurando stream avanzado', 500, 'STREAM_CONFIG_ERROR');
    }
  }

  // Dashboard profesional del streamer
  static async getStreamerProfessionalDashboard(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const { timeRange = '7d' } = req.query;

      // Verificar que sea streamer
      const user = await UserModel.findById(userId);
      if (!user || user.role !== 'metro_streamer') {
        return sendError(res, 'Solo para Metro Streamers', 403, 'NOT_STREAMER');
      }

      // Calcular rango de fechas
      const endDate = new Date();
      const startDate = new Date();
      
      switch (timeRange) {
        case '24h':
          startDate.setDate(startDate.getDate() - 1);
          break;
        case '7d':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(startDate.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(startDate.getDate() - 90);
          break;
        default:
          startDate.setDate(startDate.getDate() - 7);
      }

      // Obtener estadísticas detalladas
      const [
        totalStreams,
        totalViewTime,
        totalViewers,
        totalDonations,
        averageViewers,
        peakViewers,
        streamsByCategory,
        viewersByDay,
        donationsByDay,
        topStreams,
        followerGrowth,
        engagementMetrics
      ] = await Promise.all([
        // Total de streams en el período
        MetroLiveStreamModel.countDocuments({
          streamerId: userId,
          createdAt: { $gte: startDate, $lte: endDate }
        }),

        // Tiempo total de streaming
        MetroLiveStreamModel.aggregate([
          {
            $match: {
              streamerId: new mongoose.Types.ObjectId(userId),
              createdAt: { $gte: startDate, $lte: endDate },
              duration: { $gt: 0 }
            }
          },
          { $group: { _id: null, totalMinutes: { $sum: { $divide: ['$duration', 60] } } } }
        ]),

        // Total de viewers únicos
        MetroLiveStreamModel.aggregate([
          {
            $match: {
              streamerId: new mongoose.Types.ObjectId(userId),
              createdAt: { $gte: startDate, $lte: endDate }
            }
          },
          { $group: { _id: null, totalViewers: { $sum: '$maxViewers' } } }
        ]),

        // Total de donaciones
        MetroLiveStreamModel.aggregate([
          {
            $match: {
              streamerId: new mongoose.Types.ObjectId(userId),
              createdAt: { $gte: startDate, $lte: endDate }
            }
          },
          { $group: { _id: null, totalDonations: { $sum: '$totalDonations' } } }
        ]),

        // Promedio de viewers
        MetroLiveStreamModel.aggregate([
          {
            $match: {
              streamerId: new mongoose.Types.ObjectId(userId),
              createdAt: { $gte: startDate, $lte: endDate },
              maxViewers: { $gt: 0 }
            }
          },
          { $group: { _id: null, avgViewers: { $avg: '$maxViewers' } } }
        ]),

        // Pico de viewers
        MetroLiveStreamModel.aggregate([
          {
            $match: {
              streamerId: new mongoose.Types.ObjectId(userId),
              createdAt: { $gte: startDate, $lte: endDate }
            }
          },
          { $group: { _id: null, peakViewers: { $max: '$maxViewers' } } }
        ]),

        // Streams por categoría
        MetroLiveStreamModel.aggregate([
          {
            $match: {
              streamerId: new mongoose.Types.ObjectId(userId),
              createdAt: { $gte: startDate, $lte: endDate }
            }
          },
          { $group: { _id: '$category', count: { $sum: 1 }, totalViewers: { $sum: '$maxViewers' } } },
          { $sort: { count: -1 } }
        ]),

        // Viewers por día
        MetroLiveStreamModel.aggregate([
          {
            $match: {
              streamerId: new mongoose.Types.ObjectId(userId),
              createdAt: { $gte: startDate, $lte: endDate }
            }
          },
          {
            $group: {
              _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
              viewers: { $sum: '$maxViewers' },
              streams: { $sum: 1 }
            }
          },
          { $sort: { _id: 1 } }
        ]),

        // Donaciones por día
        MetroLiveStreamModel.aggregate([
          {
            $match: {
              streamerId: new mongoose.Types.ObjectId(userId),
              createdAt: { $gte: startDate, $lte: endDate },
              totalDonations: { $gt: 0 }
            }
          },
          {
            $group: {
              _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
              donations: { $sum: '$totalDonations' },
              donationCount: { $sum: '$donationsCount' }
            }
          },
          { $sort: { _id: 1 } }
        ]),

        // Top streams del período
        MetroLiveStreamModel.find({
          streamerId: userId,
          createdAt: { $gte: startDate, $lte: endDate }
        })
        .sort({ maxViewers: -1 })
        .limit(5)
        .select('title maxViewers totalDonations duration createdAt category'),

        // Crecimiento de seguidores
        StreamFollowModel.aggregate([
          {
            $match: {
              streamerId: new mongoose.Types.ObjectId(userId),
              createdAt: { $gte: startDate, $lte: endDate }
            }
          },
          {
            $group: {
              _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
              newFollowers: { $sum: 1 }
            }
          },
          { $sort: { _id: 1 } }
        ]),

        // Métricas de engagement
        MetroLiveStreamModel.aggregate([
          {
            $match: {
              streamerId: new mongoose.Types.ObjectId(userId),
              createdAt: { $gte: startDate, $lte: endDate },
              maxViewers: { $gt: 0 }
            }
          },
          {
            $group: {
              _id: null,
              avgDonationPerViewer: { 
                $avg: { 
                  $cond: [
                    { $gt: ['$maxViewers', 0] },
                    { $divide: ['$totalDonations', '$maxViewers'] },
                    0
                  ]
                }
              },
              avgChatPerViewer: {
                $avg: {
                  $cond: [
                    { $gt: ['$maxViewers', 0] },
                    { $divide: [{ $ifNull: ['$chatMessages', 0] }, '$maxViewers'] },
                    0
                  ]
                }
              }
            }
          }
        ])
      ]);

      return sendOk(res, {
        dashboard: {
          overview: {
            totalStreams,
            totalViewTime: Math.round((totalViewTime[0]?.totalMinutes || 0) * 10) / 10,
            totalViewers: totalViewers[0]?.totalViewers || 0,
            totalDonations: totalDonations[0]?.totalDonations || 0,
            averageViewers: Math.round((averageViewers[0]?.avgViewers || 0) * 10) / 10,
            peakViewers: peakViewers[0]?.peakViewers || 0
          },
          performance: {
            streamsByCategory,
            viewersByDay,
            donationsByDay,
            topStreams,
            followerGrowth
          },
          engagement: {
            avgDonationPerViewer: Math.round((engagementMetrics[0]?.avgDonationPerViewer || 0) * 100) / 100,
            avgChatPerViewer: Math.round((engagementMetrics[0]?.avgChatPerViewer || 0) * 10) / 10,
            donationRate: totalStreams > 0 ? Math.round((donationsByDay.length / totalStreams) * 100) : 0
          },
          serverStatus: {
            isHealthy: StreamingServerService.getServerStats().isRunning,
            activeStreams: StreamingServerService.getServerStats().activeStreams,
            totalViewers: StreamingServerService.getServerStats().totalViewers
          }
        }
      });

    } catch (error) {
      console.error('Error getting streamer professional dashboard:', error);
      return sendError(res, 'Error obteniendo dashboard profesional', 500, 'DASHBOARD_ERROR');
    }
  }

  // Configurar stream para eventos especiales
  static async setupEventStream(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const {
        title,
        description,
        scheduledTime,
        duration,
        isPublic = true,
        requiresTicket = false,
        ticketPrice = 0,
        maxViewers = 1000,
        features = {}
      } = req.body;

      // Solo admins o streamers verificados pueden crear eventos
      const user = await UserModel.findById(userId);
      if (!user || (user.role !== 'admin' && user.role !== 'metro_streamer')) {
        return sendError(res, 'Sin permisos para crear eventos', 403, 'INSUFFICIENT_PERMISSIONS');
      }

      // Generar stream key especial para eventos
      const streamKey = 'event_' + crypto.randomBytes(8).toString('hex');
      
      // Crear stream de evento
      const eventStream = new MetroLiveStreamModel({
        streamerId: userId,
        title,
        description,
        category: 'event',
        streamKey,
        status: 'scheduled',
        scheduledStartTime: new Date(scheduledTime),
        isPrivate: !isPublic,
        chatEnabled: features.chatEnabled ?? true,
        donationsEnabled: features.donationsEnabled ?? true,
        isEvent: true,
        eventSettings: {
          duration: duration || 3600, // 1 hora por defecto
          requiresTicket,
          ticketPrice,
          maxViewers,
          features: {
            multipleHosts: features.multipleHosts ?? false,
            screenShare: features.screenShare ?? true,
            recording: features.recording ?? true,
            transcription: features.transcription ?? false,
            polls: features.polls ?? true,
            qa: features.qa ?? true
          }
        },
        settings: {
          recordingEnabled: true,
          adaptiveBitrate: true,
          lowLatencyMode: true,
          maxBitrate: 8000, // Mayor bitrate para eventos
          targetLatency: 1
        }
      });

      await eventStream.save();

      // Configurar URLs especiales para eventos
      const eventUrls = {
        rtmp: {
          server: `rtmp://events.metro.pe/live`,
          key: streamKey,
          backup: `rtmp://backup.metro.pe/live/${streamKey}`
        },
        hls: {
          primary: `https://cdn.metro.pe/events/${streamKey}/index.m3u8`,
          backup: `https://cdn-backup.metro.pe/events/${streamKey}/index.m3u8`
        },
        webrtc: {
          primary: `wss://rtc.metro.pe/events/${streamKey}`,
          backup: `wss://rtc-backup.metro.pe/events/${streamKey}`
        }
      };

      return sendCreated(res, {
        message: 'Stream de evento creado exitosamente',
        eventStream: {
          id: eventStream._id,
          title: eventStream.title,
          streamKey: eventStream.streamKey,
          scheduledTime: eventStream.startedAt,
          urls: eventUrls,
          settings: (eventStream as any).eventSettings || {},
          technicalSpecs: {
            maxBitrate: '8 Mbps',
            resolution: '1920x1080',
            fps: 60,
            latency: '< 1 segundo',
            redundancy: 'Doble servidor',
            cdn: 'Global'
          }
        }
      });

    } catch (error) {
      console.error('Error setting up event stream:', error);
      return sendError(res, 'Error configurando stream de evento', 500, 'EVENT_SETUP_ERROR');
    }
  }

  // Obtener estado del servidor de streaming
  static async getServerStatus(req: Request, res: Response) {
    try {
      const serverStats = StreamingServerService.getServerStats();
      
      // Obtener estadísticas de la base de datos
      const [
        totalActiveStreams,
        totalViewers,
        serverLoad,
        bandwidthUsage
      ] = await Promise.all([
        MetroLiveStreamModel.countDocuments({ status: 'live' }),
        MetroLiveStreamModel.aggregate([
          { $match: { status: 'live' } },
          { $group: { _id: null, totalViewers: { $sum: '$viewerCount' } } }
        ]),
        // Simular carga del servidor (en producción se obtendría de métricas reales)
        Promise.resolve(Math.random() * 100),
        // Simular uso de ancho de banda
        Promise.resolve({
          incoming: Math.random() * 1000, // Mbps
          outgoing: Math.random() * 5000   // Mbps
        })
      ]);

      return sendOk(res, {
        server: {
          status: serverStats.isRunning ? 'healthy' : 'down',
          uptime: process.uptime(),
          version: '2.0.0-pro',
          load: Math.round(serverLoad * 100) / 100,
          memory: {
            used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
            total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
            percentage: Math.round((process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) * 100)
          }
        },
        streaming: {
          activeStreams: totalActiveStreams,
          totalViewers: totalViewers[0]?.totalViewers || 0,
          bandwidth: bandwidthUsage,
          regions: ['US-East', 'EU-West', 'SA-East'],
          cdn: {
            status: 'active',
            hitRate: 95.5,
            avgLatency: 45 // ms
          }
        },
        infrastructure: {
          rtmp: {
            status: 'active',
            port: STREAMING_CONFIG.rtmp.port,
            connections: 0
          },
          hls: {
            status: 'active',
            port: STREAMING_CONFIG.http.port,
            segments: 'auto'
          },
          webrtc: {
            status: 'active',
            lowLatency: true,
            iceServers: 3
          }
        }
      });

    } catch (error) {
      console.error('Error getting server status:', error);
      return sendError(res, 'Error obteniendo estado del servidor', 500, 'SERVER_STATUS_ERROR');
    }
  }
}

// Importar mongoose para agregaciones
import mongoose from 'mongoose';
import { STREAMING_CONFIG } from '../types/streaming.types';
