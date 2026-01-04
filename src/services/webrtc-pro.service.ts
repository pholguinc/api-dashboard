import { Server as SocketIOServer } from 'socket.io';
import { createServer } from 'http';
import express from 'express';

interface WebRTCPeer {
  id: string;
  streamKey: string;
  type: 'broadcaster' | 'viewer';
  socket: any;
  peerConnection?: any; // RTCPeerConnection comentado temporalmente
  isConnected: boolean;
  quality: string;
  bandwidth: number;
  latency: number;
  joinedAt: Date;
}

interface StreamRoom {
  streamKey: string;
  broadcaster?: WebRTCPeer;
  viewers: Map<string, WebRTCPeer>;
  createdAt: Date;
  settings: {
    maxViewers: number;
    allowedQualities: string[];
    recordingEnabled: boolean;
    lowLatencyMode: boolean;
  };
}

export class WebRTCProService {
  private static io: SocketIOServer;
  private static rooms: Map<string, StreamRoom> = new Map();
  private static peers: Map<string, WebRTCPeer> = new Map();
  private static server: any;

  // Inicializar servidor WebRTC profesional
  static async initialize(port: number = 9000): Promise<void> {
    try {
      const app = express();
      this.server = createServer(app);
      
      this.io = new SocketIOServer(this.server, {
        cors: {
          origin: "*",
          methods: ["GET", "POST"]
        },
        transports: ['websocket', 'polling']
      });

      this.setupSocketHandlers();

      this.server.listen(port, () => {
        console.log(`🌐 WebRTC Server iniciado en puerto ${port}`);
      });

      // Configurar limpieza periódica
      this.setupCleanupTasks();

    } catch (error) {
      console.error('❌ Error inicializando WebRTC Service:', error);
      throw error;
    }
  }

  // Configurar manejadores de sockets
  private static setupSocketHandlers(): void {
    this.io.on('connection', (socket) => {
      console.log('🔗 Nueva conexión WebRTC:', socket.id);

      // Unirse como broadcaster
      socket.on('join-as-broadcaster', async (data) => {
        await this.handleBroadcasterJoin(socket, data);
      });

      // Unirse como viewer
      socket.on('join-as-viewer', async (data) => {
        await this.handleViewerJoin(socket, data);
      });

      // Manejar oferta WebRTC
      socket.on('webrtc-offer', async (data) => {
        await this.handleWebRTCOffer(socket, data);
      });

      // Manejar respuesta WebRTC
      socket.on('webrtc-answer', async (data) => {
        await this.handleWebRTCAnswer(socket, data);
      });

      // Manejar candidatos ICE
      socket.on('ice-candidate', async (data) => {
        await this.handleICECandidate(socket, data);
      });

      // Cambiar calidad de video
      socket.on('change-quality', async (data) => {
        await this.handleQualityChange(socket, data);
      });

      // Estadísticas en tiempo real
      socket.on('get-stats', () => {
        this.sendStatsUpdate(socket);
      });

      // Desconexión
      socket.on('disconnect', () => {
        this.handleDisconnect(socket);
      });
    });
  }

  // Manejar broadcaster que se une
  private static async handleBroadcasterJoin(socket: any, data: any): Promise<void> {
    try {
      const { streamKey, quality = '1080p' } = data;

      // Verificar que el stream key es válido
      const { StreamingServerService } = await import('./streaming-server.service');
      const isValid = await StreamingServerService.validateStreamKey(streamKey);
      
      if (!isValid) {
        socket.emit('error', { message: 'Stream key inválido' });
        return;
      }

      // Verificar que no hay otro broadcaster activo
      const existingRoom = this.rooms.get(streamKey);
      if (existingRoom?.broadcaster) {
        socket.emit('error', { message: 'Ya hay un broadcaster activo' });
        return;
      }

      // Crear o actualizar room
      const room: StreamRoom = existingRoom || {
        streamKey,
        viewers: new Map(),
        createdAt: new Date(),
        settings: {
          maxViewers: 1000,
          allowedQualities: ['1080p', '720p', '480p', '360p'],
          recordingEnabled: true,
          lowLatencyMode: true
        }
      };

      // Crear peer del broadcaster
      const broadcaster: WebRTCPeer = {
        id: socket.id,
        streamKey,
        type: 'broadcaster',
        socket,
        isConnected: true,
        quality,
        bandwidth: 0,
        latency: 0,
        joinedAt: new Date()
      };

      room.broadcaster = broadcaster;
      this.rooms.set(streamKey, room);
      this.peers.set(socket.id, broadcaster);

      socket.join(streamKey);
      socket.emit('broadcaster-joined', {
        streamKey,
        room: {
          viewerCount: room.viewers.size,
          settings: room.settings
        }
      });

      console.log(`📡 Broadcaster conectado: ${streamKey}`);

    } catch (error) {
      console.error('❌ Error en broadcaster join:', error);
      socket.emit('error', { message: 'Error conectando broadcaster' });
    }
  }

