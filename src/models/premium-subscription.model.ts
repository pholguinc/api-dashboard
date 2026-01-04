import mongoose, { Schema, Document } from 'mongoose';

export interface PremiumSubscriptionDocument extends Document {
  userId: mongoose.Types.ObjectId;
  plan: 'monthly' | 'quarterly' | 'yearly';
  status: 'active' | 'cancelled' | 'expired' | 'pending_payment';
  startDate: Date;
  endDate: Date;
  price: number;
  currency: string;
  paymentMethod: 'yape' | 'plin' | 'card' | 'admin';
  paymentReference?: string;
  paymentProof?: string; // URL de la imagen de comprobante
  benefits: {
    noAds: boolean;
    jobSearch: boolean;
    microCourses: boolean;
    irlExclusive: boolean;
    dailyPoints: number;
    premiumDiscounts: boolean;
  };
  autoRenewal: boolean;
  cancelledAt?: Date;
  cancelReason?: string;
  metadata: {
    activatedBy?: string; // 'payment' | 'admin' | 'promotion'
    originalPrice?: number;
    discountApplied?: number;
    promoCode?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const PremiumSubscriptionSchema = new Schema<PremiumSubscriptionDocument>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    plan: {
      type: String,
      enum: ['monthly', 'quarterly', 'yearly'],
      required: true,
      default: 'monthly'
    },
    status: {
      type: String,
      enum: ['active', 'cancelled', 'expired', 'pending_payment'],
      required: true,
      default: 'pending_payment',
      index: true
    },
    startDate: {
      type: Date,
      required: true
    },
    endDate: {
      type: Date,
      required: true,
      index: true
    },
    price: {
      type: Number,
      required: true,
      min: 0
    },
    currency: {
      type: String,
      required: true,
      default: 'PEN'
    },
    paymentMethod: {
      type: String,
      enum: ['yape', 'plin', 'card', 'admin'],
      required: true
    },
    paymentReference: {
      type: String,
      sparse: true
    },
    paymentProof: {
      type: String, // URL de la imagen
      validate: {
        validator: function(v: string) {
          return !v || /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)$/i.test(v);
        },
        message: 'URL de comprobante inválida'
      }
    },
    benefits: {
      noAds: { type: Boolean, default: true },
      jobSearch: { type: Boolean, default: true },
      microCourses: { type: Boolean, default: true },
      irlExclusive: { type: Boolean, default: true },
      dailyPoints: { type: Number, default: 50 },
      premiumDiscounts: { type: Boolean, default: true }
    },
    autoRenewal: {
      type: Boolean,
      default: false
    },
    cancelledAt: Date,
    cancelReason: String,
    metadata: {
      activatedBy: {
        type: String,
        enum: ['payment', 'admin', 'promotion'],
        default: 'payment'
      },
      originalPrice: Number,
      discountApplied: Number,
      promoCode: String
    }
  },
  {
    timestamps: true,
    collection: 'premium_subscriptions'
  }
);

// Índices compuestos
PremiumSubscriptionSchema.index({ userId: 1, status: 1 });
PremiumSubscriptionSchema.index({ endDate: 1, status: 1 });

// Middleware para actualizar estado del usuario
PremiumSubscriptionSchema.post('save', async function(doc) {
  try {
    const User = mongoose.model('User');
    const isActive = doc.status === 'active' && doc.endDate > new Date();
    
    await User.findByIdAndUpdate(doc.userId, {
      hasMetroPremium: isActive,
      metroPremiumExpiry: isActive ? doc.endDate : null
    });
  } catch (error) {
    console.error('Error updating user premium status:', error);
  }
});

export const PremiumSubscriptionModel = mongoose.model<PremiumSubscriptionDocument>('PremiumSubscription', PremiumSubscriptionSchema);

// Configuración de precios
export const PREMIUM_PRICING = {
  monthly: {
    price: 19.90,
    discount: 0,
    description: 'Plan Mensual'
  },
  quarterly: {
    price: 49.90,
    discount: 16.7, // vs 3 meses
    description: 'Plan Trimestral'
  },
  yearly: {
    price: 179.90,
    discount: 25, // vs 12 meses
    description: 'Plan Anual'
  }
};

// Beneficios Premium
export const PREMIUM_BENEFITS = {
  noAds: {
    name: 'Sin Anuncios',
    description: 'Experiencia sin interrupciones publicitarias',
    icon: '🚫'
  },
  jobSearch: {
    name: 'Busca Chamba Premium',
    description: 'Acceso completo a todas las ofertas laborales',
    icon: '💼'
  },
  microCourses: {
    name: 'Micro Cursos Ilimitados',
    description: 'Acceso a todos los cursos y certificaciones',
    icon: '📚'
  },
  irlExclusive: {
    name: 'IRL Exclusivos',
    description: 'Eventos y streams exclusivos para Premium',
    icon: '🎭'
  },
  dailyPoints: {
    name: '50 Puntos Diarios',
    description: 'Puntos automáticos cada día',
    icon: '⭐'
  },
  premiumDiscounts: {
    name: 'Descuentos Exclusivos',
    description: 'Descuentos Metro con menos puntos',
    icon: '💎'
  }
};
