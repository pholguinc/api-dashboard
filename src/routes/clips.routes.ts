import { Router } from 'express';
import { auth, requireRole } from '../middleware/auth';
import {
  // Clips públicos
  getActiveClips,
  getClipById,
  recordClipInteraction,
  getTrendingClips,

  // Admin clips
  getAllClips,
  createClip,
  updateClip,
  deleteClip,
  moderateClip,
  getClipStats,
  getClipAnalytics
} from '../controllers/clips.controller';
import {
  validateBody,
  validateQuery,
  validateParams,
  createClipSchema,
  updateClipSchema,
  moderateClipSchema,
  clipInteractionSchema,
  paginationSchema,
  objectIdSchema
} from '../utils/validation';
import { z } from 'zod';

const router = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     ClipInteractionRequest:
 *       type: object
 *       required:
 *         - type
 *       properties:
 *         type:
 *           type: string
 *           enum: [view, like, share, comment]
 *           example: "like"
 *         comment:
 *           type: string
 *           example: "¡Muy divertido!"
 *           description: Comentario (solo si type es comment)
 *     
 *     CreateClipRequest:
 *       type: object
 *       required:
 *         - title
 *         - description
 *         - category
 *         - youtubeId
 *         - youtubeUrl
 *         - thumbnailUrl
 *         - duration
 *         - creator
 *       properties:
 *         title:
 *           type: string
 *           maxLength: 100
 *           example: "clip prueba"
 *           description: Título del clip
 *         description:
 *           type: string
 *           maxLength: 500
 *           example: "clip prueba"
 *           description: Descripción del clip
 *         category:
 *           type: string
 *           enum: [comedy, music, dance, food, travel, news, sports, education]
 *           example: "comedy"
 *           description: Categoría del clip
 *         youtubeId:
 *           type: string
 *           example: "clip_1767932451048_tem69zvns"
 *           description: ID único del video
 *         youtubeUrl:
 *           type: string
 *           format: uri
 *           example: "https://api-dashboard.telemetro.pe/uploads/ads/ad-video-1767932452212-42695974.mp4"
 *           description: URL del video
 *         thumbnailUrl:
 *           type: string
 *           format: uri
 *           example: "https://via.placeholder.com/640x360.png?text=No+Thumbnail"
 *           description: URL de la imagen de portada
 *         duration:
 *           type: integer
 *           minimum: 1
 *           maximum: 180
 *           example: 30
 *           description: Duración del clip en segundos (máximo 3 minutos)
 *         creator:
 *           type: object
 *           required:
 *             - name
 *             - channel
 *           properties:
 *             name:
 *               type: string
 *               maxLength: 100
 *               example: "clip prueba"
 *               description: Nombre del creador
 *             channel:
 *               type: string
 *               maxLength: 100
 *               example: "clip prueba"
 *               description: Canal del creador
 *           description: Información del creador del clip
 *         status:
 *           type: string
 *           enum: [draft, active, paused, reported, removed]
 *           default: draft
 *           example: "draft"
 *           description: Estado del clip
 *         isVertical:
 *           type: boolean
 *           default: true
 *           example: true
 *           description: Si el video es vertical (formato shorts)
 *         quality:
 *           type: string
 *           enum: [low, medium, high, hd]
 *           default: medium
 *           example: "medium"
 *           description: Calidad del video
 *         hashtags:
 *           type: array
 *           items:
 *             type: string
 *             maxLength: 30
 *           example: ["clip prueba"]
 *           description: Lista de hashtags del clip
 *         priority:
 *           type: integer
 *           minimum: 1
 *           maximum: 10
 *           default: 1
 *           example: 1
 *           description: Prioridad del clip (1-10)
 *         isFeatured:
 *           type: boolean
 *           default: false
 *           example: true
 *           description: Si el clip está destacado
 *     
 *     UpdateClipRequest:
 *       type: object
 *       properties:
 *         title:
 *           type: string
 *           example: "Clip divertido de comedia actualizado"
 *         description:
 *           type: string
 *           example: "Nueva descripción del clip"
 *         category:
 *           type: string
 *           enum: [comedy, music, dance, food, travel, news, sports, education]
 *           example: "comedy"
 *         status:
 *           type: string
 *           enum: [draft, active, paused, reported, removed]
 *           example: "active"
 *         isFeatured:
 *           type: boolean
 *           example: true
 *     
 *     ModerateClipRequest:
 *       type: object
 *       required:
 *         - action
 *       properties:
 *         action:
 *           type: string
 *           enum: [approve, reject, remove]
 *           example: "approve"
 *         reason:
 *           type: string
 *           example: "Contenido apropiado"
 *           description: Razón de la moderación
 *     
 *     ClipsListResponse:
 *       allOf:
 *         - $ref: '#/components/schemas/SuccessResponse'
 *         - type: object
 *           properties:
 *             data:
 *               type: object
 *               properties:
 *                 clips:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Clip'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                       example: 1
 *                     limit:
 *                       type: integer
 *                       example: 10
 *                     total:
 *                       type: integer
 *                       example: 100
 *                     totalPages:
 *                       type: integer
 *                       example: 10
 *     
 *     ClipResponse:
 *       allOf:
 *         - $ref: '#/components/schemas/SuccessResponse'
 *         - type: object
 *           properties:
 *             data:
 *               type: object
 *               properties:
 *                 clip:
 *                   $ref: '#/components/schemas/Clip'
 *     
 *     ClipStatsResponse:
 *       allOf:
 *         - $ref: '#/components/schemas/SuccessResponse'
 *         - type: object
 *           properties:
 *             data:
 *               type: object
 *               properties:
 *                 totalClips:
 *                   type: integer
 *                   example: 1500
 *                 activeClips:
 *                   type: integer
 *                   example: 1200
 *                 totalViews:
 *                   type: integer
 *                   example: 50000
 *                 totalLikes:
 *                   type: integer
 *                   example: 5000
 *                 totalShares:
 *                   type: integer
 *                   example: 800
 *                 categoryBreakdown:
 *                   type: object
 *                   additionalProperties:
 *                     type: integer
 *                   example:
 *                     comedy: 500
 *                     music: 300
 *                     dance: 200
 */

