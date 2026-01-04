import mongoose, { Schema, Document } from 'mongoose';

export interface MetroDiscountDocument extends Document {
  userId: mongoose.Types.ObjectId;
  discountCode: string;
  discountType: 'percentage' | 'fixed_amount';
  discountValue: number; // Porcentaje (0-100) o monto fijo
  pointsUsed: number;
  originalPrice: number;
  finalPrice: number;
  validFrom: Date;
  validUntil: Date;
  isUsed: boolean;
  usedAt?: Date;
  stationFrom?: string;
  stationTo?: string;
  tripType: 'single' | 'round_trip' | 'monthly_pass';
  // Nuevos campos para administración
  cantidad_disponible?: number;
  fecha_expiracion?: Date;
  premiumOnly?: boolean;
  enabled?: boolean;
  description?: string;
  metadata: {
    generatedBy: string;
    campaignId?: string;
    promotionCode?: string;
    operatorId?: string;
    stationUsed?: string;
    usedBy?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const MetroDiscountSchema = new Schema<MetroDiscountDocument>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    discountCode: {
      type: String,
      required: false,
      unique: true,
      uppercase: true,
      minlength: 8,
      maxlength: 12
    },
    discountType: {
      type: String,
      enum: ['percentage', 'fixed_amount'],
      required: true
    },
    discountValue: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: function(value: number) {
          if (this.discountType === 'percentage') {
            return value >= 0 && value <= 100;
          }
          return value >= 0;
        },
        message: 'Valor de descuento inválido'
      }
    },
    pointsUsed: {
      type: Number,
      required: true,
      min: 1
    },
    originalPrice: {
      type: Number,
      required: true,
      min: 0
    },
    finalPrice: {
      type: Number,
      required: true,
      min: 0
    },
    validFrom: {
      type: Date,
      required: true,
      default: Date.now
    },
    validUntil: {
      type: Date,
      required: true,
      validate: {
        validator: function(value: Date) {
          return value > this.validFrom;
        },
        message: 'La fecha de expiración debe ser posterior a la fecha de inicio'
      }
    },
    isUsed: {
      type: Boolean,
      default: false,
      index: true
    },
    usedAt: {
      type: Date,
      validate: {
        validator: function(value: Date | undefined) {
          return !this.isUsed || value !== undefined;
        },
        message: 'La fecha de uso es requerida cuando el descuento está usado'
      }
    },
    stationFrom: {
      type: String,
      enum: [
        'Naranjal', 'UNI', 'Angamos', 'San Borja Sur', 'La Cultura',
        'San Borja Norte', 'Estadio Nacional', 'España', 'Central',
        'Colmena', 'Tacna', 'Jiron de la Union', 'Quilca', 'Dos de Mayo',
        'Miguel Grau', 'Canada', 'Javier Prado', 'Canaval y Moreyra',
        'Aramburú', 'Domingo Orué', 'Angamos Este', 'Ricardo Palma',
        'Benavides', 'Tomás Marsano', 'Balta', 'Plaza de Flores',
        'Parque Industrial', 'Villa El Salvador'
      ]
    },
    stationTo: {
      type: String,
      enum: [
        'Naranjal', 'UNI', 'Angamos', 'San Borja Sur', 'La Cultura',
        'San Borja Norte', 'Estadio Nacional', 'España', 'Central',
        'Colmena', 'Tacna', 'Jiron de la Union', 'Quilca', 'Dos de Mayo',
        'Miguel Grau', 'Canada', 'Javier Prado', 'Canaval y Moreyra',
        'Aramburú', 'Domingo Orué', 'Angamos Este', 'Ricardo Palma',
        'Benavides', 'Tomás Marsano', 'Balta', 'Plaza de Flores',
        'Parque Industrial', 'Villa El Salvador'
      ]
    },
    tripType: {
      type: String,
      enum: ['single', 'round_trip', 'monthly_pass'],
      required: true,
      default: 'single'
    },
    // Nuevos campos para administración
    cantidad_disponible: {
      type: Number,
      min: 0,
      default: null
    },
    fecha_expiracion: {
      type: Date,
      validate: {
        validator: function(value: Date | undefined) {
          return !value || value > new Date();
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
      maxlength: 200
    },
    metadata: {
      generatedBy: {
        type: String,
        required: true,
        default: 'user_points_redemption'
      },
      campaignId: String,
      promotionCode: String
    }
  },
  {
    timestamps: true
  }
);

// Índices para optimizar consultas
MetroDiscountSchema.index({ userId: 1, isUsed: 1 });
// discountCode ya tiene unique: true, no necesita índice adicional
MetroDiscountSchema.index({ validUntil: 1 });
MetroDiscountSchema.index({ createdAt: -1 });

// Middleware para generar código de descuento único
MetroDiscountSchema.pre('save', async function(next) {
  if (this.isNew && !this.discountCode) {
    this.discountCode = await generateUniqueDiscountCode();
  }
  next();
});

// Función para generar código único
async function generateUniqueDiscountCode(): Promise<string> {
  let code: string;
  let exists: boolean;
  
  do {
    code = 'METRO' + Math.random().toString(36).substring(2, 8).toUpperCase();
    const existingDiscount = await mongoose.model('MetroDiscount').findOne({ discountCode: code });
    exists = !!existingDiscount;
  } while (exists);
  
  return code;
}

export const MetroDiscountModel = mongoose.model<MetroDiscountDocument>('MetroDiscount', MetroDiscountSchema);

// Configuración de precios del metro
export const METRO_PRICING = {
  single_trip: {
    regular: 2.50,
    university: 1.25,
    school: 1.00
  },
  round_trip: {
    regular: 5.00,
    university: 2.50,
    school: 2.00
  },
  monthly_pass: {
    regular: 65.00,
    university: 32.50,
    school: 26.00
  }
};

// Configuración de canjes de puntos
export const POINTS_TO_DISCOUNT = {
  '10_percent': { points: 500, discount: 10 },
  '20_percent': { points: 1000, discount: 20 },
  '30_percent': { points: 1500, discount: 30 },
  '50_percent': { points: 2500, discount: 50 },
  'free_trip': { points: 3000, discount: 100 }
};