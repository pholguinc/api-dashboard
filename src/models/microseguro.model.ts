import mongoose from 'mongoose';

const microseguroSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  category: {
    type: String,
    enum: ['dispositivos', 'transporte', 'salud', 'pertenencias'],
    required: true
  },
  monthlyPrice: {
    type: Number,
    required: true,
    min: 0
  },
  maxCoverage: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'PEN'
  },
  benefits: [{
    type: String,
    trim: true
  }],
  terms: {
    type: String,
    required: false, 
    default: ''     
  },
  isActive: {
    type: Boolean,
    default: true
  },
  icon: {
    type: String,
    required: true
  },
  color: {
    type: String,
    required: true
  },
  targetAudience: {
    type: String,
    enum: ['general', 'estudiantes', 'trabajadores', 'premium'],
    default: 'general'
  },
  minimumAge: {
    type: Number,
    default: 18
  },
  maximumAge: {
    type: Number,
    default: 65
  }
}, {
  timestamps: true
});

// Esquema para contrataciones de microseguros
const microseguroContractSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  microseguroId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Microseguro',
    required: true
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
  monthlyPrice: {
    type: Number,
    required: true
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
  claimsCount: {
    type: Number,
    default: 0
  },
  lastClaimDate: {
    type: Date,
    required: false
  },
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

// Esquema para reclamos de microseguros
const microseguroClaimSchema = new mongoose.Schema({
  contractId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MicroseguroContract',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  microseguroId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Microseguro',
    required: true
  },
  claimType: {
    type: String,
    enum: ['theft', 'damage', 'loss', 'medical', 'accident'],
    required: true
  },
  description: {
    type: String,
    required: true
  },
  claimAmount: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'paid'],
    required: true,
    default: 'pending'
  },
  evidenceFiles: [{
    filename: String,
    url: String,
    fileType: String
  }],
  adminNotes: {
    type: String,
    required: false
  },
  processedAt: {
    type: Date,
    required: false
  },
  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  }
}, {
  timestamps: true
});

// Índices para optimizar consultas
microseguroSchema.index({ category: 1 });
microseguroSchema.index({ isActive: 1 });
microseguroSchema.index({ monthlyPrice: 1 });

microseguroContractSchema.index({ userId: 1 });
microseguroContractSchema.index({ status: 1 });
microseguroContractSchema.index({ endDate: 1 });

microseguroClaimSchema.index({ userId: 1 });
microseguroClaimSchema.index({ status: 1 });
microseguroClaimSchema.index({ createdAt: -1 });

// Método virtual para verificar si está activo
microseguroContractSchema.virtual('isActive').get(function() {
  return this.status === 'active' && new Date() < this.endDate;
});

// Método para calcular días restantes
microseguroContractSchema.methods.getDaysRemaining = function() {
  if (this.status !== 'active') return 0;
  const now = new Date();
  const diff = this.endDate.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
};

export const MicroseguroProductModel = mongoose.models.MicroseguroProduct || mongoose.model('MicroseguroProduct', microseguroSchema);
export const MicroseguroContractModel = mongoose.models.MicroseguroContract || mongoose.model('MicroseguroContract', microseguroContractSchema);
export const MicroseguroClaimModel = mongoose.models.MicroseguroClaim || mongoose.model('MicroseguroClaim', microseguroClaimSchema);
