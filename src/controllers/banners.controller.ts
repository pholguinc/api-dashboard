import { Request, Response } from 'express';
import { sendError, sendOk, sendCreated, sendPaginated, sendNoContent } from '../utils/response';
import { BannerModel, BannerInteractionModel } from '../models/banner.model';
import { AuthenticatedRequest } from '../middleware/auth';
import mongoose from 'mongoose';

// ========== BANNERS PÚBLICOS PARA LA APP ==========

export async function getActiveBanners(req: Request, res: Response) {
  try {
    const { limit = 5, userId } = req.query as any;
    
    const now = new Date();
    const filter = {
      isActive: true,
      status: 'active',
      'schedule.startDate': { $lte: now },
      'schedule.endDate': { $gte: now }
    };

    const banners = await BannerModel.find(filter)
      .sort({ displayOrder: 1, priority: -1 })
      .limit(parseInt(limit))
      .lean();

    return sendOk(res, banners);
  } catch (error) {
    console.error('Error in getActiveBanners:', error);
    return sendError(res, 'Error al obtener banners', 500, 'BANNERS_FETCH_ERROR');
  }
}

export async function recordBannerInteraction(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { type, userId, metadata } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 'ID de banner inválido', 400, 'INVALID_BANNER_ID');
    }

    if (!['impression', 'click'].includes(type)) {
      return sendError(res, 'Tipo de interacción inválido', 400, 'INVALID_INTERACTION_TYPE');
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Registrar interacción
      await BannerInteractionModel.create([{
        bannerId: id,
        userId: userId || undefined,
        type,
        metadata: {
          userAgent: req.headers['user-agent'],
          ip: req.ip,
          referrer: req.headers.referer,
          deviceType: 'mobile',
          ...metadata
        }
      }], { session });

      // Actualizar contador en el banner
      const updateField = type === 'impression' ? 'impressions' : 'clicks';
      
      await BannerModel.findByIdAndUpdate(
        id,
        { $inc: { [updateField]: 1 } },
        { session }
      );

      await session.commitTransaction();

      return sendOk(res, { recorded: true, type });
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }

  } catch (error) {
    console.error('Error in recordBannerInteraction:', error);
    return sendError(res, 'Error al registrar interacción', 500, 'BANNER_INTERACTION_ERROR');
  }
}

// ========== GESTIÓN ADMIN DE BANNERS ==========

export async function getAllBanners(req: Request, res: Response) {
  try {
    const { 
      page = 1, 
      limit = 10, 
      type, 
      status, 
      search 
    } = req.query as any;
    
    const skip = (page - 1) * limit;

    // Construir filtros
    const filter: any = {};
    
    if (type) filter.type = type;
    if (status) filter.status = status;
    
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { subtitle: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const [banners, total] = await Promise.all([
      BannerModel.find(filter)
        .populate('createdBy', 'displayName')
        .sort({ displayOrder: 1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      BannerModel.countDocuments(filter)
    ]);

    return sendPaginated(res, banners, page, limit, total);
  } catch (error) {
    console.error('Error in getAllBanners:', error);
    return sendError(res, 'Error al obtener banners', 500, 'BANNERS_ADMIN_FETCH_ERROR');
  }
}

export async function getBannerById(req: Request, res: Response) {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 'ID de banner inválido', 400, 'INVALID_BANNER_ID');
    }

    const banner = await BannerModel.findById(id)
      .populate('createdBy', 'displayName')
      .lean();
      
    if (!banner) {
      return sendError(res, 'Banner no encontrado', 404, 'BANNER_NOT_FOUND');
    }

    return sendOk(res, banner);
  } catch (error) {
    console.error('Error in getBannerById:', error);
    return sendError(res, 'Error al obtener banner', 500, 'BANNER_FETCH_ERROR');
  }
}

export async function createBanner(req: AuthenticatedRequest, res: Response) {
  try {
    const bannerData = {
      ...req.body,
      createdBy: req.user!.id
    };

    const banner = await BannerModel.create(bannerData);
    
    return sendCreated(res, banner, 'Banner creado exitosamente');
  } catch (error) {
    console.error('Error in createBanner:', error);
    
    if (error instanceof mongoose.Error.ValidationError) {
      const validationErrors = Object.values(error.errors).map(err => ({
        field: err.path,
        message: err.message
      }));
      return sendError(res, 'Datos de entrada inválidos', 400, 'VALIDATION_ERROR', validationErrors);
    }
    
    return sendError(res, 'Error al crear banner', 500, 'BANNER_CREATE_ERROR');
  }
}

