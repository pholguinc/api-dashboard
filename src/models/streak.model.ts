import mongoose, { Schema, Document } from 'mongoose';

export interface StreakDocument extends Document {
  userId: mongoose.Types.ObjectId;
  currentStreak: number;
  longestStreak: number;
  lastClaimDate: Date;
  totalDays: number;
  missions: {
    daily: {
      loginCompleted: boolean;
      gameCompleted: boolean;
      adWatched: boolean;
      friendReferred: boolean;
      pointsEarned: number;
    };
    weekly: {
      gamesCompleted: number;
      adsWatched: number;
      friendsReferred: number;
      pointsEarned: number;
    };
  };
  rewards: {
    streakBonus: number;
    missionBonus: number;
    totalEarned: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const StreakSchema = new Schema<StreakDocument>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true
    },
    currentStreak: {
      type: Number,
      required: true,
      default: 0,
      min: 0
    },
    longestStreak: {
      type: Number,
      required: true,
      default: 0,
      min: 0
    },
    lastClaimDate: {
      type: Date,
      index: true
    },
    totalDays: {
      type: Number,
      required: true,
      default: 0,
      min: 0
    },
    missions: {
      daily: {
        loginCompleted: { type: Boolean, default: false },
        gameCompleted: { type: Boolean, default: false },
        adWatched: { type: Boolean, default: false },
        friendReferred: { type: Boolean, default: false },
        pointsEarned: { type: Number, default: 0 }
      },
      weekly: {
        gamesCompleted: { type: Number, default: 0 },
        adsWatched: { type: Number, default: 0 },
        friendsReferred: { type: Number, default: 0 },
        pointsEarned: { type: Number, default: 0 }
      }
    },
    rewards: {
      streakBonus: { type: Number, default: 0 },
      missionBonus: { type: Number, default: 0 },
      totalEarned: { type: Number, default: 0 }
    }
  },
  {
    timestamps: true,
    collection: 'streaks'
  }
);

export const StreakModel = mongoose.model<StreakDocument>('Streak', StreakSchema);

// Configuración de recompensas por rachas
export const STREAK_REWARDS = {
  daily: {
    1: { points: 10, title: "¡Primera racha!" },
    3: { points: 25, title: "3 días seguidos" },
    7: { points: 75, title: "¡Una semana!" },
    14: { points: 200, title: "¡Dos semanas!" },
    30: { points: 500, title: "¡Un mes completo!" },
    60: { points: 1200, title: "¡Dos meses!" },
    100: { points: 2500, title: "¡100 días épicos!" }
  },
  missions: {
    login: { points: 5, title: "Iniciar sesión" },
    game: { points: 50, title: "Completar un juego" },
    ad: { points: 10, title: "Ver un anuncio" },
    referral: { points: 100, title: "Referir un amigo" }
  }
};

// Funciones helper
export async function getStreakStatus(userId: string): Promise<{
  currentStreak: number;
  longestStreak: number;
  canClaimToday: boolean;
  todaysMissions: any;
  nextReward: any;
  totalPointsAvailable: number;
}> {
  try {
    let streak = await StreakModel.findOne({ userId: new mongoose.Types.ObjectId(userId) });
    
    if (!streak) {
      streak = new StreakModel({
        userId: new mongoose.Types.ObjectId(userId),
        currentStreak: 0,
        longestStreak: 0,
        totalDays: 0
      });
      await streak.save();
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const lastClaim = streak.lastClaimDate ? new Date(streak.lastClaimDate) : null;
    lastClaim?.setHours(0, 0, 0, 0);

    // Verificar si puede reclamar hoy
    const canClaimToday = !lastClaim || lastClaim.getTime() !== today.getTime();
    
    // Calcular siguiente recompensa
    const nextStreakDay = streak.currentStreak + 1;
    const nextReward = Object.entries(STREAK_REWARDS.daily)
      .find(([day]) => parseInt(day) > streak.currentStreak);

    // Calcular puntos disponibles por misiones
    const missionPoints = Object.values(STREAK_REWARDS.missions)
      .reduce((sum, mission) => sum + mission.points, 0);

    return {
      currentStreak: streak.currentStreak,
      longestStreak: streak.longestStreak,
      canClaimToday,
      todaysMissions: streak.missions.daily,
      nextReward: nextReward ? {
        day: parseInt(nextReward[0]),
        points: nextReward[1].points,
        title: nextReward[1].title
      } : null,
      totalPointsAvailable: canClaimToday ? missionPoints : 0
    };
  } catch (error) {
    console.error('Error getting streak status:', error);
    return {
      currentStreak: 0,
      longestStreak: 0,
      canClaimToday: false,
      todaysMissions: {},
      nextReward: null,
      totalPointsAvailable: 0
    };
  }
}

export async function updateStreak(userId: string, missionType: 'login' | 'game' | 'ad' | 'referral'): Promise<{
  success: boolean;
  pointsEarned: number;
  newStreak: number;
  missionCompleted: boolean;
}> {
  try {
    let streak = await StreakModel.findOne({ userId: new mongoose.Types.ObjectId(userId) });
    
    if (!streak) {
      streak = new StreakModel({
        userId: new mongoose.Types.ObjectId(userId),
        currentStreak: 0,
        longestStreak: 0,
        totalDays: 0
      });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const lastClaim = streak.lastClaimDate ? new Date(streak.lastClaimDate) : null;
    lastClaim?.setHours(0, 0, 0, 0);

    // Verificar si es un nuevo día
    const isNewDay = !lastClaim || lastClaim.getTime() !== today.getTime();
    
    if (isNewDay) {
      // Verificar si mantuvo la racha (ayer reclamó)
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      if (lastClaim && lastClaim.getTime() === yesterday.getTime()) {
        streak.currentStreak += 1;
      } else if (!lastClaim || lastClaim.getTime() < yesterday.getTime()) {
        streak.currentStreak = 1; // Reiniciar racha
      }
      
      // Actualizar récord
      if (streak.currentStreak > streak.longestStreak) {
        streak.longestStreak = streak.currentStreak;
      }
      
      streak.lastClaimDate = today;
      streak.totalDays += 1;
      
      // Resetear misiones diarias
      streak.missions.daily = {
        loginCompleted: missionType === 'login',
        gameCompleted: missionType === 'game',
        adWatched: missionType === 'ad',
        friendReferred: missionType === 'referral',
        pointsEarned: 0
      };
    }

    // Marcar misión como completada
    const missionField = `missions.daily.${missionType}Completed`;
    const wasCompleted = streak.missions.daily[`${missionType}Completed` as keyof typeof streak.missions.daily];
    
    if (!wasCompleted) {
      (streak.missions.daily as any)[`${missionType}Completed`] = true;
      
      // Otorgar puntos por misión
      const missionPoints = STREAK_REWARDS.missions[missionType].points;
      streak.missions.daily.pointsEarned += missionPoints;
      streak.rewards.missionBonus += missionPoints;
      streak.rewards.totalEarned += missionPoints;
      
      await streak.save();
      
      return {
        success: true,
        pointsEarned: missionPoints,
        newStreak: streak.currentStreak,
        missionCompleted: true
      };
    }

    return {
      success: false,
      pointsEarned: 0,
      newStreak: streak.currentStreak,
      missionCompleted: false
    };
  } catch (error) {
    console.error('Error updating streak:', error);
    return {
      success: false,
      pointsEarned: 0,
      newStreak: 0,
      missionCompleted: false
    };
  }
}
