import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { AuthenticatedRequest } from '../middleware/auth';
import { getDailyPointsStatus, claimDailyPoints, autoAwardDailyPoints, DAILY_POINTS_CONFIG } from '../models/daily-points.model';
import { sendOk, sendError } from '../utils/response';

export class DailyPointsController {

  // Obtener estado de puntos diarios del usuario
  static async getDailyStatus(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return sendError(res, 'Usuario no autenticado', 401);
      }

      const status = await getDailyPointsStatus(userId);

      return sendOk(res, {
        ...status,
        config: DAILY_POINTS_CONFIG
      });
    } catch (error) {
      console.error('Error getting daily points status:', error);
      return sendError(res, 'Error obteniendo estado de puntos diarios', 500);
    }
  }

  // Reclamar puntos diarios
  static async claimDaily(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return sendError(res, 'Usuario no autenticado', 401);
      }

      const result = await claimDailyPoints(userId);

      if (result.success) {
        return sendOk(res, {
          message: result.message,
          pointsAwarded: result.pointsAwarded,
          streakCount: result.streakCount
        });
      } else {
        return sendError(res, result.message, 400, 'ALREADY_CLAIMED');
      }
    } catch (error) {
      console.error('Error claiming daily points:', error);
      return sendError(res, 'Error reclamando puntos diarios', 500);
    }
  }

  // Auto-otorgar puntos (para cron job) - Solo admin
  static async autoAward(req: AuthenticatedRequest, res: Response) {
    try {
      const awarded = await autoAwardDailyPoints();

      return sendOk(res, {
        message: `Puntos otorgados automáticamente a ${awarded} usuarios Premium`,
        usersAwarded: awarded
      });
    } catch (error) {
      console.error('Error auto-awarding points:', error);
      return sendError(res, 'Error en auto-otorgamiento', 500);
    }
  }

  // Obtener historial de puntos diarios del usuario
  static async getDailyHistory(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const { days = 30 } = req.query;

      if (!userId) {
        return sendError(res, 'Usuario no autenticado', 401);
      }

      const DailyPointsModel = require('../models/daily-points.model').DailyPointsModel;
      
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - Number(days));
      startDate.setHours(0, 0, 0, 0);

      const history = await DailyPointsModel.find({
        userId: new mongoose.Types.ObjectId(userId),
        date: { $gte: startDate }
      }).sort({ date: -1 });

      // Calcular estadísticas
      const totalPoints = history.reduce((sum, entry) => sum + (entry.claimed ? entry.pointsAmount : 0), 0);
      const claimedDays = history.filter(entry => entry.claimed).length;
      const currentStreak = await calculateCurrentStreak(userId);

      return sendOk(res, {
        history,
        stats: {
          totalPoints,
          claimedDays,
          totalDays: Number(days),
          claimRate: ((claimedDays / Number(days)) * 100).toFixed(1),
          currentStreak
        }
      });
    } catch (error) {
      console.error('Error getting daily history:', error);
      return sendError(res, 'Error obteniendo historial', 500);
    }
  }
}

async function calculateCurrentStreak(userId: string): Promise<number> {
  try {
    const DailyPointsModel = require('../models/daily-points.model').DailyPointsModel;
    const today = new Date();
    let streakCount = 0;
    let checkDate = new Date(today);

    // Verificar días consecutivos hacia atrás
    for (let i = 0; i < 30; i++) {
      checkDate.setHours(0, 0, 0, 0);

      const dayPoints = await DailyPointsModel.findOne({
        userId: new mongoose.Types.ObjectId(userId),
        date: checkDate,
        claimed: true
      });

      if (dayPoints) {
        streakCount++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    return streakCount;
  } catch (error) {
    console.error('Error calculating current streak:', error);
    return 0;
  }
}