export async function updateBanner(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const updateData = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 'ID de banner inválido', 400, 'INVALID_BANNER_ID');
    }

    const banner = await BannerModel.findByIdAndUpdate(
      id,
      { ...updateData, updatedAt: new Date() },
      { new: true, runValidators: true }
    ).populate('createdBy', 'displayName');

    if (!banner) {
      return sendError(res, 'Banner no encontrado', 404, 'BANNER_NOT_FOUND');
    }

    return sendOk(res, banner, 200, { message: 'Banner actualizado exitosamente' });
  } catch (error) {
    console.error('Error in updateBanner:', error);
    return sendError(res, 'Error al actualizar banner', 500, 'BANNER_UPDATE_ERROR');
  }
}

export async function deleteBanner(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 'ID de banner inválido', 400, 'INVALID_BANNER_ID');
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const banner = await BannerModel.findByIdAndDelete(id).session(session);
      if (!banner) {
        await session.abortTransaction();
        return sendError(res, 'Banner no encontrado', 404, 'BANNER_NOT_FOUND');
      }

      // Eliminar interacciones asociadas
      await BannerInteractionModel.deleteMany({ bannerId: id }).session(session);

      await session.commitTransaction();
      return sendNoContent(res);

    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }

  } catch (error) {
    console.error('Error in deleteBanner:', error);
    return sendError(res, 'Error al eliminar banner', 500, 'BANNER_DELETE_ERROR');
  }
}

export async function updateBannerOrder(req: AuthenticatedRequest, res: Response) {
  try {
    const { bannerOrders } = req.body; // Array de { id, displayOrder }

    if (!Array.isArray(bannerOrders)) {
      return sendError(res, 'Formato de orden inválido', 400, 'INVALID_ORDER_FORMAT');
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Actualizar orden de cada banner
      for (const { id, displayOrder } of bannerOrders) {
        if (mongoose.Types.ObjectId.isValid(id)) {
          await BannerModel.findByIdAndUpdate(
            id,
            { displayOrder },
            { session }
          );
        }
      }

      await session.commitTransaction();
      return sendOk(res, { updated: true }, 200, { message: 'Orden actualizado exitosamente' });

    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }

  } catch (error) {
    console.error('Error in updateBannerOrder:', error);
    return sendError(res, 'Error al actualizar orden', 500, 'BANNER_ORDER_ERROR');
  }
}

// ========== ESTADÍSTICAS ==========

export async function getBannerStats(req: Request, res: Response) {
  try {
    const [
      totalBanners,
      activeBanners,
      totalImpressions,
      totalClicks,
      topPerformingBanners
    ] = await Promise.all([
      BannerModel.countDocuments(),
      BannerModel.countDocuments({ status: 'active', isActive: true }),
      BannerModel.aggregate([{ $group: { _id: null, total: { $sum: '$impressions' } } }]),
      BannerModel.aggregate([{ $group: { _id: null, total: { $sum: '$clicks' } } }]),
      BannerModel.find({ status: 'active' })
        .sort({ clicks: -1 })
        .limit(5)
        .select('title clicks impressions ctr')
        .lean()
    ]);

    const stats = {
      total: totalBanners,
      active: activeBanners,
      paused: await BannerModel.countDocuments({ status: 'paused' }),
      draft: await BannerModel.countDocuments({ status: 'draft' }),
      metrics: {
        totalImpressions: totalImpressions[0]?.total || 0,
        totalClicks: totalClicks[0]?.total || 0,
        averageCTR: totalImpressions[0]?.total > 0 
          ? ((totalClicks[0]?.total || 0) / totalImpressions[0].total * 100).toFixed(2)
          : '0.00'
      },
      topPerforming: topPerformingBanners
    };

    return sendOk(res, stats);
  } catch (error) {
    console.error('Error in getBannerStats:', error);
    return sendError(res, 'Error al obtener estadísticas', 500, 'BANNER_STATS_ERROR');
  }
}
