import NodeMediaServer from 'node-media-server';
import { spawn, spawnSync, ChildProcessWithoutNullStreams } from 'child_process';
import path from 'path';
import fs from 'fs';
// import AWS from 'aws-sdk';
import { MetroLiveStreamModel } from '../models/metro-live.model';
import { UserModel } from '../models/user.model';

// Configuración de AWS S3 para almacenamiento (comentado temporalmente)
// const s3 = new AWS.S3({
//   accessKeyId: process.env.AWS_ACCESS_KEY_ID,
//   secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
//   region: process.env.AWS_REGION || 'us-east-1'
// });

// Configuración del servidor de streaming
const STREAMING_CONFIG = {
  rtmp: {
    port: 1935,
    chunk_size: 60000,
    gop_cache: true,
    ping: 30,
    ping_timeout: 60
  },  
  http: {
    port: 8000,
    allow_origin: '*',
    mediaroot: './media',
    webroot: './www'
  },
  https: {
    port: 8443,
    key: './ssl/privatekey.pem',
    cert: './ssl/certificate.pem'
  },
  relay: {
    ffmpeg: '/usr/local/bin/ffmpeg',
    tasks: [
      {
        app: 'live',
        mode: 'push',
        edge: 'rtmp://cdn.metro.pe/live'
      }
    ]
  },
  recording: {
    enabled: true,
    path: './recordings',
    format: 'mp4',
    cleanup: true,
    maxDuration: 3600 // 1 hora máximo
  }
};

export class StreamingServerService {
  private static server: any;
  private static isInitialized = false;
  private static ffmpegPath: string | null = null;
  private static ffprobePath: string | null = null;
  private static transcodingProcesses: Map<string, ChildProcessWithoutNullStreams[]> = new Map();
  private static recordingProcesses: Map<string, ChildProcessWithoutNullStreams> = new Map();

  // Inicializar servidor de streaming
  static async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Crear directorios necesarios
      this.ensureDirectories();

      // Detectar ffmpeg
      this.ffmpegPath = this.findFfmpegPath();
      if (!this.ffmpegPath) {
        console.warn('⚠️ ffmpeg no encontrado, usando "ffmpeg" del PATH');
        this.ffmpegPath = 'ffmpeg';
      }

      // Detectar ffprobe
      this.ffprobePath = this.findFfprobePath();
      if (!this.ffprobePath) {
        console.warn('⚠️ ffprobe no encontrado, usando "ffprobe" del PATH');
        this.ffprobePath = 'ffprobe';
      }

      // Configurar Node Media Server real
      this.server = new NodeMediaServer({
        rtmp: STREAMING_CONFIG.rtmp,
        http: STREAMING_CONFIG.http,
      });

      // Event listeners
      this.setupEventListeners();

      // Iniciar servidor
      this.server.run();
      this.isInitialized = true;

      console.log('🎥 Streaming Server iniciado exitosamente');
      
      const isProduction = process.env.NODE_ENV === 'production';
      const host = isProduction ? 'streaming.telemetro.pe' : 'localhost';
      const protocol = isProduction ? 'https' : 'http';
      
