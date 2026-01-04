import mongoose, { Schema, Document, Model } from 'mongoose';

export type BannerType = 'promotional' | 'informational' | 'event' | 'service' | 'partnership';
export type BannerStatus = 'draft' | 'active' | 'paused' | 'expired';

export interface BannerDocument extends Document {
  title: string;
  subtitle: string;
  description?: string;
  type: BannerType;
  status: BannerStatus;
  
  // Visual elements
  imageUrl: string;
  imageSizes?: {
    mobile?: string;
    tablet?: string;
    desktop?: string;
    square?: string;
    wide?: string;
  };
  backgroundColor: string;
  textColor: string;
  gradient?: {
    colors: string[];
    direction: 'horizontal' | 'vertical' | 'diagonal';
  };
  
  // Action
  actionText?: string;
  actionUrl?: string;
  actionType: 'internal' | 'external' | 'none';
  
  // Targeting and scheduling
  targetAudience?: {
    roles?: string[];
    ageMin?: number;
    ageMax?: number;
    location?: string[];
  };
  
  schedule: {
    startDate: Date;
    endDate: Date;
    timezone: string;
  };
  
  // Metrics
  impressions: number;
  clicks: number;
  
  // Metadata for file information
  metadata?: {
    fileType?: string;
    fileSize?: number;
    originalName?: string;
    isAnimated?: boolean;
  };
  
  // Configuration
  isActive: boolean;
  priority: number;
  displayOrder: number;
  
