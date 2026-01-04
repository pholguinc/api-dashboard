import { Request, Response } from 'express';
import { sendOk, sendError } from '../../utils/response';
import { UserModel } from '../../models/user.model';
import { MetroLiveStreamModel, StreamFollowModel } from '../../models/metro-live.model';

export async function listStreamers(_req: Request, res: Response) {
  try {
    const users = await (UserModel as any).find({ role: 'metro_streamer' }).lean();
    const streamerIds = users.map((u: any) => u._id);
    const [followersAgg, lastLives] = await Promise.all([
      StreamFollowModel.aggregate([
        { $match: { streamerId: { $in: streamerIds } } },
        { $group: { _id: '$streamerId', followers: { $sum: 1 } } }
      ]),
      MetroLiveStreamModel.aggregate([
        { $match: { streamerId: { $in: streamerIds } } },
        { $sort: { createdAt: -1 } },
        { $group: { _id: '$streamerId', lastStream: { $first: '$createdAt' }, isLive: { $first: { $eq: ['$status', 'live'] } } } }
      ])
    ]);

    const followersMap = new Map<string, number>(followersAgg.map((f: any) => [String(f._id), f.followers]));
    const lastLivesMap = new Map<string, { lastStream: Date; isLive: boolean }>(lastLives.map((l: any) => [String(l._id), { lastStream: l.lastStream, isLive: l.isLive }]));

    const mapped = users.map((u: any) => {
      const stats = lastLivesMap.get(String(u._id));
      
      // Calcular estado basado en isActive, isVerified y suspensión
      let calculatedStatus = 'inactive';
      const isActive = u.streamerProfile?.isActive !== false;
      const isVerified = u.streamerProfile?.isVerified || false;
      const isSuspended = u.streamerProfile?.suspendedAt && u.streamerProfile?.suspensionReason;
      
      if (isSuspended) {
        calculatedStatus = u.streamerProfile?.suspensionReason?.includes('baneado') || 
                          u.streamerProfile?.suspensionReason?.includes('Baneado') ? 'banned' : 'suspended';
      } else if (isActive && isVerified) {
        calculatedStatus = 'active';
      } else if (!isActive) {
        calculatedStatus = 'inactive';
      } else if (isActive && !isVerified) {
        calculatedStatus = 'pending';
      }
      
      return {
        id: u._id,
        userId: u._id,
        name: u.displayName,
        displayName: u.displayName,
        username: u.metroUsername || '',
        category: (u.streamerProfile?.categories?.[0] || '').toLowerCase(),
        bio: u.streamerProfile?.bio || '',
        status: calculatedStatus,
        isLive: stats?.isLive || false,
        isVerified: isVerified,
        isActive: isActive,
        suspendedAt: u.streamerProfile?.suspendedAt || null,
        suspensionReason: u.streamerProfile?.suspensionReason || null,
        lastStream: stats?.lastStream || u.updatedAt,
        followerCount: followersMap.get(String(u._id)) || 0,
        totalViews: u.streamerProfile?.totalViews || 0,
        totalStreams: u.streamerProfile?.totalStreams || 0,
        socialLinks: {
          twitter: u.streamerProfile?.socialLinks?.twitter || '',
          instagram: u.streamerProfile?.socialLinks?.instagram || '',
          youtube: u.streamerProfile?.socialLinks?.youtube || '',
          tiktok: u.streamerProfile?.socialLinks?.tiktok || ''
        },
        monetization: {
          isEnabled: u.streamerProfile?.monetization?.isEnabled || false,
          donationsEnabled: u.streamerProfile?.monetization?.donationsEnabled || false,
          subscriptionsEnabled: u.streamerProfile?.monetization?.subscriptionsEnabled || false,
          pointsPerView: u.streamerProfile?.monetization?.pointsPerView || 1
        },
        createdAt: u.createdAt,
        updatedAt: u.updatedAt
      };
    });

    return sendOk(res, mapped);
  } catch { return sendError(res, 'Error', 500); }
}
export async function listApplications(_req: Request, res: Response) {
  try {
    const users = await (UserModel as any).find({ role: 'metro_streamer', 'streamerProfile.isVerified': false }).select('displayName metroUsername streamerProfile createdAt').lean();
    const applications = users.map((u: any) => ({
      id: u._id,
      name: u.displayName,
      username: u.metroUsername,
      bio: u.streamerProfile?.bio,
      categories: u.streamerProfile?.categories || [],
      createdAt: u.createdAt,
      status: 'pending'
    }));
    return sendOk(res, applications);
  } catch { return sendError(res, 'Error', 500); }
}
export async function getStats(_req: Request, res: Response) {
  try {
    const [total, approved, pending, live] = await Promise.all([
      UserModel.countDocuments({ role: 'metro_streamer' }),
      UserModel.countDocuments({ role: 'metro_streamer', 'streamerProfile.isVerified': true }),
      UserModel.countDocuments({ role: 'metro_streamer', 'streamerProfile.isVerified': false }),
      MetroLiveStreamModel.countDocuments({ status: 'live' })
    ]);
    // followers total
    const followersAgg = await StreamFollowModel.aggregate([{ $group: { _id: null, total: { $sum: 1 } } }]);
    const totalFollowers = followersAgg[0]?.total || 0;
    return sendOk(res, { total, approved, pending, live, totalFollowers });
  } catch { return sendError(res, 'Error', 500); }
}
export async function getActiveStreams(_req: Request, res: Response) {
  try {
    const streams = await (MetroLiveStreamModel as any).find({ status: 'live' }).sort({ viewerCount: -1 }).limit(20).lean();
    return sendOk(res, streams);
  } catch { return sendError(res, 'Error', 500); }
}
export async function updateStatus(req: Request, res: Response) {
  try {
    const { userId } = req.params as any;
    const { status } = req.body as any; // 'approved' | 'rejected' | 'pending'
    const update: any = {};
    if (status === 'approved') update['streamerProfile.isVerified'] = true;
    if (status === 'rejected') update['streamerProfile.isVerified'] = false;
    if (status === 'pending') update['streamerProfile.isVerified'] = false;
    const u = await UserModel.findByIdAndUpdate(userId, { $set: update }, { new: true });
    if (!u) return sendError(res, 'Usuario no encontrado', 404);
    return sendOk(res, { id: u._id, isVerified: u.streamerProfile?.isVerified });
  } catch { return sendError(res, 'Error', 500); }
}
export async function verifyStreamer(req: Request, res: Response) {
  try {
    const { streamerId } = req.params as any;
    const u = await UserModel.findByIdAndUpdate(streamerId, { $set: { 'streamerProfile.isVerified': true } }, { new: true });
    if (!u) return sendError(res, 'Usuario no encontrado', 404);
    return sendOk(res, { id: u._id, verified: true });
  } catch { return sendError(res, 'Error', 500); }
}

