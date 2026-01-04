import { Router } from 'express';
import { PointsStatsController } from '../controllers/points-stats.controller';
import { auth, requireRole } from '../middleware/auth';

const router = Router();

// Aplicar autenticación a todas las rutas
router.use(auth);

// Rutas para usuarios autenticados

router.get('/my-stats', PointsStatsController.getUserPointsStats);

router.get('/my-history', PointsStatsController.getUserPointsHistory);

router.get('/daily-summary', PointsStatsController.getDailySummary);

// Rutas para administradores
router.get('/global', requireRole(['admin', 'moderator']), PointsStatsController.getGlobalStats);

export default router;