import { Router } from 'express';
import { NotificationsController } from '../controllers/notifications.controller';
import { authenticateJwt, requireRole } from '../middleware/auth';

const router = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Notification:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: objectId
 *           example: "507f1f77bcf86cd799439011"
 *         user:
 *           $ref: '#/components/schemas/User'
 *         title:
 *           type: string
 *           example: "Nuevo clip disponible"
 *         message:
 *           type: string
 *           example: "Tu clip ha sido aprobado y está disponible"
 *         type:
 *           type: string
 *           enum: [info, success, warning, error, promotion]
 *           example: "success"
 *         category:
 *           type: string
 *           enum: [system, content, payment, social, marketing]
 *           example: "content"
 *         isRead:
 *           type: boolean
 *           example: false
 *         data:
 *           type: object
 *           properties:
 *             clipId:
 *               type: string
 *               example: "507f1f77bcf86cd799439011"
 *             actionUrl:
 *               type: string
 *               example: "/clips/507f1f77bcf86cd799439011"
 *         createdAt:
 *           type: string
 *           format: date-time
 *           example: "2024-01-15T10:30:00.000Z"
 *         readAt:
 *           type: string
 *           format: date-time
 *           example: "2024-01-15T11:00:00.000Z"
 *     
 *     NotificationSettings:
 *       type: object
 *       properties:
 *         pushNotifications:
 *           type: boolean
 *           example: true
 *         emailNotifications:
 *           type: boolean
 *           example: false
 *         smsNotifications:
 *           type: boolean
 *           example: true
 *         marketingEmails:
 *           type: boolean
 *           example: false
 *         contentUpdates:
 *           type: boolean
 *           example: true
 *         streamAlerts:
 *           type: boolean
 *           example: true
 *         gameInvites:
 *           type: boolean
 *           example: false
 *     
 *     FCMTokenRequest:
 *       type: object
 *       required:
 *         - token
 *       properties:
 *         token:
 *           type: string
 *           example: "fcm_token_example_123456789"
 *         platform:
 *           type: string
 *           enum: [android, ios, web]
 *           example: "android"
 *     
 *     BroadcastNotificationRequest:
 *       type: object
 *       required:
 *         - title
 *         - message
 *       properties:
 *         title:
 *           type: string
 *           example: "Mantenimiento programado"
 *         message:
 *           type: string
 *           example: "El sistema estará en mantenimiento el domingo"
 *         type:
 *           type: string
 *           enum: [info, success, warning, error, promotion]
 *           example: "info"
 *         category:
 *           type: string
 *           enum: [system, content, payment, social, marketing]
 *           example: "system"
 *         targetUsers:
 *           type: array
 *           items:
 *             type: string
 *             format: objectId
 *           description: IDs de usuarios específicos (opcional)
 *         targetRoles:
 *           type: array
 *           items:
 *             type: string
 *             enum: [user, moderator, admin]
 *           description: Roles objetivo (opcional)
 *         scheduledAt:
 *           type: string
 *           format: date-time
 *           description: Fecha programada para envío (opcional)
 *     
 *     NotificationTemplate:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: objectId
 *           example: "507f1f77bcf86cd799439011"
 *         name:
 *           type: string
 *           example: "Clip Aprobado"
 *         title:
 *           type: string
 *           example: "Tu clip ha sido aprobado"
 *         message:
 *           type: string
 *           example: "El clip '{clipTitle}' ha sido aprobado y está disponible"
 *         type:
 *           type: string
 *           enum: [info, success, warning, error, promotion]
 *           example: "success"
 *         category:
 *           type: string
 *           enum: [system, content, payment, social, marketing]
 *           example: "content"
 *         variables:
 *           type: array
 *           items:
 *             type: string
 *           example: ["clipTitle", "userName"]
 *         isActive:
 *           type: boolean
 *           example: true
 *         createdAt:
 *           type: string
 *           format: date-time
 *           example: "2024-01-15T10:30:00.000Z"
 */

// Rutas autenticadas
router.use(authenticateJwt);