  // Manejar viewer que se une
  private static async handleViewerJoin(socket: any, data: any): Promise<void> {
    try {
      const { streamKey, preferredQuality = 'auto' } = data;

      const room = this.rooms.get(streamKey);
      if (!room || !room.broadcaster) {
        socket.emit('error', { message: 'Stream no disponible' });
        return;
      }

      // Verificar límite de viewers
      if (room.viewers.size >= room.settings.maxViewers) {
        socket.emit('error', { message: 'Stream lleno' });
        return;
      }

      // Determinar calidad óptima
      const optimalQuality = this.determineOptimalQuality(preferredQuality, room.settings.allowedQualities);

      // Crear peer del viewer
      const viewer: WebRTCPeer = {
        id: socket.id,
        streamKey,
        type: 'viewer',
        socket,
        isConnected: true,
        quality: optimalQuality,
        bandwidth: 0,
        latency: 0,
        joinedAt: new Date()
      };

      room.viewers.set(socket.id, viewer);
      this.peers.set(socket.id, viewer);

      socket.join(streamKey);
      socket.emit('viewer-joined', {
        streamKey,
        quality: optimalQuality,
        room: {
          viewerCount: room.viewers.size,
          broadcasterConnected: !!room.broadcaster
        }
      });

      // Notificar al broadcaster sobre nuevo viewer
      room.broadcaster.socket.emit('viewer-count-update', {
        count: room.viewers.size
      });

      console.log(`👁️ Viewer conectado: ${streamKey} (${room.viewers.size} viewers)`);

    } catch (error) {
      console.error('❌ Error en viewer join:', error);
      socket.emit('error', { message: 'Error conectando viewer' });
    }
  }

  // Manejar oferta WebRTC
  private static async handleWebRTCOffer(socket: any, data: any): Promise<void> {
    try {
      const { streamKey, offer, targetPeerId } = data;
      const peer = this.peers.get(socket.id);
      
      if (!peer) {
        socket.emit('error', { message: 'Peer no encontrado' });
        return;
      }

      const room = this.rooms.get(streamKey);
      if (!room) {
        socket.emit('error', { message: 'Room no encontrada' });
        return;
      }

      // Si es broadcaster, enviar oferta a viewer específico o a todos
      if (peer.type === 'broadcaster') {
        if (targetPeerId) {
          const targetViewer = room.viewers.get(targetPeerId);
          if (targetViewer) {
            targetViewer.socket.emit('webrtc-offer', {
              offer,
              broadcasterId: socket.id
            });
          }
        } else {
          // Enviar a todos los viewers
          room.viewers.forEach((viewer) => {
            viewer.socket.emit('webrtc-offer', {
              offer,
              broadcasterId: socket.id
            });
          });
        }
      } else {
        // Si es viewer, enviar oferta al broadcaster
        if (room.broadcaster) {
          room.broadcaster.socket.emit('webrtc-offer', {
            offer,
            viewerId: socket.id
          });
        }
      }

    } catch (error) {
      console.error('❌ Error manejando WebRTC offer:', error);
      socket.emit('error', { message: 'Error en WebRTC offer' });
    }
  }

  // Manejar respuesta WebRTC
  private static async handleWebRTCAnswer(socket: any, data: any): Promise<void> {
    try {
      const { streamKey, answer, targetPeerId } = data;
      const peer = this.peers.get(socket.id);
      
      if (!peer) return;

      const room = this.rooms.get(streamKey);
      if (!room) return;

      // Enviar respuesta al peer objetivo
      if (peer.type === 'viewer' && room.broadcaster) {
        room.broadcaster.socket.emit('webrtc-answer', {
          answer,
          viewerId: socket.id
        });
      } else if (peer.type === 'broadcaster' && targetPeerId) {
        const targetViewer = room.viewers.get(targetPeerId);
        if (targetViewer) {
          targetViewer.socket.emit('webrtc-answer', {
            answer,
            broadcasterId: socket.id
          });
        }
      }

    } catch (error) {
      console.error('❌ Error manejando WebRTC answer:', error);
    }
  }

