import mongoose, { Schema, Document } from 'mongoose';

export interface MusicDocument extends Document {
  userId: mongoose.Types.ObjectId;
  title: string;
  subtitle: string;
  emotion: string;
  duration: number;
  trackId: string;
  status: string;
  trackUrl?: string;
  image_url?: string;
  generatedAt?: Date;
  expiredAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const musicSchema = new Schema<MusicDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    subtitle: { type: String, required: true },
    emotion: { type: String, required: true },
    duration: { type: Number, required: true },
    trackId: { type: String, required: true },
    status: { type: String, required: true },
    trackUrl: { type: String },
    image_url: { type: String },
    generatedAt: { type: Date },
    expiredAt: { type: Date },
  },
  { timestamps: true }
);

export const MusicModel = mongoose.model<MusicDocument>('Music', musicSchema);
