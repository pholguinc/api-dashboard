import mongoose, { Schema, Document, Model } from 'mongoose';

export type ClipCategory = 'comedy' | 'music' | 'dance' | 'food' | 'travel' | 'news' | 'sports' | 'education';
export type ClipStatus = 'draft' | 'active' | 'paused' | 'reported' | 'removed';

export interface ClipDocument extends Document {
  title: string;
  description: string;
  category: ClipCategory;
  status: ClipStatus;

  // Video information
  youtubeId: string;
  youtubeUrl: string;
  thumbnailUrl: string;
  duration: number; // in seconds

  // Metadata
  creator: {
    name: string;
    channel: string;
    avatarUrl?: string;
  };

  // Engagement metrics
  views: number;
  likes: number;
  shares: number;
  comments: number;

  // Platform specific
  isVertical: boolean;
  quality: 'low' | 'medium' | 'high' | 'hd';

  // Moderation
  isApproved: boolean;
  moderatedBy?: mongoose.Types.ObjectId;
  moderatedAt?: Date;
  reportCount: number;

  // Scheduling
  publishedAt?: Date;
  expiresAt?: Date;

  // SEO and discovery
  tags: string[];
  hashtags: string[];

  // Admin
  priority: number;
  isFeatured: boolean;
  createdBy: mongoose.Types.ObjectId;

  // Campos para contenido externo
  source: 'internal' | 'tiktok' | 'youtube' | 'instagram';
  externalId?: string;
  isActive: boolean;

  createdAt: Date;
  updatedAt: Date;
}

const ClipSchema = new Schema<ClipDocument>(
  {
    title: {
      type: String,
      required: true,
      maxlength: 100,
      trim: true,
      index: 'text'
    },
    description: {
      type: String,
      required: true,
      maxlength: 500,
      trim: true,
      index: 'text'
    },
    category: {
      type: String,
      enum: ['comedy', 'music', 'dance', 'food', 'travel', 'news', 'sports', 'education'],
      required: true,
      index: true
    },
    status: {
      type: String,
      enum: ['draft', 'active', 'paused', 'reported', 'removed'],
      default: 'draft',
      index: true
    },

    // Video information
    youtubeId: {
      type: String,
      required: true,
      unique: true,
      validate: {
        validator: function (v: string) {
          // Permitir IDs de cualquier longitud para TikToks
          return /^[a-zA-Z0-9_-]+$/.test(v);
        },
        message: 'ID de video inválido'
      }
    },
    youtubeUrl: {
      type: String,
      required: true,
      validate: {
        validator: function (v: string) {
          // Permitir URLs HTTP y HTTPS (para desarrollo local y producción)
          return /^https?:\/\//.test(v);
        },
        message: 'URL de video inválida'
      }
    },
    thumbnailUrl: {
      type: String,
      required: true,
      validate: {
        validator: function (v: string) {
          return /^https?:\/\/.+\.(jpg|jpeg|png|webp)$/i.test(v);
        },
        message: 'URL de thumbnail inválida'
      }
    },
    duration: {
      type: Number,
      required: true,
      min: 1,
      max: 180 // máximo 3 minutos para shorts
    },

    // Metadata
    creator: {
      name: {
        type: String,
        required: true,
        maxlength: 100,
        trim: true
      },
      channel: {
        type: String,
        required: true,
        maxlength: 100,
        trim: true
      },
      avatarUrl: {
        type: String,
        validate: {
          validator: function (v: string) {
            return !v || /^https?:\/\/.+\.(jpg|jpeg|png|webp)$/i.test(v);
          },
          message: 'URL de avatar inválida'
        }
      }
    },

    // Engagement metrics
    views: {
      type: Number,
      default: 0,
      min: 0
    },
    likes: {
      type: Number,
      default: 0,
      min: 0
    },
    shares: {
      type: Number,
      default: 0,
      min: 0
    },
    comments: {
      type: Number,
      default: 0,
      min: 0
    },

    // Platform specific
    isVertical: {
      type: Boolean,
      default: true,
      index: true
    },
    quality: {
      type: String,
      enum: ['low', 'medium', 'high', 'hd'],
      default: 'medium'
    },

    // Moderation
    isApproved: {
      type: Boolean,
      default: false,
      index: true
    },
    moderatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    moderatedAt: {
      type: Date
    },
    reportCount: {
      type: Number,
      default: 0,
      min: 0
    },

    // Scheduling
    publishedAt: {
      type: Date,
      index: true
    },
    expiresAt: {
      type: Date,
      index: true
    },

    // SEO and discovery
    tags: [{
      type: String,
      trim: true,
      maxlength: 50
    }],
    hashtags: [{
      type: String,
      trim: true,
      maxlength: 30,
      validate: {
        validator: function (v: string) {
          return /^[a-zA-Z0-9_áéíóúñÁÉÍÓÚÑ]+$/.test(v);
        },
        message: 'Hashtag inválido'
      }
    }],

    // Admin
    priority: {
      type: Number,
      default: 1,
      min: 1,
      max: 10,
      index: true
    },
    isFeatured: {
      type: Boolean,
      default: false,
      index: true
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },

    // Campos para contenido externo (TikTok, etc.)
    source: {
      type: String,
      enum: ['internal', 'tiktok', 'youtube', 'instagram'],
      default: 'internal',
      index: true
    },
    externalId: {
      type: String,
      sparse: true,
      index: true
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true
    }
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function (doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      }
    },
    toObject: { virtuals: true }
  }
);

