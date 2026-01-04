import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { AuthenticatedRequest } from '../middleware/auth';
import { PremiumSubscriptionModel, PREMIUM_PRICING, PREMIUM_BENEFITS } from '../models/premium-subscription.model';
import { getPaymentConfig, updatePaymentConfig } from '../models/payment-config.model';
import { UserModel } from '../models/user.model';
import { PointsService } from '../services/points.service';
import { NotificationHelpers } from '../services/notification.service';
import { sendOk, sendError, sendCreated } from '../utils/response';

export class PremiumController {

  // Obtener números de pago (público)
  static async getPaymentNumbers(req: Request, res: Response) {
    try {
      const config = await getPaymentConfig();
      return sendOk(res, {
        yapeNumber: config.yapeNumber,
        plinNumber: config.plinNumber
      });
    } catch (error) {
      console.error('Error getting payment numbers:', error);
      return sendError(res, 'Error obteniendo números de pago', 500);
    }
  }

  // Obtener planes y precios
  static async getPlans(req: Request, res: Response) {
    try {
      const plans = Object.entries(PREMIUM_PRICING).map(([key, config]) => ({
        id: key,
        name: config.description,
        price: config.price,
        discount: config.discount,
        duration: key === 'monthly' ? 1 : key === 'quarterly' ? 3 : 12,
        unit: 'months',
        popular: key === 'quarterly'
      }));

      return sendOk(res, {
        plans,
        benefits: PREMIUM_BENEFITS,
        currency: 'PEN'
      });
    } catch (error) {
      console.error('Error getting plans:', error);
      return sendError(res, 'Error obteniendo planes', 500);
    }
  }

