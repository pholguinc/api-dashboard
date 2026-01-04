import mongoose, { Schema, Document, Model } from 'mongoose';

export type ProductCategory = 'digital' | 'physical' | 'premium';

export interface ProductDocument extends Document {
  name: string;
  description: string;
  category: ProductCategory;
  pointsCost: number;
  stock: number;
  imageUrl: string;
  provider: string;
  isActive: boolean;
  validityMinutes?: number;
  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema = new Schema<ProductDocument>(
  {
    name: { type: String, required: true },
    description: { type: String, required: true },
    category: { type: String, enum: ['digital', 'physical', 'premium'], required: true, index: true },
    pointsCost: { type: Number, required: true },
    stock: { type: Number, default: 0 },
    imageUrl: { type: String, required: true },
    provider: { type: String, required: true },
    isActive: { type: Boolean, default: true },
    validityMinutes: { type: Number, default: 60 },
  },
  { timestamps: true }
);

export const ProductModel: Model<ProductDocument> =
  mongoose.models.Product || mongoose.model<ProductDocument>('Product', ProductSchema);

export type RedemptionStatus = 'pending' | 'confirmed' | 'delivered';

export interface RedemptionDocument extends Document {
  userId: mongoose.Types.ObjectId;
  productId: mongoose.Types.ObjectId;
  pointsSpent: number;
  status: RedemptionStatus;
  code?: string; // digital
  deliveryInfo?: Record<string, unknown>; // physical
  expiresAt?: Date;
  confirmedAt?: Date;
  deliveredAt?: Date;
  confirmedBy?: mongoose.Types.ObjectId;
  deliveredBy?: mongoose.Types.ObjectId;
  station?: {
    name?: string;
    code?: string;
    deviceId?: string;
  };
  audit?: {
    entries: Array<{
      action: 'confirm' | 'deliver' | 'scan';
      byUserId?: mongoose.Types.ObjectId;
      at: Date;
      stationCode?: string;
      deviceId?: string;
      outcome?: 'ok' | 'duplicate' | 'expired' | 'invalid' | 'error';
      note?: string;
    }>;
  };
  createdAt: Date;
  updatedAt: Date;
}

const RedemptionSchema = new Schema<RedemptionDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    pointsSpent: { type: Number, required: true },
    status: { type: String, enum: ['pending', 'confirmed', 'delivered'], default: 'pending', index: true },
    code: { type: String },
    deliveryInfo: { type: Object },
    expiresAt: { type: Date },
    confirmedAt: { type: Date },
    deliveredAt: { type: Date },
    confirmedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    deliveredBy: { type: Schema.Types.ObjectId, ref: 'User' },
    station: {
      name: { type: String },
      code: { type: String },
      deviceId: { type: String }
    },
    audit: {
      entries: [
        {
          action: { type: String, enum: ['confirm', 'deliver', 'scan'] },
          byUserId: { type: Schema.Types.ObjectId, ref: 'User' },
          at: { type: Date, default: Date.now },
          stationCode: { type: String },
          deviceId: { type: String },
          outcome: { type: String, enum: ['ok', 'duplicate', 'expired', 'invalid', 'error'] },
          note: { type: String }
        }
      ]
    }
  },
  { timestamps: true }
);

export const RedemptionModel: Model<RedemptionDocument> =
  mongoose.models.Redemption || mongoose.model<RedemptionDocument>('Redemption', RedemptionSchema);


