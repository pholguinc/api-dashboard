import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { sendError, sendOk } from '../utils/response';
import { UserModel } from '../models/user.model';

export class MetroYaController {
  // Obtener ofertas de Metro Ya
  static async getOffers(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const user = await UserModel.findById(userId);
      
      if (!user) {
        return sendError(res, 'Usuario no encontrado', 404);
      }

      // Ofertas dinámicas basadas en el estado del usuario
      const offers = [
        {
          id: 'express_metro',
          title: '🚇 Metro Express',
          description: 'Viaja más rápido con el servicio express',
          price: 3.50,
          originalPrice: 4.00,
          discount: 12.5,
          category: 'transport',
          isAvailable: true,
          isPremiumOnly: false,
          estimatedTime: '15 min',
          route: 'Línea 1 completa',
          benefits: ['Sin paradas intermedias', 'Asientos garantizados', 'WiFi gratis']
        },
        {
          id: 'metro_premium_day',
          title: '⭐ Día Premium',
          description: 'Acceso premium por 24 horas',
          price: 5.00,
          originalPrice: user.hasMetroPremium ? 0 : 5.00,
          discount: user.hasMetroPremium ? 100 : 0,
          category: 'premium',
          isAvailable: !user.hasMetroPremium,
          isPremiumOnly: false,
          duration: '24 horas',
          benefits: ['Sin anuncios', 'Descuentos exclusivos', 'Soporte prioritario']
        },
        {
          id: 'group_discount',
          title: '👥 Descuento Grupal',
          description: 'Viaja con amigos y ahorra',
          price: 2.00,
          originalPrice: 2.50,
          discount: 20,
          category: 'social',
          isAvailable: true,
          isPremiumOnly: false,
          minGroup: 3,
          maxGroup: 8,
          benefits: ['20% descuento por persona', 'Válido por 7 días', 'Transferible']
        },
        {
          id: 'night_service',
          title: '🌙 Servicio Nocturno',
          description: 'Metro hasta las 2:00 AM',
          price: 4.50,
          originalPrice: 5.00,
          discount: 10,
          category: 'special',
          isAvailable: true,
          isPremiumOnly: user.hasMetroPremium ? false : true,
          schedule: '22:00 - 02:00',
          frequency: 'Cada 15 minutos',
          benefits: ['Servicio extendido', 'Seguridad reforzada', 'Menos multitudes']
        },
        {
          id: 'weekend_unlimited',
          title: '🎉 Fin de Semana Ilimitado',
          description: 'Viajes ilimitados sábado y domingo',
          price: 12.00,
          originalPrice: 15.00,
          discount: 20,
          category: 'weekend',
          isAvailable: true,
          isPremiumOnly: false,
          validity: 'Sábado y Domingo',
          benefits: ['Viajes ilimitados', 'Incluye buses alimentadores', 'Válido 48 horas']
        }
      ];

      // Filtrar ofertas según el estado del usuario
      const availableOffers = offers.filter(offer => {
        if (offer.isPremiumOnly && !user.hasMetroPremium) {
          return false;
        }
        return offer.isAvailable;
      });

      return sendOk(res, {
        offers: availableOffers,
        userInfo: {
          hasMetroPremium: user.hasMetroPremium,
          pointsSmart: user.pointsSmart,
          canUsePoints: user.pointsSmart >= 100 // Mínimo para usar puntos
        },
        categories: ['transport', 'premium', 'social', 'special', 'weekend']
      });

    } catch (error) {
      console.error('Error in getOffers:', error);
      return sendError(res, 'Error obteniendo ofertas de Metro Ya', 500);
    }
  }

  // Comprar oferta de Metro Ya
  static async purchaseOffer(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const { offerId, paymentMethod, usePoints } = req.body;

      const user = await UserModel.findById(userId);
      if (!user) {
        return sendError(res, 'Usuario no encontrado', 404);
      }

      // Obtener la oferta (en un sistema real estaría en BD)
      const offers = [
        { id: 'express_metro', price: 3.50, pointsPrice: 350 },
        { id: 'metro_premium_day', price: 5.00, pointsPrice: 500 },
        { id: 'group_discount', price: 2.00, pointsPrice: 200 },
        { id: 'night_service', price: 4.50, pointsPrice: 450 },
        { id: 'weekend_unlimited', price: 12.00, pointsPrice: 1200 },
      ];

      const offer = offers.find(o => o.id === offerId);
      if (!offer) {
        return sendError(res, 'Oferta no encontrada', 404);
      }

      if (usePoints) {
        if (user.pointsSmart < offer.pointsPrice) {
          return sendError(res, 'Puntos insuficientes', 400);
        }
        
        // Descontar puntos
        await UserModel.findByIdAndUpdate(userId, {
          $inc: { pointsSmart: -offer.pointsPrice }
        });
      }

      // Generar código de compra
      const purchaseCode = `METRO-${Date.now().toString().slice(-6)}`;

      return sendOk(res, {
        message: 'Compra realizada exitosamente',
        purchaseCode,
        offer: {
          id: offer.id,
          price: usePoints ? offer.pointsPrice : offer.price,
          paymentMethod: usePoints ? 'points' : paymentMethod
        },
        qrCode: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${purchaseCode}`,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 horas
      });

    } catch (error) {
      console.error('Error in purchaseOffer:', error);
      return sendError(res, 'Error procesando compra', 500);
    }
  }
}
