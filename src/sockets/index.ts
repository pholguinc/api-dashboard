import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { StreamCommentModel } from '../models/stream.model';

const BAD_WORDS = [
  'tonto',
  'estupido',
  'idiota',
  'mierda',
  'carajo',
];

function moderate(text: string): string {
  let result = text;
  for (const w of BAD_WORDS) {
    const re = new RegExp(w, 'gi');
    result = result.replace(re, '***');
  }
  return result;
}

export function configureSockets(io: Server): void {
  io.use((socket, next) => {
    try {
      const token = (socket.handshake.auth as any)?.token as string | undefined;
      if (token) {
        const decoded = jwt.verify(token, env.jwtSecret) as { id: string; role: string };
        (socket.data as any).user = decoded;
        return next();
      }
      return next(new Error('Unauthorized'));
    } catch (err) {
      return next(new Error('Unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    // eslint-disable-next-line no-console
    console.log('Socket connected', socket.id);

    socket.on('joinRoom', (roomId: string) => {
      socket.join(roomId);
      socket.to(roomId).emit('system', `Usuario ${socket.id} se unió`);
    });

    socket.on('leaveRoom', (roomId: string) => {
      socket.leave(roomId);
      socket.to(roomId).emit('system', `Usuario ${socket.id} salió`);
    });

    socket.on('chatMessage', async ({ roomId, message }: { roomId: string; message: string }) => {
      const safe = moderate(message);
      io.to(roomId).emit('chatMessage', { sender: (socket.data as any).user?.id ?? socket.id, message: safe, ts: Date.now() });
      try {
        const userId = (socket.data as any).user?.id;
        if (userId) {
          await new StreamCommentModel({ roomId, userId, message: safe }).save();
        }
      } catch (e) {
        // ignore persistence error
      }
    });

    // WebRTC signaling relay
    socket.on('webrtc:offer', ({ roomId, sdp }: { roomId: string; sdp: any }) => {
      socket.to(roomId).emit('webrtc:offer', { from: socket.id, sdp });
    });

    socket.on('webrtc:answer', ({ roomId, sdp }: { roomId: string; sdp: any }) => {
      socket.to(roomId).emit('webrtc:answer', { from: socket.id, sdp });
    });

    socket.on('webrtc:ice-candidate', ({ roomId, candidate }: { roomId: string; candidate: any }) => {
      socket.to(roomId).emit('webrtc:ice-candidate', { from: socket.id, candidate });
    });

    socket.on('disconnect', () => {
      // eslint-disable-next-line no-console
      console.log('Socket disconnected', socket.id);
    });
  });
}


