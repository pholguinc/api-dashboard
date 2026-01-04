import { Router } from 'express';
import { auth, requireRole } from '../../middleware/auth';
import {
  listUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  getUserStats
} from '../../controllers/admin/users.admin.controller';
import { sendOk } from '../../utils/response';
import { UserModel } from '../../models/user.model';

const router = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     CreateUserRequest:
 *       type: object
 *       required:
 *         - phone
 *         - displayName
 *         - role
 *       properties:
 *         phone:
 *           type: string
 *           example: "+51987654321"
 *         displayName:
 *           type: string
 *           example: "Juan Pérez"
 *         metroUsername:
 *           type: string
 *           example: "juan_perez"
 *         fullName:
 *           type: string
 *           example: "Juan Carlos Pérez García"
 *         email:
 *           type: string
 *           format: email
 *           example: "juan@example.com"
 *         role:
 *           type: string
 *           enum: [user, moderator, admin]
 *           example: "user"
 *         pointsSmart:
 *           type: integer
 *           example: 1000
 *     
 *     UpdateUserRequest:
 *       type: object
 *       properties:
 *         displayName:
 *           type: string
 *           example: "Juan Pérez Actualizado"
 *         metroUsername:
 *           type: string
 *           example: "juan_perez_new"
 *         fullName:
 *           type: string
 *           example: "Juan Carlos Pérez García"
 *         email:
 *           type: string
 *           format: email
 *           example: "juan.new@example.com"
 *         role:
 *           type: string
 *           enum: [user, moderator, admin]
 *           example: "moderator"
 *         pointsSmart:
 *           type: integer
 *           example: 1500
 *         isActive:
 *           type: boolean
 *           example: true
 *     
 *     UserStatsResponse:
 *       allOf:
 *         - $ref: '#/components/schemas/SuccessResponse'
 *         - type: object
 *           properties:
 *             data:
 *               type: object
 *               properties:
 *                 totalUsers:
 *                   type: integer
 *                   example: 1500
 *                 activeUsers:
 *                   type: integer
 *                   example: 1200
 *                 newUsersToday:
 *                   type: integer
 *                   example: 25
 *                 newUsersThisWeek:
 *                   type: integer
 *                   example: 150
 *                 newUsersThisMonth:
 *                   type: integer
 *                   example: 600
 *                 usersByRole:
 *                   type: object
 *                   properties:
 *                     user:
 *                       type: integer
 *                       example: 1400
 *                     moderator:
 *                       type: integer
 *                       example: 50
 *                     admin:
 *                       type: integer
 *                       example: 5
 *                 averagePoints:
 *                   type: number
 *                   example: 750.5
 *                 topUsers:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       user:
 *                         $ref: '#/components/schemas/User'
 *                       points:
 *                         type: integer
 *                         example: 5000
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
 */

router.use(auth, requireRole(['admin']));

/**
 * @swagger
 * /api/admin/users:
 *   get:
 *     tags: [Admin - Usuarios]
 *     summary: Listar todos los usuarios
 *     description: Obtiene una lista paginada de todos los usuarios del sistema
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
 *         description: Cantidad de usuarios por página
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [user, moderator, admin]
 *         description: Filtrar por rol
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Buscar por nombre, email o teléfono
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: string
 *           enum: [true, false]
 *         description: Filtrar por estado activo
 *     responses:
 *       200:
 *         description: Lista de usuarios obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UsersListResponse'
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
router.get('/', listUsers);

/**
 * @swagger
 * /api/admin/users/stats:
 *   get:
 *     tags: [Admin - Usuarios]
 *     summary: Obtener estadísticas de usuarios
 *     description: Obtiene estadísticas generales de usuarios para el dashboard de administración
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Estadísticas obtenidas exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserStatsResponse'
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
router.get('/stats', getUserStats);

/**
 * @swagger
 * /api/admin/users:
 *   post:
 *     tags: [Admin - Usuarios]
 *     summary: Crear nuevo usuario
 *     description: Crea un nuevo usuario en el sistema (solo administradores)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateUserRequest'
 *     responses:
 *       201:
 *         description: Usuario creado exitosamente
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
router.post('/', createUser);

/**
 * @swagger
 * /api/admin/users/{id}:
 *   get:
 *     tags: [Admin - Usuarios]
 *     summary: Obtener usuario por ID
 *     description: Obtiene los detalles de un usuario específico
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: objectId
 *         description: ID del usuario
 *     responses:
 *       200:
 *         description: Usuario obtenido exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ClipResponse'
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
 *         description: Usuario no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/:id', getUserById);

/**
 * @swagger
 * /api/admin/users/{id}:
 *   put:
 *     tags: [Admin - Usuarios]
 *     summary: Actualizar usuario
 *     description: Actualiza la información de un usuario existente
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: objectId
 *         description: ID del usuario
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateUserRequest'
 *     responses:
 *       200:
 *         description: Usuario actualizado exitosamente
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
 *         description: Usuario no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.put('/:id', updateUser);

/**
 * @swagger
 * /api/admin/users/{id}:
 *   delete:
 *     tags: [Admin - Usuarios]
 *     summary: Eliminar usuario
 *     description: Elimina un usuario del sistema (solo administradores)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: objectId
 *         description: ID del usuario
 *     responses:
 *       200:
 *         description: Usuario eliminado exitosamente
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
 *         description: Usuario no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.delete('/:id', deleteUser);

/**
 * @swagger
 * /api/admin/users/{id}/notification-settings:
 *   get:
 *     tags: [Admin - Usuarios]
 *     summary: Obtener configuración de notificaciones del usuario
 *     description: Obtiene la configuración de notificaciones de un usuario específico
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: objectId
 *         description: ID del usuario
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
 *       403:
 *         description: Sin permisos de administrador
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Usuario no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/:id/notification-settings', async (req, res) => {
  const u: any = await (UserModel as any).findById(req.params.id).select('notificationSettings').lean();
  return sendOk(res, u?.notificationSettings || {});
});

/**
 * @swagger
 * /api/admin/users/{id}/notification-settings:
 *   put:
 *     tags: [Admin - Usuarios]
 *     summary: Actualizar configuración de notificaciones del usuario
 *     description: Actualiza la configuración de notificaciones de un usuario específico
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: objectId
 *         description: ID del usuario
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
 *       403:
 *         description: Sin permisos de administrador
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Usuario no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.put('/:id/notification-settings', async (req, res) => {
  const updated = await (UserModel as any).findByIdAndUpdate(req.params.id, { notificationSettings: req.body }, { new: true }).select('notificationSettings').lean();
  return sendOk(res, updated?.notificationSettings || {});
});

export default router;


