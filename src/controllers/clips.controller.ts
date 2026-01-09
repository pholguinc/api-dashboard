import { Request, Response } from 'express';
import { sendError, sendOk, sendCreated, sendPaginated, sendNoContent } from '../utils/response';
import { ClipModel, ClipInteractionModel } from '../models/clip.model';
import { UserModel } from '../models/user.model';
import { AuthenticatedRequest } from '../middleware/auth';
import mongoose from 'mongoose';

// ========== CLIPS PÚBLICOS PARA LA APP ==========

export async function getActiveClips(req: Request, res: Response) {
  try {
    const {
      category,
      limit = 20,
      page = 1,
      featured,
      userId
    } = req.query as any;

    const skip = (page - 1) * limit;
    const now = new Date();

    // Filtros para clips activos
    const filter: any = {
      status: 'active',
      isActive: true
    };

    // Agregar filtro de featured si se solicita
    if (featured === 'true') {
      filter.isFeatured = true;
    }

    console.log('🔍 Buscando clips con filtro:', JSON.stringify(filter));
    const totalClips = await ClipModel.countDocuments({});
    const activeClips = await ClipModel.countDocuments(filter);
    console.log(`📊 Total clips: ${totalClips}, Clips activos: ${activeClips}`);

    if (category) {
      filter.category = category;
    }

    if (featured === 'true') {
      filter.isFeatured = true;
    }

    // Obtener clips con información de interacciones del usuario
    const aggregationPipeline = [
      { $match: filter },
      {
        $lookup: {
          from: 'clipinteractions',
          let: { clipId: '$_id', currentUserId: userId ? new mongoose.Types.ObjectId(userId) : null },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$clipId', '$$clipId'] },
                    { $eq: ['$userId', '$$currentUserId'] }
                  ]
                }
              }
            }
          ],
          as: 'userInteractions'
        }
      },
      {
        $addFields: {
          isLikedByUser: {
            $in: ['like', '$userInteractions.type']
          },
          isSharedByUser: {
            $in: ['share', '$userInteractions.type']
          }
        }
      },
      {
        $project: {
          userInteractions: 0 // No enviar las interacciones completas
        }
      },
      {
        $sort: {
          isFeatured: -1,
          priority: -1,
          views: -1,
          createdAt: -1
        }
      },
      { $skip: skip },
      { $limit: parseInt(limit) }
    ];

    const [clips, total] = await Promise.all([
      (ClipModel as any).aggregate(aggregationPipeline),
      ClipModel.countDocuments(filter)
    ]);

    return sendPaginated(res, clips, page, limit, total);
  } catch (error) {
    console.error('Error in getActiveClips:', error);
    return sendError(res, 'Error al obtener clips', 500, 'CLIPS_FETCH_ERROR');
  }
}

export async function getClipById(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { userId } = req.query;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 'ID de clip inválido', 400, 'INVALID_CLIP_ID');
    }

    const clip = await ClipModel.findById(id);
    if (!clip) {
      return sendError(res, 'Clip no encontrado', 404, 'CLIP_NOT_FOUND');
    }

    // Obtener interacciones del usuario si está autenticado
    let userInteractions = {};
    if (userId && mongoose.Types.ObjectId.isValid(userId as string)) {
      const interactions = await ClipInteractionModel.find({
        clipId: id,
        userId: userId
      }).lean();

      userInteractions = {
        isLiked: interactions.some(i => i.type === 'like'),
        isShared: interactions.some(i => i.type === 'share'),
        watchTime: interactions.find(i => i.type === 'view')?.metadata?.watchTime || 0
      };
    }

    return sendOk(res, { ...clip, userInteractions });
  } catch (error) {
    console.error('Error in getClipById:', error);
    return sendError(res, 'Error al obtener clip', 500, 'CLIP_FETCH_ERROR');
  }
}

