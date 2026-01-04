import { Router } from 'express';
import { auth, requireRole } from '../../middleware/auth';
import * as Ctrl from '../../controllers/admin/metro-sessions.admin.controller';

const router = Router();
router.use(auth, requireRole(['admin']));

/**
 * @swagger
 * components:
 *   schemas:
 *     MetroSession:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: objectId
 *           example: "507f1f77bcf86cd799439011"
 *         title:
 *           type: string
 *           example: "Sesión de Metro Live - Noticias"
 *         description:
 *           type: string
 *           example: "Transmisión en vivo de noticias del metro"
 *         startTime:
 *           type: string
 *           format: date-time
 *           example: "2024-01-15T10:00:00Z"
 *         endTime:
 *           type: string
 *           format: date-time
 *           example: "2024-01-15T12:00:00Z"
 *         status:
 *           type: string
 *           enum: [scheduled, live, ended, cancelled]
 *           example: "scheduled"
 *         streamUrl:
 *           type: string
 *           example: "https://stream.telemetro.pe/live/123"
 *         thumbnail:
 *           type: string
 *           example: "https://example.com/thumbnail.jpg"
 *         viewers:
 *           type: integer
 *           example: 1250
 *         maxViewers:
 *           type: integer
 *           example: 2000
 *         isActive:
 *           type: boolean
 *           example: true
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     CreateMetroSessionRequest:
 *       type: object
 *       required:
 *         - title
 *         - description
 *         - startTime
 *         - endTime
 *       properties:
 *         title:
 *           type: string
 *           example: "Sesión de Metro Live - Noticias"
 *         description:
 *           type: string
 *           example: "Transmisión en vivo de noticias del metro"
 *         startTime:
 *           type: string
 *           format: date-time
 *           example: "2024-01-15T10:00:00Z"
 *         endTime:
 *           type: string
 *           format: date-time
 *           example: "2024-01-15T12:00:00Z"
 *         streamUrl:
 *           type: string
 *           example: "https://stream.telemetro.pe/live/123"
 *         thumbnail:
 *           type: string
 *           example: "https://example.com/thumbnail.jpg"
 *         maxViewers:
 *           type: integer
 *           example: 2000
 *     UpdateMetroSessionRequest:
 *       type: object
 *       properties:
 *         title:
 *           type: string
 *           example: "Sesión de Metro Live - Noticias Actualizadas"
 *         description:
 *           type: string
 *           example: "Transmisión en vivo de noticias del metro actualizadas"
 *         startTime:
 *           type: string
 *           format: date-time
 *           example: "2024-01-15T10:30:00Z"
 *         endTime:
 *           type: string
 *           format: date-time
 *           example: "2024-01-15T12:30:00Z"
 *         status:
 *           type: string
 *           enum: [scheduled, live, ended, cancelled]
 *           example: "live"
 *         streamUrl:
 *           type: string
 *           example: "https://stream.telemetro.pe/live/123"
 *         thumbnail:
 *           type: string
 *           example: "https://example.com/thumbnail.jpg"
 *         maxViewers:
 *           type: integer
 *           example: 2500
 *         isActive:
 *           type: boolean
 *           example: true
 *     MetroSessionStats:
 *       type: object
 *       properties:
 *         totalSessions:
 *           type: integer
 *           example: 45
 *         activeSessions:
 *           type: integer
 *           example: 2
 *         totalViewers:
 *           type: integer
 *           example: 12500
 *         averageViewers:
 *           type: number
 *           example: 278.5
 *         sessionsByStatus:
 *           type: object
 *           properties:
 *             scheduled:
 *               type: integer
 *               example: 15
 *             live:
 *               type: integer
 *               example: 2
 *             ended:
 *               type: integer
 *               example: 25
 *             cancelled:
 *               type: integer
 *               example: 3
 */

/**
 * @swagger
 * /api/admin/metro-sessions:
 *   get:
 *     tags: [Admin - Streaming]
 *     summary: Listar sesiones de Metro Live
 *     description: Obtiene una lista paginada de todas las sesiones de Metro Live
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
 *         description: Cantidad de sesiones por página
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [scheduled, live, ended, cancelled]
 *         description: Filtrar por estado de sesión
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: string
 *           enum: [true, false]
 *         description: Filtrar por estado activo
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Buscar por título o descripción
 *     responses:
 *       200:
 *         description: Lista de sesiones obtenida exitosamente
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
router.get('/', Ctrl.listSessions);

/**
 * @swagger
 * /api/admin/metro-sessions:
 *   post:
 *     tags: [Admin - Streaming]
 *     summary: Crear nueva sesión de Metro Live
 *     description: Crea una nueva sesión de Metro Live en el sistema
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateMetroSessionRequest'
 *     responses:
 *       201:
 *         description: Sesión creada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/MetroSession'
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
router.post('/', Ctrl.createSession);

/**
 * @swagger
 * /api/admin/metro-sessions/{id}:
 *   put:
 *     tags: [Admin - Streaming]
 *     summary: Actualizar sesión de Metro Live
 *     description: Actualiza una sesión de Metro Live existente
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: objectId
 *         description: ID de la sesión
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateMetroSessionRequest'
 *     responses:
 *       200:
 *         description: Sesión actualizada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/MetroSession'
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
 *         description: Sesión no encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.put('/:id', Ctrl.updateSession);

/**
 * @swagger
 * /api/admin/metro-sessions/{id}:
 *   delete:
 *     tags: [Admin - Streaming]
 *     summary: Eliminar sesión de Metro Live
 *     description: Elimina una sesión de Metro Live del sistema
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: objectId
 *         description: ID de la sesión
 *     responses:
 *       200:
 *         description: Sesión eliminada exitosamente
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
 *         description: Sesión no encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.delete('/:id', Ctrl.deleteSession);

/**
 * @swagger
 * /api/admin/metro-sessions/stats:
 *   get:
 *     tags: [Admin - Streaming]
 *     summary: Obtener estadísticas de sesiones
 *     description: Obtiene estadísticas generales de las sesiones de Metro Live
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
 *                       $ref: '#/components/schemas/MetroSessionStats'
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
 * /api/admin/metro-sessions/live:
 *   get:
 *     tags: [Admin - Streaming]
 *     summary: Obtener sesiones en vivo
 *     description: Obtiene las sesiones de Metro Live que están actualmente en vivo
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Sesiones en vivo obtenidas exitosamente
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
 *                         $ref: '#/components/schemas/MetroSession'
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
router.get('/live', Ctrl.getLive);

export default router;


