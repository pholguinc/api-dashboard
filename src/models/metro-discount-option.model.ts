import mongoose, { Schema, Document } from 'mongoose';

export interface MetroDiscountOptionDocument extends Document {
  discountType: string; // '10_percent', '20_percent', etc.
  discountValue: number; // Porcentaje de descuento
  pointsRequired: number; // Puntos necesarios para canjear
  cantidad_disponible: number; // Cantidad disponible para canje
  fecha_expiracion: Date; // Fecha límite para canjear
  premiumOnly: boolean; // Solo para usuarios Premium
  enabled: boolean; // Activo/Inactivo
  description: string; // Descripción del descuento
  estimatedSavings: {
    single: number;
    roundTrip: number;
    monthlyPass: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const MetroDiscountOptionSchema = new Schema<MetroDiscountOptionDocument>(
  {
    discountType: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: false
    },
    discountValue: {
      type: Number,
      required: true,
      min: 1,
      max: 100,
      validate: {
        validator: function(value: number) {
          return value >= 1 && value <= 100;
        },
        message: 'El valor de descuento debe estar entre 1 y 100'
      }
    },
    pointsRequired: {
      type: Number,
      required: true,
      min: 1
    },
    cantidad_disponible: {
      type: Number,
      required: true,
      min: 0,
      default: 0
    },
    fecha_expiracion: {
      type: Date,
      required: true,
      validate: {
        validator: function(value: Date) {
          return value > new Date();
        },
        message: 'La fecha de expiración debe ser futura'
      }
    },
    premiumOnly: {
      type: Boolean,
      default: false
    },
    enabled: {
      type: Boolean,
      default: true
    },
    description: {
      type: String,
      required: true,
      maxlength: 200,
      trim: true
    },
    estimatedSavings: {
      single: {
        type: Number,
        required: true,
        min: 0
      },
      roundTrip: {
        type: Number,
        required: true,
        min: 0
      },
      monthlyPass: {
        type: Number,
        required: true,
        min: 0
      }
    }
  },
  {
    timestamps: true
  }
);

// Índices para optimizar consultas
MetroDiscountOptionSchema.index({ enabled: 1, fecha_expiracion: 1 });
MetroDiscountOptionSchema.index({ premiumOnly: 1, enabled: 1 });
MetroDiscountOptionSchema.index({ discountType: 1 });

export const MetroDiscountOptionModel = mongoose.model<MetroDiscountOptionDocument>('MetroDiscountOption', MetroDiscountOptionSchema);