// Toggle verificación del streamer (agregar/quitar verificación)
export async function toggleVerification(req: Request, res: Response) {
  try {
    const { streamerId } = req.params as any;
    const { isVerified } = req.body as any;
    
    const user = await UserModel.findById(streamerId);
    if (!user) return sendError(res, 'Streamer no encontrado', 404);

    const update = {
      'streamerProfile.isVerified': isVerified === true
    };

    const updatedUser = await UserModel.findByIdAndUpdate(streamerId, { $set: update }, { new: true });
    
    return sendOk(res, { 
      id: updatedUser._id, 
      isVerified: updatedUser.streamerProfile?.isVerified,
      action: isVerified ? 'verified' : 'unverified'
    });
  } catch (error) {
    console.error('Error toggling verification:', error);
    return sendError(res, 'Error al cambiar verificación', 500);
  }
}

// Obtener streamer individual
export async function getStreamer(req: Request, res: Response) {
  try {
    const { streamerId } = req.params as any;
    const user = await (UserModel as any).findById(streamerId).lean();
    if (!user) return sendError(res, 'Streamer no encontrado', 404);
    
    const [followersAgg, lastLives] = await Promise.all([
      StreamFollowModel.aggregate([
        { $match: { streamerId: user._id } },
        { $group: { _id: '$streamerId', followers: { $sum: 1 } } }
      ]),
      MetroLiveStreamModel.aggregate([
        { $match: { streamerId: user._id } },
        { $sort: { createdAt: -1 } },
        { $group: { _id: '$streamerId', lastStream: { $first: '$createdAt' }, isLive: { $first: { $eq: ['$status', 'live'] } } } }
      ])
    ]);

    const followers = followersAgg[0]?.followers || 0;
    const stats = lastLives[0];
    
    const mapped = {
      id: user._id,
      userId: user._id,
      name: user.displayName,
      username: user.metroUsername || '',
      category: (user.streamerProfile?.categories?.[0] || '').toLowerCase(),
      bio: user.streamerProfile?.bio || '',
      status: user.streamerProfile?.isVerified ? 'approved' : 'pending',
      isLive: stats?.isLive || false,
      isVerified: user.streamerProfile?.isVerified || false,
      isActive: user.streamerProfile?.isActive !== false,
      lastStream: stats?.lastStream || user.updatedAt,
      followerCount: followers,
      totalViews: user.streamerProfile?.totalViews || 0,
      totalStreams: user.streamerProfile?.totalStreams || 0,
      socialLinks: user.streamerProfile?.socialLinks || {},
      monetization: user.streamerProfile?.monetization || {
        isEnabled: false,
        donationsEnabled: false,
        subscriptionsEnabled: false,
        pointsPerView: 1
      },
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };

    return sendOk(res, mapped);
  } catch { return sendError(res, 'Error', 500); }
}

