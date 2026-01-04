import mongoose, { Schema, Document } from 'mongoose';

export interface DailyUsageDocument extends Document {
  userId: mongoose.Types.ObjectId;
  date: Date; // Solo fecha (sin hora)
  feature: 'job_search' | 'job_application' | 'microcourse_access' | 'certificate_download' | 'irl_event';
  usageCount: number;
  metadata: {
    details?: any;
    isPremium: boolean;
    limitApplied?: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const DailyUsageSchema = new Schema<DailyUsageDocument>(
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
    feature: {
      type: String,
      enum: ['job_search', 'job_application', 'microcourse_access', 'certificate_download', 'irl_event'],
      required: true,
      index: true
    },
    usageCount: {
      type: Number,
      required: true,
      default: 0,
      min: 0
    },
    metadata: {
      details: Schema.Types.Mixed,
      isPremium: { type: Boolean, required: true },
      limitApplied: Number
    }
  },
  {
    timestamps: true,
    collection: 'daily_usage'
  }
);

// Índices compuestos
DailyUsageSchema.index({ userId: 1, date: 1, feature: 1 }, { unique: true });
DailyUsageSchema.index({ date: 1, feature: 1 });

export const DailyUsageModel = mongoose.model<DailyUsageDocument>('DailyUsage', DailyUsageSchema);

// Funciones helper para gestionar límites
export async function checkDailyLimit(
  userId: string, 
  feature: DailyUsageDocument['feature'], 
  limit: number,
  isPremium: boolean = false
): Promise<{ canUse: boolean; currentUsage: number; limit: number }> {
  try {
    // Si es Premium, sin límites
    if (isPremium) {
      return { canUse: true, currentUsage: 0, limit: -1 };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const usage = await DailyUsageModel.findOne({
      userId: new mongoose.Types.ObjectId(userId),
      date: today,
      feature
    });

    const currentUsage = usage?.usageCount || 0;
    const canUse = currentUsage < limit;

    return { canUse, currentUsage, limit };
  } catch (error) {
    console.error('Error checking daily limit:', error);
    return { canUse: false, currentUsage: 0, limit };
  }
}

export async function incrementUsage(
  userId: string,
  feature: DailyUsageDocument['feature'],
  isPremium: boolean = false,
  details?: any
): Promise<number> {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const result = await DailyUsageModel.findOneAndUpdate(
      {
        userId: new mongoose.Types.ObjectId(userId),
        date: today,
        feature
      },
      {
        $inc: { usageCount: 1 },
        $set: {
          'metadata.isPremium': isPremium,
          'metadata.details': details
        }
      },
      { upsert: true, new: true }
    );

    return result.usageCount;
  } catch (error) {
    console.error('Error incrementing usage:', error);
    throw error;
  }
}

export async function resetDailyUsage(userId: string, feature?: DailyUsageDocument['feature']) {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const filter: any = {
      userId: new mongoose.Types.ObjectId(userId),
      date: today
    };

    if (feature) {
      filter.feature = feature;
    }

    await DailyUsageModel.deleteMany(filter);
  } catch (error) {
    console.error('Error resetting daily usage:', error);
    throw error;
  }
}

// Configuración de límites para usuarios FREE
export const FREE_USER_DAILY_LIMITS = {
  job_search: 5,           // 5 vistas de trabajos por día
  job_application: 2,      // 2 aplicaciones por día
  microcourse_access: 3,   // 3 cursos por día
  certificate_download: 0, // No puede descargar certificados
  irl_event: 0            // No puede acceder a eventos IRL
};