// ========== RUTAS PÚBLICAS PARA LA APP ==========

/**
 * @swagger
 * /api/clips/active:
 *   get:
 *     tags: [Clips]
 *     summary: Obtener clips activos
 *     description: Obtiene una lista paginada de clips activos con filtros opcionales
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
 *         description: Cantidad de clips por página
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [comedy, music, dance, food, travel, news, sports, education]
 *         description: Filtrar por categoría
 *       - in: query
 *         name: featured
 *         schema:
 *           type: string
 *           enum: [true, false]
 *         description: Filtrar clips destacados
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *           format: objectId
 *         description: Filtrar por ID de usuario
 *     responses:
 *       200:
 *         description: Lista de clips activos obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: Error en los parámetros de consulta
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/active',
  validateQuery(paginationSchema.extend({
    category: z.enum(['comedy', 'music', 'dance', 'food', 'travel', 'news', 'sports', 'education']).optional(),
    featured: z.enum(['true', 'false']).optional(),
    userId: objectIdSchema.optional()
  })),
  getActiveClips
);

/**
 * @swagger
 * /api/clips/trending:
 *   get:
 *     tags: [Clips]
 *     summary: Obtener clips trending
 *     description: Obtiene los clips más populares en un período de tiempo específico
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 10
 *         description: Cantidad de clips a retornar
 *       - in: query
 *         name: timeframe
 *         schema:
 *           type: string
 *           enum: [day, week, month]
 *           default: week
 *         description: Período de tiempo para calcular trending
 *     responses:
 *       200:
 *         description: Lista de clips trending obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: Error en los parámetros de consulta
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/trending',
  validateQuery(z.object({
    limit: z.coerce.number().min(1).max(50).default(10),
    timeframe: z.enum(['day', 'week', 'month']).default('week')
  })),
  getTrendingClips
);

/**
 * @swagger
 * /api/clips/{id}:
 *   get:
 *     tags: [Clips]
 *     summary: Obtener clip específico
 *     description: Obtiene los detalles de un clip específico por su ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: objectId
 *         description: ID del clip
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *           format: objectId
 *         description: ID del usuario (para personalización)
 *     responses:
 *       200:
 *         description: Clip obtenido exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ClipResponse'
 *       404:
 *         description: Clip no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/:id',
  validateParams(z.object({ id: objectIdSchema })),
  validateQuery(z.object({
    userId: objectIdSchema.optional()
  })),
  getClipById
);

/**
 * @swagger
 * /api/clips/{id}/interact:
 *   post:
 *     tags: [Clips]
 *     summary: Registrar interacción con clip
 *     description: Registra una interacción del usuario con un clip (like, share, comment, view)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: objectId
 *         description: ID del clip
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ClipInteractionRequest'
 *     responses:
 *       200:
 *         description: Interacción registrada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: Error en la solicitud
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
 *       404:
 *         description: Clip no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/:id/interact',
  auth,
  validateParams(z.object({ id: objectIdSchema })),
  validateBody(clipInteractionSchema),
  recordClipInteraction
);

// ========== RUTAS DE ADMINISTRACIÓN ==========

// Middleware: Solo administradores y moderadores
router.use(auth, requireRole(['admin', 'moderator']));

/**
 * @swagger
 * /api/clips/admin/stats:
 *   get:
 *     tags: [Admin - Contenido]
 *     summary: Obtener estadísticas de clips
 *     description: Obtiene estadísticas generales de clips para administradores
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Estadísticas obtenidas exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ClipStatsResponse'
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
router.get('/admin/stats', getClipStats);

/**
 * @swagger
 * /api/clips/admin/all:
 *   get:
 *     tags: [Admin - Contenido]
 *     summary: Listar todos los clips (admin)
 *     description: Obtiene una lista paginada de todos los clips con filtros avanzados para administradores
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
 *         description: Cantidad de clips por página
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [comedy, music, dance, food, travel, news, sports, education]
 *         description: Filtrar por categoría
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [draft, active, paused, reported, removed]
 *         description: Filtrar por estado
 *       - in: query
 *         name: isApproved
 *         schema:
 *           type: string
 *           enum: [true, false]
 *         description: Filtrar por estado de aprobación
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Buscar en título y descripción
 *       - in: query
 *         name: creator
 *         schema:
 *           type: string
 *         description: Filtrar por nombre del creador
 *     responses:
 *       200:
 *         description: Lista de clips obtenida exitosamente
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
router.get('/admin/all',
  validateQuery(paginationSchema.extend({
    category: z.enum(['comedy', 'music', 'dance', 'food', 'travel', 'news', 'sports', 'education']).optional(),
    status: z.enum(['draft', 'active', 'paused', 'reported', 'removed']).optional(),
    isApproved: z.enum(['true', 'false']).optional(),
    search: z.string().optional(),
    creator: z.string().optional()
  })),
  getAllClips
);

/**
 * @swagger
 * /api/clips/admin:
 *   post:
 *     tags: [Admin - Contenido]
 *     summary: Crear nuevo clip
 *     description: Crea un nuevo clip (solo administradores)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateClipRequest'
 *     responses:
 *       201:
 *         description: Clip creado exitosamente
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
router.post('/admin',
  validateBody(createClipSchema),
  createClip
);

/**
 * @swagger
 * /api/clips/admin/{id}:
 *   put:
 *     tags: [Admin - Contenido]
 *     summary: Actualizar clip
 *     description: Actualiza un clip existente (solo administradores)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: objectId
 *         description: ID del clip
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateClipRequest'
 *     responses:
 *       200:
 *         description: Clip actualizado exitosamente
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
 *         description: Clip no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.put('/admin/:id',
  validateParams(z.object({ id: objectIdSchema })),
  validateBody(updateClipSchema),
  updateClip
);

/**
 * @swagger
 * /api/clips/admin/{id}:
 *   delete:
 *     tags: [Admin - Contenido]
 *     summary: Eliminar clip
 *     description: Elimina un clip permanentemente (solo administradores)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: objectId
 *         description: ID del clip
 *     responses:
 *       200:
 *         description: Clip eliminado exitosamente
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
 *         description: Clip no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.delete('/admin/:id',
  validateParams(z.object({ id: objectIdSchema })),
  deleteClip
);

/**
 * @swagger
 * /api/clips/admin/{id}/moderate:
 *   patch:
 *     tags: [Admin - Contenido]
 *     summary: Moderar clip
 *     description: Aprueba, rechaza o elimina un clip (solo administradores y moderadores)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: objectId
 *         description: ID del clip
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ModerateClipRequest'
 *     responses:
 *       200:
 *         description: Clip moderado exitosamente
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
 *         description: Sin permisos de moderador
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Clip no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.patch('/admin/:id/moderate',
  validateParams(z.object({ id: objectIdSchema })),
  validateBody(moderateClipSchema),
  moderateClip
);

/**
 * @swagger
 * /api/clips/admin/{id}/analytics:
 *   get:
 *     tags: [Admin - Contenido]
 *     summary: Obtener analytics del clip
 *     description: Obtiene estadísticas detalladas de un clip específico
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: objectId
 *         description: ID del clip
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Fecha de inicio para el análisis
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Fecha de fin para el análisis
 *       - in: query
 *         name: groupBy
 *         schema:
 *           type: string
 *           enum: [hour, day, month]
 *           default: day
 *         description: Agrupación temporal de los datos
 *     responses:
 *       200:
 *         description: Analytics obtenidos exitosamente
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
 *                         analytics:
 *                           type: object
 *                           properties:
 *                             views:
 *                               type: array
 *                               items:
 *                                 type: object
 *                                 properties:
 *                                   date:
 *                                     type: string
 *                                     format: date-time
 *                                   count:
 *                                     type: integer
 *                             likes:
 *                               type: array
 *                               items:
 *                                 type: object
 *                                 properties:
 *                                   date:
 *                                     type: string
 *                                     format: date-time
 *                                   count:
 *                                     type: integer
 *                             shares:
 *                               type: array
 *                               items:
 *                                 type: object
 *                                 properties:
 *                                   date:
 *                                     type: string
 *                                     format: date-time
 *                                   count:
 *                                     type: integer
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
 *         description: Clip no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/admin/:id/analytics',
  validateParams(z.object({ id: objectIdSchema })),
  validateQuery(z.object({
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    groupBy: z.enum(['hour', 'day', 'month']).default('day')
  })),
  getClipAnalytics
);

export default router;
