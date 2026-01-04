import { Router } from 'express';
import { auth, requireRole } from '../../middleware/auth';
import * as Ctrl from '../../controllers/admin/subscriptions.admin.controller';

const router = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     CreateSubscriptionRequest:
 *       type: object
 *       required:
 *         - userId
 *         - planId
 *       properties:
 *         userId:
 *           type: string
 *           format: objectId
 *           example: "507f1f77bcf86cd799439011"
 *         planId:
 *           type: string
 *           format: objectId
 *           example: "507f1f77bcf86cd799439011"
 *         paymentMethod:
 *           type: string
 *           example: "credit_card"
 *         autoRenew:
 *           type: boolean
 *           example: true
 *     
 *     UpdateSubscriptionRequest:
 *       type: object
 *       properties:
 *         planId:
 *           type: string
 *           format: objectId
 *           example: "507f1f77bcf86cd799439011"
 *         autoRenew:
 *           type: boolean
 *           example: false
 *         status:
 *           type: string
 *           enum: [active, paused, cancelled, expired]
 *           example: "active"
 *     
 *     SubscriptionStatsResponse:
 *       allOf:
 *         - $ref: '#/components/schemas/SuccessResponse'
 *         - type: object
 *           properties:
 *             data:
 *               type: object
 *               properties:
 *                 totalSubscriptions:
 *                   type: integer
 *                   example: 500
 *                 activeSubscriptions:
 *                   type: integer
 *                   example: 450
 *                 newThisMonth:
 *                   type: integer
 *                   example: 50
 *                 cancelledThisMonth:
 *                   type: integer
 *                   example: 10
 *                 averageRevenuePerUser:
 *                   type: number
 *                   example: 15.99
 *                 churnRate:
 *                   type: number
 *                   example: 0.05
 *                 subscriptionsByPlan:
 *                   type: object
 *                   additionalProperties:
 *                     type: integer
 *                   example:
 *                     basic: 200
 *                     premium: 150
 *                     pro: 100
 *     
 *     RevenueResponse:
 *       allOf:
 *         - $ref: '#/components/schemas/SuccessResponse'
 *         - type: object
 *           properties:
 *             data:
 *               type: object
 *               properties:
 *                 totalRevenue:
 *                   type: number
 *                   example: 50000.00
 *                 monthlyRevenue:
 *                   type: number
 *                   example: 5000.00
 *                 yearlyRevenue:
 *                   type: number
 *                   example: 60000.00
 *                 revenueByMonth:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       month:
 *                         type: string
 *                         example: "2024-01"
 *                       revenue:
 *                         type: number
 *                         example: 5000.00
 *                       subscriptions:
 *                         type: integer
 *                         example: 50
 *                 revenueByPlan:
 *                   type: object
 *                   additionalProperties:
 *                     type: number
 *                   example:
 *                     basic: 20000.00
 *                     premium: 25000.00
 *                     pro: 5000.00
 */

router.use(auth, requireRole(['admin']));

/**
 * @swagger
 * /api/admin/subscriptions:
 *   get:
 *     tags: [Admin - Suscripciones]
 *     summary: Listar suscripciones
 *     description: Obtiene una lista de todas las suscripciones del sistema
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Número de página
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Cantidad de suscripciones por página
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, paused, cancelled, expired]
 *         description: Filtrar por estado
 *       - in: query
 *         name: planId
 *         schema:
 *           type: string
 *           format: objectId
 *         description: Filtrar por plan
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *           format: objectId
 *         description: Filtrar por usuario
 *     responses:
 *       200:
 *         description: Lista de suscripciones obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
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
 */
router.get('/', Ctrl.listSubscriptions);

/**
 * @swagger
 * /api/admin/subscriptions/stats:
 *   get:
 *     tags: [Admin - Suscripciones]
 *     summary: Obtener estadísticas de suscripciones
 *     description: Obtiene estadísticas generales de suscripciones
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Estadísticas obtenidas exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SubscriptionStatsResponse'
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
 */
router.get('/stats', Ctrl.getStats);

/**
 * @swagger
 * /api/admin/subscriptions/revenue:
 *   get:
 *     tags: [Admin - Suscripciones]
 *     summary: Obtener reporte de ingresos
 *     description: Obtiene reportes detallados de ingresos por suscripciones
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [7d, 30d, 90d, 1y]
 *           default: 30d
 *         description: Período de tiempo para el reporte
 *     responses:
 *       200:
 *         description: Reporte de ingresos obtenido exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RevenueResponse'
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
 */
router.get('/revenue', Ctrl.getRevenue);

/**
 * @swagger
 * /api/admin/subscriptions:
 *   post:
 *     tags: [Admin - Suscripciones]
 *     summary: Crear suscripción
 *     description: Crea una nueva suscripción para un usuario
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateSubscriptionRequest'
 *     responses:
 *       201:
 *         description: Suscripción creada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ClipResponse'
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
 *       403:
 *         description: Sin permisos de administrador
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/', Ctrl.createSubscription);

/**
 * @swagger
 * /api/admin/subscriptions/{id}:
 *   put:
 *     tags: [Admin - Suscripciones]
 *     summary: Actualizar suscripción
 *     description: Actualiza una suscripción existente
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: objectId
 *         description: ID de la suscripción
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateSubscriptionRequest'
 *     responses:
 *       200:
 *         description: Suscripción actualizada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ClipResponse'
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
 *       403:
 *         description: Sin permisos de administrador
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Suscripción no encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.put('/:id', Ctrl.updateSubscription);

/**
 * @swagger
 * /api/admin/subscriptions/{id}/cancel:
 *   post:
 *     tags: [Admin - Suscripciones]
 *     summary: Cancelar suscripción
 *     description: Cancela una suscripción existente
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: objectId
 *         description: ID de la suscripción
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 example: "Solicitud del usuario"
 *               refundAmount:
 *                 type: number
 *                 example: 15.99
 *     responses:
 *       200:
 *         description: Suscripción cancelada exitosamente
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
 *       403:
 *         description: Sin permisos de administrador
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Suscripción no encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/:id/cancel', Ctrl.cancelSubscription);

export default router;


