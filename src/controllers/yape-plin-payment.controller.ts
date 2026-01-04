import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { sendError, sendOk, sendCreated } from '../utils/response';
import { 
  YapePlinPaymentModel, 
  PaymentConfigModel,
  generatePaymentCode,
  calculateExpirationTime,
  DEFAULT_PAYMENT_CONFIG
} from '../models/yape-plin-payment.model';
import { PremiumSubscriptionModel, PREMIUM_PRICING } from '../models/premium-subscription.model';
import { UserModel } from '../models/user.model';
import { NotificationHelpers } from '../services/notification.service';
import mongoose from 'mongoose';

export class YapePlinPaymentController {
  
  // Obtener configuración de números de pago
  static async getPaymentConfig(req: Request, res: Response) {
    try {
      let config = await PaymentConfigModel.findOne({ isActive: true });
      
      if (!config) {
        // Crear configuración por defecto si no existe
        config = new PaymentConfigModel({
          ...DEFAULT_PAYMENT_CONFIG,
          updatedBy: new mongoose.Types.ObjectId() // ID temporal
        });
        await config.save();
      }

      return sendOk(res, {
        yapeNumber: config.yapeNumber,
        plinNumber: config.plinNumber,
        qrCodeYape: config.qrCodeYape,
        qrCodePlin: config.qrCodePlin
      });
    } catch (error) {
      console.error('Error getting payment config:', error);
      return sendError(res, 'Error obteniendo configuración de pagos', 500);
    }
  }