// Crear nuevo streamer
export async function createStreamer(req: Request, res: Response) {
  try {
    const { userId, displayName, bio, category, isActive, socialLinks, monetization } = req.body as any;
    
    if (!userId || !displayName) {
      return sendError(res, 'userId y displayName son requeridos', 400);
    }

    const existingUser = await UserModel.findById(userId);
    if (!existingUser) {
      return sendError(res, 'Usuario no encontrado', 404);
    }

    const update = {
      role: 'metro_streamer',
      displayName,
      'streamerProfile.bio': bio || '',
      'streamerProfile.categories': [category || 'other'],
      'streamerProfile.isActive': isActive !== false,
      'streamerProfile.isVerified': false,
      'streamerProfile.socialLinks': {
        twitter: socialLinks?.twitter || '',
        instagram: socialLinks?.instagram || '',
        youtube: socialLinks?.youtube || '',
        tiktok: socialLinks?.tiktok || ''
      },
      'streamerProfile.monetization': {
        isEnabled: monetization?.isEnabled || false,
        donationsEnabled: monetization?.donationsEnabled || false,
        subscriptionsEnabled: monetization?.subscriptionsEnabled || false,
        pointsPerView: monetization?.pointsPerView || 1
      }
    };

    const updatedUser = await UserModel.findByIdAndUpdate(userId, { $set: update }, { new: true });
    return sendOk(res, { id: updatedUser._id, success: true });
  } catch (error) { 
    return sendError(res, 'Error al crear streamer', 500); 
  }
}

// Actualizar streamer
export async function updateStreamer(req: Request, res: Response) {
  try {
    const { streamerId } = req.params as any;
    const { displayName, bio, category, isActive, socialLinks, monetization } = req.body as any;
    
    const user = await UserModel.findById(streamerId);
    if (!user) return sendError(res, 'Streamer no encontrado', 404);

    const update: any = {};
    if (displayName) update.displayName = displayName;
    if (bio !== undefined) update['streamerProfile.bio'] = bio;
    if (category) update['streamerProfile.categories'] = [category];
    if (isActive !== undefined) update['streamerProfile.isActive'] = isActive;
    
    if (socialLinks) {
      update['streamerProfile.socialLinks'] = {
        twitter: socialLinks?.twitter || '',
        instagram: socialLinks?.instagram || '',
        youtube: socialLinks?.youtube || '',
        tiktok: socialLinks?.tiktok || ''
      };
    }
    
    if (monetization) {
      update['streamerProfile.monetization'] = {
        isEnabled: monetization?.isEnabled || false,
        donationsEnabled: monetization?.donationsEnabled || false,
        subscriptionsEnabled: monetization?.subscriptionsEnabled || false,
        pointsPerView: monetization?.pointsPerView || 1
      };
    }

    const updatedUser = await UserModel.findByIdAndUpdate(streamerId, { $set: update }, { new: true });
    return sendOk(res, { id: updatedUser._id, success: true });
  } catch (error) { 
    return sendError(res, 'Error al actualizar streamer', 500); 
  }
}

