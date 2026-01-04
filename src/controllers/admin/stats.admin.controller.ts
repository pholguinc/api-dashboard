import { Request, Response } from 'express';
import { sendOk, sendError } from '../../utils/response';
import { UserModel } from '../../models/user.model';
import { BannerModel } from '../../models/banner.model';
import { GameModel } from '../../models/game.model';
import { JobModel } from '../../models/job.model';

/**
 * GET /api/admin/stats
 * Devuelve estadísticas generales para el dashboard de admin.
 */
export async function getDashboardStats(_req: Request, res: Response): Promise<Response | void> {
  try {
    const now = new Date();

    const [
      usersTotal,
      usersActive,
      bannersTotal,
      bannersActive,
      gamesTotal,
      gamesActive,
      jobsTotal,
      jobsActive
    ] = await Promise.all([
      UserModel.countDocuments({}),
      UserModel.countDocuments({ isActive: true }),
      BannerModel.countDocuments({}),
      // Banners "activos" = activos y en ventana de schedule
      BannerModel.countDocuments({
        isActive: true,
        status: 'active',
        'schedule.startDate': { $lte: now },
        'schedule.endDate': { $gte: now }
      } as any),
      GameModel.countDocuments({}),
      GameModel.countDocuments({ isAvailable: true } as any),
      JobModel.countDocuments({}),
      JobModel.countDocuments({ isActive: true } as any)
    ]);

    return sendOk(res, {
      users: { total: usersTotal, active: usersActive },
      banners: { total: bannersTotal, active: bannersActive },
      games: { total: gamesTotal, active: gamesActive },
      jobs: { total: jobsTotal, active: jobsActive }
    });
  } catch (err: any) {
    return sendError(res, err?.message || 'No se pudieron obtener las estadísticas', 500, 'STATS_FETCH_ERROR');
  }
}


