import mongoose from 'mongoose';

const gameSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['puzzle', 'trivia', 'memory', 'reaction', 'strategy'],
    required: true
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    required: true
  },
  basePoints: {
    type: Number,
    required: true,
    min: 1
  },
  maxPoints: {
    type: Number,
    required: true,
    min: 1
  },
  iconPath: {
    type: String,
    required: false
  },
  primaryColor: {
    type: String,
    required: true,
    default: '#673AB7'
  },
  secondaryColor: {
    type: String,
    required: true,
    default: '#9C27B0'
  },
  estimatedTimeMinutes: {
    type: Number,
    required: true,
    min: 1
  },
  isAvailable: {
    type: Boolean,
    default: true
  },
  instructions: [{
    type: String,
    trim: true
  }],
  playCount: {
    type: Number,
    default: 0
  },
  averageRating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  gameConfig: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// Índices
gameSchema.index({ type: 1 });
gameSchema.index({ difficulty: 1 });
gameSchema.index({ isAvailable: 1 });
gameSchema.index({ playCount: -1 });
gameSchema.index({ averageRating: -1 });

// Esquema para resultados de juegos
const gameResultSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  requestId: {
    type: String,
    required: false,
  },
  gameId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Game',
    required: true
  },
  score: {
    type: Number,
    required: true,
    min: 0
  },
  pointsEarned: {
    type: Number,
    required: true,
    min: 0
  },
  timeSpentSeconds: {
    type: Number,
    required: true,
    min: 1
  },
  gameData: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  completedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Índices para game results
gameResultSchema.index({ userId: 1, createdAt: -1 });
gameResultSchema.index({ gameId: 1 });
gameResultSchema.index({ score: -1 });
gameResultSchema.index({ pointsEarned: -1 });
gameResultSchema.index({ userId: 1, requestId: 1 }, { unique: true, sparse: true });

// Esquema para puntos del usuario
const userPointsSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  action: {
    type: String,
    enum: ['game', 'ad_watch', 'referral', 'premium_bonus', 'daily_checkin', 'profile_complete'],
    required: true
  },
  points: {
    type: Number,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// Índices para points
userPointsSchema.index({ userId: 1, createdAt: -1 });
userPointsSchema.index({ action: 1 });

export const GameModel = mongoose.model('Game', gameSchema);
export const GameResultModel = mongoose.model('GameResult', gameResultSchema);
export const UserPointsModel = mongoose.model('UserPoints', userPointsSchema);