  // Manejar candidatos ICE
  private static async handleICECandidate(socket: any, data: any): Promise<void> {
    try {
      const { streamKey, candidate, targetPeerId } = data;
      const peer = this.peers.get(socket.id);
      
      if (!peer) return;

      const room = this.rooms.get(streamKey);
      if (!room) return;

      // Reenviar candidato ICE al peer objetivo
      if (peer.type === 'broadcaster') {
        if (targetPeerId) {
          const targetViewer = room.viewers.get(targetPeerId);
          if (targetViewer) {
            targetViewer.socket.emit('ice-candidate', {
              candidate,
              broadcasterId: socket.id
            });
          }
        } else {
          // Enviar a todos los viewers
          room.viewers.forEach((viewer) => {
            viewer.socket.emit('ice-candidate', {
              candidate,
              broadcasterId: socket.id
            });
          });
        }
      } else if (room.broadcaster) {
        room.broadcaster.socket.emit('ice-candidate', {
          candidate,
          viewerId: socket.id
        });
      }

    } catch (error) {
      console.error('❌ Error manejando ICE candidate:', error);
    }
  }

  // Manejar cambio de calidad
  private static async handleQualityChange(socket: any, data: any): Promise<void> {
    try {
      const { quality } = data;
      const peer = this.peers.get(socket.id);
      
      if (!peer || peer.type !== 'viewer') return;

      const room = this.rooms.get(peer.streamKey);
      if (!room || !room.settings.allowedQualities.includes(quality)) return;

      // Actualizar calidad del viewer
      peer.quality = quality;
      
      socket.emit('quality-changed', { quality });

      console.log(`🎬 Calidad cambiada a ${quality} para viewer: ${socket.id}`);

    } catch (error) {
      console.error('❌ Error cambiando calidad:', error);
    }
  }

  // Enviar estadísticas en tiempo real
  private static sendStatsUpdate(socket: any): void {
    const peer = this.peers.get(socket.id);
    if (!peer) return;

    const room = this.rooms.get(peer.streamKey);
    if (!room) return;

    const stats = {
      room: {
        streamKey: room.streamKey,
        viewerCount: room.viewers.size,
        broadcasterConnected: !!room.broadcaster,
        uptime: Date.now() - room.createdAt.getTime()
      },
      peer: {
        id: peer.id,
        type: peer.type,
        quality: peer.quality,
        bandwidth: peer.bandwidth,
        latency: peer.latency,
        connectionTime: Date.now() - peer.joinedAt.getTime()
      },
      server: { isRunning: true, activeStreams: 0, totalViewers: 0 } // StreamingServerService.getServerStats()
    };

    socket.emit('stats-update', stats);
  }

  // Manejar desconexión
  private static handleDisconnect(socket: any): void {
    try {
      const peer = this.peers.get(socket.id);
      if (!peer) return;

      const room = this.rooms.get(peer.streamKey);
      if (!room) return;

      if (peer.type === 'broadcaster') {
        // Broadcaster desconectado - notificar a todos los viewers
        room.viewers.forEach((viewer) => {
          viewer.socket.emit('broadcaster-disconnected');
        });
        
        // Limpiar room
        room.broadcaster = undefined;
        
        // Si no hay viewers, eliminar room
        if (room.viewers.size === 0) {
          this.rooms.delete(peer.streamKey);
        }

        console.log(`📡 Broadcaster desconectado: ${peer.streamKey}`);
      } else {
        // Viewer desconectado
        room.viewers.delete(socket.id);
        
        // Notificar al broadcaster
        if (room.broadcaster) {
          room.broadcaster.socket.emit('viewer-count-update', {
            count: room.viewers.size
          });
        }

        console.log(`👁️ Viewer desconectado: ${peer.streamKey} (${room.viewers.size} viewers restantes)`);
      }

      this.peers.delete(socket.id);

    } catch (error) {
      console.error('❌ Error manejando desconexión:', error);
    }
  }

  // Determinar calidad óptima basada en ancho de banda
  private static determineOptimalQuality(preferred: string, available: string[]): string {
    if (preferred === 'auto') {
      // En una implementación real, detectarías el ancho de banda del usuario
      // Por ahora, usar 720p como predeterminado
      return available.includes('720p') ? '720p' : available[0];
    }

    return available.includes(preferred) ? preferred : available[0];
  }