  // Crear pago pendiente para suscripción
  static async createPayment(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const { subscriptionId, paymentMethod } = req.body;

      if (!userId) {
        return sendError(res, 'Usuario no autenticado', 401);
      }

      if (!['yape', 'plin'].includes(paymentMethod)) {
        return sendError(res, 'Método de pago inválido. Use "yape" o "plin"', 400);
      }

      // Verificar que la suscripción existe y está pendiente
      const subscription = await PremiumSubscriptionModel.findOne({
        _id: subscriptionId,
        userId: new mongoose.Types.ObjectId(userId),
        status: 'pending_payment'
      });

      if (!subscription) {
        return sendError(res, 'Suscripción no encontrada o ya procesada', 404);
      }

      // Verificar que no hay un pago pendiente para esta suscripción
      const existingPayment = await YapePlinPaymentModel.findOne({
        subscriptionId,
        status: 'pending'
      });

      if (existingPayment) {
        return sendError(res, 'Ya existe un pago pendiente para esta suscripción', 400);
      }

      // Obtener configuración de números
      const config = await PaymentConfigModel.findOne({ isActive: true });
      if (!config) {
        return sendError(res, 'Configuración de pagos no disponible', 500);
      }

      const user = await UserModel.findById(userId);
      if (!user) {
        return sendError(res, 'Usuario no encontrado', 404);
      }

      // Crear pago pendiente
      const paymentCode = generatePaymentCode();
      const expiresAt = calculateExpirationTime();
      const targetNumber = paymentMethod === 'yape' ? config.yapeNumber : config.plinNumber;

      const payment = new YapePlinPaymentModel({
        userId: new mongoose.Types.ObjectId(userId),
        subscriptionId: new mongoose.Types.ObjectId(subscriptionId),
        paymentMethod,
        amount: subscription.price,
        currency: subscription.currency,
        status: 'pending',
        paymentCode,
        phoneNumber: user.phone,
        targetNumber,
        expiresAt,
        metadata: {
          plan: subscription.plan,
          originalPrice: subscription.price,
          discount: 0,
          finalPrice: subscription.price
        }
      });

      await payment.save();

      return sendCreated(res, {
        paymentId: payment._id,
        paymentCode,
        paymentMethod,
        amount: payment.amount,
        currency: payment.currency,
        targetNumber,
        expiresAt,
        instructions: paymentMethod === 'yape' 
          ? `Envía S/ ${payment.amount} al número ${targetNumber} por Yape con el código: ${paymentCode}`
          : `Envía S/ ${payment.amount} al número ${targetNumber} por Plin con el código: ${paymentCode}`,
        qrCode: paymentMethod === 'yape' ? config.qrCodeYape : config.qrCodePlin
      });

    } catch (error) {
      console.error('Error creating payment:', error);
      return sendError(res, 'Error creando pago', 500);
    }
  }

  // Subir comprobante de pago
  static async uploadPaymentProof(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const { paymentId } = req.params;
      const { proofImageUrl, notes } = req.body;

      if (!proofImageUrl) {
        return sendError(res, 'Imagen de comprobante requerida', 400);
      }

      const payment = await YapePlinPaymentModel.findOne({
        _id: paymentId,
        userId: new mongoose.Types.ObjectId(userId),
        status: 'pending'
      });

      if (!payment) {
        return sendError(res, 'Pago no encontrado o ya procesado', 404);
      }

      // Verificar que no haya expirado
      if (payment.expiresAt < new Date()) {
        await YapePlinPaymentModel.findByIdAndUpdate(paymentId, { status: 'expired' });
        return sendError(res, 'El pago ha expirado', 400);
      }

      // Actualizar pago con comprobante
      await YapePlinPaymentModel.findByIdAndUpdate(paymentId, {
        paymentProof: proofImageUrl,
        verificationNotes: notes,
        status: 'pending' // Mantener pending hasta que admin verifique
      });

      // Notificar a admins sobre nuevo comprobante
      // Por ahora omitimos la notificación, se puede implementar después
      console.log(`📄 Nuevo comprobante: Usuario ${payment.phoneNumber} - ${payment.paymentMethod.toUpperCase()} - S/ ${payment.amount}`);

      return sendOk(res, {
        message: 'Comprobante subido exitosamente. Será verificado en breve.',
        paymentId,
        status: 'pending_verification'
      });

    } catch (error) {
      console.error('Error uploading payment proof:', error);
      return sendError(res, 'Error subiendo comprobante', 500);
    }
  }

  // Verificar pago (Admin)
  static async verifyPayment(req: AuthenticatedRequest, res: Response) {
    try {
      const adminId = req.user?.id;
      const { paymentId } = req.params;
      const { isVerified, notes } = req.body;

      // Solo admins pueden verificar pagos
      if (req.user?.role !== 'admin') {
        return sendError(res, 'Solo administradores pueden verificar pagos', 403);
      }

      const payment = await YapePlinPaymentModel.findById(paymentId)
        .populate('subscriptionId')
        .populate('userId', 'displayName phone email');

      if (!payment) {
        return sendError(res, 'Pago no encontrado', 404);
      }

      const newStatus = isVerified ? 'verified' : 'rejected';
      
      // Actualizar pago
      await YapePlinPaymentModel.findByIdAndUpdate(paymentId, {
        status: newStatus,
        verifiedBy: new mongoose.Types.ObjectId(adminId),
        verificationNotes: notes,
        paidAt: isVerified ? new Date() : undefined
      });

      if (isVerified) {
        // Activar suscripción
        await PremiumSubscriptionModel.findByIdAndUpdate(payment.subscriptionId, {
          status: 'active',
          paymentMethod: payment.paymentMethod,
          activatedAt: new Date()
        });

        // Actualizar usuario
        const subscription = payment.subscriptionId as any;
        await UserModel.findByIdAndUpdate(payment.userId, {
          hasMetroPremium: true,
          metroPremiumExpiry: subscription.endDate.toISOString()
        });

        // Notificar al usuario
        await NotificationHelpers.sendToUser(payment.userId.toString(), {
          title: '🎉 ¡Metro Premium Activado!',
          body: `Tu suscripción ${subscription.plan} ha sido activada exitosamente`,
          type: 'premium_activated',
          data: { subscriptionId: subscription._id, plan: subscription.plan }
        });
      } else {
        // Notificar rechazo
        await NotificationHelpers.sendToUser(payment.userId.toString(), {
          title: '❌ Pago Rechazado',
          body: `Tu comprobante de pago fue rechazado. ${notes || 'Contacta soporte para más información.'}`,
          type: 'payment_rejected',
          data: { paymentId, reason: notes }
        });
      }

      return sendOk(res, {
        message: isVerified ? 'Pago verificado y suscripción activada' : 'Pago rechazado',
        payment: {
          id: payment._id,
          status: newStatus,
          verifiedAt: new Date(),
          verifiedBy: adminId
        }
      });

    } catch (error) {
      console.error('Error verifying payment:', error);
      return sendError(res, 'Error verificando pago', 500);
    }
  }

  // Obtener pagos pendientes (Admin)
  static async getPendingPayments(req: AuthenticatedRequest, res: Response) {
    try {
      // Solo admins pueden ver pagos pendientes
      if (req.user?.role !== 'admin') {
        return sendError(res, 'Solo administradores pueden ver pagos pendientes', 403);
      }

      const { page = 1, limit = 20, status = 'pending' } = req.query;
      const skip = (Number(page) - 1) * Number(limit);

      const [payments, total] = await Promise.all([
        YapePlinPaymentModel.find({ status })
          .populate('userId', 'displayName phone email')
          .populate('subscriptionId', 'plan price')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(Number(limit)),
        
        YapePlinPaymentModel.countDocuments({ status })
      ]);

      return sendOk(res, {
        payments: payments.map(payment => ({
          id: payment._id,
          paymentCode: payment.paymentCode,
          paymentMethod: payment.paymentMethod,
          amount: payment.amount,
          currency: payment.currency,
          status: payment.status,
          expiresAt: payment.expiresAt,
          createdAt: (payment as any).createdAt,
          paymentProof: payment.paymentProof,
          verificationNotes: payment.verificationNotes,
          user: {
            id: (payment.userId as any)._id,
            name: (payment.userId as any).displayName,
            phone: (payment.userId as any).phone,
            email: (payment.userId as any).email
          },
          subscription: {
            id: (payment.subscriptionId as any)._id,
            plan: (payment.subscriptionId as any).plan,
            price: (payment.subscriptionId as any).price
          },
          metadata: payment.metadata
        })),
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      });

    } catch (error) {
      console.error('Error getting pending payments:', error);
      return sendError(res, 'Error obteniendo pagos pendientes', 500);
    }
  }

  // Obtener historial de pagos del usuario
  static async getUserPayments(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const { page = 1, limit = 10 } = req.query;
      const skip = (Number(page) - 1) * Number(limit);

      const [payments, total] = await Promise.all([
        YapePlinPaymentModel.find({ userId: new mongoose.Types.ObjectId(userId) })
          .populate('subscriptionId', 'plan price startDate endDate')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(Number(limit)),
        
        YapePlinPaymentModel.countDocuments({ userId: new mongoose.Types.ObjectId(userId) })
      ]);

      return sendOk(res, {
        payments: payments.map(payment => ({
          id: payment._id,
          paymentCode: payment.paymentCode,
          paymentMethod: payment.paymentMethod,
          amount: payment.amount,
          status: payment.status,
          createdAt: (payment as any).createdAt,
          expiresAt: payment.expiresAt,
          paidAt: payment.paidAt,
          subscription: {
            plan: (payment.subscriptionId as any).plan,
            price: (payment.subscriptionId as any).price,
            startDate: (payment.subscriptionId as any).startDate,
            endDate: (payment.subscriptionId as any).endDate
          }
        })),
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      });

    } catch (error) {
      console.error('Error getting user payments:', error);
      return sendError(res, 'Error obteniendo historial de pagos', 500);
    }
  }

  // Actualizar configuración de números (Admin)
  static async updatePaymentConfig(req: AuthenticatedRequest, res: Response) {
    try {
      const adminId = req.user?.id;
      const { yapeNumber, plinNumber, qrCodeYape, qrCodePlin } = req.body;

      // Solo admins pueden actualizar configuración
      if (req.user?.role !== 'admin') {
        return sendError(res, 'Solo administradores pueden actualizar configuración', 403);
      }

      // Validar números de teléfono peruanos
      const phoneRegex = /^(\+51)?9\d{8}$/;
      if (yapeNumber && !phoneRegex.test(yapeNumber)) {
        return sendError(res, 'Número de Yape inválido', 400);
      }
      if (plinNumber && !phoneRegex.test(plinNumber)) {
        return sendError(res, 'Número de Plin inválido', 400);
      }

      // Desactivar configuración anterior
      await PaymentConfigModel.updateMany({}, { isActive: false });

      // Crear nueva configuración
      const newConfig = new PaymentConfigModel({
        yapeNumber: yapeNumber || DEFAULT_PAYMENT_CONFIG.yapeNumber,
        plinNumber: plinNumber || DEFAULT_PAYMENT_CONFIG.plinNumber,
        qrCodeYape,
        qrCodePlin,
        isActive: true,
        updatedBy: new mongoose.Types.ObjectId(adminId)
      });

      await newConfig.save();

      return sendOk(res, {
        message: 'Configuración de pagos actualizada exitosamente',
        config: {
          yapeNumber: newConfig.yapeNumber,
          plinNumber: newConfig.plinNumber,
          qrCodeYape: newConfig.qrCodeYape,
          qrCodePlin: newConfig.qrCodePlin,
          lastUpdated: newConfig.lastUpdated
        }
      });

    } catch (error) {
      console.error('Error updating payment config:', error);
      return sendError(res, 'Error actualizando configuración', 500);
    }
  }

  // Obtener estadísticas de pagos (Admin)
  static async getPaymentStats(req: AuthenticatedRequest, res: Response) {
    try {
      // Solo admins pueden ver estadísticas
      if (req.user?.role !== 'admin') {
        return sendError(res, 'Solo administradores pueden ver estadísticas', 403);
      }

      const { period = '30d' } = req.query;
      
      const now = new Date();
      let startDate: Date;
      
      switch (period) {
        case '7d':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case '90d':
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }

      const [
        totalPayments,
        verifiedPayments,
        pendingPayments,
        rejectedPayments,
        totalRevenue,
        paymentsByMethod,
        dailyStats
      ] = await Promise.all([
        YapePlinPaymentModel.countDocuments({ createdAt: { $gte: startDate } }),
        YapePlinPaymentModel.countDocuments({ status: 'verified', createdAt: { $gte: startDate } }),
        YapePlinPaymentModel.countDocuments({ status: 'pending', createdAt: { $gte: startDate } }),
        YapePlinPaymentModel.countDocuments({ status: 'rejected', createdAt: { $gte: startDate } }),
        
        YapePlinPaymentModel.aggregate([
          { $match: { status: 'verified', createdAt: { $gte: startDate } } },
          { $group: { _id: null, total: { $sum: '$amount' } } }
        ]),
        
        YapePlinPaymentModel.aggregate([
          { $match: { createdAt: { $gte: startDate } } },
          { $group: { _id: '$paymentMethod', count: { $sum: 1 }, amount: { $sum: '$amount' } } }
        ]),
        
        YapePlinPaymentModel.aggregate([
          { $match: { createdAt: { $gte: startDate } } },
          {
            $group: {
              _id: {
                year: { $year: '$createdAt' },
                month: { $month: '$createdAt' },
                day: { $dayOfMonth: '$createdAt' }
              },
              count: { $sum: 1 },
              amount: { $sum: '$amount' },
              verified: {
                $sum: { $cond: [{ $eq: ['$status', 'verified'] }, 1, 0] }
              }
            }
          },
          { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
        ])
      ]);

      return sendOk(res, {
        overview: {
          totalPayments,
          verifiedPayments,
          pendingPayments,
          rejectedPayments,
          totalRevenue: totalRevenue[0]?.total || 0,
          conversionRate: totalPayments > 0 ? (verifiedPayments / totalPayments * 100).toFixed(1) : 0
        },
        paymentsByMethod,
        dailyStats: dailyStats.map(stat => ({
          date: `${stat._id.year}-${String(stat._id.month).padStart(2, '0')}-${String(stat._id.day).padStart(2, '0')}`,
          count: stat.count,
          amount: stat.amount,
          verified: stat.verified
        }))
      });

    } catch (error) {
      console.error('Error getting payment stats:', error);
      return sendError(res, 'Error obteniendo estadísticas de pagos', 500);
    }
  }
}