  // Crear suscripción pendiente de pago
  static async createSubscription(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const { plan, paymentMethod } = req.body;

      if (!userId) {
        return sendError(res, 'Usuario no autenticado', 401);
      }

      if (!PREMIUM_PRICING[plan as keyof typeof PREMIUM_PRICING]) {
        return sendError(res, 'Plan inválido', 400);
      }

      // Permitir método yape_plin para el nuevo sistema
      if (!['yape', 'plin', 'yape_plin'].includes(paymentMethod)) {
        return sendError(res, 'Método de pago inválido', 400);
      }

      // Verificar si ya tiene suscripción activa
      const existingSubscription = await PremiumSubscriptionModel.findOne({
        userId: new mongoose.Types.ObjectId(userId),
        status: { $in: ['active', 'pending_payment'] }
      });

      if (existingSubscription) {
        return sendError(res, 'Ya tienes una suscripción activa o pendiente', 400);
      }

      const planConfig = PREMIUM_PRICING[plan as keyof typeof PREMIUM_PRICING];
      const startDate = new Date();
      const endDate = new Date();
      
      if (plan === 'monthly') {
        endDate.setMonth(endDate.getMonth() + 1);
      } else if (plan === 'quarterly') {
        endDate.setMonth(endDate.getMonth() + 3);
      } else if (plan === 'yearly') {
        endDate.setFullYear(endDate.getFullYear() + 1);
      }

      const subscription = new PremiumSubscriptionModel({
        userId: new mongoose.Types.ObjectId(userId),
        plan,
        status: 'pending_payment',
        startDate,
        endDate,
        price: planConfig.price,
        currency: 'PEN',
        paymentMethod,
        benefits: {
          noAds: true,
          jobSearch: true,
          microCourses: true,
          irlExclusive: true,
          dailyPoints: 50,
          premiumDiscounts: true
        },
        autoRenewal: false,
        metadata: {
          activatedBy: 'payment',
          originalPrice: planConfig.price
        }
      });

      await subscription.save();

      return sendCreated(res, {
        subscription: {
          id: subscription._id,
          plan: subscription.plan,
          price: subscription.price,
          paymentMethod: subscription.paymentMethod,
          status: subscription.status
        },
        paymentInfo: {
          amount: planConfig.price,
          currency: 'PEN',
          reference: subscription._id.toString(),
          instructions: paymentMethod === 'yape' 
            ? 'Realiza el pago por Yape y sube el comprobante'
            : 'Realiza el pago por Plin y sube el comprobante'
        }
      });
    } catch (error) {
      console.error('Error creating subscription:', error);
      return sendError(res, 'Error creando suscripción', 500);
    }
  }

  // Confirmar pago con comprobante
  static async confirmPayment(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const { subscriptionId, paymentReference, paymentProof } = req.body;

      if (!userId) {
        return sendError(res, 'Usuario no autenticado', 401);
      }

      const subscription = await PremiumSubscriptionModel.findOne({
        _id: subscriptionId,
        userId: new mongoose.Types.ObjectId(userId),
        status: 'pending_payment'
      });

      if (!subscription) {
        return sendError(res, 'Suscripción no encontrada o ya procesada', 404);
      }

      // Actualizar con información de pago
      subscription.paymentReference = paymentReference;
      subscription.paymentProof = paymentProof;
      subscription.status = 'active';
      await subscription.save();

      // Enviar notificación de activación
      await NotificationHelpers.sendToUser(
        userId,
        {
          title: '🌟 ¡Metro Premium Activado!',
          body: 'Tu suscripción Premium está activa. Disfruta de todos los beneficios.',
          type: 'premium_activated',
          data: { subscriptionId: subscription._id },
          actionUrl: '/profile'
        }
      );

      return sendOk(res, {
        message: 'Pago confirmado y Premium activado',
        subscription: {
          id: subscription._id,
          status: subscription.status,
          endDate: subscription.endDate
        }
      });
    } catch (error) {
      console.error('Error confirming payment:', error);
      return sendError(res, 'Error confirmando pago', 500);
    }
  }

  // Obtener suscripción del usuario
  static async getUserSubscription(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return sendError(res, 'Usuario no autenticado', 401);
      }

      const subscription = await PremiumSubscriptionModel.findOne({
        userId: new mongoose.Types.ObjectId(userId),
        status: { $in: ['active', 'pending_payment'] }
      }).sort({ createdAt: -1 });

      const user = await UserModel.findById(userId).select('hasMetroPremium metroPremiumExpiry');

      return sendOk(res, {
        subscription,
        user: {
          hasMetroPremium: user?.hasMetroPremium || false,
          metroPremiumExpiry: user?.metroPremiumExpiry
        },
        benefits: PREMIUM_BENEFITS
      });
    } catch (error) {
      console.error('Error getting user subscription:', error);
      return sendError(res, 'Error obteniendo suscripción', 500);
    }
  }

  // Activar Premium por admin
  static async activatePremiumByAdmin(req: AuthenticatedRequest, res: Response) {
    try {
      const { userId } = req.params;
      const { plan = 'monthly', duration = 1 } = req.body;

      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return sendError(res, 'ID de usuario inválido', 400);
      }

      const user = await UserModel.findById(userId);
      if (!user) {
        return sendError(res, 'Usuario no encontrado', 404);
      }

      const startDate = new Date();
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + duration);

      const subscription = new PremiumSubscriptionModel({
        userId: new mongoose.Types.ObjectId(userId),
        plan,
        status: 'active',
        startDate,
        endDate,
        price: 0,
        currency: 'PEN',
        paymentMethod: 'admin',
        benefits: {
          noAds: true,
          jobSearch: true,
          microCourses: true,
          irlExclusive: true,
          dailyPoints: 50,
          premiumDiscounts: true
        },
        autoRenewal: false,
        metadata: {
          activatedBy: 'admin'
        }
      });

      await subscription.save();

      // Enviar notificación
      await NotificationHelpers.sendToUser(
        userId,
        {
          title: '🎁 ¡Metro Premium Activado!',
          body: `Has recibido Metro Premium por ${duration} mes(es). ¡Disfruta todos los beneficios!`,
          type: 'premium_gift',
          data: { duration, activatedBy: 'admin' },
          actionUrl: '/profile'
        }
      );

      return sendOk(res, {
        message: 'Metro Premium activado exitosamente',
        subscription: {
          id: subscription._id,
          status: subscription.status,
          endDate: subscription.endDate
        }
      });
    } catch (error) {
      console.error('Error activating premium by admin:', error);
      return sendError(res, 'Error activando Premium', 500);
    }
  }

  // Cancelar suscripción
  static async cancelSubscription(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const { reason } = req.body;

      if (!userId) {
        return sendError(res, 'Usuario no autenticado', 401);
      }

      const subscription = await PremiumSubscriptionModel.findOne({
        userId: new mongoose.Types.ObjectId(userId),
        status: 'active'
      });

      if (!subscription) {
        return sendError(res, 'No tienes suscripción activa', 404);
      }

      subscription.status = 'cancelled';
      subscription.cancelledAt = new Date();
      subscription.cancelReason = reason;
      subscription.autoRenewal = false;
      await subscription.save();

      return sendOk(res, {
        message: 'Suscripción cancelada. Seguirás teniendo Premium hasta la fecha de vencimiento.',
        endDate: subscription.endDate
      });
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      return sendError(res, 'Error cancelando suscripción', 500);
    }
  }

  // Estadísticas de Premium para admin
  static async getPremiumStats(req: AuthenticatedRequest, res: Response) {
    try {
      const [
        totalSubscriptions,
        activeSubscriptions,
        pendingPayments,
        monthlyRevenue,
        recentSubscriptions
      ] = await Promise.all([
        PremiumSubscriptionModel.countDocuments(),
        PremiumSubscriptionModel.countDocuments({ status: 'active' }),
        PremiumSubscriptionModel.countDocuments({ status: 'pending_payment' }),
        PremiumSubscriptionModel.aggregate([
          {
            $match: {
              status: 'active',
              createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
            }
          },
          { $group: { _id: null, total: { $sum: '$price' } } }
        ]),
        PremiumSubscriptionModel.find({ status: 'active' })
          .populate('userId', 'displayName phone')
          .sort({ createdAt: -1 })
          .limit(10)
          .lean()
      ]);

      return sendOk(res, {
        totalSubscriptions,
        activeSubscriptions,
        pendingPayments,
        monthlyRevenue: monthlyRevenue[0]?.total || 0,
        conversionRate: totalSubscriptions > 0 
          ? ((activeSubscriptions / totalSubscriptions) * 100).toFixed(1)
          : '0.0',
        recentSubscriptions
      });
    } catch (error) {
      console.error('Error getting premium stats:', error);
      return sendError(res, 'Error obteniendo estadísticas', 500);
    }
  }

  // Obtener todas las suscripciones para admin
  static async getAllSubscriptions(req: AuthenticatedRequest, res: Response) {
    try {
      const subscriptions = await PremiumSubscriptionModel.find()
        .populate('userId', 'displayName phone email')
        .sort({ createdAt: -1 })
        .lean();

      const formattedSubscriptions = subscriptions.map(sub => ({
        ...sub,
        user: sub.userId
      }));

      return sendOk(res, formattedSubscriptions);
    } catch (error) {
      console.error('Error getting all subscriptions:', error);
      return sendError(res, 'Error obteniendo suscripciones', 500);
    }
  }

  // Aprobar pago pendiente
  static async approvePayment(req: AuthenticatedRequest, res: Response) {
    try {
      const { subscriptionId } = req.params;

      const subscription = await PremiumSubscriptionModel.findById(subscriptionId);
      if (!subscription) {
        return sendError(res, 'Suscripción no encontrada', 404);
      }

      subscription.status = 'active';
      await subscription.save();

      // Enviar notificación al usuario
      await NotificationHelpers.sendToUser(
        subscription.userId.toString(),
        {
          title: '🎉 ¡Pago Aprobado!',
          body: 'Tu suscripción Metro Premium está activa. ¡Disfruta todos los beneficios!',
          type: 'premium_approved',
          data: { subscriptionId: subscription._id },
          actionUrl: '/profile'
        }
      );

      return sendOk(res, { message: 'Pago aprobado y Premium activado' });
    } catch (error) {
      console.error('Error approving payment:', error);
      return sendError(res, 'Error aprobando pago', 500);
    }
  }

  // Rechazar pago pendiente
  static async rejectPayment(req: AuthenticatedRequest, res: Response) {
    try {
      const { subscriptionId } = req.params;
      const { reason } = req.body;

      const subscription = await PremiumSubscriptionModel.findById(subscriptionId);
      if (!subscription) {
        return sendError(res, 'Suscripción no encontrada', 404);
      }

      subscription.status = 'cancelled';
      subscription.cancelledAt = new Date();
      subscription.cancelReason = reason || 'Rechazado por administrador';
      await subscription.save();

      // Enviar notificación al usuario
      await NotificationHelpers.sendToUser(
        subscription.userId.toString(),
        {
          title: '❌ Pago Rechazado',
          body: `Tu solicitud de Premium fue rechazada. Motivo: ${reason || 'Comprobante inválido'}`,
          type: 'premium_rejected',
          data: { subscriptionId: subscription._id, reason },
          actionUrl: '/subscription'
        }
      );

      return sendOk(res, { message: 'Pago rechazado' });
    } catch (error) {
      console.error('Error rejecting payment:', error);
      return sendError(res, 'Error rechazando pago', 500);
    }
  }

  // Obtener configuración de pagos
  static async getPaymentConfig(req: AuthenticatedRequest, res: Response) {
    try {
      const config = await getPaymentConfig();
      return sendOk(res, config);
    } catch (error) {
      console.error('Error getting payment config:', error);
      return sendError(res, 'Error obteniendo configuración', 500);
    }
  }

  // Actualizar configuración de pagos
  static async updatePaymentConfig(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const { yapeNumber, plinNumber } = req.body;

      if (!userId) {
        return sendError(res, 'Usuario no autenticado', 401);
      }

      // Validar números
      if (!yapeNumber || !plinNumber) {
        return sendError(res, 'Números de Yape y Plin son requeridos', 400);
      }

      // Validar formato de números (básico)
      const phoneRegex = /^\d{3}-\d{3}-\d{3}$/;
      if (!phoneRegex.test(yapeNumber) || !phoneRegex.test(plinNumber)) {
        return sendError(res, 'Formato de número inválido (debe ser: 999-999-999)', 400);
      }

      await updatePaymentConfig(yapeNumber, plinNumber, userId);

      return sendOk(res, {
        message: 'Configuración actualizada exitosamente',
        config: { yapeNumber, plinNumber }
      });
    } catch (error) {
      console.error('Error updating payment config:', error);
      return sendError(res, 'Error actualizando configuración', 500);
    }
  }
}
