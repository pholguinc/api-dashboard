import axios from 'axios';
import crypto from 'crypto';
import { UserModel } from '../models/user.model';
import { SubscriptionModel } from '../models/subscription.model';

// Configuración de Culqi
const CULQI_CONFIG = {
  publicKey: process.env.CULQI_PUBLIC_KEY || 'pk_test_your_public_key',
  secretKey: process.env.CULQI_SECRET_KEY || 'sk_test_your_secret_key',
  baseUrl: 'https://api.culqi.com/v2',
  webhookSecret: process.env.CULQI_WEBHOOK_SECRET || 'your_webhook_secret'
};

export class PaymentService {
  
  // Crear token de tarjeta (se hace desde el frontend)
  static async createCardToken(cardData: {
    card_number: string;
    cvv: string;
    expiration_month: string;
    expiration_year: string;
    email: string;
  }) {
    try {
      const response = await axios.post(`${CULQI_CONFIG.baseUrl}/tokens`, cardData, {
        headers: {
          'Authorization': `Bearer ${CULQI_CONFIG.publicKey}`,
          'Content-Type': 'application/json'
        }
      });

      return { success: true, token: response.data };
    } catch (error: any) {
      console.error('Error creating card token:', error.response?.data || error.message);
      return { 
        success: false, 
        error: error.response?.data?.user_message || 'Error procesando tarjeta' 
      };
    }
  }

  // Crear cargo (cobro)
  static async createCharge(chargeData: {
    amount: number; // En centavos (ej: 990 = S/ 9.90)
    currency_code: string;
    email: string;
    source_id: string; // Token de la tarjeta
    description: string;
    metadata?: any;
  }) {
    try {
      const response = await axios.post(`${CULQI_CONFIG.baseUrl}/charges`, chargeData, {
        headers: {
          'Authorization': `Bearer ${CULQI_CONFIG.secretKey}`,
          'Content-Type': 'application/json'
        }
      });

      return { success: true, charge: response.data };
    } catch (error: any) {
      console.error('Error creating charge:', error.response?.data || error.message);
      return { 
        success: false, 
        error: error.response?.data?.user_message || 'Error procesando pago' 
      };
    }
  }

  // Procesar suscripción MetroPremium
  static async processMetroPremiumSubscription(
    userId: string,
    tokenId: string,
    userEmail: string
  ): Promise<{ success: boolean; subscription?: any; error?: string }> {
    try {
      // Verificar si ya tiene suscripción activa
      const existingSubscription = await SubscriptionModel.findOne({
        userId,
        status: 'active',
        endDate: { $gt: new Date() }
      });

      if (existingSubscription) {
        return { success: false, error: 'Ya tienes una suscripción activa' };
      }

      // Crear cargo en Culqi
      const chargeResult = await this.createCharge({
        amount: 990, // S/ 9.90 en centavos
        currency_code: 'PEN',
        email: userEmail,
        source_id: tokenId,
        description: 'Suscripción MetroPremium - 1 mes',
        metadata: {
          userId,
          product: 'MetroPremium',
          duration: '1_month'
        }
      });

      if (!chargeResult.success) {
        return { success: false, error: chargeResult.error };
      }

      // Crear suscripción en la base de datos
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
        paymentMethod: 'card',
        transactionId: chargeResult.charge.id,
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

      // Actualizar usuario
      await UserModel.findByIdAndUpdate(userId, {
        hasMetroPremium: true,
        metroPremiumExpiry: endDate
      });

      return { 
        success: true, 
        subscription: {
          id: subscription._id,
          type: subscription.type,
          status: subscription.status,
          startDate: subscription.startDate,
          endDate: subscription.endDate,
          transactionId: chargeResult.charge.id
        }
      };

    } catch (error) {
      console.error('Error processing MetroPremium subscription:', error);
      return { success: false, error: 'Error procesando suscripción' };
    }
  }

  // Procesar pago de microseguro
  static async processInsurancePayment(
    userId: string,
    tokenId: string,
    userEmail: string,
    insuranceData: {
      insuranceId: string;
      price: number;
      coverage: string;
      duration: number; // en días
    }
  ): Promise<{ success: boolean; payment?: any; error?: string }> {
    try {
      // Crear cargo en Culqi
      const chargeResult = await this.createCharge({
        amount: Math.round(insuranceData.price * 100), // Convertir a centavos
        currency_code: 'PEN',
        email: userEmail,
        source_id: tokenId,
        description: `Microseguro - ${insuranceData.coverage}`,
        metadata: {
          userId,
          product: 'insurance',
          insuranceId: insuranceData.insuranceId,
          coverage: insuranceData.coverage,
          duration: insuranceData.duration
        }
      });

      if (!chargeResult.success) {
        return { success: false, error: chargeResult.error };
      }

      // TODO: Crear registro de póliza de seguro en la base de datos
      // Esto requeriría un modelo específico para pólizas de seguro

      return { 
        success: true, 
        payment: {
          transactionId: chargeResult.charge.id,
          amount: insuranceData.price,
          currency: 'PEN',
          status: 'paid',
          insuranceId: insuranceData.insuranceId
        }
      };

    } catch (error) {
      console.error('Error processing insurance payment:', error);
      return { success: false, error: 'Error procesando pago de seguro' };
    }
  }