  // Configurar tareas de limpieza
  private static setupCleanupTasks(): void {
    // Limpiar peers inactivos cada minuto
    setInterval(() => {
      this.cleanupInactivePeers();
    }, 60000);

    // Enviar estadísticas cada 5 segundos
    setInterval(() => {
      this.broadcastStats();
    }, 5000);
  }

  // Limpiar peers inactivos
  private static cleanupInactivePeers(): void {
    const now = Date.now();
    const timeout = 5 * 60 * 1000; // 5 minutos

    this.peers.forEach((peer, peerId) => {
      if (now - peer.joinedAt.getTime() > timeout && !peer.isConnected) {
        this.peers.delete(peerId);
        
        const room = this.rooms.get(peer.streamKey);
        if (room) {
          if (peer.type === 'broadcaster') {
            room.broadcaster = undefined;
          } else {
            room.viewers.delete(peerId);
          }
        }
      }
    });
  }

  // Transmitir estadísticas a todos los peers
  private static broadcastStats(): void {
    this.rooms.forEach((room, streamKey) => {
      const roomStats = {
        streamKey,
        viewerCount: room.viewers.size,
        broadcasterConnected: !!room.broadcaster,
        uptime: Date.now() - room.createdAt.getTime(),
        avgLatency: this.calculateAverageLatency(room),
        totalBandwidth: this.calculateTotalBandwidth(room)
      };

      // Enviar a broadcaster
      if (room.broadcaster) {
        room.broadcaster.socket.emit('room-stats', roomStats);
      }

      // Enviar a viewers (estadísticas simplificadas)
      room.viewers.forEach((viewer) => {
        viewer.socket.emit('viewer-stats', {
          viewerCount: room.viewers.size,
          quality: viewer.quality,
          latency: viewer.latency
        });
      });
    });
  }

  // Calcular latencia promedio
  private static calculateAverageLatency(room: StreamRoom): number {
    let totalLatency = 0;
    let count = 0;

    if (room.broadcaster) {
      totalLatency += room.broadcaster.latency;
      count++;
    }

    room.viewers.forEach((viewer) => {
      totalLatency += viewer.latency;
      count++;
    });

    return count > 0 ? Math.round(totalLatency / count) : 0;
  }

  // Calcular ancho de banda total
  private static calculateTotalBandwidth(room: StreamRoom): number {
    let totalBandwidth = 0;

    if (room.broadcaster) {
      totalBandwidth += room.broadcaster.bandwidth;
    }

    room.viewers.forEach((viewer) => {
      totalBandwidth += viewer.bandwidth;
    });

    return Math.round(totalBandwidth / 1024); // KB/s
  }

  // Obtener estadísticas globales
  static getGlobalStats() {
    const totalRooms = this.rooms.size;
    const totalViewers = Array.from(this.rooms.values()).reduce(
      (sum, room) => sum + room.viewers.size, 0
    );
    const totalBroadcasters = Array.from(this.rooms.values()).filter(
      room => room.broadcaster
    ).length;

    return {
      rooms: totalRooms,
      viewers: totalViewers,
      broadcasters: totalBroadcasters,
      peers: this.peers.size,
      avgLatency: this.calculateGlobalAverageLatency(),
      totalBandwidth: this.calculateGlobalBandwidth()
    };
  }

  // Calcular latencia global promedio
  private static calculateGlobalAverageLatency(): number {
    let totalLatency = 0;
    let count = 0;

    this.peers.forEach((peer) => {
      totalLatency += peer.latency;
      count++;
    });

    return count > 0 ? Math.round(totalLatency / count) : 0;
  }

  // Calcular ancho de banda global
  private static calculateGlobalBandwidth(): number {
    let totalBandwidth = 0;

    this.peers.forEach((peer) => {
      totalBandwidth += peer.bandwidth;
    });

    return Math.round(totalBandwidth / 1024); // KB/s
  }

  // Forzar desconexión de peer (Admin)
  static disconnectPeer(peerId: string): boolean {
    const peer = this.peers.get(peerId);
    if (!peer) return false;

    peer.socket.disconnect(true);
    return true;
  }

  // Cambiar configuración de room (Admin)
  static updateRoomSettings(streamKey: string, settings: any): boolean {
    const room = this.rooms.get(streamKey);
    if (!room) return false;

    room.settings = { ...room.settings, ...settings };
    
    // Notificar cambios a todos los peers
    if (room.broadcaster) {
      room.broadcaster.socket.emit('room-settings-updated', room.settings);
    }

    room.viewers.forEach((viewer) => {
      viewer.socket.emit('room-settings-updated', room.settings);
    });

    return true;
  }
}
