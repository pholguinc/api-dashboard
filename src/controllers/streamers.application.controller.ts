import { Request, Response } from 'express';
import { UserModel } from '../models/user.model';
import { sendError, sendOk } from '../utils/response';

function toTitleCaseCategory(cat?: string): string | undefined {
  if (!cat) return undefined;
  const map: Record<string, string> = {
    irl: 'IRL',
    gaming: 'Gaming',
    music: 'Music',
    art: 'Art',
    food: 'Food',
    tech: 'Tech',
    dance: 'Dance',
    freestyle: 'Freestyle',
    event: 'Event'
  };
  const key = String(cat).toLowerCase();
  return map[key] || undefined;
}

export async function applyForStreamer(req: Request, res: Response) {
  try {
    const {
      userId,
      email,
      username,
      displayName,
      bio,
      category,
      socialLinks
    } = req.body as any;

    // 1) Validar que userId/email/username correspondan al MISMO usuario
    const user = await UserModel.findById(userId);
    if (!user) return sendError(res, 'Usuario no encontrado', 404);

    const userEmail = user.email || '';
    const userUsername = user.metroUsername || '';
    if ((email || '') !== userEmail || (username || '') !== userUsername) {
      return sendError(res, 'userId, email y username no coinciden', 400, 'USER_MISMATCH');
    }

    // 2) Caso idempotente: si ya es metro_streamer
    if (user.role === 'metro_streamer') {
      const isVerified = user.streamerProfile?.isVerified || false;
      const isActive = user.streamerProfile?.isActive !== false;

      if (!isVerified) {
        // Asegurar campos básicos y devolver 200
        const setUpdate: any = {
          displayName: displayName || user.displayName,
          'streamerProfile.bio': bio ?? (user.streamerProfile?.bio || ''),
          'streamerProfile.isActive': isActive,
          'streamerProfile.isVerified': false,
          'streamerProfile.monetization': {
            isEnabled: user.streamerProfile?.monetization?.isEnabled || false,
            donationsEnabled: user.streamerProfile?.monetization?.donationsEnabled || false,
            subscriptionsEnabled: user.streamerProfile?.monetization?.subscriptionsEnabled || false,
            pointsPerView: user.streamerProfile?.monetization?.pointsPerView || 1
          }
        };
        const normCat = toTitleCaseCategory(category);
        if (normCat) setUpdate['streamerProfile.categories'] = [normCat];
        if (socialLinks) {
          setUpdate['streamerProfile.socialLinks'] = {
            twitter: socialLinks?.twitter || '',
            instagram: socialLinks?.instagram || '',
            youtube: socialLinks?.youtube || '',
            tiktok: socialLinks?.tiktok || ''
          };
        }

        const updated = await UserModel.findByIdAndUpdate(user._id, { $set: setUpdate }, { new: true });

        return sendOk(res, {
          id: updated!._id,
          userId: updated!._id,
          name: updated!.displayName,
          displayName: updated!.displayName,
          username: updated!.metroUsername || '',
          category: (updated!.streamerProfile?.categories?.[0] || '').toLowerCase(),
          bio: updated!.streamerProfile?.bio || '',
          status: 'pending',
          isLive: false,
          isVerified: false,
          isActive: updated!.streamerProfile?.isActive !== false,
          socialLinks: {
            twitter: updated!.streamerProfile?.socialLinks?.twitter || '',
            instagram: updated!.streamerProfile?.socialLinks?.instagram || '',
            youtube: updated!.streamerProfile?.socialLinks?.youtube || '',
            tiktok: updated!.streamerProfile?.socialLinks?.tiktok || ''
          },
          monetization: {
            isEnabled: updated!.streamerProfile?.monetization?.isEnabled || false,
            donationsEnabled: updated!.streamerProfile?.monetization?.donationsEnabled || false,
            subscriptionsEnabled: updated!.streamerProfile?.monetization?.subscriptionsEnabled || false,
            pointsPerView: updated!.streamerProfile?.monetization?.pointsPerView || 1
          },
          createdAt: updated!.createdAt,
          updatedAt: updated!.updatedAt
        });
      }

      // Si ya está verificado, no permitir nueva solicitud
      return sendError(res, 'Usuario ya es streamer aprobado', 409, 'ALREADY_STREAMER');
    }

    // 3) Crear/actualizar perfil de streamer con status pendiente
    const setUpdate: any = {
      role: 'metro_streamer',
      displayName: displayName || user.displayName,
      'streamerProfile.bio': bio || '',
      'streamerProfile.isActive': true,
      'streamerProfile.isVerified': false,
      'streamerProfile.socialLinks': {
        twitter: socialLinks?.twitter || '',
        instagram: socialLinks?.instagram || '',
        youtube: socialLinks?.youtube || '',
        tiktok: socialLinks?.tiktok || ''
      },
      'streamerProfile.monetization': {
        isEnabled: false,
        donationsEnabled: false,
        subscriptionsEnabled: false,
        pointsPerView: 1
      }
    };
    const normCat = toTitleCaseCategory(category);
    if (normCat) setUpdate['streamerProfile.categories'] = [normCat];

    const updatedUser = await UserModel.findByIdAndUpdate(user._id, { $set: setUpdate }, { new: true });

    return sendOk(res, {
      id: updatedUser!._id,
      userId: updatedUser!._id,
      name: updatedUser!.displayName,
      displayName: updatedUser!.displayName,
      username: updatedUser!.metroUsername || '',
      category: (updatedUser!.streamerProfile?.categories?.[0] || '').toLowerCase(),
      bio: updatedUser!.streamerProfile?.bio || '',
      status: 'pending',
      isLive: false,
      isVerified: false,
      isActive: updatedUser!.streamerProfile?.isActive !== false,
      socialLinks: {
        twitter: updatedUser!.streamerProfile?.socialLinks?.twitter || '',
        instagram: updatedUser!.streamerProfile?.socialLinks?.instagram || '',
        youtube: updatedUser!.streamerProfile?.socialLinks?.youtube || '',
        tiktok: updatedUser!.streamerProfile?.socialLinks?.tiktok || ''
      },
      monetization: {
        isEnabled: updatedUser!.streamerProfile?.monetization?.isEnabled || false,
        donationsEnabled: updatedUser!.streamerProfile?.monetization?.donationsEnabled || false,
        subscriptionsEnabled: updatedUser!.streamerProfile?.monetization?.subscriptionsEnabled || false,
        pointsPerView: updatedUser!.streamerProfile?.monetization?.pointsPerView || 1
      },
      createdAt: updatedUser!.createdAt,
      updatedAt: updatedUser!.updatedAt
    });
  } catch (error) {
    return sendError(res, 'Error al procesar solicitud', 500);
  }
}




