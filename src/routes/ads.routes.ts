import { Router } from 'express';
import { auth, requireRole } from '../middleware/auth';
import {
  getAllAds,
  getAdById,
  createAd,
  updateAd,
  deleteAd,
  toggleAdStatus,
  getAdMetrics,
  recordAdInteraction,
  recordAdView,
  recordAdClick,
  getActiveAds,
  getAdStats,
  uploadAdFile
} from '../controllers/ads.controller';
import {
  validateBody,
  validateQuery,
  validateParams,
  createAdSchema,
  updateAdSchema,
  adStatusSchema,
  adInteractionSchema,
  paginationSchema,
  objectIdSchema
} from '../utils/validation';
import { uploadAdFile as uploadAdFileMiddleware, handleAdUploadError } from '../middleware/upload';
import { z } from 'zod';

const router = Router();

// ========== RUTAS PÚBLICAS PARA LA APP ==========

// GET /api/ads/active - Obtener anuncios activos

/**
 * @swagger
 * /api/ads/active:
 *   get:
 *     tags: [Anuncios]
 *     summary: Obtener anuncios activos
 *     description: Obtiene los anuncios activos disponibles para mostrar en la aplicación
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
router.get('/active',
  validateQuery(z.object({
    placement: z.enum(['home_top', 'home_middle', 'home_bottom', 'marketplace', 'profile', 'streaming']).optional(),
    type: z.enum(['banner', 'video', 'fullscreen', 'interstitial']).optional(),
    limit: z.coerce.number().min(1).max(50).default(10)
  })),
  getActiveAds
);

// POST /api/ads/:id/interact - Registrar interacción (impresión, clic, conversión)

/**
 * @swagger
 * /api/ads/{id}/interact:
 *   post:
 *     tags: [Anuncios]
 *     summary: POST /:id/interact
 *     description: Endpoint POST para /:id/interact
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
router.post('/:id/interact',
  validateParams(z.object({ id: objectIdSchema })),
  validateBody(adInteractionSchema),
  recordAdInteraction
);

// POST /api/ads/:id/view - Registrar visualización de anuncio

/**
 * @swagger
 * /api/ads/{id}/view:
 *   post:
 *     tags: [Anuncios]
 *     summary: POST /:id/view
 *     description: Endpoint POST para /:id/view
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
router.post('/:id/view',
  validateParams(z.object({ id: objectIdSchema })),
  recordAdView
);

// POST /api/ads/:id/click - Registrar clic en anuncio

/**
 * @swagger
 * /api/ads/{id}/click:
 *   post:
 *     tags: [Anuncios]
 *     summary: POST /:id/click
 *     description: Endpoint POST para /:id/click
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
router.post('/:id/click',
  validateParams(z.object({ id: objectIdSchema })),
  recordAdClick
);

// ========== RUTAS DE ADMINISTRACIÓN ==========

// Middleware: Solo administradores pueden gestionar anuncios
router.use(auth, requireRole(['admin']));

// POST /api/ads/upload - Subir archivo para anuncio

/**
 * @swagger
 * /api/ads/upload:
 *   post:
 *     tags: [Admin - Anuncios]
 *     summary: Subir archivo para anuncio
 *     description: Sube una imagen o video para usar en un anuncio
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Archivo de imagen o video (máximo 50MB)
 *     responses:
 *       201:
 *         description: Archivo subido exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: Error en la validación o archivo
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
router.post('/upload',
  uploadAdFileMiddleware,
  handleAdUploadError,
  uploadAdFile
);

// GET /api/ads/stats - Estadísticas generales de anuncios

/**
 * @swagger
 * /api/ads/stats:
 *   get:
 *     tags: [Admin - Estadísticas]
 *     summary: GET /stats
 *     description: Endpoint GET para /stats
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
router.get('/stats', getAdStats);

// GET /api/ads - Listar todos los anuncios

/**
 * @swagger
 * /api/ads:
 *   get:
 *     tags: [Admin - Estadísticas]
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
router.get('/',
  validateQuery(paginationSchema.extend({
    status: z.enum(['draft', 'active', 'paused', 'expired']).optional(),
    type: z.enum(['banner', 'interstitial', 'video', 'native']).optional(),
    placement: z.enum(['home_top', 'home_middle', 'home_bottom', 'marketplace', 'profile', 'streaming']).optional(),
    search: z.string().optional(),
    advertiser: z.string().optional()
  })),
  getAllAds
);

// GET /api/ads/:id - Obtener anuncio específico

/**
 * @swagger
 * /api/ads/{id}:
 *   get:
 *     tags: [Admin - Estadísticas]
 *     summary: GET /:id
 *     description: Endpoint GET para /:id
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
router.get('/:id',
  validateParams(z.object({ id: objectIdSchema })),
  getAdById
);

// POST /api/ads - Crear nuevo anuncio

/**
 * @swagger
 * /api/ads:
 *   post:
 *     tags: [Admin - Estadísticas]
 *     summary: POST /
 *     description: Endpoint POST para /
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
router.post('/',
  validateBody(createAdSchema),
  createAd
);

// PUT /api/ads/:id - Actualizar anuncio

/**
 * @swagger
 * /api/ads/{id}:
 *   put:
 *     tags: [Admin - Estadísticas]
 *     summary: PUT /:id
 *     description: Endpoint PUT para /:id
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
router.put('/:id',
  validateParams(z.object({ id: objectIdSchema })),
  validateBody(updateAdSchema),
  updateAd
);

// DELETE /api/ads/:id - Eliminar anuncio

/**
 * @swagger
 * /api/ads/{id}:
 *   delete:
 *     tags: [Admin - Estadísticas]
 *     summary: DELETE /:id
 *     description: Endpoint DELETE para /:id
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
router.delete('/:id',
  validateParams(z.object({ id: objectIdSchema })),
  deleteAd
);

// PATCH /api/ads/:id/status - Cambiar estado del anuncio

/**
 * @swagger
 * /api/ads/{id}/status:
 *   patch:
 *     tags: [Admin - Estadísticas]
 *     summary: PATCH /:id/status
 *     description: Endpoint PATCH para /:id/status
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
router.patch('/:id/status',
  validateParams(z.object({ id: objectIdSchema })),
  validateBody(adStatusSchema),
  toggleAdStatus
);

// GET /api/ads/:id/metrics - Obtener métricas del anuncio

/**
 * @swagger
 * /api/ads/{id}/metrics:
 *   get:
 *     tags: [Admin - Estadísticas]
 *     summary: GET /:id/metrics
 *     description: Endpoint GET para /:id/metrics
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
router.get('/:id/metrics',
  validateParams(z.object({ id: objectIdSchema })),
  validateQuery(z.object({
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    groupBy: z.enum(['hour', 'day', 'month']).default('day')
  })),
  getAdMetrics
);

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


