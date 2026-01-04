import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { sendOk, sendError } from '../utils/response';
import { PointsManagerService } from '../services/points-manager.service';
import { PointsTrackingModel } from '../models/points-tracking.model';
import { UserModel } from '../models/user.model';
import mongoose from 'mongoose';

export class PointsStatsController {

  /**
   * Obtener estadísticas de puntos del usuario autenticado
   */
  static async getUserPointsStats(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const stats = await PointsManagerService.getPointsStats(userId);
      
      return sendOk(res, {
        stats,
        message: 'Estadísticas de puntos obtenidas'
      });
    } catch (error) {
      console.error('Error getting user points stats:', error);
      return sendError(res, 'Error obteniendo estadísticas', 500);
    }
  }

  /**
   * Obtener historial detallado de puntos del usuario
   */
  static async getUserPointsHistory(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const { page = 1, limit = 20, source, type } = req.query;
      
      const filter: any = { userId: new mongoose.Types.ObjectId(userId) };
      
      if (source) filter.source = source;
      if (type) filter.transactionType = type;

      const skip = (Number(page) - 1) * Number(limit);
      
      const [transactions, total] = await Promise.all([
        PointsTrackingModel.find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(Number(limit))
          .populate('userId', 'displayName phone email'),
        PointsTrackingModel.countDocuments(filter)
      ]);

      return sendOk(res, {
        transactions,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit))
        }
      });
    } catch (error) {
      console.error('Error getting user points history:', error);
      return sendError(res, 'Error obteniendo historial', 500);
    }
  }

  /**
   * Obtener resumen diario de puntos por fuente
   */
  static async getDailySummary(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const dailyStats = await PointsTrackingModel.aggregate([
        {
          $match: {
            userId: new mongoose.Types.ObjectId(userId),
            createdAt: { $gte: today, $lt: tomorrow },
            transactionType: 'earned'
          }
        },
        {
          $group: {
            _id: '$source',
            totalPoints: { $sum: '$pointsAmount' },
            transactionCount: { $sum: 1 },
            lastTransaction: { $max: '$createdAt' }
          }
        }
      ]);

      // Obtener límites actuales del usuario
      const user = await UserModel.findById(userId);
      const dailyLimits = user?.dailyLimits || {};

      const summary = {
        today: dailyStats,
        limits: dailyLimits,
        date: today.toISOString().split('T')[0]
      };

      return sendOk(res, summary);
    } catch (error) {
      console.error('Error getting daily summary:', error);
      return sendError(res, 'Error obteniendo resumen diario', 500);
    }
  }

  /**
   * Obtener estadísticas globales de puntos (solo admin)
   */
  static async getGlobalStats(req: AuthenticatedRequest, res: Response) {
    try {
      // Verificar permisos de admin
      if (!['admin', 'moderator'].includes(req.user!.role)) {
        return sendError(res, 'Acceso denegado', 403);
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const lastWeek = new Date(today);
      lastWeek.setDate(lastWeek.getDate() - 7);

      const [
        totalPointsIssued,
        totalPointsSpent,
        dailyStats,
        weeklyStats,
        topUsers
      ] = await Promise.all([
        // Total de puntos emitidos
        PointsTrackingModel.aggregate([
          { $match: { transactionType: 'earned' } },
          { $group: { _id: null, total: { $sum: '$pointsAmount' } } }
        ]),
        
        // Total de puntos gastados
        PointsTrackingModel.aggregate([
          { $match: { transactionType: 'spent' } },
          { $group: { _id: null, total: { $sum: { $abs: '$pointsAmount' } } } }
        ]),
        
        // Estadísticas de hoy por fuente
        PointsTrackingModel.aggregate([
          {
            $match: {
              createdAt: { $gte: today },
              transactionType: 'earned'
            }
          },
          {
            $group: {
              _id: '$source',
              totalPoints: { $sum: '$pointsAmount' },
              transactionCount: { $sum: 1 }
            }
          }
        ]),
        
        // Estadísticas de la semana
        PointsTrackingModel.aggregate([
          {
            $match: {
              createdAt: { $gte: lastWeek },
              transactionType: 'earned'
            }
          },
          {
            $group: {
              _id: { 
                source: '$source',
                date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }
              },
              totalPoints: { $sum: '$pointsAmount' },
              transactionCount: { $sum: 1 }
            }
          }
        ]),
        
        // Top usuarios por puntos ganados
        UserModel.find({})
          .sort({ totalPointsEarned: -1 })
          .limit(10)
          .select('displayName totalPointsEarned pointsSmart pointsBreakdown')
      ]);

      return sendOk(res, {
        totalIssued: totalPointsIssued[0]?.total || 0,
        totalSpent: totalPointsSpent[0]?.total || 0,
        dailyStats,
        weeklyStats,
        topUsers
      });
    } catch (error) {
      console.error('Error getting global stats:', error);
      return sendError(res, 'Error obteniendo estadísticas globales', 500);
    }
  }
}
