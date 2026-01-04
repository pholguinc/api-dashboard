import mongoose, { Schema, Document, Model } from 'mongoose';

export interface UserCustomizationDocument extends Document {
  userId: mongoose.Types.ObjectId;
  customUsername?: string;
  primaryColor?: number; // Color value as int
  secondaryColor?: number;
  accentColor?: number;
  selectedBadgeId?: string;
  profileTheme?: string;
  showAchievements: boolean;
  showStats: boolean;
  customBio?: string;
  lastUpdated: Date;
}

const UserCustomizationSchema = new Schema<UserCustomizationDocument>(
  {
    userId: { 
      type: Schema.Types.ObjectId, 
      ref: 'User', 
      required: true, 
      unique: true,
      index: true 
    },
    customUsername: { 
      type: String, 
      maxlength: 30,
      trim: true,
      // Validación de caracteres permitidos
      validate: {
        validator: function(v: string) {
          return !v || /^[a-zA-Z0-9_\-\.]+$/.test(v);
        },
        message: 'Username solo puede contener letras, números, guiones y puntos'
      }
    },
    primaryColor: { type: Number },
    secondaryColor: { type: Number },
    accentColor: { type: Number },
    selectedBadgeId: { type: String },
    profileTheme: { 
      type: String,
      enum: ['metro_classic', 'underground_neon', 'street_art', 'gaming_rgb', 'premium_gold', 'cyber_blue'],
      default: 'metro_classic'
    },
    showAchievements: { type: Boolean, default: true },
    showStats: { type: Boolean, default: true },
    customBio: { 
      type: String, 
      maxlength: 150,
      trim: true 
    },
    lastUpdated: { type: Date, default: Date.now }
  },
  { 
    timestamps: true,
    collection: 'user_customizations'
  }
);

// Índices para optimización
UserCustomizationSchema.index({ userId: 1 });
UserCustomizationSchema.index({ customUsername: 1 }, { sparse: true });

export const UserCustomizationModel: Model<UserCustomizationDocument> =
  mongoose.models.UserCustomization || 
  mongoose.model<UserCustomizationDocument>('UserCustomization', UserCustomizationSchema);

// Modelo para insignias de usuario
export interface UserBadgeDocument extends Document {
  userId: mongoose.Types.ObjectId;
  badgeId: string;
  badgeName: string;
  badgeType: string; // 'role', 'achievement', 'special', 'seasonal', 'gaming'
  isUnlocked: boolean;
  unlockedAt?: Date;
  rarity: number; // 1-5
  metadata?: Map<string, any>; // Para datos adicionales específicos de cada insignia
}

const UserBadgeSchema = new Schema<UserBadgeDocument>(
  {
    userId: { 
      type: Schema.Types.ObjectId, 
      ref: 'User', 
      required: true,
      index: true 
    },
    badgeId: { 
      type: String, 
      required: true,
      index: true 
    },
    badgeName: { type: String, required: true },
    badgeType: { 
      type: String, 
      enum: ['role', 'achievement', 'special', 'seasonal', 'gaming'],
      required: true 
    },
    isUnlocked: { type: Boolean, default: false },
    unlockedAt: { type: Date },
    rarity: { 
      type: Number, 
      min: 1, 
      max: 5, 
      default: 1 
    },
    metadata: { type: Map, of: Schema.Types.Mixed }
  },
  { 
    timestamps: true,
    collection: 'user_badges'
  }
);

// Índices compuestos
UserBadgeSchema.index({ userId: 1, badgeId: 1 }, { unique: true });
UserBadgeSchema.index({ userId: 1, isUnlocked: 1 });
UserBadgeSchema.index({ badgeType: 1, rarity: -1 });

export const UserBadgeModel: Model<UserBadgeDocument> =
  mongoose.models.UserBadge || 
  mongoose.model<UserBadgeDocument>('UserBadge', UserBadgeSchema);

// Definiciones de insignias predefinidas
export interface BadgeDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  primaryColor: number;
  secondaryColor: number;
  type: string;
  rarity: number;
  requirements: {
    userRole?: string;
    minPoints?: number;
    minGamesPlayed?: number;
    minStreamsWatched?: number;
    minDonationsMade?: number;
    minDaysActive?: number;
    specialCondition?: string;
  };
  isAnimated?: boolean;
  gradientColors?: number[];
}

