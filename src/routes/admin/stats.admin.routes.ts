import { Router } from 'express';
import { auth, requireRole } from '../../middleware/auth';
import { getDashboardStats } from '../../controllers/admin/stats.admin.controller';

const router = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     DashboardStatsResponse:
 *       allOf:
 *         - $ref: '#/components/schemas/SuccessResponse'
 *         - type: object
 *           properties:
 *             data:
 *               type: object
 *               properties:
 *                 users:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                       example: 1500
 *                     active:
 *                       type: integer
 *                       example: 1200
 *                     newToday:
 *                       type: integer
 *                       example: 25
 *                     newThisWeek:
 *                       type: integer
 *                       example: 150
 *                     newThisMonth:
 *                       type: integer
 *                       example: 600
 *                 clips:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                       example: 5000
 *                     active:
 *                       type: integer
 *                       example: 4500
 *                     pending:
 *                       type: integer
 *                       example: 200
 *                     reported:
 *                       type: integer
 *                       example: 50
 *                 streams:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                       example: 800
 *                     live:
 *                       type: integer
 *                       example: 15
 *                     totalViewers:
 *                       type: integer
 *                       example: 2500
 *                     totalDonations:
 *                       type: number
 *                       example: 1500.50
 *                 points:
 *                   type: object
 *                   properties:
 *                     totalAwarded:
 *                       type: integer
 *                       example: 500000
 *                     totalRedeemed:
 *                       type: integer
 *                       example: 200000
 *                     averagePerUser:
 *                       type: number
 *                       example: 333.33
 *                 revenue:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: number
 *                       example: 50000.00
 *                     thisMonth:
 *                       type: number
 *                       example: 5000.00
 *                     subscriptions:
 *                       type: number
 *                       example: 30000.00
 *                     donations:
 *                       type: number
 *                       example: 20000.00
 *                 system:
 *                   type: object
 *                   properties:
 *                     uptime:
 *                       type: string
 *                       example: "99.9%"
 *                     responseTime:
 *                       type: number
 *                       example: 150
 *                     errorRate:
 *                       type: number
 *                       example: 0.1
 *                     lastBackup:
 *                       type: string
 *                       format: date-time
 *                       example: "2024-01-15T10:30:00.000Z"
 *       400:
 *         description: Error en la validación
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'

 */
router.use(auth, requireRole(['admin']));

/**
 * @swagger
 * /api/admin/stats:
 *   get:
 *     tags: [Admin - Estadísticas]
 *     summary: Obtener estadísticas del dashboard
 *     description: Obtiene estadísticas generales del sistema para el dashboard de administración
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Estadísticas obtenidas exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DashboardStatsResponse'
 *       401:
 *         description: No autorizado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Sin permisos de administrador
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       400:
 *         description: Error en la validación
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'

 */
router.get('/', getDashboardStats);

export default router;


