import mongoose, { Schema, Document } from 'mongoose';

export interface MetroConfigDocument extends Document {
  configType: 'pricing' | 'discount_options';
  data: any;
  lastUpdatedBy: mongoose.Types.ObjectId;
  version: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const MetroConfigSchema = new Schema<MetroConfigDocument>(
  {
    configType: {
      type: String,
      enum: ['pricing', 'discount_options'],
      required: true,
      unique: true,
      index: true
    },
    data: {
      type: Schema.Types.Mixed,
      required: true
    },
    lastUpdatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    version: {
      type: Number,
      default: 1
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true,
    collection: 'metro_configs'
  }
);

// Índices
MetroConfigSchema.index({ configType: 1, isActive: 1 });

export const MetroConfigModel = mongoose.model<MetroConfigDocument>('MetroConfig', MetroConfigSchema);

// Configuraciones por defecto
export const DEFAULT_METRO_PRICING = {
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

export const DEFAULT_DISCOUNT_OPTIONS = {
  '10_percent': { points: 500, discount: 10, enabled: true, premiumOnly: false },
  '20_percent': { points: 1000, discount: 20, enabled: true, premiumOnly: false },
  '30_percent': { points: 1500, discount: 30, enabled: true, premiumOnly: false },
  '50_percent': { points: 2500, discount: 50, enabled: true, premiumOnly: false },
  'free_trip': { points: 3000, discount: 100, enabled: true, premiumOnly: false },
  // Opciones exclusivas Premium
  'premium_15_percent': { points: 300, discount: 15, enabled: true, premiumOnly: true },
  'premium_25_percent': { points: 600, discount: 25, enabled: true, premiumOnly: true },
  'premium_40_percent': { points: 1200, discount: 40, enabled: true, premiumOnly: true },
  'premium_75_percent': { points: 1800, discount: 75, enabled: true, premiumOnly: true },
  'premium_free_trip': { points: 2000, discount: 100, enabled: true, premiumOnly: true }
};

// Funciones helper para obtener configuraciones dinámicas
export async function getMetroPricing() {
  try {
    const config = await MetroConfigModel.findOne({ 
      configType: 'pricing', 
      isActive: true 
    }).lean();
    
    return config?.data || DEFAULT_METRO_PRICING;
  } catch (error) {
    console.error('Error getting metro pricing:', error);
    return DEFAULT_METRO_PRICING;
  }
}

export async function getDiscountOptions() {
  try {
    const config = await MetroConfigModel.findOne({ 
      configType: 'discount_options', 
      isActive: true 
    }).lean();
    
    return config?.data || DEFAULT_DISCOUNT_OPTIONS;
  } catch (error) {
    console.error('Error getting discount options:', error);
    return DEFAULT_DISCOUNT_OPTIONS;
  }
}

export async function updateMetroPricing(pricing: any, updatedBy: string) {
  try {
    const result = await MetroConfigModel.findOneAndUpdate(
      { configType: 'pricing' },
      {
        data: pricing,
        lastUpdatedBy: new mongoose.Types.ObjectId(updatedBy),
        $inc: { version: 1 },
        isActive: true
      },
      { 
        upsert: true, 
        new: true 
      }
    );
    
    return result;
  } catch (error) {
    console.error('Error updating metro pricing:', error);
    throw error;
  }
}

export async function updateDiscountOptions(options: any, updatedBy: string) {
  try {
    const result = await MetroConfigModel.findOneAndUpdate(
      { configType: 'discount_options' },
      {
        data: options,
        lastUpdatedBy: new mongoose.Types.ObjectId(updatedBy),
        $inc: { version: 1 },
        isActive: true
      },
      { 
        upsert: true, 
        new: true 
      }
    );
    
    return result;
  } catch (error) {
    console.error('Error updating discount options:', error);
    throw error;
  }
}