export async function recordClipInteraction(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const { type, metadata } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 'ID de clip inválido', 400, 'INVALID_CLIP_ID');
    }

    const clip = await ClipModel.findById(id);
    if (!clip) {
      return sendError(res, 'Clip no encontrado', 404, 'CLIP_NOT_FOUND');
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Para likes y shares, verificar si ya existe
      if (['like', 'share'].includes(type)) {
        const existingInteraction = await ClipInteractionModel.findOne({
          clipId: id,
          userId: req.user!.id,
          type
        }).session(session);

        if (existingInteraction && type === 'like') {
          // Toggle like - remover si ya existe
          await ClipInteractionModel.deleteOne({
            clipId: id,
            userId: req.user!.id,
            type: 'like'
          }).session(session);

          await ClipModel.findByIdAndUpdate(
            id,
            { $inc: { likes: -1 } },
            { session }
          );

          await session.commitTransaction();
          return sendOk(res, { action: 'unliked', likes: clip.likes - 1 });
        } else if (existingInteraction) {
          await session.abortTransaction();
          return sendError(res, 'Interacción ya registrada', 400, 'ALREADY_INTERACTED');
        }
      }

      // Registrar nueva interacción
      await ClipInteractionModel.create([{
        clipId: id,
        userId: req.user!.id,
        type,
        metadata: {
          deviceType: 'mobile',
          ...metadata
        }
      }], { session });

      // Actualizar contadores en el clip
      const updateField = type === 'view' ? 'views' :
        type === 'like' ? 'likes' :
          type === 'share' ? 'shares' :
            type === 'comment' ? 'comments' : null;

      if (updateField) {
        await ClipModel.findByIdAndUpdate(
          id,
          { $inc: { [updateField]: 1 } },
          { session }
        );
      }

      // Recompensar puntos por interacción
      const pointsReward = {
        view: 5,    // 5 puntos por ver un clip completo
        like: 10,   // 10 puntos por like
        share: 20,  // 20 puntos por compartir
        comment: 15 // 15 puntos por comentar
      };

      if (pointsReward[type as keyof typeof pointsReward]) {
        await UserModel.findByIdAndUpdate(
          req.user!.id,
          { $inc: { pointsSmart: pointsReward[type as keyof typeof pointsReward] } },
          { session }
        );
      }

      await session.commitTransaction();

      const newCount = clip[updateField as keyof typeof clip] + 1;
      return sendOk(res, {
        action: 'recorded',
        type,
        [updateField || 'count']: newCount,
        pointsEarned: pointsReward[type as keyof typeof pointsReward] || 0
      });

    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }

  } catch (error) {
    console.error('Error in recordClipInteraction:', error);
    return sendError(res, 'Error al registrar interacción', 500, 'INTERACTION_ERROR');
  }
}

export async function getTrendingClips(req: Request, res: Response) {
  try {
    const { limit = 10, timeframe = 'week' } = req.query as any;

    // Calcular fecha de inicio según timeframe
    const now = new Date();
    const timeframes = {
      day: 24 * 60 * 60 * 1000,
      week: 7 * 24 * 60 * 60 * 1000,
      month: 30 * 24 * 60 * 60 * 1000
    };

    const startDate = new Date(now.getTime() - timeframes[timeframe as keyof typeof timeframes]);

    const trendingClips = await ClipModel.aggregate([
      {
        $match: {
          status: 'active',
          isApproved: true,
          createdAt: { $gte: startDate }
        }
      },
      {
        $addFields: {
          trendingScore: {
            $add: [
              { $multiply: ['$views', 1] },
              { $multiply: ['$likes', 3] },
              { $multiply: ['$shares', 5] },
              { $multiply: ['$comments', 4] }
            ]
          }
        }
      },
      {
        $sort: { trendingScore: -1, createdAt: -1 }
      },
      {
        $limit: parseInt(limit)
      }
    ]);

    return sendOk(res, trendingClips);
  } catch (error) {
    console.error('Error in getTrendingClips:', error);
    return sendError(res, 'Error al obtener clips trending', 500, 'TRENDING_CLIPS_ERROR');
  }
}

// ========== GESTIÓN ADMIN DE CLIPS ==========

export async function getAllClips(req: Request, res: Response) {
  try {
    const {
      page = 1,
      limit = 10,
      category,
      status,
      isApproved,
      search,
      creator
    } = req.query as any;

    const skip = (page - 1) * limit;

    // Construir filtros
    const filter: any = {};

    if (category) filter.category = category;
    if (status) filter.status = status;
    if (isApproved !== undefined) filter.isApproved = isApproved === 'true';
    if (creator) filter['creator.name'] = { $regex: creator, $options: 'i' };

    if (search) {
      filter.$text = { $search: search };
    }

    const [clips, total] = await Promise.all([
      ClipModel.find(filter)
        .populate('createdBy', 'displayName')
        .populate('moderatedBy', 'displayName')
        .sort({ createdAt: -1, priority: -1 })
        .skip(skip)
        .limit(limit),
      ClipModel.countDocuments(filter)
    ]);

    return sendPaginated(res, clips, page, limit, total);
  } catch (error) {
    console.error('Error in getAllClips:', error);
    return sendError(res, 'Error al obtener clips', 500, 'CLIPS_ADMIN_FETCH_ERROR');
  }
}

export async function createClip(req: AuthenticatedRequest, res: Response) {
  try {
    console.log('📝 createClip - req.body recibido:', JSON.stringify(req.body, null, 2));
    console.log('📝 status recibido:', req.body.status);
    console.log('📝 tags recibidos:', req.body.tags);

    const clipData = {
      ...req.body,
      createdBy: req.user!.id
    };

    console.log('📝 clipData final:', JSON.stringify(clipData, null, 2));

    const clip = await ClipModel.create(clipData);

    return sendCreated(res, clip, 'Clip creado exitosamente');
  } catch (error) {
    console.error('Error in createClip:', error);

    if (error instanceof mongoose.Error.ValidationError) {
      const validationErrors = Object.values(error.errors).map(err => ({
        field: err.path,
        message: err.message
      }));
      return sendError(res, 'Datos de entrada inválidos', 400, 'VALIDATION_ERROR', validationErrors);
    }

    return sendError(res, 'Error al crear clip', 500, 'CLIP_CREATE_ERROR');
  }
}