/**
 * @swagger
 * /api/notifications/my-notifications:
 *   get:
 *     tags: [Notificaciones]
 *     summary: Obtener notificaciones del usuario
 *     description: Obtiene las notificaciones del usuario autenticado
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
 *           default: 20
 *         description: Cantidad de notificaciones por página
 *       - in: query
 *         name: unreadOnly
 *         schema:
 *           type: string
 *           enum: [true, false]
 *         description: Mostrar solo notificaciones no leídas
 *     responses:
 *       200:
 *         description: Notificaciones obtenidas exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         notifications:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/Notification'
 *                         unreadCount:
 *                           type: integer
 *                           example: 5
 *                         pagination:
 *                           type: object
 *                           properties:
 *                             page:
 *                               type: integer
 *                               example: 1
 *                             limit:
 *                               type: integer
 *                               example: 20
 *                             total:
 *                               type: integer
 *                               example: 50
 *                             totalPages:
 *                               type: integer
 *                               example: 3
 *       401:
 *         description: No autorizado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/my-notifications', NotificationsController.getUserNotifications);

/**
 * @swagger
 * /api/notifications/{notificationId}/read:
 *   patch:
 *     tags: [Notificaciones]
 *     summary: Marcar notificación como leída
 *     description: Marca una notificación específica como leída
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: notificationId
 *         required: true
 *         schema:
 *           type: string
 *           format: objectId
 *         description: ID de la notificación
 *     responses:
 *       200:
 *         description: Notificación marcada como leída exitosamente
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
 *       404:
 *         description: Notificación no encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.patch('/:notificationId/read', NotificationsController.markAsRead);

/**
 * @swagger
 * /api/notifications/mark-all-read:
 *   patch:
 *     tags: [Notificaciones]
 *     summary: Marcar todas las notificaciones como leídas
 *     description: Marca todas las notificaciones del usuario como leídas
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Todas las notificaciones marcadas como leídas exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         markedCount:
 *                           type: integer
 *                           example: 15
 *       401:
 *         description: No autorizado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.patch('/mark-all-read', NotificationsController.markAllAsRead);

/**
 * @swagger
 * /api/notifications/{notificationId}:
 *   delete:
 *     tags: [Notificaciones]
 *     summary: Eliminar notificación
 *     description: Elimina una notificación específica
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: notificationId
 *         required: true
 *         schema:
 *           type: string
 *           format: objectId
 *         description: ID de la notificación
 *     responses:
 *       200:
 *         description: Notificación eliminada exitosamente
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
 *       404:
 *         description: Notificación no encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.delete('/:notificationId', NotificationsController.deleteNotification);

/**
 * @swagger
 * /api/notifications/settings:
 *   get:
 *     tags: [Notificaciones]
 *     summary: Obtener configuración de notificaciones
 *     description: Obtiene la configuración de notificaciones del usuario
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Configuración obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/NotificationSettings'
 *       401:
 *         description: No autorizado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/settings', NotificationsController.getUserSettings);

/**
 * @swagger
 * /api/notifications/settings:
 *   put:
 *     tags: [Notificaciones]
 *     summary: Actualizar configuración de notificaciones
 *     description: Actualiza la configuración de notificaciones del usuario
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/NotificationSettings'
 *     responses:
 *       200:
 *         description: Configuración actualizada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/NotificationSettings'
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
router.put('/settings', NotificationsController.updateUserSettings);

/**
 * @swagger
 * /api/notifications/fcm-token:
 *   post:
 *     tags: [Notificaciones]
 *     summary: Registrar token FCM
 *     description: Registra un token FCM para notificaciones push
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/FCMTokenRequest'
 *     responses:
 *       200:
 *         description: Token FCM registrado exitosamente
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
router.post('/fcm-token', NotificationsController.registerFCMToken);

/**
 * @swagger
 * /api/notifications/fcm-token:
 *   delete:
 *     tags: [Notificaciones]
 *     summary: Eliminar token FCM
 *     description: Elimina el token FCM del usuario
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Token FCM eliminado exitosamente
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
 */
router.delete('/fcm-token', NotificationsController.removeFCMToken);

/**
 * @swagger
 * /api/notifications/test:
 *   post:
 *     tags: [Notificaciones]
 *     summary: Enviar notificación de prueba
 *     description: Envía una notificación de prueba al usuario autenticado
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Notificación de prueba enviada exitosamente
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
 */
router.post('/test', NotificationsController.sendTestNotification);

// Rutas de administración
router.use(requireRole(['admin', 'moderator']));

/**
 * @swagger
 * /api/notifications/broadcast:
 *   post:
 *     tags: [Admin - Notificaciones]
 *     summary: Enviar notificación masiva
 *     description: Envía una notificación masiva a usuarios específicos o por roles
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/BroadcastNotificationRequest'
 *     responses:
 *       200:
 *         description: Notificación masiva enviada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         sentCount:
 *                           type: integer
 *                           example: 1500
 *                         scheduledFor:
 *                           type: string
 *                           format: date-time
 *                           example: "2024-01-15T15:00:00.000Z"
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
router.post('/broadcast', NotificationsController.sendBroadcastNotification);

/**
 * @swagger
 * /api/notifications/templates:
 *   post:
 *     tags: [Admin - Notificaciones]
 *     summary: Crear template de notificación
 *     description: Crea un nuevo template de notificación
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - title
 *               - message
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Clip Aprobado"
 *               title:
 *                 type: string
 *                 example: "Tu clip ha sido aprobado"
 *               message:
 *                 type: string
 *                 example: "El clip '{clipTitle}' ha sido aprobado y está disponible"
 *               type:
 *                 type: string
 *                 enum: [info, success, warning, error, promotion]
 *                 example: "success"
 *               category:
 *                 type: string
 *                 enum: [system, content, payment, social, marketing]
 *                 example: "content"
 *               variables:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["clipTitle", "userName"]
 *     responses:
 *       201:
 *         description: Template creado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/NotificationTemplate'
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
router.post('/templates', NotificationsController.createTemplate);

/**
 * @swagger
 * /api/notifications/templates:
 *   get:
 *     tags: [Admin - Notificaciones]
 *     summary: Obtener templates de notificaciones
 *     description: Obtiene una lista de templates de notificaciones
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Templates obtenidos exitosamente
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
 *                         $ref: '#/components/schemas/NotificationTemplate'
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
router.get('/templates', NotificationsController.getTemplates);

/**
 * @swagger
 * /api/notifications/admin/stats:
 *   get:
 *     tags: [Admin - Notificaciones]
 *     summary: Obtener estadísticas de notificaciones
 *     description: Obtiene estadísticas generales de notificaciones para administradores
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Estadísticas obtenidas exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         totalNotifications:
 *                           type: integer
 *                           example: 10000
 *                         sentToday:
 *                           type: integer
 *                           example: 500
 *                         sentThisWeek:
 *                           type: integer
 *                           example: 3000
 *                         sentThisMonth:
 *                           type: integer
 *                           example: 10000
 *                         readRate:
 *                           type: number
 *                           example: 0.75
 *                         clickRate:
 *                           type: number
 *                           example: 0.25
 *                         notificationsByType:
 *                           type: object
 *                           additionalProperties:
 *                             type: integer
 *                           example:
 *                             info: 5000
 *                             success: 3000
 *                             warning: 1500
 *                             error: 500
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
router.get('/admin/stats', NotificationsController.getNotificationStats);

export default router;


