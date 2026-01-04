import mongoose, { Schema, Document } from 'mongoose';

export interface DailyPointsDocument extends Document {
  userId: mongoose.Types.ObjectId;
  date: Date; // Solo fecha (sin hora)
  pointsType: 'premium_daily' | 'free_daily' | 'bonus' | 'streak';
  pointsAmount: number;
  claimed: boolean;
  claimedAt?: Date;
  streakCount?: number; // Para bonos por días consecutivos
  metadata: {
    isPremium: boolean;
    autoAwarded?: boolean;
    bonusReason?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const DailyPointsSchema = new Schema<DailyPointsDocument>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    date: {
      type: Date,
      required: true,
      index: true
    },
    pointsType: {
      type: String,
      enum: ['premium_daily', 'free_daily', 'bonus', 'streak'],
      required: true,
      default: 'free_daily'
    },
    pointsAmount: {
      type: Number,
      required: true,
      min: 0
    },
    claimed: {
      type: Boolean,
      required: true,
      default: false
    },
    claimedAt: {
      type: Date
    },
    streakCount: {
      type: Number,
      min: 1
    },
    metadata: {
      isPremium: { type: Boolean, required: true },
      autoAwarded: { type: Boolean, default: false },
      bonusReason: String
    }
  },
  {
    timestamps: true,
    collection: 'daily_points'
  }
);

// Índices compuestos
DailyPointsSchema.index({ userId: 1, date: 1 }, { unique: true });
DailyPointsSchema.index({ date: 1, claimed: 1 });

export const DailyPointsModel = mongoose.model<DailyPointsDocument>('DailyPoints', DailyPointsSchema);

// Configuración de puntos diarios
export const DAILY_POINTS_CONFIG = {
  free: {
    amount: 10,
    description: 'Puntos diarios básicos'
  },
  premium: {
    amount: 50,
    description: 'Puntos diarios Premium'
  },
  streak: {
    bonus: 5, // Puntos extra por día consecutivo
    maxBonus: 25, // Máximo bonus por streak
    description: 'Bonus por días consecutivos'
  }
};

// Funciones helper
export async function getDailyPointsStatus(userId: string): Promise<{
  canClaim: boolean;
  pointsAvailable: number;
  alreadyClaimed: boolean;
  streakCount: number;
  isPremium: boolean;
}> {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Verificar si el usuario es Premium
    const User = mongoose.model('User');
    const user = await User.findById(userId).select('hasMetroPremium metroPremiumExpiry');
    const isPremium = user?.hasMetroPremium && 
                     user?.metroPremiumExpiry && 
                     user.metroPremiumExpiry > today;

    // Verificar si ya reclamó hoy
    const todayPoints = await DailyPointsModel.findOne({
      userId: new mongoose.Types.ObjectId(userId),
      date: today
    });

    if (todayPoints?.claimed) {
      return {
        canClaim: false,
        pointsAvailable: 0,
        alreadyClaimed: true,
        streakCount: todayPoints.streakCount || 0,
        isPremium
      };
    }

    // Calcular streak
    const streakCount = await calculateStreak(userId);
    const basePoints = isPremium ? DAILY_POINTS_CONFIG.premium.amount : DAILY_POINTS_CONFIG.free.amount;
    const streakBonus = Math.min(streakCount * DAILY_POINTS_CONFIG.streak.bonus, DAILY_POINTS_CONFIG.streak.maxBonus);
    const totalPoints = basePoints + streakBonus;

    return {
      canClaim: true,
      pointsAvailable: totalPoints,
      alreadyClaimed: false,
      streakCount,
      isPremium
    };
  } catch (error) {
    console.error('Error getting daily points status:', error);
    return {
      canClaim: false,
      pointsAvailable: 0,
      alreadyClaimed: false,
      streakCount: 0,
      isPremium: false
    };
  }
}

