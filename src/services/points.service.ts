import { 
  PointsTransactionModel, 
  PointsConfigModel, 
  UserDailyActionsModel,
  PointsTransactionType 
} from '../models/points.model';
import { UserModel } from '../models/user.model';
import mongoose from 'mongoose';

export class PointsService {
  // Configuración por defecto de puntos
  static async initializePointsConfig() {
    const defaultConfigs = [
      {
        action: 'daily_login',
        pointsAwarded: 10,
        dailyLimit: 1,
        description: 'Puntos por iniciar sesión diariamente',
        multipliers: { premium: 2, weekend: 1.5, special: 1 }
      },
      {
        action: 'watch_ad',
        pointsAwarded: 5,
        dailyLimit: 20,
        cooldownMinutes: 1,
        description: 'Puntos por ver anuncios',
        multipliers: { premium: 1.5, weekend: 1, special: 2 }
      },
      {
        action: 'play_game',
        pointsAwarded: 15,
        dailyLimit: 10,
        cooldownMinutes: 5,
        description: 'Puntos por jugar minijuegos',
        multipliers: { premium: 2, weekend: 1, special: 1 }
      },
      {
        action: 'referral_signup',
        pointsAwarded: 100,
        description: 'Puntos por referir a un nuevo usuario',
        multipliers: { premium: 1, weekend: 1, special: 1.5 }
      },
      {
        action: 'stream_donation_received',
        pointsAwarded: 2,
        description: 'Puntos por recibir donaciones en stream (por cada punto donado)',
        multipliers: { premium: 1, weekend: 1, special: 1 }
      },
      {
        action: 'content_like',
        pointsAwarded: 1,
        dailyLimit: 50,
        description: 'Puntos por dar like a contenido',
        multipliers: { premium: 1, weekend: 1, special: 1 }
      },
      {
        action: 'content_share',
        pointsAwarded: 3,
        dailyLimit: 20,
        description: 'Puntos por compartir contenido',
        multipliers: { premium: 1.5, weekend: 1, special: 1 }
      },
      {
        action: 'metro_usage',
        pointsAwarded: 5,
        dailyLimit: 10,
        description: 'Puntos por usar el metro (detectado por GPS)',
        multipliers: { premium: 1.5, weekend: 1, special: 1 }
      },
      {
        action: 'survey_complete',
        pointsAwarded: 25,
        dailyLimit: 3,
        description: 'Puntos por completar encuestas',
        multipliers: { premium: 1.5, weekend: 1, special: 2 }
      }
    ];

    for (const config of defaultConfigs) {
      await PointsConfigModel.findOneAndUpdate(
        { action: config.action },
        config,
        { upsert: true, new: true }
      );
    }
  }

  // Otorgar puntos a un usuario
  static async awardPoints(
    userId: string,
    type: PointsTransactionType,
    baseAmount: number,
    description: string,
    metadata: any = {}
  ): Promise<{ success: boolean; pointsAwarded: number; newBalance: number; message?: string }> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Obtener configuración de la acción
      const actionKey = type.replace('earned_', '');
      const config = await PointsConfigModel.findOne({ action: actionKey, isActive: true });
      
      if (!config && !type.startsWith('spent_') && !type.includes('admin')) {
        return { success: false, pointsAwarded: 0, newBalance: 0, message: 'Acción no configurada' };
      }

      // Verificar límites diarios si aplica
      if (config?.dailyLimit) {
        const today = new Date().toISOString().split('T')[0];
        const dailyActions = await UserDailyActionsModel.findOne({ userId, date: today });
        
        const actionCount = (dailyActions?.actions as any)?.get(actionKey)?.count || 0;
        if (actionCount >= config.dailyLimit) {
          return { success: false, pointsAwarded: 0, newBalance: 0, message: 'Límite diario alcanzado' };
        }

        // Verificar cooldown
        if (config.cooldownMinutes && (dailyActions?.actions as any)?.get(actionKey)?.lastAction) {
          const lastAction = (dailyActions.actions as any).get(actionKey)!.lastAction;
          const cooldownMs = config.cooldownMinutes * 60 * 1000;
          if (Date.now() - lastAction.getTime() < cooldownMs) {
            return { success: false, pointsAwarded: 0, newBalance: 0, message: 'Cooldown activo' };
          }
        }
      }

      // Calcular puntos finales con multiplicadores
      let finalAmount = baseAmount;
      if (config && type.startsWith('earned_')) {
        finalAmount = config.pointsAwarded;
        
        // Aplicar multiplicadores
        const user = await UserModel.findById(userId);
        if (user?.hasMetroPremium && config.multipliers?.premium) {
          finalAmount *= config.multipliers.premium;
        }
        
        // Multiplicador de fin de semana
        const isWeekend = [0, 6].includes(new Date().getDay());
        if (isWeekend && config.multipliers?.weekend) {
          finalAmount *= config.multipliers.weekend;
        }
        
        // Multiplicador especial (eventos)
        if (metadata.specialEvent && config.multipliers?.special) {
          finalAmount *= config.multipliers.special;
        }
      }

      finalAmount = Math.round(finalAmount);

      // Obtener usuario y actualizar balance
      const user = await UserModel.findById(userId);
      if (!user) {
        throw new Error('Usuario no encontrado');
      }

      const newBalance = Math.max(0, user.pointsSmart + finalAmount);
      
      // Para gastos, verificar que tenga suficientes puntos
      if (finalAmount < 0 && user.pointsSmart < Math.abs(finalAmount)) {
        return { success: false, pointsAwarded: 0, newBalance: user.pointsSmart, message: 'Puntos insuficientes' };
      }

