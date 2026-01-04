import mongoose, { Schema, Document, Model } from 'mongoose';

export type StreamStatus = 'offline' | 'live' | 'starting' | 'ending' | 'scheduled';
export type StreamCategory = 'IRL' | 'Gaming' | 'Music' | 'Art' | 'Food' | 'Tech' | 'Dance' | 'Freestyle' | 'Event';

export interface MetroLiveStreamDocument extends Document {
  streamerId: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  category: StreamCategory;
  thumbnailUrl?: string;
  status: StreamStatus;
  viewerCount: number;
  maxViewers: number;
  actualStartTime?: Date;
  scheduledStartTime?: Date;
  startedAt?: Date;
  endedAt?: Date;
  duration: number; // En segundos
  isRecorded: boolean;
  recordingUrl?: string;
  tags: string[];
  location?: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
    stationName?: string;
    lineName?: string;
  };
  chatEnabled: boolean;
  donationsEnabled: boolean;
  donationsCount: number;
  chatMessages: number;
  totalDonations: number;
  settings: {
    recordingEnabled: boolean;
    adaptiveBitrate: boolean;
    lowLatencyMode: boolean;
    maxBitrate: number;
    targetLatency: number;
  };
  advancedSettings: any;
  eventSettings: any;
  cdnUrls: string[];
  recordingSize?: number;
  isEvent: boolean;
  averageViewTime: number; // En segundos
  streamKey?: string;
  rtmpUrl?: string;
  hlsUrl?: string;
  webrtcUrl?: string;
  quality: {
    resolution: string; // "1080p", "720p", "480p"
    bitrate: number;
    fps: number;
  };
  moderators: mongoose.Types.ObjectId[];
  moderation?: {
    slowModeSeconds: number; // 0 = off
    mutedUserIds: mongoose.Types.ObjectId[];
    bannedUserIds: mongoose.Types.ObjectId[];
    lastMessageAtByUser: Record<string, Date>;
  };
  isFeatured: boolean;
  featuredUntil?: Date;
  reminderSubscribers?: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const MetroLiveStreamSchema = new Schema<MetroLiveStreamDocument>(
  {
    streamerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, maxlength: 100 },
    description: { type: String, maxlength: 500 },
    category: { 
      type: String, 
      enum: ['IRL', 'Gaming', 'Music', 'Art', 'Food', 'Tech', 'Dance', 'Freestyle', 'Event'], 
      required: true, 
      index: true 
    },
    thumbnailUrl: { type: String },
    status: { 
      type: String, 
      enum: ['offline', 'live', 'starting', 'ending', 'scheduled'], 
      default: 'offline', 
      index: true 
    },
    viewerCount: { type: Number, default: 0 },
    maxViewers: { type: Number, default: 0 },
    actualStartTime: { type: Date },
    scheduledStartTime: { type: Date },
    startedAt: { type: Date },
    endedAt: { type: Date },
    duration: { type: Number, default: 0 },
    isRecorded: { type: Boolean, default: false },
    recordingUrl: { type: String },
    tags: [{ type: String, maxlength: 30 }],
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number],
        index: '2dsphere'
      },
      stationName: { type: String },
      lineName: { type: String }
    },
    chatEnabled: { type: Boolean, default: true },
    donationsEnabled: { type: Boolean, default: true },
    donationsCount: { type: Number, default: 0 },
    chatMessages: { type: Number, default: 0 },
    totalDonations: { type: Number, default: 0 },
    averageViewTime: { type: Number, default: 0 },
    streamKey: { type: String, select: false }, // No incluir en consultas por defecto
    rtmpUrl: { type: String, select: false },
    hlsUrl: { type: String },
    webrtcUrl: { type: String },
    quality: {
      resolution: { type: String, default: '720p' },
      bitrate: { type: Number, default: 2500 },
      fps: { type: Number, default: 30 }
    },
    moderators: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    moderation: {
      slowModeSeconds: { type: Number, default: 0 },
      mutedUserIds: [{ type: Schema.Types.ObjectId, ref: 'User' }],
      bannedUserIds: [{ type: Schema.Types.ObjectId, ref: 'User' }],
      lastMessageAtByUser: { type: Schema.Types.Mixed, default: {} }
    },
    isFeatured: { type: Boolean, default: false, index: true },
    featuredUntil: { type: Date },
    reminderSubscribers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    settings: {
      recordingEnabled: { type: Boolean, default: true },
      adaptiveBitrate: { type: Boolean, default: true },
      lowLatencyMode: { type: Boolean, default: false },
      maxBitrate: { type: Number, default: 5000 },
      targetLatency: { type: Number, default: 3 }
    },
    advancedSettings: { type: Schema.Types.Mixed, default: {} },
    eventSettings: { type: Schema.Types.Mixed, default: {} },
    cdnUrls: [String],
    recordingSize: Number,
    isEvent: { type: Boolean, default: false }
  },
  { timestamps: true }
);