export async function claimDailyPoints(userId: string): Promise<{
  success: boolean;
  pointsAwarded: number;
  streakCount: number;
  message: string;
}> {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Verificar si ya reclamó hoy
    const existingClaim = await DailyPointsModel.findOne({
      userId: new mongoose.Types.ObjectId(userId),
      date: today,
      claimed: true
    });

    if (existingClaim) {
      return {
        success: false,
        pointsAwarded: 0,
        streakCount: existingClaim.streakCount || 0,
        message: 'Ya reclamaste tus puntos diarios hoy'
      };
    }

    // Obtener estado actual
    const status = await getDailyPointsStatus(userId);
    if (!status.canClaim) {
      return {
        success: false,
        pointsAwarded: 0,
        streakCount: status.streakCount,
        message: 'No puedes reclamar puntos en este momento'
      };
    }

    // Crear o actualizar registro de puntos diarios
    const dailyPoints = await DailyPointsModel.findOneAndUpdate(
      {
        userId: new mongoose.Types.ObjectId(userId),
        date: today
      },
      {
        pointsType: status.isPremium ? 'premium_daily' : 'free_daily',
        pointsAmount: status.pointsAvailable,
        claimed: true,
        claimedAt: new Date(),
        streakCount: status.streakCount,
        metadata: {
          isPremium: status.isPremium,
          autoAwarded: false
        }
      },
      { upsert: true, new: true }
    );

    // Otorgar puntos al usuario
    const PointsService = require('../services/points.service').PointsService;
    await PointsService.awardPoints(
      userId,
      status.isPremium ? 'daily_premium_bonus' : 'daily_login_bonus',
      status.pointsAvailable,
      `Puntos diarios ${status.isPremium ? 'Premium' : 'básicos'}${status.streakCount > 1 ? ` + bonus streak (${status.streakCount} días)` : ''}`,
      {
        dailyPointsId: dailyPoints._id,
        streakCount: status.streakCount,
        isPremium: status.isPremium
      }
    );

    return {
      success: true,
      pointsAwarded: status.pointsAvailable,
      streakCount: status.streakCount,
      message: `¡Reclamaste ${status.pointsAvailable} puntos!${status.streakCount > 1 ? ` (Streak: ${status.streakCount} días)` : ''}`
    };
  } catch (error) {
    console.error('Error claiming daily points:', error);
    return {
      success: false,
      pointsAwarded: 0,
      streakCount: 0,
      message: 'Error al reclamar puntos diarios'
    };
  }
}

async function calculateStreak(userId: string): Promise<number> {
  try {
    const today = new Date();
    let streakCount = 1;
    let checkDate = new Date(today);

    // Retroceder día por día para calcular streak
    for (let i = 1; i <= 30; i++) { // Máximo 30 días de streak
      checkDate.setDate(checkDate.getDate() - 1);
      checkDate.setHours(0, 0, 0, 0);

      const dayPoints = await DailyPointsModel.findOne({
        userId: new mongoose.Types.ObjectId(userId),
        date: checkDate,
        claimed: true
      });

      if (dayPoints) {
        streakCount++;
      } else {
        break;
      }
    }

    return streakCount;
  } catch (error) {
    console.error('Error calculating streak:', error);
    return 1;
  }
}

// Función para auto-otorgar puntos (para cron job)
export async function autoAwardDailyPoints() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    console.log('🎯 Iniciando auto-otorgamiento de puntos diarios...');

    // Obtener todos los usuarios Premium activos
    const User = mongoose.model('User');
    const premiumUsers = await User.find({
      hasMetroPremium: true,
      metroPremiumExpiry: { $gt: today },
      isActive: true
    }).select('_id displayName');

    console.log(`👑 Encontrados ${premiumUsers.length} usuarios Premium activos`);

    let awarded = 0;
    for (const user of premiumUsers) {
      try {
        // Verificar si ya recibió puntos hoy
        const existingPoints = await DailyPointsModel.findOne({
          userId: user._id,
          date: today,
          claimed: true
        });

        if (!existingPoints) {
          const result = await claimDailyPoints(user._id.toString());
          if (result.success) {
            awarded++;
            console.log(`✅ ${result.pointsAwarded} puntos otorgados a ${user.displayName}`);
          }
        }
      } catch (error) {
        console.error(`❌ Error otorgando puntos a ${user.displayName}:`, error);
      }
    }

    console.log(`🎉 Auto-otorgamiento completado: ${awarded} usuarios recibieron puntos`);
    return awarded;
  } catch (error) {
    console.error('Error in autoAwardDailyPoints:', error);
    return 0;
  }
}
