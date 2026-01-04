import { Router } from 'express';
import { DailyPointsController } from '../controllers/daily-points.controller';
import { authenticateJwt, requireRole } from '../middleware/auth';

const router = Router();

// Rutas autenticadas
router.use(authenticateJwt);

// Obtener estado de puntos diarios del usuario

/**
 * @swagger
 * /api/daily-points/status:
 *   get:
 *     tags: [Puntos]
 *     summary: GET /status
 *     description: Endpoint GET para /status
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Operación exitosa
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: Error en la validación
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: No autorizado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/status', DailyPointsController.getDailyStatus);

// Reclamar puntos diarios

/**
 * @swagger
 * /api/daily-points/claim:
 *   post:
 *     tags: [Puntos]
 *     summary: POST /claim
 *     description: Endpoint POST para /claim
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Operación exitosa
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: Error en la validación
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: No autorizado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/claim', DailyPointsController.claimDaily);

// Obtener historial de puntos diarios

/**
 * @swagger
 * /api/daily-points/history:
 *   get:
 *     tags: [Puntos]
 *     summary: GET /history
 *     description: Endpoint GET para /history
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Operación exitosa
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: Error en la validación
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: No autorizado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/history', DailyPointsController.getDailyHistory);

// Rutas de administración

/**
 * @swagger
 * /admin/auto-award:
 *   post:
 *     tags: [Admin - Estadísticas]
 *     summary: POST /admin/auto-award
 *     description: Endpoint POST para /admin/auto-award
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Operación exitosa
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: Error en la validación
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: No autorizado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/admin/auto-award', 
  requireRole(['admin']), 
  DailyPointsController.autoAward
);

export default router;
/**
 * @swagger
 * components:
 *   schemas:
 *     GeneralResponse:
 *       allOf:
 *         - $ref: '#/components/schemas/SuccessResponse'
 *         - type: object
 *           properties:
 *             data:
 *               type: object
 *               description: Datos específicos del endpoint
 */