export async function updateClip(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const updateData = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 'ID de clip inválido', 400, 'INVALID_CLIP_ID');
    }

    const clip = await ClipModel.findByIdAndUpdate(
      id,
      { ...updateData, updatedAt: new Date() },
      { new: true, runValidators: true }
    ).populate('createdBy', 'displayName')
      .populate('moderatedBy', 'displayName');

    if (!clip) {
      return sendError(res, 'Clip no encontrado', 404, 'CLIP_NOT_FOUND');
    }

    return sendOk(res, clip, 200, { message: 'Clip actualizado exitosamente' });
  } catch (error) {
    console.error('Error in updateClip:', error);
    return sendError(res, 'Error al actualizar clip', 500, 'CLIP_UPDATE_ERROR');
  }
}

export async function deleteClip(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 'ID de clip inválido', 400, 'INVALID_CLIP_ID');
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Eliminar clip
      const clip = await ClipModel.findByIdAndDelete(id).session(session);
      if (!clip) {
        await session.abortTransaction();
        return sendError(res, 'Clip no encontrado', 404, 'CLIP_NOT_FOUND');
      }

      // Eliminar interacciones asociadas
      await ClipInteractionModel.deleteMany({ clipId: id }).session(session);

      await session.commitTransaction();
      return sendNoContent(res);

    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }

  } catch (error) {
    console.error('Error in deleteClip:', error);
    return sendError(res, 'Error al eliminar clip', 500, 'CLIP_DELETE_ERROR');
  }
}

export async function moderateClip(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const { isApproved, status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 'ID de clip inválido', 400, 'INVALID_CLIP_ID');
    }

    const updateData: any = {
      moderatedBy: req.user!.id,
      moderatedAt: new Date()
    };

    if (isApproved !== undefined) {
      updateData.isApproved = isApproved;
    }

    if (status) {
      updateData.status = status;
    }

    const clip = await ClipModel.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate('createdBy', 'displayName')
      .populate('moderatedBy', 'displayName');

    if (!clip) {
      return sendError(res, 'Clip no encontrado', 404, 'CLIP_NOT_FOUND');
    }

    return sendOk(res, clip, 200, { message: 'Clip moderado exitosamente' });
  } catch (error) {
    console.error('Error in moderateClip:', error);
    return sendError(res, 'Error al moderar clip', 500, 'CLIP_MODERATE_ERROR');
  }
}

// ========== ESTADÍSTICAS Y ANALYTICS ==========

export async function getClipStats(req: Request, res: Response) {
  try {
    const [
      totalClips,
      activeClips,
      pendingApproval,
      reportedClips,
      totalViews,
      totalLikes,
      topCategories
    ] = await Promise.all([
      ClipModel.countDocuments(),
      ClipModel.countDocuments({ status: 'active', isApproved: true }),
      ClipModel.countDocuments({ status: 'draft', isApproved: false }),
      ClipModel.countDocuments({ reportCount: { $gt: 0 } }),
      ClipModel.aggregate([{ $group: { _id: null, total: { $sum: '$views' } } }]),
      ClipModel.aggregate([{ $group: { _id: null, total: { $sum: '$likes' } } }]),
      ClipModel.aggregate([
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 }
      ])
    ]);

    const stats = {
      clips: {
        total: totalClips,
        active: activeClips,
        pending: pendingApproval,
        reported: reportedClips
      },
      engagement: {
        totalViews: totalViews[0]?.total || 0,
        totalLikes: totalLikes[0]?.total || 0,
        avgViewsPerClip: totalClips > 0 ? Math.round((totalViews[0]?.total || 0) / totalClips) : 0
      },
      categories: topCategories
    };

    return sendOk(res, stats);
  } catch (error) {
    console.error('Error in getClipStats:', error);
    return sendError(res, 'Error al obtener estadísticas', 500, 'CLIP_STATS_ERROR');
  }
}

export async function getClipAnalytics(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { startDate, endDate, groupBy = 'day' } = req.query as any;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 'ID de clip inválido', 400, 'INVALID_CLIP_ID');
    }

    const dateFilter: any = { clipId: new mongoose.Types.ObjectId(id) };

    if (startDate && endDate) {
      dateFilter.timestamp = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const analytics = await ClipInteractionModel.aggregate([
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
          count: { $sum: 1 },
          avgWatchTime: {
            $avg: {
              $cond: [
                { $eq: ['$type', 'view'] },
                '$metadata.watchTime',
                null
              ]
            }
          }
        }
      },
      { $sort: { '_id.date': 1 } }
    ]);

    return sendOk(res, { clipId: id, analytics });
  } catch (error) {
    console.error('Error in getClipAnalytics:', error);
    return sendError(res, 'Error al obtener analytics', 500, 'CLIP_ANALYTICS_ERROR');
  }
}
