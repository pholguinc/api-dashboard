import { Router } from 'express';
import { auth, requireRole } from '../../middleware/auth';
import * as Ctrl from '../../controllers/admin/subscription-plans.admin.controller';

const router = Router();
router.use(auth, requireRole(['admin']));

/**
 * @swagger
 * components:
 *   schemas:
 *     SubscriptionPlan:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: objectId
 *           example: "507f1f77bcf86cd799439011"
 *         name:
 *           type: string
 *           example: "Plan Premium"
 *         description:
 *           type: string
 *           example: "Acceso completo a todas las funciones premium"
 *         price:
 *           type: number
 *           example: 29.99
 *         currency:
 *           type: string
 *           example: "PEN"
 *         interval:
 *           type: string
 *           enum: [monthly, yearly, lifetime]
 *           example: "monthly"
 *         features:
 *           type: array
 *           items:
 *             type: string
 *           example: ["Streaming HD", "Sin anuncios", "Contenido exclusivo"]
 *         maxStreams:
 *           type: integer
 *           example: 5
 *         maxDevices:
 *           type: integer
 *           example: 3
 *         isActive:
 *           type: boolean
 *           example: true
 *         isPopular:
 *           type: boolean
 *           example: false
 *         trialDays:
 *           type: integer
 *           example: 7
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     CreateSubscriptionPlanRequest:
 *       type: object
 *       required:
 *         - name
 *         - description
 *         - price
 *         - currency
 *         - interval
 *       properties:
 *         name:
 *           type: string
 *           example: "Plan Premium"
 *         description:
 *           type: string
 *           example: "Acceso completo a todas las funciones premium"
 *         price:
 *           type: number
 *           example: 29.99
 *         currency:
 *           type: string
 *           example: "PEN"
 *         interval:
 *           type: string
 *           enum: [monthly, yearly, lifetime]
 *           example: "monthly"
 *         features:
 *           type: array
 *           items:
 *             type: string
 *           example: ["Streaming HD", "Sin anuncios", "Contenido exclusivo"]
 *         maxStreams:
 *           type: integer
 *           example: 5
 *         maxDevices:
 *           type: integer
 *           example: 3
 *         isPopular:
 *           type: boolean
 *           example: false
 *         trialDays:
 *           type: integer
 *           example: 7
 *     UpdateSubscriptionPlanRequest:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *           example: "Plan Premium Plus"
 *         description:
 *           type: string
 *           example: "Acceso completo a todas las funciones premium con beneficios adicionales"
 *         price:
 *           type: number
 *           example: 39.99
 *         currency:
 *           type: string
 *           example: "PEN"
 *         interval:
 *           type: string
 *           enum: [monthly, yearly, lifetime]
 *           example: "monthly"
 *         features:
 *           type: array
 *           items:
 *             type: string
 *           example: ["Streaming 4K", "Sin anuncios", "Contenido exclusivo", "Soporte prioritario"]
 *         maxStreams:
 *           type: integer
 *           example: 10
 *         maxDevices:
 *           type: integer
 *           example: 5
 *         isActive:
 *           type: boolean
 *           example: true
 *         isPopular:
 *           type: boolean
 *           example: true
 *         trialDays:
 *           type: integer
 *           example: 14
 */

/**
 * @swagger
 * /api/admin/subscription-plans:
 *   get:
 *     tags: [Admin - Suscripciones]
 *     summary: Listar planes de suscripción
 *     description: Obtiene una lista de todos los planes de suscripción
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: string
 *           enum: [true, false]
 *         description: Filtrar por estado activo
 *       - in: query
 *         name: interval
 *         schema:
 *           type: string
 *           enum: [monthly, yearly, lifetime]
 *         description: Filtrar por intervalo de pago
 *     responses:
 *       200:
 *         description: Lista de planes obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/SubscriptionPlan'
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
router.get('/', Ctrl.listPlans);

/**
 * @swagger
 * /api/admin/subscription-plans:
 *   post:
 *     tags: [Admin - Suscripciones]
 *     summary: Crear nuevo plan de suscripción
 *     description: Crea un nuevo plan de suscripción en el sistema
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateSubscriptionPlanRequest'
 *     responses:
 *       201:
 *         description: Plan de suscripción creado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/SubscriptionPlan'
 *       400:
 *         description: Error en los datos proporcionados
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
router.post('/', Ctrl.createPlan);

/**
 * @swagger
 * /api/admin/subscription-plans/{id}:
 *   put:
 *     tags: [Admin - Suscripciones]
 *     summary: Actualizar plan de suscripción
 *     description: Actualiza un plan de suscripción existente
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: objectId
 *         description: ID del plan de suscripción
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateSubscriptionPlanRequest'
 *     responses:
 *       200:
 *         description: Plan de suscripción actualizado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/SubscriptionPlan'
 *       400:
 *         description: Error en los datos proporcionados
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
 *         description: Plan de suscripción no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.put('/:id', Ctrl.updatePlan);

/**
 * @swagger
 * /api/admin/subscription-plans/{id}:
 *   delete:
 *     tags: [Admin - Suscripciones]
 *     summary: Eliminar plan de suscripción
 *     description: Elimina un plan de suscripción del sistema
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: objectId
 *         description: ID del plan de suscripción
 *     responses:
 *       200:
 *         description: Plan de suscripción eliminado exitosamente
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
 *       404:
 *         description: Plan de suscripción no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: No se puede eliminar el plan porque tiene suscripciones activas
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.delete('/:id', Ctrl.deletePlan);

export default router;