export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  // Role badges
  {
    id: 'admin_crown',
    name: '👑 Administrador',
    description: 'Administrador principal del sistema',
    icon: 'admin_panel_settings',
    primaryColor: 0xFFFFC107, // Colors.amber
    secondaryColor: 0xFFFF9800, // Colors.orange
    type: 'role',
    rarity: 5,
    requirements: { userRole: 'admin' },
    isAnimated: true,
    gradientColors: [0xFFFFC107, 0xFFFF9800, 0xFFF44336],
  },
  {
    id: 'streamer_live',
    name: '🎬 Metro Streamer',
    description: 'Creador de contenido oficial',
    icon: 'videocam',
    primaryColor: 0xFFF44336, // Colors.red
    secondaryColor: 0xFFE91E63, // Colors.pink
    type: 'role',
    rarity: 4,
    requirements: { userRole: 'metro_streamer' },
    isAnimated: true,
    gradientColors: [0xFFF44336, 0xFFE91E63, 0xFF9C27B0],
  },
  {
    id: 'premium_star',
    name: '⭐ Metro Premium',
    description: 'Usuario Premium con beneficios exclusivos',
    icon: 'star',
    primaryColor: 0xFF9C27B0, // Colors.purple
    secondaryColor: 0xFF673AB7, // Colors.deepPurple
    type: 'role',
    rarity: 3,
    requirements: { userRole: 'premium_user' },
    gradientColors: [0xFF9C27B0, 0xFF673AB7, 0xFF3F51B5],
  },
  {
    id: 'metro_rider',
    name: '🚇 Pasajero Metro',
    description: 'Usuario activo del Metro de Lima',
    icon: 'train',
    primaryColor: 0xFF4CAF50, // Colors.green
    secondaryColor: 0xFF8BC34A, // Colors.lightGreen
    type: 'role',
    rarity: 1,
    requirements: { userRole: 'regular_user' },
    gradientColors: [0xFF4CAF50, 0xFF8BC34A],
  },

  // Achievement badges
  {
    id: 'points_master',
    name: '🌟 Maestro de Puntos',
    description: 'Has acumulado más de 10,000 puntos',
    icon: 'emoji_events',
    primaryColor: 0xFFFFC107, // Colors.amber
    secondaryColor: 0xFFFFEB3B, // Colors.yellow
    type: 'achievement',
    rarity: 4,
    requirements: { minPoints: 10000 },
    isAnimated: true,
  },
  {
    id: 'points_collector',
    name: '💰 Coleccionista',
    description: 'Has acumulado más de 5,000 puntos',
    icon: 'savings',
    primaryColor: 0xFFFF9800, // Colors.orange
    secondaryColor: 0xFFFF5722, // Colors.deepOrange
    type: 'achievement',
    rarity: 3,
    requirements: { minPoints: 5000 },
  },
  {
    id: 'game_master',
    name: '🎮 Maestro Gamer',
    description: 'Has jugado más de 50 partidas',
    icon: 'gamepad',
    primaryColor: 0xFF3F51B5, // Colors.indigo
    secondaryColor: 0xFF2196F3, // Colors.blue
    type: 'gaming',
    rarity: 3,
    requirements: { minGamesPlayed: 50 },
    isAnimated: true,
  },
  {
    id: 'stream_watcher',
    name: '📺 Fanático del Stream',
    description: 'Has visto más de 20 streams',
    icon: 'tv',
    primaryColor: 0xFF9C27B0, // Colors.purple
    secondaryColor: 0xFF673AB7, // Colors.deepPurple
    type: 'achievement',
    rarity: 2,
    requirements: { minStreamsWatched: 20 },
  },
  {
    id: 'generous_donor',
    name: '❤️ Donante Generoso',
    description: 'Has hecho más de 10 donaciones',
    icon: 'favorite',
    primaryColor: 0xFFE91E63, // Colors.pink
    secondaryColor: 0xFFF44336, // Colors.red
    type: 'achievement',
    rarity: 3,
    requirements: { minDonationsMade: 10 },
    isAnimated: true,
  },

  // Special badges
  {
    id: 'early_adopter',
    name: '🏆 Pionero',
    description: 'Usuario desde el primer año',
    icon: 'history',
    primaryColor: 0xFF795548, // Colors.brown
    secondaryColor: 0xFFFF9800, // Colors.orange
    type: 'special',
    rarity: 4,
    requirements: { minDaysActive: 365 },
  },
  {
    id: 'founder_gem',
    name: '💎 Fundador',
    description: 'Usuario fundador de Telemetro',
    icon: 'diamond',
    primaryColor: 0xFF00BCD4, // Colors.cyan
    secondaryColor: 0xFF009688, // Colors.teal
    type: 'special',
    rarity: 5,
    requirements: { specialCondition: 'founder' },
    isAnimated: true,
    gradientColors: [0xFF00BCD4, 0xFF009688, 0xFF4CAF50],
  },

  // Gaming specific badges
  {
    id: 'high_scorer',
    name: '🚀 Puntuación Alta',
    description: 'Has conseguido más de 1000 puntos en un juego',
    icon: 'rocket_launch',
    primaryColor: 0xFFFF5722, // Colors.deepOrange
    secondaryColor: 0xFFF44336, // Colors.red
    type: 'gaming',
    rarity: 3,
    requirements: { specialCondition: 'high_game_score' },
    isAnimated: true,
  },
];
