import mongoose, { Schema, Document } from 'mongoose';

export interface PointsTrackingDocument extends Document {
  userId: mongoose.Types.ObjectId;
  transactionType: 'earned' | 'spent';
  source: 'game' | 'daily_bonus' | 'referral' | 'admin' | 'streak' | 'ad_view' | 'marketplace' | 'discount';
  sourceDetails: {
    gameId?: string;
    gameName?: string;
    gameScore?: number;
    gameLevel?: number;
    productId?: string;
    productName?: string;
    discountCode?: string;
    referralCode?: string;
    adminReason?: string;
  };
  pointsAmount: number;
  balanceBefore: number;
  balanceAfter: number;
  description: string;
  metadata: {
    ipAddress?: string;
    userAgent?: string;
    sessionId?: string;
    gameSession?: string;
    platform?: 'web' | 'mobile' | 'admin';
  };
  createdAt: Date;
  updatedAt: Date;
}

const PointsTrackingSchema = new Schema<PointsTrackingDocument>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    transactionType: {
      type: String,
      enum: ['earned', 'spent'],
      required: true,
      index: true
    },
    source: {
      type: String,
      enum: ['game', 'daily_bonus', 'referral', 'admin', 'streak', 'ad_view', 'marketplace', 'discount'],
      required: true,
      index: true
    },
    sourceDetails: {
      gameId: String,
      gameName: String,
      gameScore: Number,
      gameLevel: Number,
      productId: String,
      productName: String,
      discountCode: String,
      referralCode: String,
      adminReason: String
    },
    pointsAmount: {
      type: Number,
      required: true
    },
    balanceBefore: {
      type: Number,
      required: true
    },
    balanceAfter: {
      type: Number,
      required: true
    },
    description: {
      type: String,
      required: true
    },
    metadata: {
      ipAddress: String,
      userAgent: String,
      sessionId: String,
      gameSession: String,
      platform: {
        type: String,
        enum: ['web', 'mobile', 'admin'],
        default: 'mobile'
      }
    }
  },
  {
    timestamps: true,
    collection: 'points_tracking'
  }
);

// Índices compuestos para consultas eficientes
PointsTrackingSchema.index({ userId: 1, createdAt: -1 });
PointsTrackingSchema.index({ source: 1, createdAt: -1 });
PointsTrackingSchema.index({ transactionType: 1, createdAt: -1 });
PointsTrackingSchema.index({ 'sourceDetails.gameId': 1, createdAt: -1 });

export const PointsTrackingModel = mongoose.model<PointsTrackingDocument>('PointsTracking', PointsTrackingSchema);

// Función para registrar transacción de puntos
export async function trackPointsTransaction(
  userId: string,
  transactionType: 'earned' | 'spent',
  source: PointsTrackingDocument['source'],
  pointsAmount: number,
  description: string,
  sourceDetails: any = {},
  metadata: any = {}
): Promise<PointsTrackingDocument> {
  try {
    // Obtener balance actual del usuario
    const UserModel = mongoose.model('User');
    const user = await UserModel.findById(userId).select('pointsSmart');
    const balanceBefore = user?.pointsSmart || 0;
    const balanceAfter = transactionType === 'earned' 
      ? balanceBefore + pointsAmount 
      : balanceBefore - pointsAmount;

    const tracking = new PointsTrackingModel({
      userId: new mongoose.Types.ObjectId(userId),
      transactionType,
      source,
      sourceDetails,
      pointsAmount,
      balanceBefore,
      balanceAfter,
      description,
      metadata: {
        platform: 'mobile',
        sessionId: metadata.sessionId || `session_${Date.now()}`,
        ...metadata
      }
    });

    await tracking.save();
    
    console.log(`📊 Points tracked: ${transactionType} ${pointsAmount} pts from ${source} for user ${userId}`);
    
    return tracking;
  } catch (error) {
    console.error('Error tracking points transaction:', error);
    throw error;
  }
}

// Función para obtener estadísticas de puntos
export async function getPointsStats(userId?: string, days: number = 30) {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const matchFilter: any = {
      createdAt: { $gte: startDate }
    };
    
    if (userId) {
      matchFilter.userId = new mongoose.Types.ObjectId(userId);
    }

    const stats = await PointsTrackingModel.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: {
            source: '$source',
            transactionType: '$transactionType'
          },
          totalPoints: { $sum: '$pointsAmount' },
          totalTransactions: { $sum: 1 },
          avgPoints: { $avg: '$pointsAmount' }
        }
      },
      {
        $group: {
          _id: '$_id.source',
          earned: {
            $sum: {
              $cond: [
                { $eq: ['$_id.transactionType', 'earned'] },
                '$totalPoints',
                0
              ]
            }
          },
          spent: {
            $sum: {
              $cond: [
                { $eq: ['$_id.transactionType', 'spent'] },
                '$totalPoints',
                0
              ]
            }
          },
          transactions: { $sum: '$totalTransactions' }
        }
      }
    ]);

    return stats;
  } catch (error) {
    console.error('Error getting points stats:', error);
    return [];
  }
}

// Función para obtener historial de puntos de un usuario
export async function getUserPointsHistory(
  userId: string, 
  page: number = 1, 
  limit: number = 50,
  source?: string,
  transactionType?: 'earned' | 'spent'
) {
  try {
    const skip = (page - 1) * limit;
    const filter: any = { userId: new mongoose.Types.ObjectId(userId) };
    
    if (source) filter.source = source;
    if (transactionType) filter.transactionType = transactionType;

    const [transactions, total] = await Promise.all([
      PointsTrackingModel.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      PointsTrackingModel.countDocuments(filter)
    ]);

    return {
      transactions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  } catch (error) {
    console.error('Error getting user points history:', error);
    return { transactions: [], pagination: { page: 1, limit, total: 0, totalPages: 0 } };
  }
}
