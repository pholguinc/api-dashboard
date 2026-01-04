import { Response } from 'express';
import mongoose from 'mongoose';
import { AuthenticatedRequest } from '../../middleware/auth';
import { sendError, sendOk } from '../../utils/response';
import { MetroYaCouponModel, COUPON_TEMPLATES } from '../../models/metro-ya-coupon.model';
import { MetroYaCouponUsageModel } from '../../models/metro-ya-coupon-usage.model';

/**
 * Controlador de Administración de Cupones Metro Ya
 * Solo accesible para administradores
 */
export class MetroYaCouponsAdminController {
  
  /**
   * Crear nuevo cupón
   * POST /api/admin/metro-ya-coupons
   */
  static async createCoupon(req: AuthenticatedRequest, res: Response) {
    try {
      const adminId = req.user?.id;
      const {
        code,
        title,
        description,
        icon,
        benefitType,
        discountPercentage,
        discountAmount,
        pointsBonus,
        customData,
        validFrom,
        validUntil,
        maxUsesPerCycle,
        category,
        displayOrder
      } = req.body;
      
      // Verificar que el código no exista
      const existingCoupon = await MetroYaCouponModel.findOne({ code: code.toUpperCase() });
      if (existingCoupon) {
        return sendError(res, 'Ya existe un cupón con ese código', 400, 'COUPON_CODE_EXISTS');
      }
      
      // Validar campos según benefitType
      if (benefitType === 'discount_percentage' && !discountPercentage) {
        return sendError(res, 'discountPercentage es requerido para tipo discount_percentage', 400, 'MISSING_DISCOUNT_PERCENTAGE');
      }
      
      if (benefitType === 'discount_fixed' && !discountAmount) {
        return sendError(res, 'discountAmount es requerido para tipo discount_fixed', 400, 'MISSING_DISCOUNT_AMOUNT');
      }
      
      if (benefitType === 'points_bonus' && !pointsBonus) {
        return sendError(res, 'pointsBonus es requerido para tipo points_bonus', 400, 'MISSING_POINTS_BONUS');
      }
      
      // Generar código QR único
      const generateQRCode = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = 'COUPON-';
        for (let i = 0; i < 6; i++) {
          result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
      };

      // Crear el cupón
      const newCoupon = new MetroYaCouponModel({
        code: code.toUpperCase(),
        qrCode: generateQRCode(), // Generar manualmente el QR code
        title,
        description,
        icon: icon || '🎫',
        benefitType,
        discountPercentage,
        discountAmount,
        pointsBonus,
        customData,
        isActive: true,
        validFrom: validFrom || new Date(),
        validUntil,
        maxUsesPerCycle: maxUsesPerCycle || 1,
        requiresPremium: true,
        category: category || 'transport',
        displayOrder: displayOrder || 0,
        metadata: {
          createdBy: adminId,
          totalUses: 0,
          activeUsers: 0
        }
      });
      
      await newCoupon.save();
      
      console.log(`✅ Coupon created: ${newCoupon.code} by admin ${adminId}`);
      
      return sendOk(res, {
        message: 'Cupón creado exitosamente',
        coupon: {
          id: newCoupon._id,
          code: newCoupon.code,
          title: newCoupon.title,
          benefitFormatted: newCoupon.formatBenefit(),
          isActive: newCoupon.isActive,
          createdAt: newCoupon.createdAt
        }
      });
      
    } catch (error) {
      console.error('Error in createCoupon:', error);
      return sendError(res, 'Error al crear cupón', 500, 'CREATE_COUPON_ERROR');
    }
  }
  
