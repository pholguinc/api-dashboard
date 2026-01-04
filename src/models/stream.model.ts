import mongoose from 'mongoose';

const streamSchema = new mongoose.Schema({
  streamerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    required: false,
    maxlength: 500
  },
  category: {
    type: String,
    enum: ['IRL', 'Gaming', 'Music', 'Art', 'Food', 'Tech', 'Dance', 'Freestyle'],
    required: true
  },
  status: {
    type: String,
    enum: ['scheduled', 'live', 'ended', 'cancelled'],
    required: true,
    default: 'scheduled'
  },
  scheduledStartTime: {
    type: Date,
    required: true
  },
  actualStartTime: {
    type: Date,
    required: false
  },
  endTime: {
    type: Date,
    required: false
  },
  duration: {
    type: Number, // en segundos
    default: 0
  },
  location: {
    stationName: { type: String, required: true },
    line: { type: String, required: true },
    coordinates: {
      latitude: { type: Number, required: false },
      longitude: { type: Number, required: false }
    }
  },
  viewers: {
    current: { type: Number, default: 0 },
    peak: { type: Number, default: 0 },
    total: { type: Number, default: 0 }
  },
  engagement: {
    likes: { type: Number, default: 0 },
    comments: { type: Number, default: 0 },
    shares: { type: Number, default: 0 },
    donations: { type: Number, default: 0 },
    donationAmount: { type: Number, default: 0 }
  },
  streamKey: {
    type: String,
    required: true,
    unique: true
  },
  thumbnailUrl: {
    type: String,
    required: false
  },
  tags: [{ type: String, trim: true }],
  isPublic: {
    type: Boolean,
    default: true
  },
  ageRestricted: {
    type: Boolean,
    default: false
  },
  language: {
    type: String,
    default: 'es'
  }
}, {
  timestamps: true
});

// Esquema para comentarios en streams
const streamCommentSchema = new mongoose.Schema({
  streamId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Stream',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  message: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  type: {
    type: String,
    enum: ['text', 'emoji', 'sticker'],
    default: 'text'
  },
  isHighlighted: {
    type: Boolean,
    default: false
  },
  isPinned: {
    type: Boolean,
    default: false
  },
  moderationStatus: {
    type: String,
    enum: ['approved', 'pending', 'rejected', 'auto_approved'],
    default: 'auto_approved'
  }
}, {
  timestamps: true
});

// Esquema para donaciones
const streamDonationSchema = new mongoose.Schema({
  streamId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Stream',
    required: true
  },
  streamerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  donorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 1
  },
  currency: {
    type: String,
    default: 'PEN'
  },
  message: {
    type: String,
    required: false,
    maxlength: 100
  },
  paymentMethod: {
    type: String,
    enum: ['points', 'yape', 'plin', 'card'],
    required: true
  },
  transactionId: {
    type: String,
    required: false
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded'],
    default: 'pending'
  },
  isAnonymous: {
    type: Boolean,
    default: false
  },
  displayName: {
    type: String,
    required: false
  }
}, {
  timestamps: true
});

// Esquema para emojis/reacciones en streams
const streamReactionSchema = new mongoose.Schema({
  streamId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Stream',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  emoji: {
    type: String,
    required: true,
    enum: ['❤️', '😂', '😮', '😢', '😡', '👏', '🔥', '💯', '🤙', '🇵🇪']
  },
  count: {
    type: Number,
    default: 1,
    min: 1
  }
}, {
  timestamps: true
});

// Esquema para seguidores de streamers
const streamerFollowerSchema = new mongoose.Schema({
  streamerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  followerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  notificationsEnabled: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Índices para optimizar consultas
streamSchema.index({ streamerId: 1 });
streamSchema.index({ status: 1 });
streamSchema.index({ category: 1 });
streamSchema.index({ scheduledStartTime: 1 });
streamSchema.index({ 'viewers.current': -1 });
streamSchema.index({ 'location.stationName': 1 });

streamCommentSchema.index({ streamId: 1, createdAt: -1 });
streamCommentSchema.index({ userId: 1 });
streamCommentSchema.index({ moderationStatus: 1 });

streamDonationSchema.index({ streamerId: 1, createdAt: -1 });
streamDonationSchema.index({ donorId: 1 });
streamDonationSchema.index({ status: 1 });

streamReactionSchema.index({ streamId: 1 });
streamReactionSchema.index({ userId: 1, streamId: 1 }, { unique: true });

streamerFollowerSchema.index({ streamerId: 1 });
streamerFollowerSchema.index({ followerId: 1 });
streamerFollowerSchema.index({ streamerId: 1, followerId: 1 }, { unique: true });

// Métodos virtuales
streamSchema.virtual('isLive').get(function() {
  return this.status === 'live';
});

streamSchema.virtual('totalEngagement').get(function() {
  return this.engagement.likes + this.engagement.comments + this.engagement.shares;
});

// Middleware para actualizar estadísticas del streamer
streamSchema.post('save', async function(doc) {
  if (doc.status === 'ended' && doc.actualStartTime && doc.endTime) {
    const duration = (doc.endTime.getTime() - doc.actualStartTime.getTime()) / 1000; // segundos
    
    await mongoose.model('User').findByIdAndUpdate(doc.streamerId, {
      $inc: {
        'streamerProfile.totalStreams': 1,
        'streamerProfile.totalViewers': doc.viewers.total,
        'streamerProfile.streamingHours': duration / 3600,
        'streamerProfile.totalDonations': doc.engagement.donationAmount
      },
      $set: {
        'streamerProfile.averageViewers': doc.viewers.peak
      }
    });
  }
});

export const StreamModel = mongoose.models.Stream || mongoose.model('Stream', streamSchema);
export const StreamCommentModel = mongoose.models.StreamComment || mongoose.model('StreamComment', streamCommentSchema);
export const StreamDonationModel = mongoose.models.StreamDonation || mongoose.model('StreamDonation', streamDonationSchema);
export const StreamReactionModel = mongoose.models.StreamReaction || mongoose.model('StreamReaction', streamReactionSchema);
export const StreamerFollowerModel = mongoose.models.StreamerFollower || mongoose.model('StreamerFollower', streamerFollowerSchema);