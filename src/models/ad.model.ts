import mongoose, { Schema, Document, Model } from 'mongoose';

export type AdType = 'banner' | 'interstitial' | 'video' | 'native' | 'fullscreen';
export type AdStatus = 'draft' | 'active' | 'paused' | 'expired';
export type AdPlacement = 'home_top' | 'home_middle' | 'home_bottom' | 'marketplace' | 'profile' | 'streaming' | 'fullscreen';

export interface AdDocument extends Document {
  title: string;
  description: string;
  type: AdType;
  status: AdStatus;
  placement: AdPlacement;
  imageUrl: string;
  videoUrl?: string;
  clickUrl: string;
  destination?: string;
  impressions: number;
  clicks: number;
  budget: number;
  costPerClick: number;
  targetAudience: {
    ageMin?: number;
    ageMax?: number;
    gender?: 'male' | 'female' | 'all';
    interests?: string[];
    location?: string[];
  };
  schedule: {
    startDate: Date;
    endDate: Date;
    timezone?: string;
  };
  isActive: boolean;
  priority: number;
  advertiser: string;
  duration?: number; // Duración en segundos para anuncios forzados
  skippable?: boolean; // Si se puede saltar o es obligatorio
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const AdSchema = new Schema<AdDocument>(
  {
    title: { 
      type: String, 
      required: true,
      maxlength: 100,
      trim: true
    },
    description: { 
      type: String, 
      required: true,
      maxlength: 500,
      trim: true
    },
    type: { 
      type: String, 
      enum: ['banner', 'interstitial', 'video', 'native', 'fullscreen'], 
      required: true,
      index: true
    },
    status: { 
      type: String, 
      enum: ['draft', 'active', 'paused', 'expired'], 
      required: true,
      index: true
    },
    placement: { 
      type: String, 
      enum: ['home_top', 'home_middle', 'home_bottom', 'marketplace', 'profile', 'streaming', 'fullscreen'],
      required: true,
      index: true
    },
    imageUrl: { 
      type: String, 
      required: true,
      validate: {
        validator: function(v: string) {
          // Aceptar URLs de Unsplash y otras URLs válidas
          return /^https?:\/\/.+/i.test(v);
        },
        message: 'URL de imagen inválida'
      }
    },
    videoUrl: { 
      type: String,
      validate: {
        validator: function(v: string) {
          return !v || /^https?:\/\/.+\.(mp4|webm|ogg)$/i.test(v);
        },
        message: 'URL de video inválida'
      }
    },
    clickUrl: { 
      type: String, 
      required: true,
      validate: {
        validator: function(v: string) {
          return /^https?:\/\/.+/.test(v);
        },
        message: 'URL de destino inválida'
      }
    },
    destination: {
      type: String,
      trim: true,
      maxlength: 200
    },
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
    budget: { 
      type: Number, 
      required: true,
      min: 0
    },
    costPerClick: { 
      type: Number, 
      required: true,
      min: 0
    },
    targetAudience: {
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
      gender: { 
        type: String, 
        enum: ['male', 'female', 'all'], 
        default: 'all' 
      },
      interests: [{ 
        type: String, 
        trim: true 
      }],
      location: [{ 
        type: String, 
        trim: true 
      }]
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
    isActive: { 
      type: Boolean, 
      default: true,
      index: true
    },
    priority: { 
      type: Number, 
      default: 1,
      min: 1,
      max: 10
    },
    advertiser: { 
      type: String, 
      required: true,
      trim: true,
      maxlength: 100
    },
    duration: {
      type: Number,
      default: 30,
      min: 5,
      max: 60
    },
    skippable: {
      type: Boolean,
      default: true
    },
    createdBy: { 
      type: Schema.Types.ObjectId, 
      ref: 'User', 
      required: true,
      index: true
    }
  },
  { 
    timestamps: true,
    toJSON: { 
      virtuals: true,
      transform: function(doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        
        
        return ret;
      }
    },
    toObject: { virtuals: true }
  }
);

// Virtual para CTR (Click Through Rate)
AdSchema.virtual('ctr').get(function() {
  if (this.impressions === 0) return 0;
  return ((this.clicks / this.impressions) * 100).toFixed(2);
});

// Virtual para costo total gastado
AdSchema.virtual('totalSpent').get(function() {
  return (this.clicks * this.costPerClick).toFixed(2);
});

// Virtual para verificar si el anuncio está actualmente en período activo
AdSchema.virtual('isCurrentlyActive').get(function() {
  const now = new Date();
  return this.isActive && 
         this.status === 'active' && 
         this.schedule.startDate <= now && 
         this.schedule.endDate >= now;
});

// Índices compuestos para optimizar consultas
AdSchema.index({ status: 1, placement: 1 });
AdSchema.index({ 'schedule.startDate': 1, 'schedule.endDate': 1 });
AdSchema.index({ isActive: 1, status: 1, priority: -1 });

// Middleware pre-save para validaciones
AdSchema.pre('save', function(next) {
  // Validar que endDate sea mayor que startDate
  if (this.schedule.endDate <= this.schedule.startDate) {
    return next(new Error('La fecha de fin debe ser posterior a la fecha de inicio'));
  }
  
  // Validar rango de edad
  if (this.targetAudience.ageMin && this.targetAudience.ageMax) {
    if (this.targetAudience.ageMin > this.targetAudience.ageMax) {
      return next(new Error('La edad mínima no puede ser mayor que la edad máxima'));
    }
  }
  
  next();
});

export const AdModel: Model<AdDocument> = 
  mongoose.models.Ad || mongoose.model<AdDocument>('Ad', AdSchema);

// Esquema para métricas de anuncios
export interface AdMetricDocument extends Document {
  adId: mongoose.Types.ObjectId;
  userId?: mongoose.Types.ObjectId;
  type: 'impression' | 'click' | 'conversion';
  timestamp: Date;
  metadata: {
    userAgent?: string;
    ip?: string;
    referrer?: string;
    placement?: string;
    deviceType?: string;
  };
}

const AdMetricSchema = new Schema<AdMetricDocument>(
  {
    adId: { 
      type: Schema.Types.ObjectId, 
      ref: 'Ad', 
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
      enum: ['impression', 'click', 'conversion'], 
      required: true,
      index: true
    },
    timestamp: { 
      type: Date, 
      default: Date.now,
      index: true
    },
    metadata: {
      userAgent: String,
      ip: String,
      referrer: String,
      placement: String,
      deviceType: String
    }
  },
  { 
    timestamps: { createdAt: 'timestamp', updatedAt: false }
  }
);

// Índices para métricas
AdMetricSchema.index({ adId: 1, type: 1, timestamp: -1 });
AdMetricSchema.index({ timestamp: -1 });

export const AdMetricModel: Model<AdMetricDocument> = 
  mongoose.models.AdMetric || mongoose.model<AdMetricDocument>('AdMetric', AdMetricSchema);