// Índices compuestos para búsquedas eficientes
MetroLiveStreamSchema.index({ status: 1, isFeatured: -1, viewerCount: -1 });
MetroLiveStreamSchema.index({ category: 1, status: 1, viewerCount: -1 });
MetroLiveStreamSchema.index({ streamerId: 1, createdAt: -1 });

export const MetroLiveStreamModel: Model<MetroLiveStreamDocument> =
  mongoose.models.MetroLiveStream || mongoose.model<MetroLiveStreamDocument>('MetroLiveStream', MetroLiveStreamSchema);

// Modelo para comentarios de stream
export interface StreamCommentDocument extends Document {
  streamId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  message: string;
  type: 'text' | 'emoji' | 'sticker' | 'donation';
  metadata?: {
    donationAmount?: number;
    stickerUrl?: string;
    replyToId?: mongoose.Types.ObjectId;
  };
  isVisible: boolean;
  isPinned: boolean;
  moderatedBy?: mongoose.Types.ObjectId;
  moderatedAt?: Date;
  createdAt: Date;
}

const StreamCommentSchema = new Schema<StreamCommentDocument>(
  {
    streamId: { type: Schema.Types.ObjectId, ref: 'MetroLiveStream', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    message: { type: String, required: true, maxlength: 500 },
    type: { 
      type: String, 
      enum: ['text', 'emoji', 'sticker', 'donation'], 
      default: 'text' 
    },
    metadata: {
      donationAmount: { type: Number },
      stickerUrl: { type: String },
      replyToId: { type: Schema.Types.ObjectId, ref: 'StreamComment' }
    },
    isVisible: { type: Boolean, default: true, index: true },
    isPinned: { type: Boolean, default: false },
    moderatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    moderatedAt: { type: Date }
  },
  { timestamps: true }
);

// Índice compuesto para obtener comentarios de un stream ordenados
StreamCommentSchema.index({ streamId: 1, createdAt: -1 });
StreamCommentSchema.index({ streamId: 1, isPinned: -1, createdAt: -1 });

export const StreamCommentModel: Model<StreamCommentDocument> =
  mongoose.models.StreamComment || mongoose.model<StreamCommentDocument>('StreamComment', StreamCommentSchema);

// Modelo para seguidores de streamers
export interface StreamFollowDocument extends Document {
  followerId: mongoose.Types.ObjectId;
  streamerId: mongoose.Types.ObjectId;
  notificationsEnabled: boolean;
  followedAt: Date;
}

const StreamFollowSchema = new Schema<StreamFollowDocument>(
  {
    followerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    streamerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    notificationsEnabled: { type: Boolean, default: true }
  },
  { timestamps: { createdAt: 'followedAt', updatedAt: false } }
);

// Índice único compuesto para evitar seguir dos veces al mismo streamer
StreamFollowSchema.index({ followerId: 1, streamerId: 1 }, { unique: true });
StreamFollowSchema.index({ streamerId: 1, followedAt: -1 });

export const StreamFollowModel: Model<StreamFollowDocument> =
  mongoose.models.StreamFollow || mongoose.model<StreamFollowDocument>('StreamFollow', StreamFollowSchema);

// Modelo para donaciones a streams
export interface StreamDonationDocument extends Document {
  streamId: mongoose.Types.ObjectId;
  streamerId: mongoose.Types.ObjectId;
  donorId: mongoose.Types.ObjectId;
  amount: number; // En puntos
  message?: string;
  isAnonymous: boolean;
  isHighlighted: boolean;
  highlightDuration: number; // En segundos
  status: 'pending' | 'completed' | 'refunded';
  processedAt?: Date;
  createdAt: Date;
}

const StreamDonationSchema = new Schema<StreamDonationDocument>(
  {
    streamId: { type: Schema.Types.ObjectId, ref: 'MetroLiveStream', required: true, index: true },
    streamerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    donorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true, min: 1 },
    message: { type: String, maxlength: 200 },
    isAnonymous: { type: Boolean, default: false },
    isHighlighted: { type: Boolean, default: false },
    highlightDuration: { type: Number, default: 0 },
    status: { 
      type: String, 
      enum: ['pending', 'completed', 'refunded'], 
      default: 'pending', 
      index: true 
    },
    processedAt: { type: Date }
  },
  { timestamps: true }
);

StreamDonationSchema.index({ streamerId: 1, createdAt: -1 });
StreamDonationSchema.index({ donorId: 1, createdAt: -1 });

export const StreamDonationModel: Model<StreamDonationDocument> =
  mongoose.models.StreamDonation || mongoose.model<StreamDonationDocument>('StreamDonation', StreamDonationSchema);
