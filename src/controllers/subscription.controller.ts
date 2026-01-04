import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { SubscriptionModel } from '../models/subscription.model';
import { UserModel } from '../models/user.model';
import { UserPointsModel } from '../models/game.model';
import { sendOk, sendError } from '../utils/response';

export class SubscriptionController {
  // Obtener estado de suscripción del usuario
  static async getSubscriptionStatus(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;

      const subscription = await SubscriptionModel.findOne({ userId })
        .sort({ createdAt: -1 });

      if (!subscription) {
        return sendOk(res, {
          hasSubscription: false,
          type: null,
          status: null,
          message: 'No tienes suscripción activa'
        });
      }

      return sendOk(res, {
        hasSubscription: (subscription as any).isActive,
        subscription: {
          type: subscription.type,
          status: subscription.status,
          startDate: subscription.startDate,
          endDate: subscription.endDate,
          daysRemaining: (subscription as any).getDaysRemaining(),
          benefits: subscription.benefits,
          autoRenew: subscription.autoRenew,
          transactionId: subscription.transactionId,
          price: subscription.price,
          currency: subscription.currency
        }
      });
    } catch (error) {
      return sendError(res, 'Error obteniendo estado de suscripción', 500);
    }
  }

  // Crear suscripción MetroPremium
  static async createSubscription(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const { paymentMethod, transactionId, tokenId } = req.body;

      // Verificar si ya tiene suscripción activa
      const existingSubscription = await SubscriptionModel.findOne({
        userId,
        status: 'active',
        endDate: { $gt: new Date() }
      });

      if (existingSubscription) {
        return sendError(res, 'Ya tienes una suscripción activa', 400);
      }

      // Crear nueva suscripción
      const startDate = new Date();
      const endDate = new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 días

      const subscription = new SubscriptionModel({
        userId,
        type: 'MetroPremium',
        status: 'active',
        startDate,
        endDate,
        price: 9.90,
        currency: 'PEN',
        paymentMethod,
        transactionId,
        benefits: [
          {
            name: 'Buscas Chamba?',
            description: 'Acceso exclusivo a ofertas laborales de Lima',
            isActive: true
          },
          {
            name: 'Micro-cursos',
            description: 'Capacítate con cursos cortos y certificados',
            isActive: true
          },
          {
            name: 'Streaming IRL Exclusivo',
            description: 'Streamers peruanos en vivo desde el metro',
            isActive: true
          },
          {
            name: 'Bonificación Diaria',
            description: '50 puntos diarios automáticos',
            isActive: true
          },
          {
            name: 'Ofertas Smart Prioritarias',
            description: 'Acceso anticipado a las mejores ofertas',
            isActive: true
          },
          {
            name: 'Sin Anuncios Premium',
            description: 'Disfruta contenido sin interrupciones',
            isActive: true
          }
        ]
      });

      await subscription.save();

      // Actualizar usuario para reflejar suscripción
      await UserModel.findByIdAndUpdate(userId, {
        hasMetroPremium: true,
        metroPremiumExpiry: endDate
      });

      // Otorgar puntos de bienvenida
      const welcomePoints = new UserPointsModel({
        userId,
        action: 'premium_bonus',
        points: 100,
        description: 'Bienvenida a MetroPremium',
        metadata: {
          subscriptionId: subscription._id,
          type: 'welcome_bonus'
        }
      });
      await welcomePoints.save();

      // Actualizar puntos del usuario
      await UserModel.findByIdAndUpdate(userId, {
        $inc: { points: 100 }
      });

      return sendOk(res, {
        message: '¡Suscripción MetroPremium activada exitosamente!',
        subscription,
        welcomePoints: 100
      }, 201);
    } catch (error) {
      console.error('Error creating subscription:', error);
      return sendError(res, 'Error creando suscripción', 500);
    }
  }

  // Cancelar suscripción
  static async cancelSubscription(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const { reason } = req.body;

      const subscription = await SubscriptionModel.findOne({
        userId,
        status: 'active'
      });

      if (!subscription) {
        return sendError(res, 'No tienes suscripción activa', 404);
      }

      // Actualizar suscripción
      subscription.status = 'cancelled';
      subscription.cancelledAt = new Date();
      subscription.cancelReason = reason || 'Sin motivo especificado';
      subscription.autoRenew = false;
      await subscription.save();

      // Actualizar usuario
      await UserModel.findByIdAndUpdate(userId, {
        hasMetroPremium: false,
        metroPremiumExpiry: null
      });

      return sendOk(res, {
        message: 'Suscripción cancelada exitosamente',
        validUntil: subscription.endDate
      });
    } catch (error) {
      return sendError(res, 'Error cancelando suscripción', 500);
    }
  }

  // Otorgar puntos diarios de MetroPremium
  static async grantDailyPremiumPoints(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;

      // Verificar suscripción activa
      const subscription = await SubscriptionModel.findOne({
        userId,
        status: 'active',
        endDate: { $gt: new Date() }
      });

      if (!subscription) {
        return sendError(res, 'No tienes suscripción MetroPremium activa', 403);
      }

      // Verificar si ya recibió puntos hoy
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const todayPoints = await UserPointsModel.findOne({
        userId,
        action: 'premium_bonus',
        createdAt: { $gte: today }
      });

      if (todayPoints) {
        return sendError(res, 'Ya recibiste tus puntos diarios hoy', 400);
      }

      // Otorgar puntos diarios
      const dailyPoints = new UserPointsModel({
        userId,
        action: 'premium_bonus',
        points: 50,
        description: 'Bonificación diaria MetroPremium',
        metadata: {
          subscriptionId: subscription._id,
          type: 'daily_bonus'
        }
      });
      await dailyPoints.save();

      // Actualizar puntos del usuario
      const user = await UserModel.findByIdAndUpdate(userId, {
        $inc: { points: 50 }
      }, { new: true });

      return sendOk(res, {
        pointsGranted: 50,
        newTotal: user?.pointsSmart || 0,
        message: '¡50 puntos diarios otorgados!'
      });
    } catch (error) {
      return sendError(res, 'Error otorgando puntos diarios', 500);
    }
  }

  // ADMIN: Obtener todas las suscripciones
  static async getAllSubscriptions(req: AuthenticatedRequest, res: Response) {
    try {
      const { page = 1, limit = 20, status } = req.query;

      const filters: any = {};
      if (status) filters.status = status;

      const subscriptions = await SubscriptionModel.find(filters)
        .populate('userId', 'phone email createdAt')
        .sort({ createdAt: -1 })
        .limit(Number(limit))
        .skip((Number(page) - 1) * Number(limit));

      const total = await SubscriptionModel.countDocuments(filters);

      return sendOk(res, {
        subscriptions,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      });
    } catch (error) {
      return sendError(res, 'Error obteniendo suscripciones', 500);
    }
  }

  // ADMIN: Estadísticas de suscripciones
  static async getSubscriptionStats(req: Request, res: Response) {
    try {
      const [
        totalSubscriptions,
        activeSubscriptions,
        monthlyRevenue,
        churnRate,
        subscriptionsByMonth
      ] = await Promise.all([
        SubscriptionModel.countDocuments(),
        SubscriptionModel.countDocuments({ 
          status: 'active', 
          endDate: { $gt: new Date() } 
        }),
        SubscriptionModel.aggregate([
          {
            $match: {
              status: 'active',
              createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
            }
          },
          {
            $group: {
              _id: null,
              revenue: { $sum: '$price' }
            }
          }
        ]),
        calculateChurnRate(),
        SubscriptionModel.aggregate([
          {
            $group: {
              _id: {
                year: { $year: '$createdAt' },
                month: { $month: '$createdAt' }
              },
              count: { $sum: 1 },
              revenue: { $sum: '$price' }
            }
          },
          { $sort: { '_id.year': -1, '_id.month': -1 } },
          { $limit: 12 }
        ])
      ]);

      return sendOk(res, {
        totalSubscriptions,
        activeSubscriptions,
        cancelledSubscriptions: totalSubscriptions - activeSubscriptions,
        monthlyRevenue: monthlyRevenue[0]?.revenue || 0,
        churnRate,
        subscriptionsByMonth
      });
    } catch (error) {
      return sendError(res, 'Error obteniendo estadísticas', 500);
    }
  }
}

// Función auxiliar para calcular tasa de cancelación
async function calculateChurnRate(): Promise<number> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  
  const [totalLastMonth, cancelledLastMonth] = await Promise.all([
    SubscriptionModel.countDocuments({
      createdAt: { $gte: thirtyDaysAgo }
    }),
    SubscriptionModel.countDocuments({
      status: 'cancelled',
      cancelledAt: { $gte: thirtyDaysAgo }
    })
  ]);

  return totalLastMonth > 0 ? (cancelledLastMonth / totalLastMonth) * 100 : 0;
}
