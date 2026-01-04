import { Router } from 'express';
import { TikTokContentAdminController } from '../../controllers/admin/tiktok-content.admin.controller';

const router = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     TikTokContent:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: objectId
 *           example: "507f1f77bcf86cd799439011"
 *         videoId:
 *           type: string
 *           example: "7123456789012345678"
 *         author:
 *           type: string
 *           example: "@usuario_peruano"
 *         title:
 *           type: string
 *           example: "Video viral de Perú"
 *         description:
 *           type: string
 *           example: "Contenido divertido y viral"
 *         videoUrl:
 *           type: string
 *           example: "https://example.com/video.mp4"
 *         thumbnail:
 *           type: string
 *           example: "https://example.com/thumbnail.jpg"
 *         duration:
 *           type: integer
 *           example: 30
 *         views:
 *           type: integer
 *           example: 1000000
 *         likes:
 *           type: integer
 *           example: 50000
 *         shares:
 *           type: integer
 *           example: 10000
 *         comments:
 *           type: integer
 *           example: 5000
 *         hashtags:
 *           type: array
 *           items:
 *             type: string
 *           example: ["#peru", "#viral", "#comedia"]
 *         category:
 *           type: string
 *           example: "comedy"
 *         isViral:
 *           type: boolean
 *           example: true
 *         isActive:
 *           type: boolean
 *           example: true
 *         publishedAt:
 *           type: string
 *           format: date-time
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     CreateMassiveContentRequest:
 *       type: object
 *       required:
 *         - count
 *         - category
 *       properties:
 *         count:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           example: 50
 *         category:
 *           type: string
 *           example: "comedy"
 *         includeViral:
 *           type: boolean
 *           example: true
 *         minViews:
 *           type: integer
 *           example: 10000
 *     FetchViralRequest:
 *       type: object
 *       properties:
 *         limit:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           example: 20
 *         minViews:
 *           type: integer
 *           example: 100000
 *         hashtags:
 *           type: array
 *           items:
 *             type: string
 *           example: ["#peru", "#viral"]
 *     FetchRealContentRequest:
 *       type: object
 *       properties:
 *         limit:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           example: 10
 *         category:
 *           type: string
 *           example: "comedy"
 *         region:
 *           type: string
 *           example: "peru"
 *     FetchNewContentRequest:
 *       type: object
 *       properties:
 *         limit:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           example: 15
 *         keywords:
 *           type: array
 *           items:
 *             type: string
 *           example: ["peru", "lima", "comedia"]
 *     TikTokContentStats:
 *       type: object
 *       properties:
 *         totalContent:
 *           type: integer
 *           example: 1500
 *         activeContent:
 *           type: integer
 *           example: 1200
 *         viralContent:
 *           type: integer
 *           example: 150
 *         totalViews:
 *           type: integer
 *           example: 50000000
 *         totalLikes:
 *           type: integer
 *           example: 2500000
 *         averageViews:
 *           type: number
 *           example: 33333.33
 *         contentByCategory:
 *           type: object
 *           properties:
 *             comedy:
 *               type: integer
 *               example: 500
 *             dance:
 *               type: integer
 *               example: 300
 *             music:
 *               type: integer
 *               example: 400
 *             lifestyle:
 *               type: integer
 *               example: 300
 *     TrendingHashtag:
 *       type: object
 *       properties:
 *         hashtag:
 *           type: string
 *           example: "#peru"
 *         count:
 *           type: integer
 *           example: 1500
 *         growth:
 *           type: number
 *           example: 25.5
 *         category:
 *           type: string
 *           example: "general"
 *     CleanupContentRequest:
 *       type: object
 *       properties:
 *         olderThanDays:
 *           type: integer
 *           example: 30
 *         minViews:
 *           type: integer
 *           example: 1000
 *         dryRun:
 *           type: boolean
 *           example: true
 *     AutoUpdateConfig:
 *       type: object
 *       properties:
 *         enabled:
 *           type: boolean
 *           example: true
 *         interval:
 *           type: string
 *           enum: [hourly, daily, weekly]
 *           example: "daily"
 *         maxContentPerUpdate:
 *           type: integer
 *           example: 50
 *         categories:
 *           type: array
 *           items:
 *             type: string
 *           example: ["comedy", "dance", "music"]
 */