  // Verificar estado de pago
  static async getChargeStatus(chargeId: string) {
    try {
      const response = await axios.get(`${CULQI_CONFIG.baseUrl}/charges/${chargeId}`, {
        headers: {
          'Authorization': `Bearer ${CULQI_CONFIG.secretKey}`,
          'Content-Type': 'application/json'
        }
      });

      return { success: true, charge: response.data };
    } catch (error: any) {
      console.error('Error getting charge status:', error.response?.data || error.message);
      return { 
        success: false, 
        error: error.response?.data?.user_message || 'Error consultando estado de pago' 
      };
    }
  }

  // Procesar webhook de Culqi
  static async processWebhook(payload: any, signature: string): Promise<boolean> {
    try {
      // Verificar firma del webhook
      const expectedSignature = crypto
        .createHmac('sha256', CULQI_CONFIG.webhookSecret)
        .update(JSON.stringify(payload))
        .digest('hex');

      if (signature !== expectedSignature) {
        console.error('Webhook signature mismatch');
        return false;
      }

      const { type, data } = payload;

      switch (type) {
        case 'charge.succeeded':
          await this.handleSuccessfulCharge(data);
          break;
        case 'charge.failed':
          await this.handleFailedCharge(data);
          break;
        case 'charge.disputed':
          await this.handleDisputedCharge(data);
          break;
        default:
          console.log(`Unhandled webhook type: ${type}`);
      }

      return true;
    } catch (error) {
      console.error('Error processing webhook:', error);
      return false;
    }
  }

  private static async handleSuccessfulCharge(chargeData: any) {
    try {
      const { id: chargeId, metadata } = chargeData;
      
      if (metadata?.product === 'MetroPremium') {
        // Activar suscripción si no estaba activa
        await SubscriptionModel.findOneAndUpdate(
          { transactionId: chargeId },
          { status: 'active' }
        );
        
        console.log(`MetroPremium subscription activated for charge: ${chargeId}`);
      } else if (metadata?.product === 'insurance') {
        // Activar póliza de seguro
        console.log(`Insurance policy activated for charge: ${chargeId}`);
      }
    } catch (error) {
      console.error('Error handling successful charge:', error);
    }
  }

  private static async handleFailedCharge(chargeData: any) {
    try {
      const { id: chargeId, metadata } = chargeData;
      
      if (metadata?.product === 'MetroPremium') {
        // Marcar suscripción como fallida
        await SubscriptionModel.findOneAndUpdate(
          { transactionId: chargeId },
          { status: 'pending' }
        );
        
        console.log(`MetroPremium subscription failed for charge: ${chargeId}`);
      }
    } catch (error) {
      console.error('Error handling failed charge:', error);
    }
  }

  private static async handleDisputedCharge(chargeData: any) {
    try {
      const { id: chargeId, metadata } = chargeData;
      
      if (metadata?.product === 'MetroPremium') {
        // Suspender suscripción por disputa
        await SubscriptionModel.findOneAndUpdate(
          { transactionId: chargeId },
          { status: 'cancelled', cancelReason: 'disputed' }
        );
        
        // Remover beneficios premium del usuario
        if (metadata?.userId) {
          await UserModel.findByIdAndUpdate(metadata.userId, {
            hasMetroPremium: false,
            metroPremiumExpiry: null
          });
        }
        
        console.log(`MetroPremium subscription disputed for charge: ${chargeId}`);
      }
    } catch (error) {
      console.error('Error handling disputed charge:', error);
    }
  }

  // Reembolso (para casos especiales)
  static async createRefund(chargeId: string, amount?: number, reason?: string) {
    try {
      const refundData: any = {
        charge_id: chargeId,
        reason: reason || 'requested_by_customer'
      };

      if (amount) {
        refundData.amount = amount;
      }

      const response = await axios.post(`${CULQI_CONFIG.baseUrl}/refunds`, refundData, {
        headers: {
          'Authorization': `Bearer ${CULQI_CONFIG.secretKey}`,
          'Content-Type': 'application/json'
        }
      });

      return { success: true, refund: response.data };
    } catch (error: any) {
      console.error('Error creating refund:', error.response?.data || error.message);
      return { 
        success: false, 
        error: error.response?.data?.user_message || 'Error procesando reembolso' 
      };
    }
  }
}
