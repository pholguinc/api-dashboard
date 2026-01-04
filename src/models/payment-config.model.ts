import mongoose, { Schema, Document } from 'mongoose';

export interface PaymentConfigDocument extends Document {
  configKey: string;
  configValue: any;
  description?: string;
  lastUpdatedBy: mongoose.Types.ObjectId;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentConfigSchema = new Schema<PaymentConfigDocument>(
  {
    configKey: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    configValue: {
      type: Schema.Types.Mixed,
      required: true
    },
    description: {
      type: String
    },
    lastUpdatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true,
    collection: 'payment_configs'
  }
);

export const PaymentConfigModel = mongoose.model<PaymentConfigDocument>('PaymentConfig', PaymentConfigSchema);

// Funciones helper
export async function getPaymentConfig() {
  try {
    const configs = await PaymentConfigModel.find({ isActive: true }).lean();
    
    const configMap: Record<string, any> = {};
    configs.forEach(config => {
      configMap[config.configKey] = config.configValue;
    });

    // Valores por defecto si no existen
    return {
      yapeNumber: configMap.yapeNumber || '999-999-999',
      plinNumber: configMap.plinNumber || '999-999-999',
      ...configMap
    };
  } catch (error) {
    console.error('Error getting payment config:', error);
    return {
      yapeNumber: '999-999-999',
      plinNumber: '999-999-999'
    };
  }
}

export async function updatePaymentConfig(yapeNumber: string, plinNumber: string, updatedBy: string) {
  try {
    const updates = [
      {
        configKey: 'yapeNumber',
        configValue: yapeNumber,
        description: 'Número de teléfono para pagos por Yape'
      },
      {
        configKey: 'plinNumber',
        configValue: plinNumber,
        description: 'Número de teléfono para pagos por Plin'
      }
    ];

    const results = await Promise.all(
      updates.map(update => 
        PaymentConfigModel.findOneAndUpdate(
          { configKey: update.configKey },
          {
            configValue: update.configValue,
            description: update.description,
            lastUpdatedBy: new mongoose.Types.ObjectId(updatedBy),
            isActive: true
          },
          { upsert: true, new: true }
        )
      )
    );

    return results;
  } catch (error) {
    console.error('Error updating payment config:', error);
    throw error;
  }
}
