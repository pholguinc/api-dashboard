import mongoose, { Schema, Document, Model } from 'mongoose';

export interface DonationDocument extends Document {
  roomId: mongoose.Types.ObjectId;
  fromUserId: mongoose.Types.ObjectId;
  toStreamerId: mongoose.Types.ObjectId;
  points: number;
  createdAt: Date;
}

const DonationSchema = new Schema<DonationDocument>(
  {
    roomId: { type: Schema.Types.ObjectId, ref: 'StreamRoom', required: true, index: true },
    fromUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    toStreamerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    points: { type: Number, required: true, min: 1 },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const DonationModel: Model<DonationDocument> =
  mongoose.models.Donation || mongoose.model<DonationDocument>('Donation', DonationSchema);


