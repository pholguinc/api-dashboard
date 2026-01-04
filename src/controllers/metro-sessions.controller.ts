import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { MetroSessionModel, SessionAttendanceModel } from '../models/metro-session.model';
import { sendOk, sendError } from '../utils/response';

export class MetroSessionsController {
  // Obtener todas las sesiones
  static async getSessions(req: AuthenticatedRequest, res: Response) {
    try {
      const { status, genre, station, page = 1, limit = 20 } = req.query;

      const filters: any = { isPublic: true };
      
      if (status) filters.status = status;
      if (genre) filters.genre = genre;
      if (station) filters['location.stationName'] = new RegExp(station as string, 'i');

      const sessions = await (MetroSessionModel as any).find(filters)
        .sort({ scheduledDate: 1 })
        .limit(Number(limit))
        .skip((Number(page) - 1) * Number(limit));

      const total = await MetroSessionModel.countDocuments(filters);

      return sendOk(res, {
        sessions,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      });
    } catch (error) {
      return sendError(res, 'Error obteniendo sesiones', 500);
    }
  }

  // Obtener sesiones en vivo
  static async getLiveSessions(req: AuthenticatedRequest, res: Response) {
    try {
      const liveSessions = await (MetroSessionModel as any).find({
        status: 'live',
        isPublic: true
      })
      .sort({ 'audience.onlineViewers': -1 })
      .limit(10);

      return sendOk(res, liveSessions);
    } catch (error) {
      return sendError(res, 'Error obteniendo sesiones en vivo', 500);
    }
  }

  // Unirse a una sesión
  static async joinSession(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const { sessionId } = req.params;
      const { attendanceType = 'online' } = req.body;

      const session = await (MetroSessionModel as any).findById(sessionId);
      if (!session) {
        return sendError(res, 'Sesión no encontrada', 404);
      }

      // Verificar si ya está registrado
      const existingAttendance = await (SessionAttendanceModel as any).findOne({
        sessionId,
        userId
      });

      if (existingAttendance) {
        return sendOk(res, {
          message: 'Ya estás registrado en esta sesión',
          attendance: existingAttendance
        });
      }

      // Crear registro de asistencia
      const attendance = new SessionAttendanceModel({
        sessionId,
        userId,
        attendanceType
      });
      await attendance.save();

      // Incrementar contador de asistentes
      const updateField = attendanceType === 'in_person' 
        ? 'audience.actualAttendees' 
        : 'audience.onlineViewers';

      await (MetroSessionModel as any).findByIdAndUpdate(sessionId, {
        $inc: { [updateField]: 1 }
      });

      return sendOk(res, {
        message: 'Te uniste a la sesión exitosamente',
        attendance
      }, 201);
    } catch (error) {
      return sendError(res, 'Error uniéndose a la sesión', 500);
    }
  }

  // ADMIN: Crear sesión musical
  static async createSession(req: AuthenticatedRequest, res: Response) {
    try {
      const sessionData = req.body;
      
      // Generar stream key si es necesario
      if (sessionData.streamingInfo?.isLiveStreamed) {
        sessionData.streamingInfo.streamKey = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      }

      const session = new MetroSessionModel(sessionData);
      await session.save();

      return sendOk(res, session, 201);
    } catch (error) {
      return sendError(res, 'Error creando sesión', 500);
    }
  }

  // ADMIN: Obtener todas las sesiones
  static async getAllSessions(req: AuthenticatedRequest, res: Response) {
    try {
      const { page = 1, limit = 20, status, genre } = req.query;

      const filters: any = {};
      if (status) filters.status = status;
      if (genre) filters.genre = genre;

      const sessions = await (MetroSessionModel as any).find(filters)
        .sort({ scheduledDate: -1 })
        .limit(Number(limit))
        .skip((Number(page) - 1) * Number(limit));

      const total = await MetroSessionModel.countDocuments(filters);

      return sendOk(res, {
        sessions,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      });
    } catch (error) {
      return sendError(res, 'Error obteniendo sesiones', 500);
    }
  }

  // ADMIN: Estadísticas de Metro Sessions
  static async getSessionsStats(req: AuthenticatedRequest, res: Response) {
    try {
      const [
        totalSessions,
        liveSessions,
        completedSessions,
        totalAttendees,
        sessionsByGenre,
        topArtists
      ] = await Promise.all([
        MetroSessionModel.countDocuments(),
        MetroSessionModel.countDocuments({ status: 'live' }),
        MetroSessionModel.countDocuments({ status: 'completed' }),
        SessionAttendanceModel.countDocuments(),
        MetroSessionModel.aggregate([
          { $group: { _id: '$genre', count: { $sum: 1 }, totalAttendees: { $sum: '$audience.actualAttendees' } } },
          { $sort: { count: -1 } }
        ]),
        MetroSessionModel.aggregate([
          { $group: { _id: '$artist.name', sessions: { $sum: 1 }, totalViewers: { $sum: '$audience.onlineViewers' } } },
          { $sort: { sessions: -1 } },
          { $limit: 10 }
        ])
      ]);

      return sendOk(res, {
        totalSessions,
        liveSessions,
        completedSessions,
        scheduledSessions: totalSessions - completedSessions - liveSessions,
        totalAttendees,
        sessionsByGenre,
        topArtists
      });
    } catch (error) {
      return sendError(res, 'Error obteniendo estadísticas', 500);
    }
  }
}
