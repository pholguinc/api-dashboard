import { Router } from 'express';
import { StreakController } from '../controllers/streak.controller';
import { authenticateJwt } from '../middleware/auth';
import { validateBody } from '../utils/validation';
import { z } from 'zod';

const router = Router();

// Rutas autenticadas
router.use(authenticateJwt);

// Obtener estado de racha del usuario

/**
 * @swagger
 * /api/streak/status:
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
router.get('/status', StreakController.getStreakStatus);

// Completar misión

/**
 * @swagger
 * /api/streak/mission:
 *   post:
 *     tags: [Puntos]
 *     summary: POST /mission
 *     description: Endpoint POST para /mission
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
router.post('/mission', 
  validateBody(z.object({
    missionType: z.enum(['login', 'game', 'ad', 'referral'])
  })),
  StreakController.completeMission
);

// Obtener historial de rachas

/**
 * @swagger
 * /api/streak/history:
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
router.get('/history', StreakController.getStreakHistory);

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
