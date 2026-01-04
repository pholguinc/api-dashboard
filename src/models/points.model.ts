import mongoose, { Schema, Document, Model } from 'mongoose';

export type PointsTransactionType = 
  | 'earned_daily_login'
  | 'earned_ad_watch'
  | 'earned_game_play'
  | 'earned_referral'
  | 'earned_stream_donation'
  | 'earned_streaming'
  | 'earned_content_interaction'
  | 'earned_survey'
  | 'earned_promotion'
  | 'earned_metro_usage'
  | 'earned_admin_bonus'
  | 'spent_marketplace_redeem'
  | 'spent_offer_purchase'
  | 'spent_stream_donation'
  | 'spent_metro_discount'
  | 'spent_premium_upgrade'
  | 'spent_stream_donation'
  | 'daily_premium_bonus'
  | 'earned_mission_completion'
  | 'earned_game_completion'
  | 'earned_ad_view'
  | 'earned_referral'
  | 'refund_cancelled_order'
  | 'adjustment_admin';

export interface PointsTransactionDocument extends Document {
  userId: mongoose.Types.ObjectId;
  type: PointsTransactionType;
  amount: number; // Positivo para ganar, negativo para gastar
  description: string;
  metadata?: {
    relatedId?: mongoose.Types.ObjectId; // ID del producto, stream, etc.
    relatedType?: string; // 'product', 'stream', 'ad', etc.
    multiplier?: number; // Para eventos especiales
    source?: string; // Fuente específica del punto
    [key: string]: any;
  };
  balanceAfter: number; // Balance después de la transacción
  expiresAt?: Date; // Para puntos con expiración
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const PointsTransactionSchema = new Schema<PointsTransactionDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { 
      type: String, 
      enum: [
        'earned_daily_login',
        'earned_ad_watch',
        'earned_game_play',
        'earned_referral',
        'earned_stream_donation',
        'earned_content_interaction',
        'earned_survey',
        'earned_promotion',
        'earned_metro_usage',
        'earned_admin_bonus',
        'spent_marketplace_redeem',
        'spent_offer_purchase',
        'spent_premium_upgrade',
        'spent_stream_donation',
        'refund_cancelled_order',
        'adjustment_admin'
      ], 
      required: true, 
      index: true 
    },
    amount: { type: Number, required: true },
    description: { type: String, required: true, maxlength: 200 },
    metadata: {
      relatedId: { type: Schema.Types.ObjectId },
      relatedType: { type: String },
      multiplier: { type: Number, default: 1 },
      source: { type: String },
      type: Object
    },
    balanceAfter: { type: Number, required: true },
    expiresAt: { type: Date },
    isActive: { type: Boolean, default: true, index: true }
  },
  { timestamps: true }
);

// Índices compuestos para consultas frecuentes
PointsTransactionSchema.index({ userId: 1, createdAt: -1 });
PointsTransactionSchema.index({ userId: 1, type: 1, createdAt: -1 });
PointsTransactionSchema.index({ expiresAt: 1, isActive: 1 });

export const PointsTransactionModel: Model<PointsTransactionDocument> =
  mongoose.models.PointsTransaction || mongoose.model<PointsTransactionDocument>('PointsTransaction', PointsTransactionSchema);

// Modelo para configuración de puntos
export interface PointsConfigDocument extends Document {
  action: string;
  pointsAwarded: number;
  dailyLimit?: number;
  cooldownMinutes?: number;
  multipliers?: {
    premium: number;
    weekend: number;
    special: number;
  };
  isActive: boolean;
  description: string;
  createdAt: Date;
  updatedAt: Date;
}

const PointsConfigSchema = new Schema<PointsConfigDocument>(
  {
    action: { type: String, required: true, unique: true },
    pointsAwarded: { type: Number, required: true },
    dailyLimit: { type: Number },
    cooldownMinutes: { type: Number },
    multipliers: {
      premium: { type: Number, default: 1 },
      weekend: { type: Number, default: 1 },
      special: { type: Number, default: 1 }
    },
    isActive: { type: Boolean, default: true },
    description: { type: String, required: true }
  },
  { timestamps: true }
);

export const PointsConfigModel: Model<PointsConfigDocument> =
  mongoose.models.PointsConfig || mongoose.model<PointsConfigDocument>('PointsConfig', PointsConfigSchema);

// Modelo para tracking de acciones diarias
export interface UserDailyActionsDocument extends Document {
  userId: mongoose.Types.ObjectId;
  date: string; // YYYY-MM-DD
  actions: {
    [key: string]: {
      count: number;
      lastAction: Date;
      pointsEarned: number;
    };
  };
  totalPointsEarned: number;
  createdAt: Date;
  updatedAt: Date;
}

const UserDailyActionsSchema = new Schema<UserDailyActionsDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: String, required: true },
    actions: {
      type: Map,
      of: {
        count: { type: Number, default: 0 },
        lastAction: { type: Date, default: Date.now },
        pointsEarned: { type: Number, default: 0 }
      }
    },
    totalPointsEarned: { type: Number, default: 0 }
  },
  { timestamps: true }
);

// Índice compuesto único para evitar duplicados
UserDailyActionsSchema.index({ userId: 1, date: 1 }, { unique: true });

export const UserDailyActionsModel: Model<UserDailyActionsDocument> =
  mongoose.models.UserDailyActions || mongoose.model<UserDailyActionsDocument>('UserDailyActions', UserDailyActionsSchema);