  // Admin
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const BannerSchema = new Schema<BannerDocument>(
  {
    title: {
      type: String,
      required: true,
      maxlength: 60,
      trim: true,
      index: 'text'
    },
    subtitle: {
      type: String,
      required: true,
      maxlength: 120,
      trim: true,
      index: 'text'
    },
    description: {
      type: String,
      maxlength: 300,
      trim: true
    },
    type: {
      type: String,
      enum: ['promotional', 'informational', 'event', 'service', 'partnership'],
      required: true,
      index: true
    },
    status: {
      type: String,
      enum: ['draft', 'active', 'paused', 'expired'],
      default: 'draft',
      index: true
    },
    
    // Visual elements
    imageUrl: {
      type: String,
      required: true,
      validate: {
        validator: function(v: string) {
          // Aceptar URLs relativas (/uploads/...) o completas (http://...)
          return /^(https?:\/\/.+|\/uploads\/.+)\.(jpg|jpeg|png|gif|webp)$/i.test(v);
        },
        message: 'URL de imagen inválida'
      }
    },
    imageSizes: {
      mobile: String,
      tablet: String,
      desktop: String,
      square: String,
      wide: String
    },
    backgroundColor: {
      type: String,
      required: true,
      validate: {
        validator: function(v: string) {
          return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(v);
        },
        message: 'Color de fondo inválido (usar formato hex #RRGGBB)'
      }
    },
    textColor: {
      type: String,
      required: true,
      validate: {
        validator: function(v: string) {
          return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(v);
        },
        message: 'Color de texto inválido (usar formato hex #RRGGBB)'
      }
    },
    gradient: {
      colors: [{
        type: String,
        validate: {
          validator: function(v: string) {
            return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(v);
          },
          message: 'Color de gradiente inválido'
        }
      }],
      direction: {
        type: String,
        enum: ['horizontal', 'vertical', 'diagonal'],
        default: 'diagonal'
      }
    },
    
    // Action
    actionText: {
      type: String,
      maxlength: 30,
      trim: true
    },
    actionUrl: {
      type: String,
      validate: {
        validator: function(v: string) {
          return !v || /^(https?:\/\/|\/[a-zA-Z])/.test(v);
        },
        message: 'URL de acción inválida'
      }
    },
    actionType: {
      type: String,
      enum: ['internal', 'external', 'none'],
      default: 'none'
    },
    
    // Targeting and scheduling
    targetAudience: {
      roles: [{
        type: String,
        enum: ['user', 'admin', 'moderator']
      }],
      ageMin: {
        type: Number,
        min: 13,
        max: 100
      },
      ageMax: {
        type: Number,
        min: 13,
        max: 100
      },
      location: [String]
    },
    
    schedule: {
      startDate: {
        type: Date,
        required: true,
        index: true
      },
      endDate: {
        type: Date,
        required: true,
        index: true
      },
      timezone: {
        type: String,
        default: 'America/Lima'
      }
    },
    
    // Metrics
    impressions: {
      type: Number,
      default: 0,
      min: 0
    },
    clicks: {
      type: Number,
      default: 0,
      min: 0
    },
    
    // Metadata for file information
    metadata: {
      fileType: { type: String },
      fileSize: { type: Number },
      originalName: { type: String },
      isAnimated: { type: Boolean, default: false }
    },
    
    // Configuration
    isActive: {
      type: Boolean,
      default: true,
      index: true
    },
    priority: {
      type: Number,
      default: 1,
      min: 1,
      max: 10,
      index: true
    },
    displayOrder: {
      type: Number,
      default: 1,
      min: 1,
      index: true
    },
    
    // Admin
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtual para CTR (Click Through Rate)
BannerSchema.virtual('ctr').get(function() {
  if (this.impressions === 0) return 0;
  return ((this.clicks / this.impressions) * 100).toFixed(2);
});

// Virtual para verificar si está actualmente activo
BannerSchema.virtual('isCurrentlyActive').get(function() {
  const now = new Date();
  return this.isActive && 
         this.status === 'active' && 
         this.schedule.startDate <= now && 
         this.schedule.endDate >= now;
});

// Índices compuestos para optimizar consultas
BannerSchema.index({ status: 1, isActive: 1, displayOrder: 1 });
BannerSchema.index({ 'schedule.startDate': 1, 'schedule.endDate': 1 });
BannerSchema.index({ priority: -1, displayOrder: 1 });

// Middleware pre-save para validaciones
BannerSchema.pre('save', function(next) {
  // Validar que endDate sea mayor que startDate
  if (this.schedule.endDate <= this.schedule.startDate) {
    return next(new Error('La fecha de fin debe ser posterior a la fecha de inicio'));
  }
  
  // Validar rango de edad si existe
  if (this.targetAudience?.ageMin && this.targetAudience?.ageMax) {
    if (this.targetAudience.ageMin > this.targetAudience.ageMax) {
      return next(new Error('La edad mínima no puede ser mayor que la edad máxima'));
    }
  }
  
  next();
});

export const BannerModel: Model<BannerDocument> = 
  mongoose.models.Banner || mongoose.model<BannerDocument>('Banner', BannerSchema);

// Modelo para interacciones de banners
export interface BannerInteractionDocument extends Document {
  bannerId: mongoose.Types.ObjectId;
  userId?: mongoose.Types.ObjectId;
  type: 'impression' | 'click';
  metadata: {
    userAgent?: string;
    ip?: string;
    referrer?: string;
    deviceType?: string;
    sessionId?: string;
  };
  timestamp: Date;
}

const BannerInteractionSchema = new Schema<BannerInteractionDocument>(
  {
    bannerId: {
      type: Schema.Types.ObjectId,
      ref: 'Banner',
      required: true,
      index: true
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true
    },
    type: {
      type: String,
      enum: ['impression', 'click'],
      required: true,
      index: true
    },
    metadata: {
      userAgent: String,
      ip: String,
      referrer: String,
      deviceType: String,
      sessionId: String
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
BannerInteractionSchema.index({ bannerId: 1, type: 1, timestamp: -1 });
BannerInteractionSchema.index({ timestamp: -1 });

export const BannerInteractionModel: Model<BannerInteractionDocument> = 
  mongoose.models.BannerInteraction || mongoose.model<BannerInteractionDocument>('BannerInteraction', BannerInteractionSchema);
