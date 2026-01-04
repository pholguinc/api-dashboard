import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { PaymentService } from '../services/payment.service';
import { UserModel } from '../models/user.model';
import { sendOk, sendError, sendCreated } from '../utils/response';

export class PaymentController {
  
  // Procesar pago de suscripción MetroPremium
  static async processMetroPremiumPayment(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const { tokenId } = req.body;

      if (!tokenId) {
        return sendError(res, 'Token de tarjeta requerido', 400);
      }

      // Obtener datos del usuario
      const user = await UserModel.findById(userId);
      if (!user) {
        return sendError(res, 'Usuario no encontrado', 404);
      }

      if (!user.email) {
        return sendError(res, 'Email requerido para procesar pago', 400);
      }

      // Procesar pago
      const result = await PaymentService.processMetroPremiumSubscription(
        userId,
        tokenId,
        user.email
      );

      if (result.success) {
        return sendCreated(res, {
          message: '¡Suscripción MetroPremium activada exitosamente!',
          subscription: result.subscription
        });
      } else {
        return sendError(res, result.error || 'Error procesando pago', 400);
      }

    } catch (error) {
      console.error('Error processing MetroPremium payment:', error);
      return sendError(res, 'Error interno procesando pago', 500);
    }
  }

  // Procesar pago de microseguro
  static async processInsurancePayment(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const { tokenId, insuranceId, price, coverage, duration } = req.body;

      if (!tokenId || !insuranceId || !price) {
        return sendError(res, 'Datos de pago incompletos', 400);
      }

      // Obtener datos del usuario
      const user = await UserModel.findById(userId);
      if (!user || !user.email) {
        return sendError(res, 'Usuario o email no encontrado', 404);
      }

      // Procesar pago
      const result = await PaymentService.processInsurancePayment(
        userId,
        tokenId,
        user.email,
        { insuranceId, price, coverage, duration }
      );

      if (result.success) {
        return sendCreated(res, {
          message: '¡Microseguro adquirido exitosamente!',
          payment: result.payment
        });
      } else {
        return sendError(res, result.error || 'Error procesando pago', 400);
      }

    } catch (error) {
      console.error('Error processing insurance payment:', error);
      return sendError(res, 'Error interno procesando pago', 500);
    }
  }

  // Webhook de Culqi
  static async handleCulqiWebhook(req: Request, res: Response) {
    try {
      const signature = req.headers['x-culqi-signature'] as string;
      const payload = req.body;

      if (!signature) {
        return sendError(res, 'Firma requerida', 400);
      }

      const processed = await PaymentService.processWebhook(payload, signature);

      if (processed) {
        return sendOk(res, { message: 'Webhook procesado exitosamente' });
      } else {
        return sendError(res, 'Error procesando webhook', 400);
      }

    } catch (error) {
      console.error('Error handling Culqi webhook:', error);
      return sendError(res, 'Error procesando webhook', 500);
    }
  }

  // Obtener estado de pago
  static async getPaymentStatus(req: AuthenticatedRequest, res: Response) {
    try {
      const { chargeId } = req.params;

      const result = await PaymentService.getChargeStatus(chargeId);

      if (result.success) {
        return sendOk(res, { charge: result.charge });
      } else {
        return sendError(res, result.error || 'Error consultando estado', 400);
      }

    } catch (error) {
      console.error('Error getting payment status:', error);
      return sendError(res, 'Error consultando estado de pago', 500);
    }
  }

  // Crear reembolso (Admin)
  static async createRefund(req: AuthenticatedRequest, res: Response) {
    try {
      const { chargeId, amount, reason } = req.body;

      if (!chargeId) {
        return sendError(res, 'ID de cargo requerido', 400);
      }

      const result = await PaymentService.createRefund(chargeId, amount, reason);

      if (result.success) {
        return sendCreated(res, {
          message: 'Reembolso procesado exitosamente',
          refund: result.refund
        });
      } else {
        return sendError(res, result.error || 'Error procesando reembolso', 400);
      }

    } catch (error) {
      console.error('Error creating refund:', error);
      return sendError(res, 'Error procesando reembolso', 500);
    }
  }

  // Obtener métodos de pago disponibles
  static async getPaymentMethods(req: Request, res: Response) {
    try {
      const paymentMethods = [
        {
          id: 'card',
          name: 'Tarjeta de Crédito/Débito',
          description: 'Visa, Mastercard, American Express',
          icon: 'credit_card',
          enabled: true,
          processingTime: 'Inmediato',
          fees: '3.5% + S/ 0.30'
        },
        {
          id: 'yape',
          name: 'Yape',
          description: 'Pago con código QR',
          icon: 'qr_code',
          enabled: false, // Pendiente de implementación
          processingTime: 'Inmediato',
          fees: 'Sin comisión'
        },
        {
          id: 'plin',
          name: 'Plin',
          description: 'Pago con código QR',
          icon: 'qr_code',
          enabled: false, // Pendiente de implementación
          processingTime: 'Inmediato',
          fees: 'Sin comisión'
        },
        {
          id: 'bank_transfer',
          name: 'Transferencia Bancaria',
          description: 'BCP, BBVA, Interbank, Scotiabank',
          icon: 'account_balance',
          enabled: false, // Pendiente de implementación
          processingTime: '1-2 días hábiles',
          fees: 'Sin comisión'
        }
      ];

      return sendOk(res, { paymentMethods });

    } catch (error) {
      console.error('Error getting payment methods:', error);
      return sendError(res, 'Error obteniendo métodos de pago', 500);
    }
  }
}