// Virtual para engagement rate
ClipSchema.virtual('engagementRate').get(function () {
  if (this.views === 0) return 0;
  return (((this.likes + this.shares + this.comments) / this.views) * 100).toFixed(2);
});

// Virtual para duración formateada
ClipSchema.virtual('formattedDuration').get(function () {
  const minutes = Math.floor(this.duration / 60);
  const seconds = this.duration % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
});

// Virtual para verificar si está activo
ClipSchema.virtual('isCurrentlyActive').get(function () {
  const now = new Date();
  return this.status === 'active' &&
    this.isApproved &&
    (!this.publishedAt || this.publishedAt <= now) &&
    (!this.expiresAt || this.expiresAt >= now);
});

// Índices compuestos para optimizar consultas
ClipSchema.index({ status: 1, isApproved: 1, category: 1 });
ClipSchema.index({ priority: -1, createdAt: -1 });
ClipSchema.index({ views: -1, likes: -1 });
ClipSchema.index({ publishedAt: 1, expiresAt: 1 });
ClipSchema.index({ tags: 1 });
ClipSchema.index({ hashtags: 1 });

// Índice de texto para búsqueda
ClipSchema.index({
  title: 'text',
  description: 'text',
  'creator.name': 'text',
  'creator.channel': 'text',
  tags: 'text'
});

// Middleware pre-save para validaciones
ClipSchema.pre('save', function (next) {
  // Auto-generar publishedAt si no existe y está activo
  if (this.status === 'active' && !this.publishedAt) {
    this.publishedAt = new Date();
  }

  // Limpiar hashtags (remover #)
  if (this.hashtags) {
    this.hashtags = this.hashtags.map(tag => tag.replace('#', '').toLowerCase());
  }

  // Limpiar tags
  if (this.tags) {
    this.tags = this.tags.map(tag => tag.toLowerCase().trim());
  }

  next();
});

export const ClipModel: Model<ClipDocument> =
  mongoose.models.Clip || mongoose.model<ClipDocument>('Clip', ClipSchema);

// Modelo para interacciones de clips
export interface ClipInteractionDocument extends Document {
  clipId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  type: 'view' | 'like' | 'share' | 'comment' | 'report';
  metadata: {
    watchTime?: number; // segundos vistos
    shareDestination?: string; // donde se compartió
    reportReason?: string; // razón del reporte
    deviceType?: string;
    location?: {
      lat: number;
      lon: number;
    };
  };
  timestamp: Date;
}

const ClipInteractionSchema = new Schema<ClipInteractionDocument>(
  {
    clipId: {
      type: Schema.Types.ObjectId,
      ref: 'Clip',
      required: true,
      index: true
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    type: {
      type: String,
      enum: ['view', 'like', 'share', 'comment', 'report'],
      required: true,
      index: true
    },
    metadata: {
      watchTime: Number,
      shareDestination: String,
      reportReason: String,
      deviceType: String,
      location: {
        lat: Number,
        lon: Number
      }
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true
    }
  },
  {
    timestamps: { createdAt: 'timestamp', updatedAt: false }
  }
);

// Índices para métricas
ClipInteractionSchema.index({ clipId: 1, type: 1, timestamp: -1 });
ClipInteractionSchema.index({ userId: 1, type: 1, timestamp: -1 });
ClipInteractionSchema.index({ timestamp: -1 });

// Prevenir múltiples likes del mismo usuario
ClipInteractionSchema.index(
  { clipId: 1, userId: 1, type: 1 },
  {
    unique: true,
    partialFilterExpression: { type: { $in: ['like', 'share'] } }
  }
);

export const ClipInteractionModel: Model<ClipInteractionDocument> =
  mongoose.models.ClipInteraction || mongoose.model<ClipInteractionDocument>('ClipInteraction', ClipInteractionSchema);