/**
 * @swagger
 * /api/admin/tiktok-content/create-massive:
 *   post:
 *     tags: [Admin - Contenido]
 *     summary: Crear contenido masivo
 *     description: Crea múltiples piezas de contenido de TikTok de forma masiva
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateMassiveContentRequest'
 *     responses:
 *       201:
 *         description: Contenido masivo creado exitosamente
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
 *                         created:
 *                           type: integer
 *                           example: 50
 *                         failed:
 *                           type: integer
 *                           example: 2
 *                         content:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/TikTokContent'
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
router.post('/create-massive', TikTokContentAdminController.createMassiveContent);

/**
 * @swagger
 * /api/admin/tiktok-content/fetch-viral:
 *   post:
 *     tags: [Admin - Contenido]
 *     summary: Obtener TikToks virales peruanos
 *     description: Obtiene TikToks virales reales de Perú desde la API de TikTok
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/FetchViralRequest'
 *     responses:
 *       200:
 *         description: TikToks virales obtenidos exitosamente
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
 *                         fetched:
 *                           type: integer
 *                           example: 20
 *                         content:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/TikTokContent'
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
 *       500:
 *         description: Error al obtener contenido de TikTok
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/fetch-viral', TikTokContentAdminController.fetchViralTikToks);

/**
 * @swagger
 * /api/admin/tiktok-content/fetch-real:
 *   post:
 *     tags: [Admin - Contenido]
 *     summary: Obtener contenido real de TikTok Perú
 *     description: Obtiene contenido real de TikTok específico de Perú
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/FetchRealContentRequest'
 *     responses:
 *       200:
 *         description: Contenido real obtenido exitosamente
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
 *                         fetched:
 *                           type: integer
 *                           example: 10
 *                         content:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/TikTokContent'
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
 *       500:
 *         description: Error al obtener contenido de TikTok
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/fetch-real', TikTokContentAdminController.fetchRealTikTokContent);

/**
 * @swagger
 * /api/admin/tiktok-content/fetch:
 *   post:
 *     tags: [Admin - Contenido]
 *     summary: Obtener nuevo contenido de TikTok
 *     description: Obtiene nuevo contenido de TikTok usando el método anterior
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/FetchNewContentRequest'
 *     responses:
 *       200:
 *         description: Nuevo contenido obtenido exitosamente
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
 *                         fetched:
 *                           type: integer
 *                           example: 15
 *                         content:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/TikTokContent'
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
 *       500:
 *         description: Error al obtener contenido de TikTok
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/fetch', TikTokContentAdminController.fetchNewContent);

/**
 * @swagger
 * /api/admin/tiktok-content/stats:
 *   get:
 *     tags: [Admin - Contenido]
 *     summary: Obtener estadísticas de contenido TikTok
 *     description: Obtiene estadísticas generales del contenido de TikTok
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
 *                       $ref: '#/components/schemas/TikTokContentStats'
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
router.get('/stats', TikTokContentAdminController.getContentStats);

/**
 * @swagger
 * /api/admin/tiktok-content/hashtags:
 *   get:
 *     tags: [Admin - Contenido]
 *     summary: Obtener hashtags trending
 *     description: Obtiene los hashtags más populares y trending
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Cantidad de hashtags a obtener
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filtrar por categoría
 *     responses:
 *       200:
 *         description: Hashtags trending obtenidos exitosamente
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
 *                         $ref: '#/components/schemas/TrendingHashtag'
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
router.get('/hashtags', TikTokContentAdminController.getTrendingHashtags);

/**
 * @swagger
 * /api/admin/tiktok-content/cleanup:
 *   post:
 *     tags: [Admin - Contenido]
 *     summary: Limpiar contenido antiguo
 *     description: Elimina contenido antiguo o con pocas visualizaciones
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CleanupContentRequest'
 *     responses:
 *       200:
 *         description: Limpieza completada exitosamente
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
 *                         deleted:
 *                           type: integer
 *                           example: 25
 *                         dryRun:
 *                           type: boolean
 *                           example: false
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
router.post('/cleanup', TikTokContentAdminController.cleanupContent);

/**
 * @swagger
 * /api/admin/tiktok-content/auto-update:
 *   post:
 *     tags: [Admin - Contenido]
 *     summary: Configurar auto-actualización
 *     description: Configura la actualización automática de contenido de TikTok
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AutoUpdateConfig'
 *     responses:
 *       200:
 *         description: Auto-actualización configurada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/AutoUpdateConfig'
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
router.post('/auto-update', TikTokContentAdminController.configureAutoUpdate);

export default router;
