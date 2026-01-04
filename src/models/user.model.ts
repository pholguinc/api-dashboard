import mongoose, { Schema, Document, Model } from 'mongoose';

export interface UserDocument extends Document {
  email?: string;
  passwordHash?: string;
  displayName: string;
  avatarUrl?: string;
  role: 'user' | 'admin' | 'moderator' | 'staff' | 'metro_streamer';
  staff?: {
    pinHash?: string;
    lastPinChangeAt?: Date;
    stationDefaultCode?: string;
  };
  pointsSmart: number;
  // Sistema de puntos diferenciados
  pointsBreakdown?: {
    game: number;       // Puntos de juegos
    ads: number;        // Puntos de anuncios  
    referrals: number;  // Puntos de referidos
    daily: number;      // Puntos de login diario
    admin: number;      // Bonus administrativos
  };
  // Límites diarios de puntos
  dailyLimits?: {
    game: { earned: number; limit: number; lastReset: Date };
    ads: { earned: number; limit: number; lastReset: Date };
    daily: { earned: number; limit: number; lastReset: Date };
  };
  phone?: string;
  pinHash?: string;
  pinSetupTokenHash?: string;
  pinSetupExpiresAt?: Date;
  fcmTokens?: string[];
  oauth?: { provider: 'google'; providerId: string; emailVerified?: boolean };
  // Campos de registro completo
  metroUsername?: string;
  fullName?: string;
  dni?: string;
  birthDate?: string; // Formato DDMMYY
  isProfileComplete: boolean;
  // Estado de la cuenta
  isActive?: boolean;
  deactivatedAt?: Date;
  notificationSettings?: any;
  // MetroPremium
  hasMetroPremium?: boolean;
  metroPremiumExpiry?: Date;
  totalPointsEarned?: number;
  gamesPlayed?: number;
  referralsCount?: number;
  referralCode?: string;
  referredBy?: mongoose.Types.ObjectId;
  // Streamer Profile
  streamerProfile?: {
    isVerified?: boolean;
    followers?: number;
    totalStreams?: number;
    totalViewers?: number;
    totalDonations?: number;
    streamingHours?: number;
    averageViewers?: number;
    categories?: string[];
    bio?: string;
    socialLinks?: {
      twitter?: string;
      instagram?: string;
      tiktok?: string;
      youtube?: string;
      twitch?: string;
    };
    monetization?: {
      isEnabled?: boolean;
      donationsEnabled?: boolean;
      subscriptionsEnabled?: boolean;
      pointsPerView?: number;
    };
    isActive?: boolean;
    suspendedAt?: Date;
    suspensionReason?: string;
    streamingEquipment?: {
      camera?: string;
      microphone?: string;
      internet?: string;
    };
    preferredStations?: string[];
    streamingSchedule?: any[];
    verificationReason?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<UserDocument>(
  {
    email: { type: String, required: false, unique: true, sparse: true },
    passwordHash: { type: String, required: false },
    displayName: { type: String, required: true },
    avatarUrl: { type: String },
    role: { type: String, enum: ['user', 'admin', 'moderator', 'staff', 'metro_streamer'], default: 'user', index: true },
    staff: {
      pinHash: { type: String },
      lastPinChangeAt: { type: Date },
      stationDefaultCode: { type: String }
    },
    pointsSmart: { type: Number, default: 0 },
    // Sistema de puntos diferenciados
    pointsBreakdown: {
      game: { type: Number, default: 0 },
      ads: { type: Number, default: 0 },
      referrals: { type: Number, default: 0 },
      daily: { type: Number, default: 0 },
      admin: { type: Number, default: 0 }
    },
    // Límites diarios de puntos
    dailyLimits: {
      game: {
        earned: { type: Number, default: 0 },
        limit: { type: Number, default: 200 },
        lastReset: { type: Date, default: Date.now }
      },
      ads: {
        earned: { type: Number, default: 0 },
        limit: { type: Number, default: 100 },
        lastReset: { type: Date, default: Date.now }
      },
      daily: {
        earned: { type: Number, default: 0 },
        limit: { type: Number, default: 20 },
        lastReset: { type: Date, default: Date.now }
      }
    },
    phone: { type: String, required: false, unique: true, sparse: true, index: true },
    pinHash: { type: String },
    pinSetupTokenHash: { type: String },
    pinSetupExpiresAt: { type: Date },
    fcmTokens: { type: [String], default: [] },
    oauth: {
      provider: { type: String, enum: ['google'] },
      providerId: { type: String },
      emailVerified: { type: Boolean, default: false },
    },
    // Campos de registro completo
    metroUsername: { type: String, unique: true, sparse: true },
    fullName: { type: String },
    dni: { type: String, unique: true, sparse: true },
    birthDate: { type: String }, // Formato DDMMYY
    isProfileComplete: { type: Boolean, default: false },
    // Estado de la cuenta
    isActive: { type: Boolean, default: true, index: true },
    deactivatedAt: { type: Date },
    notificationSettings: { type: Schema.Types.Mixed, default: {} },
    // MetroPremium
    hasMetroPremium: { type: Boolean, default: false },
    metroPremiumExpiry: { type: Date },
    totalPointsEarned: { type: Number, default: 0 },
    gamesPlayed: { type: Number, default: 0 },
    referralsCount: { type: Number, default: 0 },
    referralCode: { type: String, unique: true, sparse: true },
    referredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    // Campos específicos para Metro Streamers
    streamerProfile: {
      isVerified: { type: Boolean, default: false },
      followers: { type: Number, default: 0 },
      totalStreams: { type: Number, default: 0 },
      totalViewers: { type: Number, default: 0 },
      totalDonations: { type: Number, default: 0 },
      streamingHours: { type: Number, default: 0 },
      averageViewers: { type: Number, default: 0 },
      categories: [{ type: String, enum: ['IRL', 'Gaming', 'Music', 'Art', 'Food', 'Tech', 'Dance', 'Freestyle'] }],
      bio: { type: String, default: '' },
      socialLinks: {
        twitter: { type: String, default: '' },
        instagram: { type: String, default: '' },
        tiktok: { type: String, default: '' },
        youtube: { type: String, default: '' },
        twitch: { type: String, default: '' }
      },
      monetization: {
        isEnabled: { type: Boolean, default: false },
        donationsEnabled: { type: Boolean, default: false },
        subscriptionsEnabled: { type: Boolean, default: false },
        pointsPerView: { type: Number, default: 1 }
      },
      isActive: { type: Boolean, default: true },
      suspendedAt: { type: Date },
      suspensionReason: { type: String },
      streamingEquipment: {
        camera: { type: String, default: 'Móvil' },
        microphone: { type: String, default: 'Integrado' },
        internet: { type: String, default: '4G' }
      },
      preferredStations: [{ type: String }],
      streamingSchedule: [{
        day: { type: String, enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] },
        startTime: { type: String },
        endTime: { type: String },
        isActive: { type: Boolean, default: true }
      }]
    },
  },
  { timestamps: true }
);

export const UserModel: Model<UserDocument> = mongoose.models.User || mongoose.model<UserDocument>('User', UserSchema);


