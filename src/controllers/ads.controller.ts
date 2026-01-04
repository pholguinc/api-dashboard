import { Request, Response } from 'express';
import { sendError, sendOk, sendCreated, sendPaginated, sendNoContent } from '../utils/response';
import { AdModel, AdMetricModel } from '../models/ad.model';
import { AuthenticatedRequest } from '../middleware/auth';
import mongoose from 'mongoose';

// ========== GESTIÓN DE ANUNCIOS ==========

export async function getAllAds(req: Request, res: Response) {
  try {
    const { 
      page = 1, 
      limit = 10, 
      status, 
      type, 
      placement, 
      search,
      advertiser 
    } = req.query as any;
    
    const skip = (page - 1) * limit;

    // Construir filtros
    const filter: any = {};
    
    if (status) filter.status = status;
    if (type) filter.type = type;
    if (placement) filter.placement = placement;
    if (advertiser) filter.advertiser = { $regex: advertiser, $options: 'i' };
    
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { advertiser: { $regex: search, $options: 'i' } }
      ];
    }

    const [ads, total] = await Promise.all([
      AdModel.find(filter)
        .populate('createdBy', 'displayName')
        .sort({ createdAt: -1, priority: -1 })
        .skip(skip)
        .limit(limit),
      AdModel.countDocuments(filter)
    ]);


    return sendPaginated(res, ads, page, limit, total);
  } catch (error) {
    console.error('Error in getAllAds:', error);
    return sendError(res, 'Error al obtener anuncios', 500, 'ADS_FETCH_ERROR');
  }
}

export async function getAdById(req: Request, res: Response) {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 'ID de anuncio inválido', 400, 'INVALID_AD_ID');
    }

    const ad = await AdModel.findById(id)
      .populate('createdBy', 'displayName');
      
    if (!ad) {
      return sendError(res, 'Anuncio no encontrado', 404, 'AD_NOT_FOUND');
    }


    return sendOk(res, ad);
  } catch (error) {
    console.error('Error in getAdById:', error);
    return sendError(res, 'Error al obtener anuncio', 500, 'AD_FETCH_ERROR');
  }
}

export async function createAd(req: AuthenticatedRequest, res: Response) {
  try {
    const adData = {
      ...req.body,
      createdBy: req.user!.id
    };

    const ad = await AdModel.create(adData);
    
    return sendCreated(res, ad, 'Anuncio creado exitosamente');
  } catch (error) {
    console.error('Error in createAd:', error);
    
    if (error instanceof mongoose.Error.ValidationError) {
      const validationErrors = Object.values(error.errors).map(err => ({
        field: err.path,
        message: err.message
      }));
      return sendError(res, 'Datos de entrada inválidos', 400, 'VALIDATION_ERROR', validationErrors);
    }
    
    return sendError(res, 'Error al crear anuncio', 500, 'AD_CREATE_ERROR');
  }
}

export async function updateAd(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const updateData = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 'ID de anuncio inválido', 400, 'INVALID_AD_ID');
    }

    const finalUpdateData = { ...updateData, updatedAt: new Date() };

    const ad = await AdModel.findByIdAndUpdate(
      id,
      finalUpdateData,
      { new: true, runValidators: true }
    ).populate('createdBy', 'displayName');

    if (!ad) {
      return sendError(res, 'Anuncio no encontrado', 404, 'AD_NOT_FOUND');
    }

    return sendOk(res, ad, 200, { message: 'Anuncio actualizado exitosamente' });
  } catch (error) {
    console.error('Error in updateAd:', error);
    
    if (error instanceof mongoose.Error.ValidationError) {
      const validationErrors = Object.values(error.errors).map(err => ({
        field: err.path,
        message: err.message
      }));
      return sendError(res, 'Datos de entrada inválidos', 400, 'VALIDATION_ERROR', validationErrors);
    }
    
    return sendError(res, 'Error al actualizar anuncio', 500, 'AD_UPDATE_ERROR');
  }
}

export async function deleteAd(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 'ID de anuncio inválido', 400, 'INVALID_AD_ID');
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const ad = await AdModel.findByIdAndDelete(id).session(session);
      if (!ad) {
        await session.abortTransaction();
        return sendError(res, 'Anuncio no encontrado', 404, 'AD_NOT_FOUND');
      }

      // Eliminar métricas asociadas
      await AdMetricModel.deleteMany({ adId: id }).session(session);

      await session.commitTransaction();
      return sendNoContent(res);

    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }

  } catch (error) {
    console.error('Error in deleteAd:', error);
    return sendError(res, 'Error al eliminar anuncio', 500, 'AD_DELETE_ERROR');
  }
}