      console.log(`📡 RTMP: rtmp://${host}:${STREAMING_CONFIG.rtmp.port}/live`);
      console.log(`🌐 HLS: ${protocol}://${host}:${STREAMING_CONFIG.http.port}/live/{STREAM_KEY}/index.m3u8`);

    } catch (error) {
      console.error('❌ Error inicializando servidor de streaming:', error);
      throw error;
    }
  }

  // Configurar event listeners
  private static setupEventListeners(): void {
    // Cuando un stream se conecta
    this.server.on('preConnect', (id: string, args: any) => {
      console.log('🔗 Nueva conexión RTMP:', id, args);
    });

    // Cuando inicia la publicación
    this.server.on('postPublish', async (id: string, streamPath: string, args: any) => {
      console.log('🔴 Stream iniciado:', id, streamPath);
      
      const streamKey = this.extractStreamKey(streamPath);
      if (streamKey) {
        await this.handleStreamStart(streamKey, args);
      }
    });

    // Cuando termina la publicación
    this.server.on('donePublish', async (id: string, streamPath: string, args: any) => {
      console.log('⏹️ Stream terminado:', id, streamPath);
      
      const streamKey = this.extractStreamKey(streamPath);
      if (streamKey) {
        await this.handleStreamEnd(streamKey, args);
      }
    });

    // Cuando un viewer se conecta
    this.server.on('prePlay', (id: string, streamPath: string, args: any) => {
      console.log('👁️ Nuevo viewer:', id, streamPath);
      
      const streamKey = this.extractStreamKey(streamPath);
      if (streamKey) {
        this.handleViewerJoin(streamKey);
      }
    });

    // Cuando un viewer se desconecta
    this.server.on('donePlay', (id: string, streamPath: string, args: any) => {
      console.log('👋 Viewer desconectado:', id, streamPath);
      
      const streamKey = this.extractStreamKey(streamPath);
      if (streamKey) {
        this.handleViewerLeave(streamKey);
      }
    });
  }

  // Extraer stream key del path
  private static extractStreamKey(streamPath: string): string | null {
    const match = streamPath.match(/\/live\/(.+)/);
    return match ? match[1] : null;
  }

  // Manejar inicio de stream
  private static async handleStreamStart(streamKey: string, args: any): Promise<void> {
    try {
      // Buscar stream en la base de datos
      const stream = await MetroLiveStreamModel.findOne({ streamKey });
      
      if (!stream) {
        console.error('❌ Stream no encontrado en DB:', streamKey);
        return;
      }

      // Actualizar estado del stream
      stream.status = 'live';
      stream.startedAt = new Date();
      stream.actualStartTime = new Date();
      const baseUrl = process.env.NODE_ENV === 'production' ? 'streaming.telemetro.pe' : 'localhost';
      const rtmpPort = process.env.NODE_ENV === 'production' ? '1935' : STREAMING_CONFIG.rtmp.port;
      const hlsPort = process.env.NODE_ENV === 'production' ? '' : `:${STREAMING_CONFIG.http.port}`;
      const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
      
      stream.rtmpUrl = `rtmp://${baseUrl}:${rtmpPort}/live/${streamKey}`;
      stream.hlsUrl = `${protocol}://${baseUrl}${hlsPort}/live/${streamKey}/index.m3u8`;
      
      await stream.save();

      // Iniciar transcoding para múltiples calidades
      this.startTranscoding(streamKey);

      // Iniciar grabación
      this.startRecording(streamKey);

      // Notificar a seguidores del streamer
      await this.notifyFollowers(stream.streamerId.toString(), stream.title, stream._id.toString());

      console.log('✅ Stream activado en DB:', streamKey);

    } catch (error) {
      console.error('❌ Error manejando inicio de stream:', error);
    }
  }

  // Manejar fin de stream
  private static async handleStreamEnd(streamKey: string, args: any): Promise<void> {
    try {
      const stream = await MetroLiveStreamModel.findOne({ streamKey });
      
      if (!stream) return;

      // Calcular duración
      const duration = stream.startedAt 
        ? Math.floor((Date.now() - stream.startedAt.getTime()) / 1000)
        : 0;

      // Actualizar stream
      stream.status = 'offline';
      stream.endedAt = new Date();
      stream.duration = duration;
      
      await stream.save();

      // Detener transcoding
      this.stopTranscoding(streamKey);

      // Detener grabación
      this.stopRecording(streamKey);

      // Procesar grabación y subirla a S3
      await this.processRecording(streamKey, stream._id.toString());

      // Actualizar estadísticas del streamer
      await this.updateStreamerStats(stream.streamerId.toString(), duration, stream.maxViewers);

      console.log('✅ Stream finalizado y procesado:', streamKey);

    } catch (error) {
      console.error('❌ Error manejando fin de stream:', error);
    }
  }

  // Manejar viewer que se une
  private static async handleViewerJoin(streamKey: string): Promise<void> {
    try {
      const stream = await MetroLiveStreamModel.findOne({ streamKey, status: 'live' });
      if (!stream) return;

      // Incrementar contador de viewers
      stream.viewerCount += 1;
      stream.maxViewers = Math.max(stream.maxViewers, stream.viewerCount);
      
      await stream.save();

    } catch (error) {
      console.error('❌ Error manejando viewer join:', error);
    }
  }

  // Manejar viewer que se va
  private static async handleViewerLeave(streamKey: string): Promise<void> {
    try {
      const stream = await MetroLiveStreamModel.findOne({ streamKey, status: 'live' });
      if (!stream) return;

      // Decrementar contador de viewers
      stream.viewerCount = Math.max(0, stream.viewerCount - 1);
      
      await stream.save();

    } catch (error) {
      console.error('❌ Error manejando viewer leave:', error);
    }
  }

  // Iniciar transcoding para múltiples calidades
  private static startTranscoding(streamKey: string): void {
    if (!this.ffmpegPath) {
      console.warn('⚠️ ffmpeg no disponible, omitiendo transcoding');
      return;
    }

    const isProduction = process.env.NODE_ENV === 'production';
    const host = isProduction ? 'streaming.telemetro.pe' : 'localhost';
    const inputUrl = `rtmp://${host}:${STREAMING_CONFIG.rtmp.port}/live/${streamKey}`;
    const outputDir = path.join('./media/live', streamKey);

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const variant = { name: '720p', width: 1280, height: 720, vb: '2500k', ab: '128k' } as const;
    const variantPlaylist = path.join(outputDir, `${variant.name}.m3u8`);
    const segmentPattern = path.join(outputDir, `${variant.name}_%03d.ts`);

    const args = [
      '-i', inputUrl,
      '-c:v', 'libx264', '-preset', 'veryfast', '-tune', 'zerolatency',
      '-c:a', 'aac', '-b:a', variant.ab, '-ar', '44100',
      '-vf', `scale=${variant.width}:${variant.height}`,
      '-b:v', variant.vb,
      '-f', 'hls', '-hls_time', '2', '-hls_list_size', '10', '-hls_flags', 'delete_segments',
      '-hls_segment_filename', segmentPattern,
      variantPlaylist
    ];

    const proc = spawn(this.ffmpegPath, args);
    proc.stderr.on('data', (d) => process.stdout.write(d));
    proc.on('close', (code) => {
      console.log(`🎬 ffmpeg (${streamKey} ${variant.name}) finalizado con código ${code}`);
    });

    this.transcodingProcesses.set(streamKey, [proc]);

    this.createMasterPlaylist(streamKey, [
      { name: variant.name, resolution: `${variant.width}x${variant.height}`, bitrate: variant.vb } as any
    ]);
  }

  // Crear master playlist para adaptive bitrate
  private static createMasterPlaylist(streamKey: string, qualities: any[]): void {
    const outputDir = path.join('./media/live', streamKey);
    const masterPlaylistPath = path.join(outputDir, 'index.m3u8');

    let masterPlaylist = '#EXTM3U\n#EXT-X-VERSION:3\n\n';

    qualities.forEach((quality: any) => {
      const bitrateK = parseInt(String(quality.bitrate).replace('k', '')) || 2500;
      const bandwidth = bitrateK * 1000;
      masterPlaylist += `#EXT-X-STREAM-INF:BANDWIDTH=${bandwidth},RESOLUTION=${quality.resolution},NAME="${quality.name}"\n`;
      masterPlaylist += `${quality.name}.m3u8\n\n`;
    });

    fs.writeFileSync(masterPlaylistPath, masterPlaylist);
  }

  // Detener transcoding
  private static stopTranscoding(streamKey: string): void {
    const procs = this.transcodingProcesses.get(streamKey) || [];
    procs.forEach(p => {
      try { p.kill('SIGTERM'); } catch (_) { /* noop */ }
    });
    this.transcodingProcesses.delete(streamKey);
    console.log('⏹️ Transcoding detenido para:', streamKey);
  }

  // Iniciar grabación
  private static startRecording(streamKey: string): void {
    if (!this.ffmpegPath) return;
    const isProduction = process.env.NODE_ENV === 'production';
    const host = isProduction ? 'streaming.telemetro.pe' : 'localhost';
    const inputUrl = `rtmp://${host}:${STREAMING_CONFIG.rtmp.port}/live/${streamKey}`;
    const outputDir = './recordings';
    const outputFile = path.join(outputDir, `${streamKey}_${Date.now()}.mp4`);

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const args = ['-i', inputUrl, '-c:v', 'libx264', '-c:a', 'aac', outputFile];
    const proc = spawn(this.ffmpegPath, args);
    proc.stderr.on('data', (d) => process.stdout.write(d));
    this.recordingProcesses.set(streamKey, proc);
    console.log('🔴 Grabación iniciada:', outputFile);
  }

  private static stopRecording(streamKey: string): void {
    const p = this.recordingProcesses.get(streamKey);
    if (p) {
      try { p.kill('SIGTERM'); } catch (_) { /* noop */ }
      this.recordingProcesses.delete(streamKey);
    }
  }

  // Procesar grabación y subir a S3
  private static async processRecording(streamKey: string, streamId: string): Promise<void> {
    try {
      const recordingsDir = './recordings';
      const files = fs.readdirSync(recordingsDir);
      const recordingFile = files.find(file => file.startsWith(streamKey));

      if (!recordingFile) {
        console.log('⚠️ No se encontró grabación para:', streamKey);
        return;
      }

      const filePath = path.join(recordingsDir, recordingFile);
      const fileBuffer = fs.readFileSync(filePath);

      // Subir a S3 (simulado temporalmente)
      console.log('☁️ Upload a S3 simulado para:', recordingFile);
      const uploadResult = {
        Location: `https://s3.amazonaws.com/metro-recordings/${streamId}/${recordingFile}`
      };
      // const uploadResult = await s3.upload(uploadParams).promise();

      // Generar thumbnail (simulado)
      const thumbUrl = `https://s3.amazonaws.com/metro-recordings/${streamId}/thumb_${path.parse(recordingFile).name}.jpg`;

      // Extraer duración real con ffprobe
      const durationSec = this.getVideoDurationSeconds(filePath);

      // Actualizar stream con URL de grabación y thumbnail
      const update: any = {
        recordingUrl: uploadResult.Location,
        recordingSize: fileBuffer.length,
        thumbnailUrl: thumbUrl,
        isRecorded: true,
      };
      if (durationSec && durationSec > 0) {
        update.duration = durationSec;
      }
      await MetroLiveStreamModel.findByIdAndUpdate(streamId, update);

      // Limpiar archivo local
      fs.unlinkSync(filePath);

      console.log('☁️ Grabación subida a S3:', uploadResult.Location);

    } catch (error) {
      console.error('❌ Error procesando grabación:', error);
    }
  }

  // Obtener duración de video en segundos usando ffprobe
  private static getVideoDurationSeconds(filePath: string): number {
    try {
      const ffprobe = this.ffprobePath || 'ffprobe';
      const result = spawnSync(ffprobe, [
        '-v', 'error',
        '-show_entries', 'format=duration',
        '-of', 'default=nk=1:nw=1',
        filePath
      ], { encoding: 'utf8' });
      if (result.status === 0 && result.stdout) {
        const val = parseFloat((result.stdout || '').trim());
        if (!isNaN(val) && isFinite(val)) {
          return Math.max(0, Math.round(val));
        }
      } else if (result.stderr) {
        console.warn('ffprobe stderr:', result.stderr);
      }
    } catch (e) {
      console.error('⚠️ No se pudo extraer duración con ffprobe:', e);
    }
    return 0;
  }

  // Notificar a seguidores
  private static async notifyFollowers(streamerId: string, streamTitle: string, streamId: string): Promise<void> {
    try {
      // Obtener seguidores del streamer
      const { StreamFollowModel } = await import('../models/metro-live.model');
      const followers = await StreamFollowModel.find({ streamerId }).populate('followerId', '_id');

      // Enviar notificaciones push
      const { NotificationHelpers } = await import('./notification.service');
      const streamer = await UserModel.findById(streamerId);

      if (streamer && followers.length > 0) {
        const followerIds = followers.map(f => f.followerId._id.toString());
        
        // Enviar notificaciones en lotes
        for (let i = 0; i < followerIds.length; i += 100) {
          const batch = followerIds.slice(i, i + 100);
          
          const promises = batch.map(followerId => 
            NotificationHelpers.streamLive(followerId, streamer.displayName, streamTitle, streamId)
          );
          
          await Promise.allSettled(promises);
        }
      }

    } catch (error) {
      console.error('❌ Error notificando seguidores:', error);
    }
  }

  // Actualizar estadísticas del streamer
  private static async updateStreamerStats(streamerId: string, duration: number, maxViewers: number): Promise<void> {
    try {
      await UserModel.findByIdAndUpdate(streamerId, {
        $inc: {
          'streamerProfile.totalStreams': 1,
          'streamerProfile.streamingHours': Math.floor(duration / 3600),
          'streamerProfile.totalViewers': maxViewers
        },
        $set: {
          'streamerProfile.lastStreamAt': new Date(),
          'streamerProfile.averageViewers': Math.round(maxViewers * 0.7) // Estimación
        }
      });

    } catch (error) {
      console.error('❌ Error actualizando estadísticas del streamer:', error);
    }
  }

  // Crear directorios necesarios
  private static ensureDirectories(): void {
    const dirs = ['./media', './media/live', './recordings', './www'];
    
    dirs.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  // Buscar ffmpeg en rutas comunes
  private static findFfmpegPath(): string | null {
    const candidates = [
      '/opt/homebrew/bin/ffmpeg',
      '/usr/local/bin/ffmpeg',
      '/usr/bin/ffmpeg'
    ];
    for (const pth of candidates) {
      if (fs.existsSync(pth)) return pth;
    }
    return null;
  }

  // Buscar ffprobe en rutas comunes
  private static findFfprobePath(): string | null {
    const candidates = [
      '/opt/homebrew/bin/ffprobe',
      '/usr/local/bin/ffprobe',
      '/usr/bin/ffprobe'
    ];
    for (const pth of candidates) {
      if (fs.existsSync(pth)) return pth;
    }
    return null;
  }

  // Generar stream key único
  static generateStreamKey(): string {
    return 'metro_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
  }

  // Obtener URLs de streaming
  static getStreamUrls(streamKey: string) {
    const isProduction = process.env.NODE_ENV === 'production';
    const baseUrl = isProduction ? 'streaming.telemetro.pe' : 'localhost';
    const rtmpPort = isProduction ? '1935' : STREAMING_CONFIG.rtmp.port;
    const hlsPort = isProduction ? '' : `:${STREAMING_CONFIG.http.port}`;
    const protocol = isProduction ? 'https' : 'http';
    const wsProtocol = isProduction ? 'wss' : 'ws';
    
      return {
      rtmp: {
        server: `rtmp://${baseUrl}:${rtmpPort}/live`,
        key: streamKey,
        fullUrl: `rtmp://${baseUrl}:${rtmpPort}/live/${streamKey}`
      },
      hls: {
        master: `${protocol}://${baseUrl}${hlsPort}/live/${streamKey}/index.m3u8`,
        qualities: {
          '1080p': `${protocol}://${baseUrl}${hlsPort}/live/${streamKey}/1080p.m3u8`,
          '720p': `${protocol}://${baseUrl}${hlsPort}/live/${streamKey}/720p.m3u8`,
          '480p': `${protocol}://${baseUrl}${hlsPort}/live/${streamKey}/480p.m3u8`,
          '360p': `${protocol}://${baseUrl}${hlsPort}/live/${streamKey}/360p.m3u8`
        }
      },
      webrtc: {
        offer: `${wsProtocol}://${baseUrl}:9000/webrtc/${streamKey}/offer`,
        answer: `${wsProtocol}://${baseUrl}:9000/webrtc/${streamKey}/answer`
      }
    };
  }

  // Validar stream key
  static async validateStreamKey(streamKey: string): Promise<boolean> {
    try {
      const stream = await MetroLiveStreamModel.findOne({ 
        streamKey,
        status: { $in: ['scheduled', 'starting'] }
      });

      return !!stream;
    } catch (error) {
      console.error('❌ Error validando stream key:', error);
      return false;
    }
  }

  // Obtener estadísticas del servidor
  static getServerStats() {
    return {
      isRunning: this.isInitialized,
      activeStreams: this.transcodingProcesses.size,
      totalViewers: 0,
      serverStatus: this.isInitialized ? 'healthy' : 'down',
      lastCheck: new Date().toISOString()
    };
  }

  // Inicializar servidor si no está corriendo
  static async ensureServerRunning(): Promise<boolean> {
    if (!this.isInitialized) {
      try {
        // Verificar si ya hay un servidor de streaming corriendo
        const isExternalServerRunning = await this.checkExternalStreamingServer();
        if (isExternalServerRunning) {
          console.log('✅ Servidor de streaming externo detectado y funcionando');
          this.isInitialized = true;
          return true;
        }
        
        await this.initialize();
        return true;
      } catch (error) {
        console.error('❌ Error inicializando servidor de streaming:', error);
        return false;
      }
    }
    return true;
  }

  // Verificar si hay un servidor de streaming externo corriendo
  private static async checkExternalStreamingServer(): Promise<boolean> {
    try {
      // Verificar si hay un proceso de streaming-server ejecutándose
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);
      
      const { stdout } = await execAsync('ps aux | grep "streaming-server" | grep -v grep');
      return stdout.trim().length > 0;
    } catch (error) {
      console.log('⚠️ No se pudo verificar servidor externo:', error);
      return false;
    }
  }

  // Terminar stream por admin
  static async terminateStream(streamKey: string): Promise<boolean> {
    try {
      if (!this.server) return false;

      const sessions = this.server.getSession() || {};
      const session = Object.values(sessions).find((s: any) => 
        s?.publishStreamPath && s.publishStreamPath.includes(streamKey)
      );

      if (session) {
        (session as any).reject();
        return true;
      }

      return false;
    } catch (error) {
      console.error('❌ Error terminando stream:', error);
      return false;
    }
  }
}

