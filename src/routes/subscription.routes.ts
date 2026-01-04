import { Router } from 'express';
import { SubscriptionController } from '../controllers/subscription.controller';
import { authenticateJwt } from '../middleware/auth';

const router = Router();

// Rutas para usuarios
router.use(authenticateJwt);

// Obtener estado de suscripción

/**
 * @swagger
 * /api/subscription/status:
 *   get:
 *     tags: [Premium]
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
router.get('/status', SubscriptionController.getSubscriptionStatus);

// Crear suscripción

/**
 * @swagger
 * /api/subscription/create:
 *   post:
 *     tags: [Premium]
 *     summary: POST /create
 *     description: Endpoint POST para /create
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
router.post('/create', SubscriptionController.createSubscription);

// Cancelar suscripción

/**
 * @swagger
 * /cancel:
 *   post:
 *     tags: [Premium]
 *     summary: POST /cancel
 *     description: Endpoint POST para /cancel
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
router.post('/cancel', SubscriptionController.cancelSubscription);

// Obtener puntos diarios de Premium

/**
 * @swagger
 * /daily-points:
 *   post:
 *     tags: [Premium]
 *     summary: POST /daily-points
 *     description: Endpoint POST para /daily-points
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
router.post('/daily-points', SubscriptionController.grantDailyPremiumPoints);

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
