import { Router } from 'express';
import { PointsAdminController } from '../controllers/points-admin.controller';
import { authenticateJwt, requireRole } from '../middleware/auth';
import { validateQuery, validateParams, validateBody } from '../utils/validation';
import { z } from 'zod';

const router = Router();

// Rutas de administración - Solo admins
router.use(authenticateJwt, requireRole(['admin']));

// Obtener estadísticas generales de puntos

router.get('/overview',
  validateQuery(z.object({
    days: z.coerce.number().min(1).max(365).default(30)
  })),
  PointsAdminController.getPointsOverview
);

// Obtener historial detallado de puntos
router.get('/history',
  validateQuery(z.object({
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(100).default(50),
    userId: z.string().optional(),
    source: z.enum(['game', 'daily_bonus', 'referral', 'admin', 'streak', 'ad_view', 'marketplace', 'discount']).optional(),
    transactionType: z.enum(['earned', 'spent']).optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional()
  })),
  PointsAdminController.getPointsHistory
);

// Obtener estadísticas de un usuario específico

router.get('/user/:userId',
  validateParams(z.object({
    userId: z.string()
  })),
  validateQuery(z.object({
    days: z.coerce.number().min(1).max(365).default(30)
  })),
  PointsAdminController.getUserPointsStats
);

// Exportar historial de puntos

router.get('/export',
  validateQuery(z.object({
    userId: z.string().optional(),
    source: z.enum(['game', 'daily_bonus', 'referral', 'admin', 'streak', 'ad_view', 'marketplace', 'discount']).optional(),
    transactionType: z.enum(['earned', 'spent']).optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional()
  })),
  PointsAdminController.exportPointsHistory
);

// ========== GESTIÓN DE REGLAS DE PUNTOS ==========

// Obtener todas las reglas de puntos
router.get('/rules',
  PointsAdminController.getAllRules
);

// Obtener una regla específica
router.get('/rules/:ruleId',
  validateParams(z.object({
    ruleId: z.string()
  })),
  PointsAdminController.getRule
);

// Crear nueva regla
router.post('/rules',
  validateBody(z.object({
    action: z.string().min(3).max(100),
    pointsAwarded: z.number().min(0).max(10000),
    dailyLimit: z.number().min(0).max(1000).optional(),
    cooldownMinutes: z.number().min(0).max(1440).optional(),
    multipliers: z.object({
      premium: z.number().min(0).max(10).optional(),
      weekend: z.number().min(0).max(10).optional(),
      special: z.number().min(0).max(10).optional()
    }).optional(),
    description: z.string().min(3).max(500),
    isActive: z.boolean().optional()
  })),
  PointsAdminController.createRule
);

// Actualizar regla existente
router.put('/rules/:ruleId',
  validateParams(z.object({
    ruleId: z.string()
  })),
  validateBody(z.object({
    pointsAwarded: z.number().min(0).max(10000).optional(),
    dailyLimit: z.number().min(0).max(1000).optional(),
    cooldownMinutes: z.number().min(0).max(1440).optional(),
    multipliers: z.object({
      premium: z.number().min(0).max(10).optional(),
      weekend: z.number().min(0).max(10).optional(),
      special: z.number().min(0).max(10).optional()
    }).optional(),
    description: z.string().min(3).max(500).optional(),
    isActive: z.boolean().optional()
  })),
  PointsAdminController.updateRule
);

// Eliminar regla
router.delete('/rules/:ruleId',
  validateParams(z.object({
    ruleId: z.string()
  })),
  PointsAdminController.deleteRule
);

// Toggle estado de regla (activar/desactivar)
router.patch('/rules/:ruleId/toggle',
  validateParams(z.object({
    ruleId: z.string()
  })),
  PointsAdminController.toggleRuleStatus
);

export default router;