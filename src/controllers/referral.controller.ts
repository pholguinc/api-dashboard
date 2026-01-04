import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { UserModel } from '../models/user.model';
import { PointsManagerService } from '../services/points-manager.service';
import { updateStreak } from '../models/streak.model';
import { sendOk, sendError } from '../utils/response';
import mongoose from 'mongoose';

export class ReferralController {

  // Obtener código de referido del usuario
  static async getReferralCode(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return sendError(res, 'Usuario no autenticado', 401);
      }

      const user = await UserModel.findById(userId).select('displayName phone referralCode');
      
      if (!user) {
        return sendError(res, 'Usuario no encontrado', 404);
      }

      // Generar código de referido si no existe
      if (!user.referralCode) {
        user.referralCode = `METRO${user.phone.slice(-4)}${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
        await user.save();
      }

      return sendOk(res, {
        referralCode: user.referralCode,
        referralUrl: `https://telemetro.pe/join?ref=${user.referralCode}`,
        referralsCount: user.referralsCount || 0
      });
    } catch (error) {
      console.error('Error getting referral code:', error);
      return sendError(res, 'Error obteniendo código de referido', 500);
    }
  }

  // Aplicar código de referido
  static async applyReferralCode(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const { referralCode } = req.body;

      if (!userId) {
        return sendError(res, 'Usuario no autenticado', 401);
      }

      if (!referralCode) {
        return sendError(res, 'Código de referido requerido', 400);
      }

      // Buscar usuario que refiere
      const referrer = await UserModel.findOne({ referralCode });
      
      if (!referrer) {
        return sendError(res, 'Código de referido inválido', 404);
      }

      if (referrer._id.toString() === userId) {
        return sendError(res, 'No puedes usar tu propio código', 400);
      }

      // Verificar que el usuario no haya usado ya un código
      const currentUser = await UserModel.findById(userId);
      if (currentUser?.referredBy) {
        return sendError(res, 'Ya has usado un código de referido', 400);
      }

      // Aplicar referido
      currentUser!.referredBy = referrer._id as mongoose.Types.ObjectId;
      await currentUser.save();

      // Incrementar contador del referidor
      referrer.referralsCount = (referrer.referralsCount || 0) + 1;
      await referrer.save();

      // Otorgar puntos al referidor (100 puntos)
      await PointsManagerService.awardPoints(
        referrer._id.toString(),
        'referrals',
        100,
        `Referido exitoso: ${currentUser.displayName}`,
        {
          referredUserId: userId,
          referredUserName: currentUser.displayName
        }
      );

      // Otorgar puntos al nuevo usuario (50 puntos de bienvenida)
      await PointsManagerService.awardPoints(
        userId,
        'referrals',
        50,
        `Bienvenida por referido de ${referrer.displayName}`,
        {
          referrerUserId: referrer._id.toString(),
          referrerUserName: referrer.displayName
        }
      );

      // Completar misión de referido para el referidor
      await updateStreak(referrer._id.toString(), 'referral');

      return sendOk(res, {
        message: '¡Código aplicado exitosamente!',
        referrerName: referrer.displayName,
        pointsEarned: 50,
        referrerPointsEarned: 100
      });
    } catch (error) {
      console.error('Error applying referral code:', error);
      return sendError(res, 'Error aplicando código de referido', 500);
    }
  }

  // Obtener estadísticas de referidos
  static async getReferralStats(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return sendError(res, 'Usuario no autenticado', 401);
      }

      const [user, referredUsers] = await Promise.all([
        UserModel.findById(userId).select('referralCode referralsCount'),
        UserModel.find({ referredBy: new mongoose.Types.ObjectId(userId) })
          .select('displayName createdAt')
          .sort({ createdAt: -1 })
      ]);

      if (!user) {
        return sendError(res, 'Usuario no encontrado', 404);
      }

      const totalPointsEarned = (user.referralsCount || 0) * 100;

      return sendOk(res, {
        referralCode: user.referralCode,
        referralsCount: user.referralsCount || 0,
        totalPointsEarned,
        referredUsers: referredUsers.map(u => ({
          name: u.displayName,
          joinDate: u.createdAt
        }))
      });
    } catch (error) {
      console.error('Error getting referral stats:', error);
      return sendError(res, 'Error obteniendo estadísticas de referidos', 500);
    }
  }
}
