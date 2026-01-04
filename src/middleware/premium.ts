import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth';
import { UserModel } from '../models/user.model';
import { sendError } from '../utils/response';

export interface PremiumFeatures {
  jobSearch: boolean;
  microCourses: boolean;
  irlExclusive: boolean;
  noAds: boolean;
  dailyPoints: number;
  premiumDiscounts: boolean;
}

// Limitaciones para usuarios FREE
export const FREE_USER_LIMITS = {
  jobSearch: {
    dailyViews: 5,
    applicationsPerDay: 2,
    canViewSalary: false,
    canViewContactInfo: false
  },
  microCourses: {
    coursesPerMonth: 3,
    canDownloadCertificates: false,
    canAccessPremiumContent: false
  },
  irlExclusive: {
    canJoinExclusiveEvents: false,
    canAccessPremiumStreams: false
  },
  dailyPoints: 10, // vs 50 Premium
  ads: {
    showAds: true,
    adFrequency: 'normal'
  }
};

// Middleware para verificar si el usuario tiene Premium
export const requirePremium = (feature?: keyof PremiumFeatures) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return sendError(res, 'Usuario no autenticado', 401);
      }

      const user = await UserModel.findById(userId).select('hasMetroPremium metroPremiumExpiry');
      
      if (!user) {
        return sendError(res, 'Usuario no encontrado', 404);
      }

      const hasPremium = user.hasMetroPremium && 
                        user.metroPremiumExpiry && 
                        user.metroPremiumExpiry > new Date();

      if (!hasPremium) {
        return sendError(res, 'Esta función requiere Metro Premium', 403, 'PREMIUM_REQUIRED', {
          feature,
          upgradeUrl: '/premium/plans'
        });
      }

      // Añadir información Premium al request
      req.premium = {
        active: true,
        expiresAt: user.metroPremiumExpiry
      };

      next();
    } catch (error) {
      console.error('Error checking premium status:', error);
      return sendError(res, 'Error verificando estado Premium', 500);
    }
  };
};

// Middleware para aplicar limitaciones a usuarios FREE
export const applyFreeLimits = (feature: keyof typeof FREE_USER_LIMITS) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return sendError(res, 'Usuario no autenticado', 401);
      }

      const user = await UserModel.findById(userId).select('hasMetroPremium metroPremiumExpiry');
      
      if (!user) {
        return sendError(res, 'Usuario no encontrado', 404);
      }

      const hasPremium = user.hasMetroPremium && 
                        user.metroPremiumExpiry && 
                        user.metroPremiumExpiry > new Date();

      if (hasPremium) {
        // Usuario Premium, sin limitaciones
        req.userLimits = null;
        req.isPremium = true;
      } else {
        // Usuario FREE, aplicar limitaciones
        req.userLimits = FREE_USER_LIMITS[feature];
        req.isPremium = false;
      }

      next();
    } catch (error) {
      console.error('Error applying free limits:', error);
      return sendError(res, 'Error aplicando limitaciones', 500);
    }
  };
};

// Extender el tipo AuthenticatedRequest
declare global {
  namespace Express {
    interface Request {
      premium?: {
        active: boolean;
        expiresAt?: Date;
      };
      userLimits?: any;
      isPremium?: boolean;
    }
  }
}
