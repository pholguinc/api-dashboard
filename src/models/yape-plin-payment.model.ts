import mongoose, { Schema, Document, Model } from 'mongoose';

export interface YapePlinPaymentDocument extends Document {
  userId: mongoose.Types.ObjectId;
  subscriptionId: mongoose.Types.ObjectId;
  paymentMethod: 'yape' | 'plin';
  amount: number;
  currency: string;
  status: 'pending' | 'verified' | 'expired' | 'rejected';
  paymentCode: string; // Código único para identificar el pago
  phoneNumber: string; // Número del usuario que debe hacer el pago
  targetNumber: string; // Número de Yape/Plin de Telemetro
  expiresAt: Date;
  paidAt?: Date;
  verifiedBy?: mongoose.Types.ObjectId; // Admin que verificó el pago
  verificationNotes?: string;
  paymentProof?: string; // URL de la imagen de comprobante
  metadata: {
    plan: string;
    originalPrice: number;
    discount: number;
    finalPrice: number;
  };
}

const YapePlinPaymentSchema = new Schema<YapePlinPaymentDocument>(
  {
    userId: { 
      type: Schema.Types.ObjectId, 
      ref: 'User', 
      required: true,
      index: true 
    },
    subscriptionId: { 
      type: Schema.Types.ObjectId, 
      ref: 'PremiumSubscription', 
      required: true 
    },
    paymentMethod: { 
      type: String, 
      enum: ['yape', 'plin'], 
      required: true 
    },
    amount: { 
      type: Number, 
      required: true, 
      min: 0 
    },
    currency: { 
      type: String, 
      default: 'PEN' 
    },
    status: { 
      type: String, 
      enum: ['pending', 'verified', 'expired', 'rejected'], 
      default: 'pending',
      index: true 
    },
    paymentCode: { 
      type: String, 
      required: true, 
      unique: true,
      index: true 
    },
    phoneNumber: { 
      type: String, 
      required: true 
    },
    targetNumber: { 
      type: String, 
      required: true 
    },
    expiresAt: { 
      type: Date, 
      required: true,
      index: true 
    },
    paidAt: { type: Date },
    verifiedBy: { 
      type: Schema.Types.ObjectId, 
      ref: 'User' 
    },
    verificationNotes: { 
      type: String, 
      maxlength: 500 
    },
    paymentProof: { type: String }, // URL de imagen
    metadata: {
      plan: { type: String, required: true },
      originalPrice: { type: Number, required: true },
      discount: { type: Number, default: 0 },
      finalPrice: { type: Number, required: true }
    }
  },
  { 
    timestamps: true,
    collection: 'yape_plin_payments'
  }
);

// Índices para optimización
YapePlinPaymentSchema.index({ userId: 1, status: 1 });
YapePlinPaymentSchema.index({ paymentCode: 1 });
YapePlinPaymentSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index
YapePlinPaymentSchema.index({ createdAt: -1 });

export const YapePlinPaymentModel: Model<YapePlinPaymentDocument> =
  mongoose.models.YapePlinPayment || 
  mongoose.model<YapePlinPaymentDocument>('YapePlinPayment', YapePlinPaymentSchema);

// Configuración de números de pago
export interface PaymentConfigDocument extends Document {
  yapeNumber: string;
  plinNumber: string;
  qrCodeYape?: string; // URL del QR de Yape
  qrCodePlin?: string; // URL del QR de Plin
  isActive: boolean;
  lastUpdated: Date;
  updatedBy: mongoose.Types.ObjectId;
}

const PaymentConfigSchema = new Schema<PaymentConfigDocument>(
  {
    yapeNumber: { 
      type: String, 
      required: true,
      validate: {
        validator: function(v: string) {
          return /^(\+51)?9\d{8}$/.test(v);
        },
        message: 'Número de teléfono peruano inválido'
      }
    },
    plinNumber: { 
      type: String, 
      required: true,
      validate: {
        validator: function(v: string) {
          return /^(\+51)?9\d{8}$/.test(v);
        },
        message: 'Número de teléfono peruano inválido'
      }
    },
    qrCodeYape: { type: String },
    qrCodePlin: { type: String },
    isActive: { type: Boolean, default: true },
    lastUpdated: { type: Date, default: Date.now },
    updatedBy: { 
      type: Schema.Types.ObjectId, 
      ref: 'User', 
      required: true 
    }
  },
  { 
    timestamps: true,
    collection: 'payment_config'
  }
);

export const PaymentConfigModel: Model<PaymentConfigDocument> =
  mongoose.models.PaymentConfig || 
  mongoose.model<PaymentConfigDocument>('PaymentConfig', PaymentConfigSchema);

// Funciones de utilidad para generar códigos de pago
export function generatePaymentCode(): string {
  const timestamp = Date.now().toString();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `METRO-${timestamp.slice(-6)}-${random}`;
}

export function calculateExpirationTime(): Date {
  const expiration = new Date();
  expiration.setMinutes(expiration.getMinutes() + 30); // 30 minutos para pagar
  return expiration;
}

// Configuración por defecto
export const DEFAULT_PAYMENT_CONFIG = {
  yapeNumber: '+51999888777', // Número por defecto (cambiar por el real)
  plinNumber: '+51999888777', // Número por defecto (cambiar por el real)
  isActive: true
};
