import mongoose, { Schema, Document } from 'mongoose';

/**
 * Modelo de Cupones Metro Ya
 * Los cupones son creados por el administrador y representan beneficios exclusivos para usuarios Premium
 */

export interface MetroYaCouponDocument extends Document {
  code: string; // Código único del cupón (ej: "VIAJE-GRATIS-2024")
  qrCode: string; // Código QR para mostrar en UI (máx 16 dígitos)
  title: string; // Título del beneficio
  description: string;
  icon: string; // Emoji o ícono
  
  // Métodos de instancia
  isAvailableOn(date?: Date): boolean;
  formatBenefit(): string;
  
  // Tipo de beneficio
  benefitType: 'discount_percentage' | 'discount_fixed' | 'free_trip' | 'points_bonus' | 'custom';
  
  // Configuración del beneficio
  discountPercentage?: number; // 50 para 50%
  discountAmount?: number; // Monto fijo en soles
  pointsBonus?: number; // Puntos extra
  customData?: any; // Datos personalizados para beneficios especiales
  
  // Disponibilidad
  isActive: boolean; // Si el cupón está activo
  validFrom: Date; // Fecha desde cuando es válido
  validUntil?: Date; // Fecha hasta cuando es válido (opcional)
  
  // Restricciones
  maxUsesPerCycle: number; // Cuántas veces se puede usar por ciclo (normalmente 1)
  requiresPremium: boolean; // Si requiere membresía Premium activa (siempre true para Metro Ya)
  
  // Categoría para organización
  category: 'transport' | 'discount' | 'special' | 'bonus';
  
  // Orden de visualización
  displayOrder: number;
  
  // Metadatos
  metadata: {
    createdBy: mongoose.Types.ObjectId; // Admin que lo creó
    totalUses: number; // Total de veces usado
    activeUsers: number; // Usuarios que lo tienen activo
  };
  
  createdAt: Date;
  updatedAt: Date;
}

const MetroYaCouponSchema = new Schema<MetroYaCouponDocument>(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true
    },
    qrCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      maxlength: 16,
      index: true
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      required: true,
      trim: true
    },
    icon: {
      type: String,
      default: '🎫'
    },
    benefitType: {
      type: String,
      enum: ['discount_percentage', 'discount_fixed', 'free_trip', 'points_bonus', 'custom'],
      required: true
    },
    discountPercentage: {
      type: Number,
      min: 0,
      max: 100,
      validate: {
        validator: function(this: MetroYaCouponDocument, v: number) {
          return this.benefitType !== 'discount_percentage' || v !== undefined;
        },
        message: 'Discount percentage is required for discount_percentage type'
      }
    },
    discountAmount: {
      type: Number,
      min: 0,
      validate: {
        validator: function(this: MetroYaCouponDocument, v: number) {
          return this.benefitType !== 'discount_fixed' || v !== undefined;
        },
        message: 'Discount amount is required for discount_fixed type'
      }
    },
    pointsBonus: {
      type: Number,
      min: 0,
      validate: {
        validator: function(this: MetroYaCouponDocument, v: number) {
          return this.benefitType !== 'points_bonus' || v !== undefined;
        },
        message: 'Points bonus is required for points_bonus type'
      }
    },
    customData: {
      type: Schema.Types.Mixed
    },
    isActive: {
      type: Boolean,
      required: true,
      default: true,
      index: true
    },
    validFrom: {
      type: Date,
      required: true,
      default: Date.now
    },
    validUntil: {
      type: Date,
      index: true
    },
    maxUsesPerCycle: {
      type: Number,
      required: true,
      default: 1,
      min: 1
    },
    requiresPremium: {
      type: Boolean,
      required: true,
      default: true
    },
    category: {
      type: String,
      enum: ['transport', 'discount', 'special', 'bonus'],
      required: true,
      default: 'transport'
    },
    displayOrder: {
      type: Number,
      default: 0
    },
    metadata: {
      createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
      },
      totalUses: {
        type: Number,
        default: 0
      },
      activeUsers: {
        type: Number,
        default: 0
      }
    }
  },
  {
    timestamps: true,
    collection: 'metro_ya_coupons'
  }
);

// Índices compuestos
MetroYaCouponSchema.index({ isActive: 1, validFrom: 1, validUntil: 1 });
MetroYaCouponSchema.index({ category: 1, displayOrder: 1 });

// Método para verificar si el cupón está disponible en una fecha específica
MetroYaCouponSchema.methods.isAvailableOn = function(date: Date = new Date()): boolean {
  if (!this.isActive) return false;
  if (date < this.validFrom) return false;
  if (this.validUntil && date > this.validUntil) return false;
  return true;
};

// Middleware pre-save para generar código QR automáticamente
MetroYaCouponSchema.pre('save', function(this: MetroYaCouponDocument, next) {
  // Solo generar si no existe
  if (!this.qrCode) {
    // Generar código alfanumérico de 6 caracteres
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = 'COUPON-';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    this.qrCode = result; // Máximo 13 caracteres (COUPON-XXXXXX)
  }
  next();
});

// Método para formatear el beneficio como texto legible
MetroYaCouponSchema.methods.formatBenefit = function(): string {
  switch (this.benefitType) {
    case 'discount_percentage':
      return `${this.discountPercentage}% de descuento`;
    case 'discount_fixed':
      return `S/. ${this.discountAmount} de descuento`;
    case 'free_trip':
      return 'Viaje gratis';
    case 'points_bonus':
      return `+${this.pointsBonus} puntos extra`;
    case 'custom':
      return this.description;
    default:
      return this.description;
  }
};

export const MetroYaCouponModel = mongoose.model<MetroYaCouponDocument>('MetroYaCoupon', MetroYaCouponSchema);

// Tipos de cupones predefinidos para referencia
export const COUPON_TEMPLATES = {
  VIAJE_GRATIS: {
    title: 'Viaje Gratis',
    description: 'Un viaje completamente gratis en cualquier línea del metro',
    icon: '🎁',
    benefitType: 'free_trip',
    category: 'transport'
  },
  DESCUENTO_50: {
    title: '50% de Descuento',
    description: '50% de descuento en tu próximo viaje',
    icon: '💰',
    benefitType: 'discount_percentage',
    discountPercentage: 50,
    category: 'discount'
  },
  DESCUENTO_30: {
    title: '30% de Descuento',
    description: '30% de descuento en recarga de tarjeta',
    icon: '💳',
    benefitType: 'discount_percentage',
    discountPercentage: 30,
    category: 'discount'
  },
  PUNTOS_EXTRA: {
    title: 'Puntos Extra',
    description: '100 puntos extra al completar viaje',
    icon: '⭐',
    benefitType: 'points_bonus',
    pointsBonus: 100,
    category: 'bonus'
  }
};