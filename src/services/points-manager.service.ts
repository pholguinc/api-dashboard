import mongoose from 'mongoose';
import { UserModel } from '../models/user.model';
import { PointsTrackingModel } from '../models/points-tracking.model';

export type PointSource = 'game' | 'ads' | 'referrals' | 'daily' | 'admin';

export interface PointsAwardResult {
  success: boolean;
  pointsAwarded: number;
  newBalance: number;
  sourceBalance: number;
  message: string;
  limitReached?: boolean;
}

export class PointsManagerService {
  // Configuración de límites por fuente
  private static readonly LIMITS = {
    game: { daily: 200, perAction: 50, cooldown: 5 * 60 * 1000 }, // 5 min
    ads: { daily: 100, perAction: 10, cooldown: 30 * 1000 }, // 30 seg
    referrals: { daily: 1000, perAction: 100, cooldown: 0 }, // Sin cooldown
    daily: { daily: 20, perAction: 20, cooldown: 24 * 60 * 60 * 1000 }, // 24h
    admin: { daily: 10000, perAction: 1000, cooldown: 0 } // Sin límites prácticos
  };

  /**
   * Otorga puntos de una fuente específica con validaciones
   */
  static async awardPoints(
    userId: string,
    source: PointSource,
    points: number,
    reason: string,
    metadata: any = {}
  ): Promise<PointsAwardResult> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const user = await UserModel.findById(userId).session(session);
      if (!user) {
        throw new Error('Usuario no encontrado');
      }

      // Inicializar estructuras si no existen
      if (!user.pointsBreakdown) {
        user.pointsBreakdown = {
          game: 0,
          ads: 0,
          referrals: 0,
          daily: 0,
          admin: 0
        };
      }

      if (!user.dailyLimits) {
        user.dailyLimits = {
          game: { earned: 0, limit: 200, lastReset: new Date() },
          ads: { earned: 0, limit: 100, lastReset: new Date() },
          daily: { earned: 0, limit: 20, lastReset: new Date() }
        };
      }

      // Resetear límites diarios si es necesario
      await this.resetDailyLimitsIfNeeded(user);

      // Validar límites
      const validation = this.validatePointsAward(user, source, points);
      if (!validation.valid) {
        await session.abortTransaction();
        return {
          success: false,
          pointsAwarded: 0,
          newBalance: user.pointsSmart,
          sourceBalance: user.pointsBreakdown[source] || 0,
          message: validation.message!,
          limitReached: true
        };
      }

      // Limitar puntos al máximo permitido
      const finalPoints = Math.min(points, this.LIMITS[source].perAction);

      // Actualizar balances
      const newSourceBalance = (user.pointsBreakdown[source] || 0) + finalPoints;
      const newTotalBalance = user.pointsSmart + finalPoints;
      const newTotalEarned = (user.totalPointsEarned || 0) + finalPoints;

      // Actualizar límites diarios (solo para fuentes con límites definidos en el esquema)
      if (source !== 'referrals' && source !== 'admin' && user.dailyLimits[source as keyof typeof user.dailyLimits]) {
        (user.dailyLimits[source as keyof typeof user.dailyLimits] as any).earned += finalPoints;
      }

      // Actualizar usuario
      user.pointsBreakdown[source] = newSourceBalance;
      user.pointsSmart = newTotalBalance;
      user.totalPointsEarned = newTotalEarned;

      await user.save({ session });

      // Crear registro de tracking
      await PointsTrackingModel.create([{
        userId: new mongoose.Types.ObjectId(userId),
        transactionType: 'earned',
        source: source,
        sourceDetails: metadata.sourceDetails || {},
        pointsAmount: finalPoints,
        balanceBefore: user.pointsSmart - finalPoints,
        balanceAfter: newTotalBalance,
        description: reason,
        metadata: {
          ...metadata,
          sourceBalance: {
            before: newSourceBalance - finalPoints,
            after: newSourceBalance
          }
        }
      }], { session });

      await session.commitTransaction();

      return {
        success: true,
        pointsAwarded: finalPoints,
        newBalance: newTotalBalance,
        sourceBalance: newSourceBalance,
        message: `¡+${finalPoints} puntos de ${source}!`
      };

    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Gasta puntos del balance total
   */
  static async spendPoints(
    userId: string,
    points: number,
    reason: string,
    metadata: any = {}
  ): Promise<PointsAwardResult> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const user = await UserModel.findById(userId).session(session);
      if (!user) {
        throw new Error('Usuario no encontrado');
      }

      if (user.pointsSmart < points) {
        await session.abortTransaction();
        return {
          success: false,
          pointsAwarded: 0,
          newBalance: user.pointsSmart,
          sourceBalance: 0,
          message: 'Puntos insuficientes'
        };
      }

      const newBalance = user.pointsSmart - points;
      user.pointsSmart = newBalance;

      await user.save({ session });

      // Crear registro de tracking
      await PointsTrackingModel.create([{
        userId: new mongoose.Types.ObjectId(userId),
        transactionType: 'spent',
        source: 'redemption',
        sourceDetails: metadata.sourceDetails || {},
        pointsAmount: -points,
        balanceBefore: user.pointsSmart + points,
        balanceAfter: newBalance,
        description: reason,
        metadata
      }], { session });

      await session.commitTransaction();

      return {
        success: true,
        pointsAwarded: -points,
        newBalance,
        sourceBalance: 0,
        message: `${points} puntos gastados`
      };

    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Valida si se pueden otorgar puntos
   */
  private static validatePointsAward(user: any, source: PointSource, points: number): { valid: boolean; message?: string } {
    const limits = this.LIMITS[source];
    
    // Validar puntos por acción
    if (points > limits.perAction) {
      return { valid: false, message: `Máximo ${limits.perAction} puntos por acción` };
    }

    // Validar límites diarios (solo para fuentes con límites definidos en el esquema)
    if (source !== 'referrals' && source !== 'admin' && user.dailyLimits[source as keyof typeof user.dailyLimits]) {
      const dailyLimit = user.dailyLimits[source as keyof typeof user.dailyLimits] as any;
      if (dailyLimit.earned + points > dailyLimit.limit) {
        const remaining = dailyLimit.limit - dailyLimit.earned;
        return { 
          valid: false, 
          message: `Límite diario alcanzado. Disponible: ${remaining} puntos` 
        };
      }
    }

    return { valid: true };
  }

  /**
   * Resetea límites diarios si es necesario
   */
  private static async resetDailyLimitsIfNeeded(user: any): Promise<void> {
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    for (const [key, limit] of Object.entries(user.dailyLimits)) {
      const limitData = limit as any;
      const lastReset = new Date(limitData.lastReset).toISOString().split('T')[0];
      
      if (lastReset !== today) {
        limitData.earned = 0;
        limitData.lastReset = now;
      }
    }
  }

  /**
   * Obtiene estadísticas de puntos por fuente
   */
  static async getPointsStats(userId: string): Promise<any> {
    const user = await UserModel.findById(userId);
    if (!user) {
      throw new Error('Usuario no encontrado');
    }

    return {
      total: user.pointsSmart,
      breakdown: user.pointsBreakdown || {
        game: 0,
        ads: 0,
        referrals: 0,
        daily: 0,
        admin: 0
      },
      dailyLimits: user.dailyLimits || {},
      totalEarned: user.totalPointsEarned || 0
    };
  }
}
