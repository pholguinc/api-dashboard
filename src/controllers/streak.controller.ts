import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { getStreakStatus, updateStreak, STREAK_REWARDS } from '../models/streak.model';
import { PointsService } from '../services/points.service';
import { sendOk, sendError } from '../utils/response';

export class StreakController {

  // Obtener estado de racha del usuario
  static async getStreakStatus(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return sendError(res, 'Usuario no autenticado', 401);
      }

      const status = await getStreakStatus(userId);

      return sendOk(res, {
        ...status,
        rewards: STREAK_REWARDS
      });
    } catch (error) {
      console.error('Error getting streak status:', error);
      return sendError(res, 'Error obteniendo estado de racha', 500);
    }
  }

  // Completar misión
  static async completeMission(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const { missionType } = req.body;

      if (!userId) {
        return sendError(res, 'Usuario no autenticado', 401);
      }

      if (!['login', 'game', 'ad', 'referral'].includes(missionType)) {
        return sendError(res, 'Tipo de misión inválido', 400);
      }

      const result = await updateStreak(userId, missionType);

      if (result.success) {
        // Otorgar puntos al usuario
        await PointsService.awardPoints(
          userId,
          'earned_mission_completion',
          result.pointsEarned,
          `Misión completada: ${STREAK_REWARDS.missions[missionType as keyof typeof STREAK_REWARDS.missions].title}`,
          {
            missionType,
            streakDay: result.newStreak
          }
        );

        return sendOk(res, {
          message: `¡Misión completada! +${result.pointsEarned} puntos`,
          pointsEarned: result.pointsEarned,
          newStreak: result.newStreak,
          missionCompleted: result.missionCompleted
        });
      } else {
        return sendError(res, 'Misión ya completada hoy', 400, 'MISSION_ALREADY_COMPLETED');
      }
    } catch (error) {
      console.error('Error completing mission:', error);
      return sendError(res, 'Error completando misión', 500);
    }
  }

  // Obtener historial de rachas
  static async getStreakHistory(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const { days = 30 } = req.query;

      if (!userId) {
        return sendError(res, 'Usuario no autenticado', 401);
      }

      const StreakModel = require('../models/streak.model').StreakModel;
      
      const streak = await StreakModel.findOne({ 
        userId: new (require('mongoose')).Types.ObjectId(userId) 
      });

      if (!streak) {
        return sendOk(res, {
          history: [],
          stats: {
            totalDays: 0,
            longestStreak: 0,
            currentStreak: 0,
            totalPointsEarned: 0
          }
        });
      }

      return sendOk(res, {
        history: streak,
        stats: {
          totalDays: streak.totalDays,
          longestStreak: streak.longestStreak,
          currentStreak: streak.currentStreak,
          totalPointsEarned: streak.rewards.totalEarned
        }
      });
    } catch (error) {
      console.error('Error getting streak history:', error);
      return sendError(res, 'Error obteniendo historial', 500);
    }
  }
}
