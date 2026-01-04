import mongoose from 'mongoose';

const subscriptionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  type: {
    type: String,
    enum: ['MetroPremium'],
    required: true,
    default: 'MetroPremium'
  },
  status: {
    type: String,
    enum: ['active', 'cancelled', 'expired', 'pending'],
    required: true,
    default: 'pending'
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  price: {
    type: Number,
    required: true,
    default: 9.90
  },
  currency: {
    type: String,
    required: true,
    default: 'PEN'
  },
  paymentMethod: {
    type: String,
    enum: ['card', 'yape', 'plin', 'bank_transfer', 'points'],
    required: true
  },
  transactionId: {
    type: String,
    required: false
  },
  benefits: [{
    name: String,
    description: String,
    isActive: { type: Boolean, default: true }
  }],
  autoRenew: {
    type: Boolean,
    default: true
  },
  cancelledAt: {
    type: Date,
    required: false
  },
  cancelReason: {
    type: String,
    required: false
  }
}, {
  timestamps: true
});

// Índices para optimizar consultas
subscriptionSchema.index({ userId: 1 });
subscriptionSchema.index({ status: 1 });
subscriptionSchema.index({ endDate: 1 });

// Método virtual para verificar si está activa
subscriptionSchema.virtual('isActive').get(function() {
  return this.status === 'active' && new Date() < this.endDate;
});

// Método para calcular días restantes
subscriptionSchema.methods.getDaysRemaining = function() {
  if (this.status !== 'active') return 0;
  const now = new Date();
  const diff = this.endDate.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
};

export const SubscriptionModel = mongoose.model('Subscription', subscriptionSchema);