export async function toggleAdStatus(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 'ID de anuncio inválido', 400, 'INVALID_AD_ID');
    }

    if (!['draft', 'active', 'paused', 'expired'].includes(status)) {
      return sendError(res, 'Estado inválido', 400, 'INVALID_STATUS');
    }

    const ad = await AdModel.findByIdAndUpdate(
      id,
      { status },
      { new: true, runValidators: true }
    ).populate('createdBy', 'displayName');

    if (!ad) {
      return sendError(res, 'Anuncio no encontrado', 404, 'AD_NOT_FOUND');
    }

    return sendOk(res, ad, 200, { message: `Estado cambiado a ${status}` });
  } catch (error) {
    console.error('Error in toggleAdStatus:', error);
    return sendError(res, 'Error al cambiar estado', 500, 'AD_STATUS_ERROR');
  }
}

// ========== MÉTRICAS Y ANALYTICS ==========

export async function getAdMetrics(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { 
      startDate, 
      endDate, 
      groupBy = 'day' 
    } = req.query as any;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 'ID de anuncio inválido', 400, 'INVALID_AD_ID');
    }

    const ad = await AdModel.findById(id);
    if (!ad) {
      return sendError(res, 'Anuncio no encontrado', 404, 'AD_NOT_FOUND');
    }

    // Construir filtro de fechas
    const dateFilter: any = { adId: new mongoose.Types.ObjectId(id) };
    
    if (startDate && endDate) {
      dateFilter.timestamp = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    // Agregación para métricas
    const metricsAgg = await AdMetricModel.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: {
            type: '$type',
            date: {
              $dateToString: {
                format: groupBy === 'hour' ? '%Y-%m-%d-%H' : 
                       groupBy === 'day' ? '%Y-%m-%d' : 
                       '%Y-%m',
                date: '$timestamp'
              }
            }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.date': 1 } }
    ]);

    // Procesar datos para respuesta
    const metrics = {
      ad: {
        id: ad._id,
        title: ad.title,
        impressions: ad.impressions,
        clicks: ad.clicks,
        ctr: (ad as any).ctr,
        totalSpent: (ad as any).totalSpent
      },
      timeline: metricsAgg.reduce((acc: any, item: any) => {
        const date = item._id.date;
        if (!acc[date]) {
          acc[date] = { impressions: 0, clicks: 0, conversions: 0 };
        }
        acc[date][item._id.type + 's'] = item.count;
        return acc;
      }, {})
    };

    return sendOk(res, metrics);
  } catch (error) {
    console.error('Error in getAdMetrics:', error);
    return sendError(res, 'Error al obtener métricas', 500, 'METRICS_FETCH_ERROR');
  }
}

export async function recordAdInteraction(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { type, userId, metadata } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 'ID de anuncio inválido', 400, 'INVALID_AD_ID');
    }

    if (!['impression', 'click', 'conversion'].includes(type)) {
      return sendError(res, 'Tipo de interacción inválido', 400, 'INVALID_INTERACTION_TYPE');
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Registrar métrica
      await AdMetricModel.create([{
        adId: id,
        userId: userId || undefined,
        type,
        metadata: {
          userAgent: req.headers['user-agent'],
          ip: req.ip,
          referrer: req.headers.referer,
          ...metadata
        }
      }], { session });

      // Actualizar contadores en el anuncio
      const updateField = type === 'impression' ? 'impressions' : 
                         type === 'click' ? 'clicks' : 'conversions';
      
      await AdModel.findByIdAndUpdate(
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
    console.error('Error in recordAdInteraction:', error);
    return sendError(res, 'Error al registrar interacción', 500, 'INTERACTION_RECORD_ERROR');
  }
}

// ========== ANUNCIOS PARA LA APP ==========

export async function getActiveAds(req: Request, res: Response) {
  try {
    const { placement, type, limit = 10 } = req.query as any;
    
    const now = new Date();
    const filter: any = {
      isActive: true,
      status: 'active',
      'schedule.startDate': { $lte: now },
      'schedule.endDate': { $gte: now }
    };

    if (placement) {
      filter.placement = placement;
    }

    if (type) {
      filter.type = type;
    }

    const ads = await AdModel.find(filter)
      .select('title description type placement imageUrl videoUrl clickUrl destination priority')
      .sort({ priority: -1, createdAt: -1 })
      .limit(parseInt(limit));

    return sendOk(res, ads);
  } catch (error) {
    console.error('Error in getActiveAds:', error);
    return sendError(res, 'Error al obtener anuncios activos', 500, 'ACTIVE_ADS_ERROR');
  }
}

