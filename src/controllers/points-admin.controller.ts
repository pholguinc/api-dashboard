import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { PointsTrackingModel, getPointsStats, getUserPointsHistory } from '../models/points-tracking.model';
import { UserModel } from '../models/user.model';
import { sendOk, sendError } from '../utils/response';
import mongoose from 'mongoose';

export class PointsAdminController {

  // Obtener estadísticas generales de puntos
  static async getPointsOverview(req: AuthenticatedRequest, res: Response) {
    try {
      const { days = 30 } = req.query;
      
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(days as string));

      const [
        totalEarned,
        totalSpent,
        gamePoints,
        topUsers,
        recentTransactions
      ] = await Promise.all([
        // Total puntos ganados
        PointsTrackingModel.aggregate([
          { $match: { transactionType: 'earned', createdAt: { $gte: startDate } } },
          { $group: { _id: null, total: { $sum: '$pointsAmount' } } }
        ]),
        
        // Total puntos gastados
        PointsTrackingModel.aggregate([
          { $match: { transactionType: 'spent', createdAt: { $gte: startDate } } },
          { $group: { _id: null, total: { $sum: '$pointsAmount' } } }
        ]),
        
        // Puntos por juego
        PointsTrackingModel.aggregate([
          { 
            $match: { 
              source: 'game', 
              transactionType: 'earned',
              createdAt: { $gte: startDate } 
            } 
          },
          {
            $group: {
              _id: '$sourceDetails.gameName',
              totalPoints: { $sum: '$pointsAmount' },
              totalSessions: { $sum: 1 },
              avgPoints: { $avg: '$pointsAmount' }
            }
          },
          { $sort: { totalPoints: -1 } }
        ]),
        
        // Top usuarios por puntos ganados
        PointsTrackingModel.aggregate([
          { $match: { transactionType: 'earned', createdAt: { $gte: startDate } } },
          {
            $group: {
              _id: '$userId',
              totalPoints: { $sum: '$pointsAmount' },
              transactions: { $sum: 1 }
            }
          },
          { $sort: { totalPoints: -1 } },
          { $limit: 10 },
          {
            $lookup: {
              from: 'users',
              localField: '_id',
              foreignField: '_id',
              as: 'user'
            }
          }
        ]),
        
        // Transacciones recientes
        PointsTrackingModel.find({ createdAt: { $gte: startDate } })
          .populate('userId', 'displayName phone')
          .sort({ createdAt: -1 })
          .limit(20)
          .lean()
      ]);

      return sendOk(res, {
        overview: {
          totalEarned: totalEarned[0]?.total || 0,
          totalSpent: totalSpent[0]?.total || 0,
          netBalance: (totalEarned[0]?.total || 0) - (totalSpent[0]?.total || 0),
          period: `${days} días`
        },
        gameStats: gamePoints,
        topUsers: topUsers.map(user => ({
          userId: user._id,
          displayName: user.user[0]?.displayName || 'Usuario eliminado',
          phone: user.user[0]?.phone,
          totalPoints: user.totalPoints,
          transactions: user.transactions
        })),
        recentTransactions: recentTransactions.map(t => ({
          ...t,
          user: t.userId
        }))
      });
    } catch (error) {
      console.error('Error getting points overview:', error);
      return sendError(res, 'Error obteniendo estadísticas', 500);
    }
  }

  // Obtener historial detallado de puntos
  static async getPointsHistory(req: AuthenticatedRequest, res: Response) {
    try {
      const { 
        page = 1, 
        limit = 50, 
        userId, 
        source, 
        transactionType,
        startDate,
        endDate 
      } = req.query;

      const filter: any = {};
      
      if (userId) filter.userId = new mongoose.Types.ObjectId(userId as string);
      if (source) filter.source = source;
      if (transactionType) filter.transactionType = transactionType;
      
      if (startDate && endDate) {
        filter.createdAt = {
          $gte: new Date(startDate as string),
          $lte: new Date(endDate as string)
        };
      }

      const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

      const [transactions, total] = await Promise.all([
        PointsTrackingModel.find(filter)
          .populate('userId', 'displayName phone email')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(parseInt(limit as string))
          .lean(),
        PointsTrackingModel.countDocuments(filter)
      ]);

      return sendOk(res, {
        transactions: transactions.map(t => ({
          ...t,
          user: t.userId
        })),
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total,
          totalPages: Math.ceil(total / parseInt(limit as string))
        }
      });
    } catch (error) {
      console.error('Error getting points history:', error);
      return sendError(res, 'Error obteniendo historial', 500);
    }
  }

  // Obtener estadísticas de un usuario específico
  static async getUserPointsStats(req: AuthenticatedRequest, res: Response) {
    try {
      const { userId } = req.params;
      const { days = 30 } = req.query;

      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return sendError(res, 'ID de usuario inválido', 400);
      }

      const user = await UserModel.findById(userId).select('displayName phone pointsSmart totalPointsEarned gamesPlayed');
      if (!user) {
        return sendError(res, 'Usuario no encontrado', 404);
      }

      const history = await getUserPointsHistory(userId, 1, 100);
      const stats = await getPointsStats(userId, parseInt(days as string));

      // Calcular estadísticas adicionales
      const earnedTransactions = history.transactions.filter(t => t.transactionType === 'earned');
      const spentTransactions = history.transactions.filter(t => t.transactionType === 'spent');
      
      const gameTransactions = earnedTransactions.filter(t => t.source === 'game');
      const totalGamePoints = gameTransactions.reduce((sum, t) => sum + t.pointsAmount, 0);

      return sendOk(res, {
        user: {
          id: user._id,
          displayName: user.displayName,
          phone: user.phone,
          currentBalance: user.pointsSmart,
          totalEarned: user.totalPointsEarned,
          gamesPlayed: user.gamesPlayed
        },
        stats: {
          totalEarned: earnedTransactions.reduce((sum, t) => sum + t.pointsAmount, 0),
          totalSpent: spentTransactions.reduce((sum, t) => sum + t.pointsAmount, 0),
          gamePoints: totalGamePoints,
          transactions: history.transactions.length
        },
        breakdown: stats,
        recentHistory: history.transactions.slice(0, 20)
      });
    } catch (error) {
      console.error('Error getting user points stats:', error);
      return sendError(res, 'Error obteniendo estadísticas del usuario', 500);
    }
  }

  // Exportar historial de puntos
  static async exportPointsHistory(req: AuthenticatedRequest, res: Response) {
    try {
      const { 
        userId, 
        source, 
        transactionType,
        startDate,
        endDate 
      } = req.query;

      const filter: any = {};
      
      if (userId) filter.userId = new mongoose.Types.ObjectId(userId as string);
      if (source) filter.source = source;
      if (transactionType) filter.transactionType = transactionType;
      
      if (startDate && endDate) {
        filter.createdAt = {
          $gte: new Date(startDate as string),
          $lte: new Date(endDate as string)
        };
      }

      const transactions = await PointsTrackingModel.find(filter)
        .populate('userId', 'displayName phone email')
        .sort({ createdAt: -1 })
        .lean();

      // Generar CSV
      const csvHeaders = [
        'Fecha',
        'Usuario',
        'Teléfono',
        'Tipo',
        'Fuente',
        'Puntos',
        'Balance Antes',
        'Balance Después',
        'Descripción',
        'Juego',
        'Score',
        'Nivel'
      ].join(',');

      const csvRows = transactions.map(t => {
        const user = t.userId as any;
        return [
          new Date(t.createdAt).toLocaleString('es-PE'),
          user?.displayName || 'Usuario eliminado',
          user?.phone || '',
          t.transactionType === 'earned' ? 'Ganado' : 'Gastado',
          t.source,
          t.pointsAmount,
          t.balanceBefore,
          t.balanceAfter,
          t.description,
          t.sourceDetails?.gameName || '',
          t.sourceDetails?.gameScore || '',
          t.sourceDetails?.gameLevel || ''
        ].map(field => `"${field}"`).join(',');
      });

      const csvContent = [csvHeaders, ...csvRows].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="historial-puntos-${new Date().toISOString().split('T')[0]}.csv"`);
      
      return res.send(csvContent);
    } catch (error) {
      console.error('Error exporting points history:', error);
      return sendError(res, 'Error exportando historial', 500);
    }
  }

  // ========== GESTIÓN DE REGLAS DE PUNTOS ==========

  // Obtener todas las reglas de puntos
  static async getAllRules(req: AuthenticatedRequest, res: Response) {
    try {
      const { PointsConfigModel } = await import('../models/points.model');
      
      const rules = await PointsConfigModel.find()
        .sort({ action: 1 })
        .lean();

      return sendOk(res, {
        rules,
        total: rules.length
      });
    } catch (error) {
      console.error('Error getting points rules:', error);
      return sendError(res, 'Error obteniendo reglas', 500);
    }
  }

  // Obtener una regla específica
  static async getRule(req: AuthenticatedRequest, res: Response) {
    try {
      const { ruleId } = req.params;
      const { PointsConfigModel } = await import('../models/points.model');

      if (!mongoose.Types.ObjectId.isValid(ruleId)) {
        return sendError(res, 'ID de regla inválido', 400);
      }

      const rule = await PointsConfigModel.findById(ruleId).lean();

      if (!rule) {
        return sendError(res, 'Regla no encontrada', 404);
      }

      return sendOk(res, rule);
    } catch (error) {
      console.error('Error getting rule:', error);
      return sendError(res, 'Error obteniendo regla', 500);
    }
  }

  // Crear nueva regla
  static async createRule(req: AuthenticatedRequest, res: Response) {
    try {
      const { action, pointsAwarded, dailyLimit, cooldownMinutes, multipliers, description, isActive } = req.body;
      const { PointsConfigModel } = await import('../models/points.model');

      // Verificar que no exista una regla con la misma acción
      const existingRule = await PointsConfigModel.findOne({ action });
      if (existingRule) {
        return sendError(res, 'Ya existe una regla con esa acción', 400);
      }

      const newRule = await PointsConfigModel.create({
        action,
        pointsAwarded,
        dailyLimit,
        cooldownMinutes,
        multipliers: multipliers || {
          premium: 1,
          weekend: 1,
          special: 1
        },
        description,
        isActive: isActive !== undefined ? isActive : true
      });

      return sendOk(res, {
        rule: newRule,
        message: 'Regla creada exitosamente'
      });
    } catch (error) {
      console.error('Error creating rule:', error);
      return sendError(res, 'Error creando regla', 500);
    }
  }

  // Actualizar regla existente
  static async updateRule(req: AuthenticatedRequest, res: Response) {
    try {
      const { ruleId } = req.params;
      const updateData = req.body;
      const { PointsConfigModel } = await import('../models/points.model');

      if (!mongoose.Types.ObjectId.isValid(ruleId)) {
        return sendError(res, 'ID de regla inválido', 400);
      }

      const updatedRule = await PointsConfigModel.findByIdAndUpdate(
        ruleId,
        { $set: updateData },
        { new: true, runValidators: true }
      );

      if (!updatedRule) {
        return sendError(res, 'Regla no encontrada', 404);
      }

      return sendOk(res, {
        rule: updatedRule,
        message: 'Regla actualizada exitosamente'
      });
    } catch (error) {
      console.error('Error updating rule:', error);
      return sendError(res, 'Error actualizando regla', 500);
    }
  }

  // Eliminar regla
  static async deleteRule(req: AuthenticatedRequest, res: Response) {
    try {
      const { ruleId } = req.params;
      const { PointsConfigModel } = await import('../models/points.model');

      if (!mongoose.Types.ObjectId.isValid(ruleId)) {
        return sendError(res, 'ID de regla inválido', 400);
      }

      const deletedRule = await PointsConfigModel.findByIdAndDelete(ruleId);

      if (!deletedRule) {
        return sendError(res, 'Regla no encontrada', 404);
      }

      return sendOk(res, {
        message: 'Regla eliminada exitosamente'
      });
    } catch (error) {
      console.error('Error deleting rule:', error);
      return sendError(res, 'Error eliminando regla', 500);
    }
  }

  // Toggle estado de regla
  static async toggleRuleStatus(req: AuthenticatedRequest, res: Response) {
    try {
      const { ruleId } = req.params;
      const { PointsConfigModel } = await import('../models/points.model');

      if (!mongoose.Types.ObjectId.isValid(ruleId)) {
        return sendError(res, 'ID de regla inválido', 400);
      }

      const rule = await PointsConfigModel.findById(ruleId);

      if (!rule) {
        return sendError(res, 'Regla no encontrada', 404);
      }

      rule.isActive = !rule.isActive;
      await rule.save();

      return sendOk(res, {
        rule,
        message: `Regla ${rule.isActive ? 'activada' : 'desactivada'} exitosamente`
      });
    } catch (error) {
      console.error('Error toggling rule status:', error);
      return sendError(res, 'Error cambiando estado de regla', 500);
    }
  }
}
