import mongoose, { Schema, Document, Model } from 'mongoose';

export type OfferCategory = 
  | 'food_drink' 
  | 'entertainment' 
  | 'transport' 
  | 'services' 
  | 'shopping' 
  | 'health' 
  | 'education' 
  | 'other';

export interface OfferDocument extends Document {
  title: string;
  description: string;
  merchantName: string;
  merchantAddress?: string;
  category: OfferCategory;
  discountCode?: string;
  discountPercentage?: number;
  pointsReward?: number;
  expiresAt?: Date;
  imageUrl?: string;
  location: { 
    type: 'Point' | 'Polygon'; 
    coordinates: number[] | number[][][] 
  };
  isActive: boolean;
  termsAndConditions?: string;
  maxRedemptions?: number;
  currentRedemptions?: number;
  createdAt: Date;
  updatedAt: Date;
}

const OfferSchema = new Schema<OfferDocument>(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    merchantName: { type: String, required: true },
    merchantAddress: { type: String },
    category: { 
      type: String, 
      enum: ['food_drink', 'entertainment', 'transport', 'services', 'shopping', 'health', 'education', 'other'],
      required: true, 
      index: true 
    },
    discountCode: { type: String },
    discountPercentage: { type: Number, min: 0, max: 100 },
    pointsReward: { type: Number, min: 0 },
    expiresAt: { type: Date },
    imageUrl: { type: String },
    location: {
      type: { type: String, enum: ['Point', 'Polygon'], required: true },
      coordinates: { type: Schema.Types.Mixed, required: true },
    },
    isActive: { type: Boolean, default: true },
    termsAndConditions: { type: String },
    maxRedemptions: { type: Number },
    currentRedemptions: { type: Number, default: 0 },
  },
  { timestamps: true }
);

OfferSchema.index({ location: '2dsphere' });
OfferSchema.index({ category: 1, isActive: 1 });
OfferSchema.index({ expiresAt: 1 });

export const OfferModel: Model<OfferDocument> =
  mongoose.models.Offer || mongoose.model<OfferDocument>('Offer', OfferSchema);


