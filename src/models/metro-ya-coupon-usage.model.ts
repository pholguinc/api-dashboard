import mongoose, { Schema, Document } from 'mongoose';

/**
 * Modelo de Uso de Cupones Metro Ya
 * Trackea el uso de cada cupón por usuario en cada ciclo de suscripción
 */

export interface MetroYaCouponUsageDocument extends Document {
  userId: mongoose.Types.ObjectId;
  couponId: mongoose.Types.ObjectId;
  subscriptionId: mongoose.Types.ObjectId; // Referencia a la suscripción Premium activa
  
  // Métodos de instancia
  canBeUsed(): boolean;
  markAsUsed(usageDetails?: any): Promise<void>;
  resetForNewCycle(newCycleStart: Date, newCycleEnd: Date, newCycleNumber: number): Promise<void>;
  
  // Información del ciclo
  cycleStartDate: Date; // Inicio del ciclo de suscripción
  cycleEndDate: Date; // Fin del ciclo de suscripción
  cycleNumber: number; // Número de ciclo (1, 2, 3, etc.) para facilitar queries
  
  // Estado del cupón en este ciclo
  status: 'available' | 'used' | 'expired';
  
  // Detalles de uso
  usedAt?: Date; // Fecha en que se usó el cupón
  usageCount: number; // Cuántas veces se ha usado en este ciclo
  maxUsesInCycle: number; // Máximo de usos permitidos en este ciclo
  
  // Datos del uso
  usageDetails?: {
    tripId?: string; // ID del viaje donde se usó
    originalPrice?: number; // Precio original
    discountApplied?: number; // Descuento aplicado
    finalPrice?: number; // Precio final
    pointsEarned?: number; // Puntos ganados
    metadata?: any; // Datos adicionales del uso
  };
  
  // Reseteo
  willResetOn: Date; // Fecha en que se reseteará (inicio del próximo ciclo)
  resetCount: number; // Cuántas veces se ha reseteado este cupón para este usuario
  
  createdAt: Date;
  updatedAt: Date;
}

const MetroYaCouponUsageSchema = new Schema<MetroYaCouponUsageDocument>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    couponId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MetroYaCoupon',
      required: true,
      index: true
    },
    subscriptionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PremiumSubscription',
      required: true,
      index: true
    },
    cycleStartDate: {
      type: Date,
      required: true,
      index: true
    },
    cycleEndDate: {
      type: Date,
      required: true,
      index: true
    },
    cycleNumber: {
      type: Number,
      required: true,
      min: 1,
      index: true
    },
    status: {
      type: String,
      enum: ['available', 'used', 'expired'],
      required: true,
      default: 'available',
      index: true
    },
    usedAt: {
      type: Date,
      index: true
    },
    usageCount: {
      type: Number,
      required: true,
      default: 0,
      min: 0
    },
    maxUsesInCycle: {
      type: Number,
      required: true,
      default: 1,
      min: 1
    },
    usageDetails: {
      tripId: String,
      originalPrice: Number,
      discountApplied: Number,
      finalPrice: Number,
      pointsEarned: Number,
      metadata: Schema.Types.Mixed
    },
    willResetOn: {
      type: Date,
      required: true,
      index: true
    },
    resetCount: {
      type: Number,
      required: true,
      default: 0,
      min: 0
    }
  },
  {
    timestamps: true,
    collection: 'metro_ya_coupon_usages'
  }
);

// Índices compuestos para optimizar queries comunes
MetroYaCouponUsageSchema.index({ userId: 1, couponId: 1, cycleStartDate: 1 }, { unique: true });
MetroYaCouponUsageSchema.index({ userId: 1, status: 1, cycleEndDate: 1 });
MetroYaCouponUsageSchema.index({ subscriptionId: 1, cycleStartDate: 1 });
MetroYaCouponUsageSchema.index({ willResetOn: 1, status: 1 }); // Para cron job de reset

// Método para verificar si el cupón puede ser usado
MetroYaCouponUsageSchema.methods.canBeUsed = function(): boolean {
  if (this.status !== 'available') return false;
  if (this.usageCount >= this.maxUsesInCycle) return false;
  
  const now = new Date();
  if (now < this.cycleStartDate || now > this.cycleEndDate) return false;
  
  return true;
};