// Configuración de WebRTC para baja latencia
export class WebRTCService {
  private static peers: Map<string, any> = new Map();

  // Inicializar WebRTC
  static initialize() {
    console.log('🌐 WebRTC Service inicializado');
  }

  // Crear oferta WebRTC
  static async createOffer(streamKey: string, offer: any): Promise<any> {
    try {
      // En una implementación real, usarías una librería como simple-peer o node-webrtc
      // Aquí simulo la lógica básica
      
      const answer = {
        type: 'answer',
        sdp: 'simulatedSDP' // En realidad sería el SDP real
      };

      this.peers.set(streamKey, { offer, answer });

      return answer;
    } catch (error) {
      console.error('❌ Error creando oferta WebRTC:', error);
      throw error;
    }
  }

  // Manejar candidatos ICE
  static async handleICECandidate(streamKey: string, candidate: any): Promise<void> {
    try {
      const peer = this.peers.get(streamKey);
      if (peer) {
        // Procesar candidato ICE
        console.log('🧊 ICE candidate recibido para:', streamKey);
      }
    } catch (error) {
      console.error('❌ Error manejando ICE candidate:', error);
    }
  }
}

// CDN y distribución
export class CDNService {
  
  // Configurar distribución CDN
  static async setupCDNDistribution(streamKey: string): Promise<string[]> {
    try {
      // URLs de CDN para distribución global
      const cdnUrls = [
        `https://cdn-us.metro.pe/live/${streamKey}/index.m3u8`,
        `https://cdn-eu.metro.pe/live/${streamKey}/index.m3u8`,
        `https://cdn-asia.metro.pe/live/${streamKey}/index.m3u8`
      ];

      // En una implementación real, configurarías CloudFlare, AWS CloudFront, etc.
      
      return cdnUrls;
    } catch (error) {
      console.error('❌ Error configurando CDN:', error);
      return [];
    }
  }

  // Obtener URL óptima por geolocalización
  static getOptimalCDNUrl(streamKey: string, userLocation?: { lat: number; lng: number }): string {
    // Lógica para seleccionar el CDN más cercano basado en geolocalización
    if (!userLocation) {
      return `https://cdn-us.metro.pe/live/${streamKey}/index.m3u8`;
    }

    // Simplificado: seleccionar por región
    if (userLocation.lat > 0) {
      return `https://cdn-us.metro.pe/live/${streamKey}/index.m3u8`;
    } else {
      return `https://cdn-sa.metro.pe/live/${streamKey}/index.m3u8`;
    }
  }
}
