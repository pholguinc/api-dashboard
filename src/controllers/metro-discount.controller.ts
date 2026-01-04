import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { AuthenticatedRequest } from '../middleware/auth';
import { MetroDiscountModel, METRO_PRICING, POINTS_TO_DISCOUNT } from '../models/metro-discount.model';
import { MetroDiscountOptionModel } from '../models/metro-discount-option.model';

// Tipos para las opciones de descuento
interface DiscountOption {
  points: number;
  discount: number;
  enabled: boolean;
  premiumOnly: boolean;
}

type DiscountOptions = Record<string, DiscountOption>;
import { 
  MetroConfigModel, 
  getMetroPricing, 
  getDiscountOptions, 
  updateMetroPricing, 
  updateDiscountOptions,
  DEFAULT_METRO_PRICING,
  DEFAULT_DISCOUNT_OPTIONS
} from '../models/metro-config.model';
import { UserModel } from '../models/user.model';
import { PointsService } from '../services/points.service';
import { NotificationHelpers } from '../services/notification.service';
import { sendOk, sendError, sendCreated } from '../utils/response';

export class MetroDiscountController {
  
  // Obtener opciones de descuentos disponibles
  static async getDiscountOptions(req: Request, res: Response) {
    try {
      const [pricing, discountOptions] = await Promise.all([
        getMetroPricing(),
        getDiscountOptions()
      ]) as [any, DiscountOptions];

      // Obtener información del usuario si está autenticado
      const userId = (req as any).user?.id;
      let userHasPremium = false;
      
      if (userId) {
        const user = await UserModel.findById(userId).select('hasMetroPremium').lean();
        userHasPremium = user?.hasMetroPremium || false;
      }

      // Obtener opciones personalizadas de la base de datos
      const customOptions = await MetroDiscountOptionModel.find({
        enabled: true,
        fecha_expiracion: { $gt: new Date() },
        cantidad_disponible: { $gt: 0 }
      }).lean();

      const options = Object.entries(discountOptions)
        .filter(([key, config]) => {
          // Filtrar por habilitado
          if (config.enabled === false) return false;
          
          // Filtrar por tipo de usuario
          if (config.premiumOnly && !userHasPremium) return false;
          
          return true;
        })
        .map(([key, config]) => ({
          id: key,
          pointsRequired: config.points,
          discountPercentage: config.discount,
          description: config.discount === 100 
            ? (config.premiumOnly ? 'Viaje gratis Premium' : 'Viaje gratis')
            : `${config.discount}% de descuento${config.premiumOnly ? ' Premium' : ''}`,
          cantidad_disponible: null, // Opciones por defecto no tienen límite
          fecha_expiracion: null, // Opciones por defecto no expiran
          estimatedSavings: {
            single: Math.round(pricing.single_trip.regular * (config.discount / 100) * 100) / 100,
            roundTrip: Math.round(pricing.round_trip.regular * (config.discount / 100) * 100) / 100,
            monthlyPass: Math.round(pricing.monthly_pass.regular * (config.discount / 100) * 100) / 100,
          },
          enabled: config.enabled !== false,
          premiumOnly: config.premiumOnly || false
        }));

      // Agregar opciones personalizadas
      const customOptionsFormatted = customOptions
        .filter(option => {
          // Filtrar por Premium si es necesario
          if (option.premiumOnly && !userHasPremium) return false;
          return true;
        })
        .map(option => ({
          id: option.discountType,
          pointsRequired: option.pointsRequired,
          discountPercentage: option.discountValue,
          description: option.description,
          cantidad_disponible: option.cantidad_disponible,
          fecha_expiracion: option.fecha_expiracion,
          estimatedSavings: option.estimatedSavings,
          enabled: option.enabled,
          premiumOnly: option.premiumOnly
        }));

      const allOptions = [...options, ...customOptionsFormatted];

      return sendOk(res, {
        discountOptions: allOptions,
        metroPricing: pricing,
        userInfo: {
          hasPremium: userHasPremium,
          availableOptions: allOptions.length,
          premiumOptions: allOptions.filter(opt => opt.premiumOnly).length
        }
      });
    } catch (error) {
      console.error('Error getting discount options:', error);
      return sendError(res, 'Error obteniendo opciones de descuento', 500);
    }
  }

