import { Router } from 'express';
import { MetroSessionsController } from '../controllers/metro-sessions.controller';
import { authenticateJwt } from '../middleware/auth';

const router = Router();

// Rutas públicas (sin autenticación)
// Obtener todas las sesiones

/**
 * @swagger
 * /api/metro-sessions:
 *   get:
 *     tags: [Streaming]
 *     summary: GET /
 *     description: Endpoint GET para /
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
router.get('/', MetroSessionsController.getSessions);

// Obtener sesiones en vivo

/**
 * @swagger
 * /api/metro-sessions/live:
 *   get:
 *     tags: [Streaming]
 *     summary: GET /live
 *     description: Endpoint GET para /live
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
router.get('/live', MetroSessionsController.getLiveSessions);

// Rutas que requieren autenticación
// Unirse a una sesión

/**
 * @swagger
 * /api/metro-sessions:sessionId/join:
 *   post:
 *     tags: [Streaming]
 *     summary: POST /:sessionId/join
 *     description: Endpoint POST para /:sessionId/join
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
router.post('/:sessionId/join', authenticateJwt, MetroSessionsController.joinSession);

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
