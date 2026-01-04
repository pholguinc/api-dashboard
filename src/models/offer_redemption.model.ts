import mongoose, { Schema, Document, Model } from 'mongoose';

export interface OfferRedemptionDocument extends Document {
  userId: mongoose.Types.ObjectId;
  offerId: mongoose.Types.ObjectId;
  code?: string;
  createdAt: Date;
}

const OfferRedemptionSchema = new Schema<OfferRedemptionDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    offerId: { type: Schema.Types.ObjectId, ref: 'Offer', required: true, index: true },
    code: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const OfferRedemptionModel: Model<OfferRedemptionDocument> =
  mongoose.models.OfferRedemption || mongoose.model<OfferRedemptionDocument>('OfferRedemption', OfferRedemptionSchema);