  // Canjear puntos por descuento de metro
  static async redeemMetroDiscount(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const { 
        discountType, 
        tripType = 'single', 
        stationFrom, 
        stationTo,
        userType = 'regular' // regular, university, school
      } = req.body;

      // Obtener configuraciones dinámicas
      const [pricing, discountOptions] = await Promise.all([
        getMetroPricing(),
        getDiscountOptions()
      ]) as [any, DiscountOptions];

      // Verificar puntos del usuario
      const user = await UserModel.findById(userId);
      if (!user) {
        return sendError(res, 'Usuario no encontrado', 404);
      }

      let discountConfig: any = null;
      let isCustomOption = false;

      // Verificar si es una opción personalizada
      const customOption = await MetroDiscountOptionModel.findOne({
        discountType,
        enabled: true,
        fecha_expiracion: { $gt: new Date() },
        cantidad_disponible: { $gt: 0 }
      });

      if (customOption) {
        discountConfig = {
          discount: customOption.discountValue,
          points: customOption.pointsRequired,
          premiumOnly: customOption.premiumOnly
        };
        isCustomOption = true;
      } else if (discountOptions[discountType]) {
        discountConfig = discountOptions[discountType];
      } else {
        return sendError(res, 'Tipo de descuento inválido', 400);
      }

      // Verificar puntos del usuario
      if (user.pointsSmart < discountConfig.points) {
        return sendError(res, 'Puntos insuficientes', 400);
      }

      // Verificar si es descuento Premium y usuario tiene Premium
      if (discountConfig.premiumOnly && !user.hasMetroPremium) {
        return sendError(res, 'Este descuento es exclusivo para usuarios Metro Premium', 403);
      }

      // Para opciones personalizadas, verificar disponibilidad
      if (isCustomOption && customOption!.cantidad_disponible <= 0) {
        return sendError(res, 'No hay descuentos disponibles de este tipo', 400);
      }

      // Mapear tripType al formato del pricing
      const tripTypeMap: Record<string, string> = {
        'single': 'single_trip',
        'round_trip': 'round_trip',
        'monthly_pass': 'monthly_pass',
        'single_trip': 'single_trip'
      };
      const pricingKey = tripTypeMap[tripType] || 'single_trip';

      // Calcular precio y descuento
      const tripPricing = pricing[pricingKey as keyof typeof pricing];
      if (!tripPricing) {
        return sendError(res, 'Tipo de viaje inválido', 400);
      }
      const originalPrice = tripPricing[userType as 'regular' | 'university' | 'school'];
      const discountAmount = Math.round(originalPrice * (discountConfig.discount / 100) * 100) / 100;
      const finalPrice = Math.max(0, originalPrice - discountAmount);

      // Crear descuento
      const discount = new MetroDiscountModel({
        userId,
        discountType: 'percentage',
        discountValue: discountConfig.discount,
        pointsUsed: discountConfig.points,
        originalPrice,
        finalPrice,
        validFrom: new Date(),
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 días
        stationFrom,
        stationTo,
        tripType,
        metadata: {
          generatedBy: 'user_points_redemption',
          userType
        }
      });

      await discount.save();

      // Si es una opción personalizada, decrementar disponibilidad
      if (isCustomOption && customOption) {
        const availabilityUpdated = await MetroDiscountController.decrementDiscountAvailability(discountType);
        if (!availabilityUpdated) {
          // Si no se pudo decrementar, eliminar el descuento creado
          await MetroDiscountModel.findByIdAndDelete(discount._id);
          return sendError(res, 'No hay descuentos disponibles de este tipo', 400);
        }
      }

      // Descontar puntos del usuario
      await PointsService.awardPoints(
        userId,
        'spent_metro_discount',
        -discountConfig.points,
        `Descuento Metro: ${discountConfig.discount}% - ${tripType}`,
        { 
          discountId: discount._id,
          discountCode: discount.discountCode,
          originalPrice,
          finalPrice
        }
      );

      // Enviar notificación sobre el descuento generado
      await NotificationHelpers.metroDiscount(
        userId,
        discount.discountCode,
        discount.discountValue
      );

      return sendCreated(res, {
        message: 'Descuento generado exitosamente',
        discount: {
          id: discount._id,
          code: discount.discountCode,
          discountPercentage: discount.discountValue,
          originalPrice: discount.originalPrice,
          finalPrice: discount.finalPrice,
          validUntil: discount.validUntil,
          pointsUsed: discount.pointsUsed
        }
      });

    } catch (error) {
      console.error('Error redeeming metro discount:', error);
      return sendError(res, 'Error canjeando descuento', 500);
    }
  }

  // Obtener descuentos del usuario
  static async getUserDiscounts(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const { page = 1, limit = 10, status = 'all' } = req.query;

      const filters: any = { userId };
      
      if (status === 'active') {
        filters.isUsed = false;
        filters.validUntil = { $gt: new Date() };
      } else if (status === 'used') {
        filters.isUsed = true;
      } else if (status === 'expired') {
        filters.isUsed = false;
        filters.validUntil = { $lte: new Date() };
      }

      const discounts = await MetroDiscountModel
        .find(filters)
        .sort({ createdAt: -1 })
        .limit(Number(limit))
        .skip((Number(page) - 1) * Number(limit))
        .select('-__v');

      const total = await MetroDiscountModel.countDocuments(filters);

      // Agregar estado calculado
      const discountsWithStatus = discounts.map(discount => ({
        ...discount.toObject(),
        status: discount.isUsed 
          ? 'used' 
          : (discount.validUntil < new Date() ? 'expired' : 'active')
      }));

      return sendOk(res, {
        discounts: discountsWithStatus,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      });

    } catch (error) {
      console.error('Error getting user discounts:', error);
      return sendError(res, 'Error obteniendo descuentos', 500);
    }
  }

  // Validar código de descuento
  static async validateDiscountCode(req: Request, res: Response) {
    try {
      const { code } = req.params;
      
      const discount = await MetroDiscountModel.findOne({
        discountCode: code.toUpperCase(),
        isUsed: false,
        validUntil: { $gt: new Date() }
      }).populate('userId', 'displayName phone');

      if (!discount) {
        return sendError(res, 'Código de descuento inválido o expirado', 404);
      }

      return sendOk(res, {
        valid: true,
        discount: {
          id: discount._id,
          code: discount.discountCode,
          discountPercentage: discount.discountValue,
          originalPrice: discount.originalPrice,
          finalPrice: discount.finalPrice,
          tripType: discount.tripType,
          stationFrom: discount.stationFrom,
          stationTo: discount.stationTo,
          validUntil: discount.validUntil,
          user: discount.userId
        }
      });

    } catch (error) {
      console.error('Error validating discount code:', error);
      return sendError(res, 'Error validando código', 500);
    }
  }

  // Usar descuento (para operadores del metro)
  static async useDiscount(req: AuthenticatedRequest, res: Response) {
    try {
      const { code } = req.params;
      const { operatorId, stationUsed } = req.body;

      const discount = await MetroDiscountModel.findOne({
        discountCode: code.toUpperCase(),
        isUsed: false,
        validUntil: { $gt: new Date() }
      });

      if (!discount) {
        return sendError(res, 'Código de descuento inválido o expirado', 404);
      }

      // Marcar como usado
      discount.isUsed = true;
      discount.usedAt = new Date();
      discount.metadata = {
        generatedBy: discount.metadata.generatedBy,
        campaignId: discount.metadata.campaignId,
        promotionCode: discount.metadata.promotionCode,
        operatorId,
        stationUsed,
        usedBy: req.user?.id
      };

      await discount.save();

      return sendOk(res, {
        message: 'Descuento aplicado exitosamente',
        discount: {
          code: discount.discountCode,
          finalPrice: discount.finalPrice,
          usedAt: discount.usedAt
        }
      });

    } catch (error) {
      console.error('Error using discount:', error);
      return sendError(res, 'Error aplicando descuento', 500);
    }
  }

  // Estadísticas de descuentos (Admin)
  static async getDiscountStats(req: Request, res: Response) {
    try {
      const [
        totalDiscounts,
        activeDiscounts,
        usedDiscounts,
        expiredDiscounts,
        totalPointsRedeemed,
        totalSavings,
        discountsByType,
        recentActivity
      ] = await Promise.all([
        MetroDiscountModel.countDocuments(),
        MetroDiscountModel.countDocuments({ 
          isUsed: false, 
          validUntil: { $gt: new Date() } 
        }),
        MetroDiscountModel.countDocuments({ isUsed: true }),
        MetroDiscountModel.countDocuments({ 
          isUsed: false, 
          validUntil: { $lte: new Date() } 
        }),
        MetroDiscountModel.aggregate([
          { $group: { _id: null, total: { $sum: '$pointsUsed' } } }
        ]),
        MetroDiscountModel.aggregate([
          { $match: { isUsed: true } },
          { $group: { _id: null, total: { $sum: { $subtract: ['$originalPrice', '$finalPrice'] } } } }
        ]),
        MetroDiscountModel.aggregate([
          { $group: { _id: '$tripType', count: { $sum: 1 } } },
          { $sort: { count: -1 } }
        ]),
        MetroDiscountModel.aggregate([
          { $match: { createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } },
          { $group: { 
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 }
          }},
          { $sort: { _id: 1 } }
        ])
      ]);

      return sendOk(res, {
        totalDiscounts,
        activeDiscounts,
        usedDiscounts,
        expiredDiscounts,
        totalPointsRedeemed: totalPointsRedeemed[0]?.total || 0,
        totalSavings: Math.round((totalSavings[0]?.total || 0) * 100) / 100,
        discountsByType,
        recentActivity
      });

    } catch (error) {
      console.error('Error getting discount stats:', error);
      return sendError(res, 'Error obteniendo estadísticas', 500);
    }
  }

  // Obtener todos los descuentos para administración
  static async getAllDiscounts(req: AuthenticatedRequest, res: Response) {
    try {
      const { 
        page = 1, 
        limit = 50, 
        status = 'all',
        search = '',
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query;

      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const skip = (pageNum - 1) * limitNum;

      // Construir filtros
      const filters: any = {};
      
      if (status !== 'all') {
        if (status === 'used') {
          filters.isUsed = true;
        } else if (status === 'unused') {
          filters.isUsed = false;
        } else if (status === 'expired') {
          filters.validUntil = { $lt: new Date() };
          filters.isUsed = false;
        }
      }

      if (search) {
        filters.$or = [
          { discountCode: { $regex: search, $options: 'i' } }
        ];
      }

      // Configurar ordenamiento
      const sort: any = {};
      sort[sortBy as string] = sortOrder === 'desc' ? -1 : 1;

      const [discounts, total] = await Promise.all([
        MetroDiscountModel.find(filters)
          .populate('userId', 'displayName phone email')
          .sort(sort)
          .skip(skip)
          .limit(limitNum)
          .lean(),
        MetroDiscountModel.countDocuments(filters)
      ]);

      // Mapear los resultados para incluir información del usuario
      const formattedDiscounts = discounts.map(discount => ({
        ...discount,
        user: discount.userId
      }));

      return sendOk(res, {
        discounts: formattedDiscounts,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum)
        }
      });
    } catch (error) {
      console.error('Error getting all discounts:', error);
      return sendError(res, 'Error obteniendo descuentos', 500);
    }
  }

  // Exportar descuentos a CSV
  static async exportDiscounts(req: AuthenticatedRequest, res: Response) {
    try {
      const { 
        status = 'all',
        startDate,
        endDate 
      } = req.query;

      // Construir filtros
      const filters: any = {};
      
      if (status !== 'all') {
        if (status === 'used') {
          filters.isUsed = true;
        } else if (status === 'unused') {
          filters.isUsed = false;
        } else if (status === 'expired') {
          filters.validUntil = { $lt: new Date() };
          filters.isUsed = false;
        }
      }

      if (startDate && endDate) {
        filters.createdAt = {
          $gte: new Date(startDate as string),
          $lte: new Date(endDate as string)
        };
      }

      const discounts = await MetroDiscountModel.find(filters)
        .populate('userId', 'displayName phone email')
        .sort({ createdAt: -1 })
        .lean();

      // Generar CSV
      const csvHeaders = [
        'Código',
        'Usuario',
        'Teléfono',
        'Email',
        'Descuento (%)',
        'Precio Original',
        'Precio Final',
        'Puntos Usados',
        'Tipo Viaje',
        'Estado',
        'Creado',
        'Válido Hasta',
        'Usado En'
      ].join(',');

      const csvRows = discounts.map(discount => {
        const user = discount.userId as any;
        const status = discount.isUsed ? 'Usado' : 
                      new Date(discount.validUntil) < new Date() ? 'Expirado' : 'Activo';
        
        return [
          discount.discountCode,
          user?.displayName || 'Usuario eliminado',
          user?.phone || '',
          user?.email || '',
          discount.discountValue,
          discount.originalPrice.toFixed(2),
          discount.finalPrice.toFixed(2),
          discount.pointsUsed,
          discount.tripType,
          status,
          new Date(discount.createdAt).toLocaleString('es-PE'),
          new Date(discount.validUntil).toLocaleString('es-PE'),
          discount.usedAt ? new Date(discount.usedAt).toLocaleString('es-PE') : ''
        ].map(field => `"${field}"`).join(',');
      });

      const csvContent = [csvHeaders, ...csvRows].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="descuentos-metro-${new Date().toISOString().split('T')[0]}.csv"`);
      
      return res.send(csvContent);
    } catch (error) {
      console.error('Error exporting discounts:', error);
      return sendError(res, 'Error exportando descuentos', 500);
    }
  }

  // ========== GESTIÓN DE CONFIGURACIONES ==========

  // Obtener configuración de precios actual
  static async getPricing(req: AuthenticatedRequest, res: Response) {
    try {
      const pricing = await getMetroPricing();
      
      return sendOk(res, {
        pricing,
        lastUpdated: await MetroConfigModel.findOne({ configType: 'pricing' })
          .populate('lastUpdatedBy', 'displayName')
          .select('updatedAt lastUpdatedBy version')
          .lean()
      });
    } catch (error) {
      console.error('Error getting pricing:', error);
      return sendError(res, 'Error obteniendo precios', 500);
    }
  }

  // Actualizar configuración de precios
  static async updatePricing(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const { pricing } = req.body;

      if (!userId) {
        return sendError(res, 'Usuario no autenticado', 401);
      }

      // Validar estructura de precios
      const requiredFields = ['single_trip', 'round_trip', 'monthly_pass'];
      const requiredSubfields = ['regular', 'university', 'school'];

      for (const field of requiredFields) {
        if (!pricing[field]) {
          return sendError(res, `Campo requerido: ${field}`, 400);
        }
        for (const subfield of requiredSubfields) {
          if (typeof pricing[field][subfield] !== 'number' || pricing[field][subfield] <= 0) {
            return sendError(res, `Precio inválido: ${field}.${subfield}`, 400);
          }
        }
      }

      await updateMetroPricing(pricing, userId);

      return sendOk(res, { 
        message: 'Precios actualizados exitosamente',
        pricing 
      });
    } catch (error) {
      console.error('Error updating pricing:', error);
      return sendError(res, 'Error actualizando precios', 500);
    }
  }

  // Obtener opciones de descuento para administración
  static async getAdminDiscountOptions(req: AuthenticatedRequest, res: Response) {
    try {
      const discountOptions = await getDiscountOptions() as DiscountOptions;
      
      return sendOk(res, {
        discountOptions,
        lastUpdated: await MetroConfigModel.findOne({ configType: 'discount_options' })
          .populate('lastUpdatedBy', 'displayName')
          .select('updatedAt lastUpdatedBy version')
          .lean()
      });
    } catch (error) {
      console.error('Error getting admin discount options:', error);
      return sendError(res, 'Error obteniendo opciones de descuento', 500);
    }
  }

  // Actualizar opciones de descuento
  static async updateDiscountOptions(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const { discountOptions } = req.body;

      if (!userId) {
        return sendError(res, 'Usuario no autenticado', 401);
      }

      // Validar estructura de opciones
      for (const [key, option] of Object.entries(discountOptions as DiscountOptions)) {
        if (typeof option.points !== 'number' || option.points <= 0) {
          return sendError(res, `Puntos inválidos para ${key}`, 400);
        }
        if (typeof option.discount !== 'number' || option.discount <= 0 || option.discount > 100) {
          return sendError(res, `Descuento inválido para ${key}`, 400);
        }
      }

      await updateDiscountOptions(discountOptions, userId);

      return sendOk(res, { 
        message: 'Opciones de descuento actualizadas exitosamente',
        discountOptions 
      });
    } catch (error) {
      console.error('Error updating discount options:', error);
      return sendError(res, 'Error actualizando opciones de descuento', 500);
    }
  }

  // ========== GESTIÓN DE PREMIUM ==========

  // Activar/desactivar Metro Premium para un usuario
  static async toggleUserPremium(req: AuthenticatedRequest, res: Response) {
    try {
      const { userId } = req.params;
      const { premium } = req.body;

      if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
        return sendError(res, 'ID de usuario inválido', 400);
      }

      const user = await UserModel.findById(userId);
      if (!user) {
        return sendError(res, 'Usuario no encontrado', 404);
      }

      // Actualizar estado Premium
      user.hasMetroPremium = premium;
      await user.save();

      // Enviar notificación al usuario
      if (premium) {
        await NotificationHelpers.sendToUser(
          userId,
          {
            title: '🌟 ¡Bienvenido a Metro Premium!',
            body: 'Ahora disfrutas de descuentos exclusivos y experiencia sin anuncios',
            type: 'metro_premium_activated',
            data: { premiumActivated: true },
            actionUrl: '/profile'
          }
        );
      }

      return sendOk(res, {
        message: premium ? 'Metro Premium activado' : 'Metro Premium desactivado',
        user: {
          id: user._id,
          displayName: user.displayName,
          hasMetroPremium: user.hasMetroPremium
        }
      });
    } catch (error) {
      console.error('Error toggling premium:', error);
      return sendError(res, 'Error actualizando estado Premium', 500);
    }
  }

  // Crear nueva opción de descuento (Solo administradores)
  static async createDiscountOption(req: AuthenticatedRequest, res: Response) {
    try {
      const {
        discountType,
        discountValue,
        pointsRequired,
        cantidad_disponible,
        fecha_expiracion,
        premiumOnly = false,
        description,
        enabled = true
      } = req.body;

      // Validaciones
      if (!discountType || !discountValue || !pointsRequired || !cantidad_disponible || !fecha_expiracion || !description) {
        return sendError(res, 'Todos los campos son requeridos', 400);
      }

      if (discountValue < 1 || discountValue > 100) {
        return sendError(res, 'El valor de descuento debe estar entre 1 y 100', 400);
      }

      if (pointsRequired < 1) {
        return sendError(res, 'Los puntos requeridos deben ser mayor a 0', 400);
      }

      if (cantidad_disponible < 1) {
        return sendError(res, 'La cantidad disponible debe ser mayor a 0', 400);
      }

      const expirationDate = new Date(fecha_expiracion);
      if (expirationDate <= new Date()) {
        return sendError(res, 'La fecha de expiración debe ser futura', 400);
      }

      // Verificar si ya existe una opción con este tipo
      const existingOption = await MetroDiscountOptionModel.findOne({ discountType });
      if (existingOption) {
        return sendError(res, 'Ya existe una opción de descuento con este tipo', 400);
      }

      // Obtener precios para calcular ahorros estimados
      const pricing = await getMetroPricing();
      
      const estimatedSavings = {
        single: Math.round(pricing.single_trip.regular * (discountValue / 100) * 100) / 100,
        roundTrip: Math.round(pricing.round_trip.regular * (discountValue / 100) * 100) / 100,
        monthlyPass: Math.round(pricing.monthly_pass.regular * (discountValue / 100) * 100) / 100,
      };

      // Crear nueva opción
      const newOption = new MetroDiscountOptionModel({
        discountType,
        discountValue,
        pointsRequired,
        cantidad_disponible,
        fecha_expiracion: expirationDate,
        premiumOnly,
        description,
        enabled,
        estimatedSavings
      });

      await newOption.save();

      return sendCreated(res, {
        message: 'Opción de descuento creada exitosamente',
        option: {
          id: newOption._id,
          discountType: newOption.discountType,
          discountValue: newOption.discountValue,
          pointsRequired: newOption.pointsRequired,
          cantidad_disponible: newOption.cantidad_disponible,
          fecha_expiracion: newOption.fecha_expiracion,
          premiumOnly: newOption.premiumOnly,
          description: newOption.description,
          enabled: newOption.enabled,
          estimatedSavings: newOption.estimatedSavings,
          createdAt: newOption.createdAt
        }
      });

    } catch (error) {
      console.error('Error creating discount option:', error);
      return sendError(res, 'Error interno del servidor', 500);
    }
  }

  // Actualizar cantidad disponible cuando se canjea un descuento
  static async decrementDiscountAvailability(discountType: string): Promise<boolean> {
    try {
      const option = await MetroDiscountOptionModel.findOne({ 
        discountType,
        enabled: true,
        fecha_expiracion: { $gt: new Date() },
        cantidad_disponible: { $gt: 0 }
      });

      if (!option) {
        return false; // No hay disponibilidad
      }

      // Decrementar cantidad disponible
      option.cantidad_disponible -= 1;
      await option.save();

      return true; // Canje exitoso
    } catch (error) {
      console.error('Error decrementing discount availability:', error);
      return false;
    }
  }

  // ========== GESTIÓN DE OPCIONES PERSONALIZADAS ==========

  // Obtener todas las opciones personalizadas
  static async getAllCustomOptions(req: AuthenticatedRequest, res: Response) {
    try {
      const { 
        page = 1, 
        limit = 50, 
        search = '',
        status = 'all'
      } = req.query;

      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const skip = (pageNum - 1) * limitNum;

      // Construir filtros
      const filters: any = {};
      
      if (search) {
        filters.$or = [
          { discountType: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } }
        ];
      }

      if (status !== 'all') {
        if (status === 'active') {
          filters.enabled = true;
        } else if (status === 'inactive') {
          filters.enabled = false;
        }
      }

      const [options, total] = await Promise.all([
        MetroDiscountOptionModel.find(filters)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limitNum)
          .lean(),
        MetroDiscountOptionModel.countDocuments(filters)
      ]);

      return sendOk(res, {
        options,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum)
        }
      });
    } catch (error) {
      console.error('Error getting custom options:', error);
      return sendError(res, 'Error obteniendo opciones personalizadas', 500);
    }
  }

  // Actualizar opción personalizada
  static async updateCustomOption(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return sendError(res, 'ID de opción inválido', 400);
      }

      const option = await MetroDiscountOptionModel.findByIdAndUpdate(
        id,
        { $set: updateData },
        { new: true, runValidators: true }
      );

      if (!option) {
        return sendError(res, 'Opción no encontrada', 404);
      }

      return sendOk(res, {
        message: 'Opción actualizada exitosamente',
        option
      });
    } catch (error) {
      console.error('Error updating custom option:', error);
      return sendError(res, 'Error actualizando opción', 500);
    }
  }

  // Eliminar opción personalizada
  static async deleteCustomOption(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return sendError(res, 'ID de opción inválido', 400);
      }

      const option = await MetroDiscountOptionModel.findById(id);
      if (!option) {
        return sendError(res, 'Opción no encontrada', 404);
      }

      // Verificar si hay descuentos usando esta opción
      const hasDiscounts = await MetroDiscountModel.countDocuments({
        metadata: { $regex: option.discountType }
      });

      if (hasDiscounts > 0) {
        return sendError(res, 'No se puede eliminar, hay descuentos usando esta opción', 400);
      }

      await MetroDiscountOptionModel.findByIdAndDelete(id);

      return sendOk(res, {
        message: 'Opción eliminada exitosamente',
        id
      });
    } catch (error) {
      console.error('Error deleting custom option:', error);
      return sendError(res, 'Error eliminando opción', 500);
    }
  }

  // Toggle estado de opción personalizada
  static async toggleCustomOption(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return sendError(res, 'ID de opción inválido', 400);
      }

      const option = await MetroDiscountOptionModel.findById(id);
      if (!option) {
        return sendError(res, 'Opción no encontrada', 404);
      }

      option.enabled = !option.enabled;
      await option.save();

      return sendOk(res, {
        message: 'Estado de opción actualizado',
        option
      });
    } catch (error) {
      console.error('Error toggling custom option:', error);
      return sendError(res, 'Error actualizando estado', 500);
    }
  }

  // ========== GESTIÓN DE USUARIOS ==========

  // Obtener lista de usuarios
  static async getUsers(req: AuthenticatedRequest, res: Response) {
    try {
      const { 
        page = 1, 
        limit = 20, 
        search = '',
        premiumStatus = 'all'
      } = req.query;

      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const skip = (pageNum - 1) * limitNum;

      // Construir filtros
      const filters: any = {};
      
      if (search) {
        filters.$or = [
          { displayName: { $regex: search, $options: 'i' } },
          { phone: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ];
      }

      if (premiumStatus !== 'all') {
        if (premiumStatus === 'premium') {
          filters.hasMetroPremium = true;
        } else if (premiumStatus === 'regular') {
          filters.hasMetroPremium = false;
        }
      }

      const [users, total] = await Promise.all([
        UserModel.find(filters)
          .select('displayName phone email hasMetroPremium premiumExpiryDate createdAt updatedAt')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limitNum)
          .lean(),
        UserModel.countDocuments(filters)
      ]);

      return sendOk(res, {
        users,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum)
        }
      });
    } catch (error) {
      console.error('Error getting users:', error);
      return sendError(res, 'Error obteniendo usuarios', 500);
    }
  }
}