  /**
   * Obtener todos los cupones (con paginación y filtros)
   * GET /api/admin/metro-ya-coupons
   */
  static async getAllCoupons(req: AuthenticatedRequest, res: Response) {
    try {
      const { 
        page = 1, 
        limit = 20, 
        isActive, 
        category, 
        benefitType,
        search 
      } = req.query as any;
      
      const skip = (parseInt(page) - 1) * parseInt(limit);
      
      // Construir filtros
      const filter: any = {};
      
      if (isActive !== undefined) {
        filter.isActive = isActive === 'true';
      }
      
      if (category) {
        filter.category = category;
      }
      
      if (benefitType) {
        filter.benefitType = benefitType;
      }
      
      if (search) {
        filter.$or = [
          { code: { $regex: search, $options: 'i' } },
          { title: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } }
        ];
      }
      
      const [coupons, total] = await Promise.all([
        MetroYaCouponModel.find(filter)
          .populate('metadata.createdBy', 'displayName email')
          .sort({ displayOrder: 1, createdAt: -1 })
          .skip(skip)
          .limit(parseInt(limit))
          .lean(),
        MetroYaCouponModel.countDocuments(filter)
      ]);
      
      const couponsFormatted = coupons.map(coupon => ({
        id: coupon._id,
        code: coupon.code,
        title: coupon.title,
        description: coupon.description,
        icon: coupon.icon,
        benefitType: coupon.benefitType,
        benefitFormatted: coupon.formatBenefit?.() || coupon.description,
        category: coupon.category,
        isActive: coupon.isActive,
        validFrom: coupon.validFrom,
        validUntil: coupon.validUntil,
        maxUsesPerCycle: coupon.maxUsesPerCycle,
        displayOrder: coupon.displayOrder,
        stats: {
          totalUses: coupon.metadata.totalUses,
          activeUsers: coupon.metadata.activeUsers
        },
        createdBy: coupon.metadata.createdBy,
        createdAt: coupon.createdAt,
        updatedAt: coupon.updatedAt
      }));
      
      return sendOk(res, {
        coupons: couponsFormatted,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit))
        },
        summary: {
          total,
          active: coupons.filter(c => c.isActive).length,
          inactive: coupons.filter(c => !c.isActive).length
        }
      });
      
    } catch (error) {
      console.error('Error in getAllCoupons:', error);
      return sendError(res, 'Error obteniendo cupones', 500, 'GET_COUPONS_ERROR');
    }
  }
  
  /**
   * Obtener un cupón específico con estadísticas detalladas
   * GET /api/admin/metro-ya-coupons/:couponId
   */
  static async getCouponById(req: AuthenticatedRequest, res: Response) {
    try {
      const { couponId } = req.params;
      
      const coupon = await MetroYaCouponModel.findById(couponId)
        .populate('metadata.createdBy', 'displayName email');
      
      if (!coupon) {
        return sendError(res, 'Cupón no encontrado', 404, 'COUPON_NOT_FOUND');
      }
      
      // Obtener estadísticas de uso
      const usageStats = await MetroYaCouponUsageModel.aggregate([
        { $match: { couponId: new mongoose.Types.ObjectId(couponId) } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]);
      
      const stats: any = {
        totalRecords: 0,
        available: 0,
        used: 0,
        expired: 0
      };
      
      usageStats.forEach(stat => {
        stats.totalRecords += stat.count;
        stats[stat._id] = stat.count;
      });
      
      // Últimos 10 usos
      const recentUsages = await MetroYaCouponUsageModel.find({
        couponId,
        status: 'used'
      })
      .populate('userId', 'displayName phone')
      .sort({ usedAt: -1 })
      .limit(10)
      .lean();
      
      return sendOk(res, {
        coupon: {
          id: coupon._id,
          code: coupon.code,
          title: coupon.title,
          description: coupon.description,
          icon: coupon.icon,
          benefitType: coupon.benefitType,
          discountPercentage: coupon.discountPercentage,
          discountAmount: coupon.discountAmount,
          pointsBonus: coupon.pointsBonus,
          customData: coupon.customData,
          category: coupon.category,
          isActive: coupon.isActive,
          validFrom: coupon.validFrom,
          validUntil: coupon.validUntil,
          maxUsesPerCycle: coupon.maxUsesPerCycle,
          displayOrder: coupon.displayOrder,
          createdBy: coupon.metadata.createdBy,
          createdAt: coupon.createdAt,
          updatedAt: coupon.updatedAt
        },
        stats,
        recentUsages: recentUsages.map(usage => ({
          user: usage.userId,
          usedAt: usage.usedAt,
          cycleNumber: usage.cycleNumber,
          details: usage.usageDetails
        }))
      });
      
    } catch (error) {
      console.error('Error in getCouponById:', error);
      return sendError(res, 'Error obteniendo cupón', 500, 'GET_COUPON_ERROR');
    }
  }
  
  /**
   * Actualizar cupón
   * PUT /api/admin/metro-ya-coupons/:couponId
   */
  static async updateCoupon(req: AuthenticatedRequest, res: Response) {
    try {
      const { couponId } = req.params;
      const updates = req.body;
      
      // Campos que no se pueden actualizar
      delete updates.code; // El código no se puede cambiar
      delete updates.metadata;
      delete updates.createdAt;
      
      const coupon = await MetroYaCouponModel.findByIdAndUpdate(
        couponId,
        { $set: updates },
        { new: true, runValidators: true }
      );
      
      if (!coupon) {
        return sendError(res, 'Cupón no encontrado', 404, 'COUPON_NOT_FOUND');
      }
      
      console.log(`✅ Coupon updated: ${coupon.code} by admin ${req.user?.id}`);
      
      return sendOk(res, {
        message: 'Cupón actualizado exitosamente',
        coupon: {
          id: coupon._id,
          code: coupon.code,
          title: coupon.title,
          isActive: coupon.isActive,
          updatedAt: coupon.updatedAt
        }
      });
      
    } catch (error) {
      console.error('Error in updateCoupon:', error);
      return sendError(res, 'Error actualizando cupón', 500, 'UPDATE_COUPON_ERROR');
    }
  }
  
  /**
   * Activar/Desactivar cupón
   * PATCH /api/admin/metro-ya-coupons/:couponId/toggle
   */
  static async toggleCouponStatus(req: AuthenticatedRequest, res: Response) {
    try {
      const { couponId } = req.params;
      
      const coupon = await MetroYaCouponModel.findById(couponId);
      if (!coupon) {
        return sendError(res, 'Cupón no encontrado', 404, 'COUPON_NOT_FOUND');
      }
      
      coupon.isActive = !coupon.isActive;
      await coupon.save();
      
      console.log(`✅ Coupon toggled: ${coupon.code} - now ${coupon.isActive ? 'active' : 'inactive'}`);
      
      return sendOk(res, {
        message: `Cupón ${coupon.isActive ? 'activado' : 'desactivado'} exitosamente`,
        coupon: {
          id: coupon._id,
          code: coupon.code,
          isActive: coupon.isActive
        }
      });
      
    } catch (error) {
      console.error('Error in toggleCouponStatus:', error);
      return sendError(res, 'Error cambiando estado del cupón', 500, 'TOGGLE_COUPON_ERROR');
    }
  }
  
  /**
   * Eliminar cupón
   * DELETE /api/admin/metro-ya-coupons/:couponId
   */
  static async deleteCoupon(req: AuthenticatedRequest, res: Response) {
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      const { couponId } = req.params;
      
      // Verificar si tiene usos registrados
      const usageCount = await MetroYaCouponUsageModel.countDocuments({
        couponId
      }).session(session);
      
      if (usageCount > 0) {
        await session.abortTransaction();
        return sendError(
          res,
          'No se puede eliminar un cupón que ya ha sido usado. Considere desactivarlo en su lugar.',
          400,
          'COUPON_HAS_USAGE',
          { usageCount }
        );
      }
      
      const coupon = await MetroYaCouponModel.findByIdAndDelete(couponId).session(session);
      if (!coupon) {
        await session.abortTransaction();
        return sendError(res, 'Cupón no encontrado', 404, 'COUPON_NOT_FOUND');
      }
      
      await session.commitTransaction();
      
      console.log(`✅ Coupon deleted: ${coupon.code} by admin ${req.user?.id}`);
      
      return sendOk(res, {
        message: 'Cupón eliminado exitosamente'
      });
      
    } catch (error) {
      await session.abortTransaction();
      console.error('Error in deleteCoupon:', error);
      return sendError(res, 'Error eliminando cupón', 500, 'DELETE_COUPON_ERROR');
    } finally {
      session.endSession();
    }
  }
  
  /**
   * Obtener plantillas predefinidas de cupones
   * GET /api/admin/metro-ya-coupons/templates
   */
  static async getCouponTemplates(req: AuthenticatedRequest, res: Response) {
    try {
      return sendOk(res, {
        templates: Object.entries(COUPON_TEMPLATES).map(([key, template]) => ({
          key,
          ...template
        }))
      });
    } catch (error) {
      console.error('Error in getCouponTemplates:', error);
      return sendError(res, 'Error obteniendo plantillas', 500, 'GET_TEMPLATES_ERROR');
    }
  }
  
  /**
   * Obtener estadísticas globales de cupones
   * GET /api/admin/metro-ya-coupons/stats/global
   */
  static async getGlobalStats(req: AuthenticatedRequest, res: Response) {
    try {
      const [
        totalCoupons,
        activeCoupons,
        totalUsages,
        uniqueUsers
      ] = await Promise.all([
        MetroYaCouponModel.countDocuments(),
        MetroYaCouponModel.countDocuments({ isActive: true }),
        MetroYaCouponUsageModel.countDocuments({ status: 'used' }),
        MetroYaCouponUsageModel.distinct('userId', { status: 'used' })
      ]);
      
      // Cupones más usados
      const topCoupons = await MetroYaCouponUsageModel.aggregate([
        { $match: { status: 'used' } },
        {
          $group: {
            _id: '$couponId',
            totalUses: { $sum: 1 }
          }
        },
        { $sort: { totalUses: -1 } },
        { $limit: 5 },
        {
          $lookup: {
            from: 'metro_ya_coupons',
            localField: '_id',
            foreignField: '_id',
            as: 'coupon'
          }
        },
        { $unwind: '$coupon' }
      ]);
      
      return sendOk(res, {
        stats: {
          totalCoupons,
          activeCoupons,
          inactiveCoupons: totalCoupons - activeCoupons,
          totalUsages,
          uniqueUsers: uniqueUsers.length
        },
        topCoupons: topCoupons.map(item => ({
          coupon: {
            code: item.coupon.code,
            title: item.coupon.title,
            icon: item.coupon.icon
          },
          totalUses: item.totalUses
        }))
      });
      
    } catch (error) {
      console.error('Error in getGlobalStats:', error);
      return sendError(res, 'Error obteniendo estadísticas', 500, 'GET_STATS_ERROR');
    }
  }
}