// Método para marcar el cupón como usado
MetroYaCouponUsageSchema.methods.markAsUsed = async function(usageDetails?: any): Promise<void> {
  this.status = 'used';
  this.usedAt = new Date();
  this.usageCount += 1;
  
  if (usageDetails) {
    this.usageDetails = {
      ...this.usageDetails,
      ...usageDetails
    };
  }
  
  await this.save();
  
  // Actualizar estadísticas del cupón
  const MetroYaCoupon = mongoose.model('MetroYaCoupon');
  await MetroYaCoupon.findByIdAndUpdate(this.couponId, {
    $inc: { 'metadata.totalUses': 1 }
  });
};

// Método para resetear el cupón para un nuevo ciclo
MetroYaCouponUsageSchema.methods.resetForNewCycle = async function(
  newCycleStart: Date,
  newCycleEnd: Date,
  newCycleNumber: number
): Promise<void> {
  this.cycleStartDate = newCycleStart;
  this.cycleEndDate = newCycleEnd;
  this.cycleNumber = newCycleNumber;
  this.status = 'available';
  this.usedAt = undefined;
  this.usageCount = 0;
  this.willResetOn = newCycleEnd;
  this.resetCount += 1;
  
  await this.save();
};

// Método estático para obtener cupones disponibles de un usuario en el ciclo actual
MetroYaCouponUsageSchema.statics.getAvailableForUser = async function(
  userId: mongoose.Types.ObjectId,
  cycleStartDate: Date
): Promise<MetroYaCouponUsageDocument[]> {
  return this.find({
    userId,
    cycleStartDate,
    status: 'available',
    cycleEndDate: { $gte: new Date() }
  })
  .populate('couponId')
  .sort({ 'couponId.displayOrder': 1 });
};

// Método estático para obtener historial de uso
MetroYaCouponUsageSchema.statics.getUserHistory = async function(
  userId: mongoose.Types.ObjectId,
  limit: number = 10
): Promise<MetroYaCouponUsageDocument[]> {
  return this.find({
    userId,
    status: 'used'
  })
  .populate('couponId')
  .sort({ usedAt: -1 })
  .limit(limit);
};

export const MetroYaCouponUsageModel = mongoose.model<MetroYaCouponUsageDocument>('MetroYaCouponUsage', MetroYaCouponUsageSchema);

/**
 * Servicio auxiliar para gestión de ciclos
 */
export class CouponCycleService {
  /**
   * Calcula las fechas del ciclo actual basado en la fecha de inicio de suscripción
   */
  static getCurrentCycle(subscriptionStartDate: Date, now: Date = new Date()): {
    cycleNumber: number;
    cycleStart: Date;
    cycleEnd: Date;
  } {
    const start = new Date(subscriptionStartDate);
    const current = new Date(now);
    
    // Calcular cuántos meses completos han pasado
    let monthsPassed = 0;
    let cycleStart = new Date(start);
    
    while (cycleStart <= current) {
      const nextCycle = new Date(cycleStart);
      nextCycle.setMonth(nextCycle.getMonth() + 1);
      
      if (nextCycle > current) break;
      
      cycleStart = nextCycle;
      monthsPassed++;
    }
    
    const cycleEnd = new Date(cycleStart);
    cycleEnd.setMonth(cycleEnd.getMonth() + 1);
    cycleEnd.setDate(cycleEnd.getDate() - 1); // Último día del mes
    cycleEnd.setHours(23, 59, 59, 999);
    
    return {
      cycleNumber: monthsPassed + 1,
      cycleStart,
      cycleEnd
    };
  }
  
  /**
   * Calcula el próximo ciclo
   */
  static getNextCycle(currentCycleEnd: Date): {
    cycleStart: Date;
    cycleEnd: Date;
  } {
    const cycleStart = new Date(currentCycleEnd);
    cycleStart.setDate(cycleStart.getDate() + 1);
    cycleStart.setHours(0, 0, 0, 0);
    
    const cycleEnd = new Date(cycleStart);
    cycleEnd.setMonth(cycleEnd.getMonth() + 1);
    cycleEnd.setDate(cycleEnd.getDate() - 1);
    cycleEnd.setHours(23, 59, 59, 999);
    
    return { cycleStart, cycleEnd };
  }
  
  /**
   * Verifica si una fecha está dentro de un ciclo
   */
  static isDateInCycle(date: Date, cycleStart: Date, cycleEnd: Date): boolean {
    return date >= cycleStart && date <= cycleEnd;
  }
}