// Eliminar streamer
export async function deleteStreamer(req: Request, res: Response) {
  try {
    const { streamerId } = req.params as any;
    
    const user = await UserModel.findById(streamerId);
    if (!user) return sendError(res, 'Streamer no encontrado', 404);

    // En lugar de eliminar, cambiamos el rol y limpiamos el perfil de streamer
    await UserModel.findByIdAndUpdate(streamerId, { 
      $set: { 
        role: 'user',
        'streamerProfile.isActive': false,
        'streamerProfile.isVerified': false
      }
    });

    return sendOk(res, { success: true, message: 'Streamer eliminado exitosamente' });
  } catch { return sendError(res, 'Error', 500); }
}

// Obtener sesiones de streaming
export async function getStreamSessions(req: Request, res: Response) {
  try {
    const { streamerId, status, category, limit = 20 } = req.query as any;
    
    const filter: any = {};
    if (streamerId) filter.streamerId = streamerId;
    if (status) filter.status = status;
    if (category) filter.category = category;

    const sessions = await (MetroLiveStreamModel as any)
      .find(filter)
      .populate('streamerId', 'displayName metroUsername')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .lean();

    return sendOk(res, sessions);
  } catch { return sendError(res, 'Error', 500); }
}

// Buscar usuarios para convertir en streamers
export async function searchUsers(req: Request, res: Response) {
  try {
    const { search, limit = 10 } = req.query as any;
    
    if (!search || search.trim().length < 2) {
      return sendOk(res, []);
    }

    const searchTerm = search.trim();
    const searchRegex = new RegExp(searchTerm, 'i');

    // Buscar usuarios que NO sean streamers
    const users = await (UserModel as any)
      .find({
        role: { $ne: 'metro_streamer' }, // Excluir usuarios que ya son streamers
        $or: [
          { displayName: searchRegex },
          { metroUsername: searchRegex },
          { email: searchRegex },
          { name: searchRegex } // Por si tienen campo name
        ]
      })
      .select('_id displayName metroUsername email name avatar createdAt')
      .limit(parseInt(limit))
      .lean();

    const mapped = users.map((user: any) => ({
      id: user._id,
      displayName: user.displayName || user.name || 'Sin nombre',
      username: user.metroUsername || 'Sin username',
      email: user.email || 'Sin email',
      avatar: user.avatar,
      createdAt: user.createdAt
    }));

    return sendOk(res, mapped);
  } catch (error) {
    console.error('Error searching users:', error);
    return sendError(res, 'Error al buscar usuarios', 500);
  }
}

// Cambiar estado completo del streamer
export async function changeStreamerStatus(req: Request, res: Response) {
  try {
    const { streamerId } = req.params as any;
    const { status, reason } = req.body as any;
    
    // Estados válidos: 'active', 'inactive', 'suspended', 'banned'
    const validStatuses = ['active', 'inactive', 'suspended', 'banned'];
    if (!validStatuses.includes(status)) {
      return sendError(res, 'Estado inválido. Debe ser: active, inactive, suspended, banned', 400);
    }

    const user = await UserModel.findById(streamerId);
    if (!user) return sendError(res, 'Streamer no encontrado', 404);

    const update: any = {};
    
    switch (status) {
      case 'active':
        update['streamerProfile.isActive'] = true;
        update['streamerProfile.isVerified'] = true;
        update['streamerProfile.suspendedAt'] = null;
        update['streamerProfile.suspensionReason'] = null;
        break;
      case 'inactive':
        update['streamerProfile.isActive'] = false;
        update['streamerProfile.suspendedAt'] = null;
        update['streamerProfile.suspensionReason'] = null;
        break;
      case 'suspended':
        update['streamerProfile.isActive'] = false;
        update['streamerProfile.suspendedAt'] = new Date();
        update['streamerProfile.suspensionReason'] = reason || 'Suspendido por administrador';
        break;
      case 'banned':
        update['streamerProfile.isActive'] = false;
        update['streamerProfile.isVerified'] = false;
        update['streamerProfile.suspendedAt'] = new Date();
        update['streamerProfile.suspensionReason'] = reason || 'Baneado por violación de términos';
        break;
    }

    const updatedUser = await UserModel.findByIdAndUpdate(streamerId, { $set: update }, { new: true });
    
    return sendOk(res, { 
      id: updatedUser._id, 
      status,
      isActive: updatedUser.streamerProfile?.isActive,
      isVerified: updatedUser.streamerProfile?.isVerified,
      reason: updatedUser.streamerProfile?.suspensionReason
    });
  } catch (error) {
    console.error('Error changing streamer status:', error);
    return sendError(res, 'Error al cambiar estado del streamer', 500);
  }
}