      // Actualizar balance del usuario
      await UserModel.findByIdAndUpdate(
        userId,
        { 
          pointsSmart: newBalance,
          totalPointsEarned: finalAmount > 0 ? user.totalPointsEarned + finalAmount : user.totalPointsEarned
        },
        { session }
      );

      // Crear transacción
      await PointsTransactionModel.create([{
        userId,
        type,
        amount: finalAmount,
        description,
        metadata,
        balanceAfter: newBalance
      }], { session });

      // Actualizar contador diario si es ganancia de puntos
      if (finalAmount > 0 && config) {
        const today = new Date().toISOString().split('T')[0];
        await UserDailyActionsModel.findOneAndUpdate(
          { userId, date: today },
          {
            $inc: { 
              [`actions.${actionKey}.count`]: 1,
              [`actions.${actionKey}.pointsEarned`]: finalAmount,
              totalPointsEarned: finalAmount
            },
            $set: {
              [`actions.${actionKey}.lastAction`]: new Date()
            }
          },
          { upsert: true, new: true, session }
        );
      }

      await session.commitTransaction();

      return {
        success: true,
        pointsAwarded: finalAmount,
        newBalance,
        message: finalAmount > 0 ? `¡Ganaste ${finalAmount} puntos!` : `Gastaste ${Math.abs(finalAmount)} puntos`
      };
    } catch (error) {
      await session.abortTransaction();
      console.error('Error in awardPoints:', error);
      return { success: false, pointsAwarded: 0, newBalance: 0, message: 'Error interno' };
    } finally {
      session.endSession();
    }
  }

  // Obtener historial de puntos
  static async getPointsHistory(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    
    const [transactions, total] = await Promise.all([
      PointsTransactionModel
        .find({ userId, isActive: true })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      PointsTransactionModel.countDocuments({ userId, isActive: true })
    ]);

    return {
      transactions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  // Obtener estadísticas de puntos del usuario
  static async getUserPointsStats(userId: string) {
    const user = await UserModel.findById(userId);
    if (!user) throw new Error('Usuario no encontrado');

    // Estadísticas del mes actual
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const monthlyStats = await PointsTransactionModel.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          createdAt: { $gte: startOfMonth },
          isActive: true
        }
      },
      {
        $group: {
          _id: null,
          totalEarned: { $sum: { $cond: [{ $gt: ['$amount', 0] }, '$amount', 0] } },
          totalSpent: { $sum: { $cond: [{ $lt: ['$amount', 0] }, { $abs: '$amount' }, 0] } },
          transactionCount: { $sum: 1 }
        }
      }
    ]);

    // Top fuentes de puntos
    const topSources = await PointsTransactionModel.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          amount: { $gt: 0 },
          isActive: true
        }
      },
      {
        $group: {
          _id: '$type',
          totalPoints: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { totalPoints: -1 } },
      { $limit: 5 }
    ]);

    return {
      currentBalance: user.pointsSmart,
      totalEarned: user.totalPointsEarned,
      monthly: monthlyStats[0] || { totalEarned: 0, totalSpent: 0, transactionCount: 0 },
      topSources,
      isPremium: user.hasMetroPremium
    };
  }

  // Limpiar puntos expirados
  static async cleanupExpiredPoints() {
    const expiredTransactions = await PointsTransactionModel.find({
      expiresAt: { $lt: new Date() },
      isActive: true,
      amount: { $gt: 0 } // Solo puntos ganados pueden expirar
    });

    for (const transaction of expiredTransactions) {
      await this.awardPoints(
        transaction.userId.toString(),
        'adjustment_admin',
        -transaction.amount,
        `Expiración de puntos: ${transaction.description}`,
        { originalTransactionId: transaction._id }
      );
      
      transaction.isActive = false;
      await transaction.save();
    }

    return expiredTransactions.length;
  }
}

// Funciones de conveniencia para acciones comunes
export const PointsActions = {
  dailyLogin: (userId: string) => 
    PointsService.awardPoints(userId, 'earned_daily_login', 0, 'Inicio de sesión diario'),
  
  watchAd: (userId: string, adId?: string) => 
    PointsService.awardPoints(userId, 'earned_ad_watch', 0, 'Ver anuncio', { adId }),
  
  playGame: (userId: string, gameId: string, score: number) => 
    PointsService.awardPoints(userId, 'earned_game_play', 0, 'Jugar minijuego', { gameId, score }),
  
  referralSignup: (userId: string, referredUserId: string) => 
    PointsService.awardPoints(userId, 'earned_referral', 0, 'Referir usuario', { referredUserId }),
  
  likeContent: (userId: string, contentId: string, contentType: string) => 
    PointsService.awardPoints(userId, 'earned_content_interaction', 0, 'Like a contenido', { contentId, contentType }),
  
  shareContent: (userId: string, contentId: string, platform: string) => 
    PointsService.awardPoints(userId, 'earned_content_interaction', 0, 'Compartir contenido', { contentId, platform }),
  
  useMetro: (userId: string, stationFrom: string, stationTo: string) => 
    PointsService.awardPoints(userId, 'earned_metro_usage', 0, 'Uso del metro', { stationFrom, stationTo }),
  
  completeSurvey: (userId: string, surveyId: string) => 
    PointsService.awardPoints(userId, 'earned_survey', 0, 'Completar encuesta', { surveyId }),
  
  spendOnMarketplace: (userId: string, productId: string, amount: number) => 
    PointsService.awardPoints(userId, 'spent_marketplace_redeem', -amount, 'Canje en marketplace', { productId }),
  
  donateToStream: (userId: string, streamId: string, amount: number) => 
    PointsService.awardPoints(userId, 'spent_stream_donation', -amount, 'Donación a stream', { streamId })
};