// ========== ESTADÍSTICAS GENERALES ==========

export async function getAdStats(req: Request, res: Response) {
  try {
    const [
      totalAds,
      activeAds,
      totalImpressions,
      totalClicks,
      topPerformingAds
    ] = await Promise.all([
      AdModel.countDocuments(),
      AdModel.countDocuments({ status: 'active', isActive: true }),
      AdModel.aggregate([{ $group: { _id: null, total: { $sum: '$impressions' } } }]),
      AdModel.aggregate([{ $group: { _id: null, total: { $sum: '$clicks' } } }]),
      AdModel.find({ status: 'active' })
        .sort({ clicks: -1 })
        .limit(5)
        .select('title clicks impressions ctr')
    ]);

    const stats = {
      total: totalAds,
      active: activeAds,
      paused: await AdModel.countDocuments({ status: 'paused' }),
      draft: await AdModel.countDocuments({ status: 'draft' }),
      metrics: {
        totalImpressions: totalImpressions[0]?.total || 0,
        totalClicks: totalClicks[0]?.total || 0,
        averageCTR: totalImpressions[0]?.total > 0 
          ? ((totalClicks[0]?.total || 0) / totalImpressions[0].total * 100).toFixed(2)
          : '0.00'
      },
      topPerforming: topPerformingAds
    };

    return sendOk(res, stats);
  } catch (error) {
    console.error('Error in getAdStats:', error);
    return sendError(res, 'Error al obtener estadísticas', 500, 'AD_STATS_ERROR');
  }
}

// ========== REGISTRO DE INTERACCIONES SIMPLIFICADAS ==========

export async function recordAdView(req: Request, res: Response) {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 'ID de anuncio inválido', 400, 'INVALID_AD_ID');
    }

    const ad = await AdModel.findById(id);
    if (!ad) {
      return sendError(res, 'Anuncio no encontrado', 404, 'AD_NOT_FOUND');
    }

    // Registrar métrica de visualización
    const metric = new AdMetricModel({
      adId: new mongoose.Types.ObjectId(id),
      type: 'impression',
      value: 1,
      timestamp: new Date(),
      metadata: {
        userAgent: req.headers['user-agent'],
        ip: req.ip
      }
    });

    await metric.save();

    return sendOk(res, { message: 'Visualización registrada' });
  } catch (error) {
    console.error('Error in recordAdView:', error);
    return sendError(res, 'Error al registrar visualización', 500, 'AD_VIEW_ERROR');
  }
}

export async function recordAdClick(req: Request, res: Response) {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 'ID de anuncio inválido', 400, 'INVALID_AD_ID');
    }

    const ad = await AdModel.findById(id);
    if (!ad) {
      return sendError(res, 'Anuncio no encontrado', 404, 'AD_NOT_FOUND');
    }

    // Registrar métrica de clic
    const metric = new AdMetricModel({
      adId: new mongoose.Types.ObjectId(id),
      type: 'click',
      value: 1,
      timestamp: new Date(),
      metadata: {
        userAgent: req.headers['user-agent'],
        ip: req.ip,
        destination: ad.destination
      }
    });

    await metric.save();

    return sendOk(res, { 
      message: 'Clic registrado',
      destination: ad.destination 
    });
  } catch (error) {
    console.error('Error in recordAdClick:', error);
    return sendError(res, 'Error al registrar clic', 500, 'AD_CLICK_ERROR');
  }
}

// ========== UPLOAD DE ARCHIVOS PARA ANUNCIOS ==========

export async function uploadAdFile(req: AuthenticatedRequest, res: Response) {
  try {
    const file = (req as any).file;
    
    if (!file) {
      return sendError(res, 'No se proporcionó ningún archivo', 400, 'NO_FILE_PROVIDED');
    }

    const { env } = await import('../config/env');
    const isVideo = file.mimetype.startsWith('video/');
    
    // Construir URL completa usando la configuración del entorno
    const fileUrl = `${env.api.baseUrl}/uploads/ads/${file.filename}`;

    const fileData = {
      filename: file.filename,
      originalName: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      url: fileUrl,
      type: isVideo ? 'video' : 'image',
      uploadedBy: req.user!.id,
      uploadedAt: new Date()
    };

    return sendCreated(res, fileData, `${isVideo ? 'Video' : 'Imagen'} subido exitosamente`);
  } catch (error) {
    console.error('Error in uploadAdFile:', error);
    return sendError(res, 'Error al subir archivo', 500, 'AD_FILE_UPLOAD_ERROR');
  }
}