import { Router } from 'express';
import { uploadBanner, handleUploadError, generateAllBannerSizes } from '../middleware/upload';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { auth, requireRole } from '../middleware/auth';
import {
  // Banners públicos
  getActiveBanners,
  recordBannerInteraction,
  
  // Admin banners
  getAllBanners,
  getBannerById,
  createBanner,
  updateBanner,
  deleteBanner,
  updateBannerOrder,
  getBannerStats
} from '../controllers/banners.controller';
import {
  validateBody,
  validateQuery,
  validateParams,
  createBannerSchema,
  updateBannerSchema,
  bannerInteractionSchema,
  updateBannerOrderSchema,
  paginationSchema,
  objectIdSchema
} from '../utils/validation';
import { z } from 'zod';

const router = Router();

// ========== RUTAS PÚBLICAS PARA LA APP ==========

// GET /api/banners/active - Obtener banners activos

/**
 * @swagger
 * /api/banners/active:
 *   get:
 *     tags: [Banners]
 *     summary: Obtener banners activos
 *     description: Obtiene los banners activos disponibles para mostrar en la aplicación
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
    limit: z.coerce.number().min(1).max(10).default(5),
    userId: objectIdSchema.optional()
  })),
  getActiveBanners
);

// POST /api/banners/:id/interact - Registrar interacción con banner

/**
 * @swagger
 * /api/banners/{id}/interact:
 *   post:
 *     tags: [Banners]
 *     summary: Registrar interacción con banner
 *     description: Registra una interacción del usuario con un banner específico
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
  validateBody(bannerInteractionSchema),
  recordBannerInteraction
);

// ========== RUTAS DE ADMINISTRACIÓN ==========

// POST /api/banners/admin/upload - Subir imagen de banner (antes del middleware global)

/**
 * @swagger
 * /api/banners/admin/upload:
 *   post:
 *     tags: [Admin - Contenido]
 *     summary: Subir imagen de banner
 *     description: Sube una imagen de banner y genera múltiples tamaños automáticamente
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
router.post('/admin/upload',
  auth, requireRole(['admin']), // Auth específico para esta ruta
  (req, res, next) => uploadBanner(req as any, res as any, (err: any) => handleUploadError(err, req, res, next)),
  async (req, res) => {
    try {
      const file = (req as any).file;
      if (!file) {
        return res.status(400).json({ success: false, data: null, error: { message: 'No se subió archivo' } });
      }
      // Generar múltiples tamaños automáticamente
      const uploadsDir = path.join(__dirname, '../../uploads');
      const inputPath = path.join(uploadsDir, file.filename);
      const baseName = file.filename.replace(/\.(jpg|jpeg|png|gif|webp)$/i, '');
      
      // Generar todos los tamaños de banner
      const bannerSizes = await generateAllBannerSizes(inputPath, baseName);
      
      // Borrar original pesado
      if (fs.existsSync(inputPath)) {
        fs.unlinkSync(inputPath);
      }

      // Devolver URL principal (mobile) y todas las variantes
      return res.status(201).json({ 
        success: true, 
        data: { 
          imageUrl: `/uploads/${bannerSizes.mobile}`,
          sizes: {
            mobile: `/uploads/${bannerSizes.mobile}`,
            tablet: `/uploads/${bannerSizes.tablet}`,
            desktop: `/uploads/${bannerSizes.desktop}`,
            square: `/uploads/${bannerSizes.square}`,
            wide: `/uploads/${bannerSizes.wide}`
          }
        }, 
        error: null 
      });
    } catch (error) {
      return res.status(500).json({ success: false, data: null, error: { message: 'Error al subir imagen' } });
    }
  }
);

// Middleware: Solo administradores pueden gestionar banners (para el resto de rutas)
router.use(auth, requireRole(['admin']));

// GET /api/banners/admin/stats - Estadísticas de banners

/**
 * @swagger
 * /api/banners/admin/stats:
 *   get:
 *     tags: [Admin - Contenido]
 *     summary: GET /admin/stats
 *     description: Endpoint GET para /admin/stats
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
router.get('/admin/stats', getBannerStats);

// GET /api/banners/admin/all - Listar todos los banners

/**
 * @swagger
 * /api/banners/admin/all:
 *   get:
 *     tags: [Admin - Contenido]
 *     summary: GET /admin/all
 *     description: Endpoint GET para /admin/all
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
router.get('/admin/all',
  validateQuery(paginationSchema.extend({
    type: z.enum(['promotional', 'informational', 'event', 'service', 'partnership']).optional(),
    status: z.enum(['draft', 'active', 'paused', 'expired']).optional(),
    search: z.string().optional()
  })),
  getAllBanners
);

// GET /api/banners/admin/:id - Obtener banner específico

/**
 * @swagger
 * /api/banners/admin/{id}:
 *   get:
 *     tags: [Admin - Contenido]
 *     summary: GET /admin/:id
 *     description: Endpoint GET para /admin/:id
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
router.get('/admin/:id',
  validateParams(z.object({ id: objectIdSchema })),
  getBannerById
);

// POST /api/banners/admin - Crear nuevo banner

/**
 * @swagger
 * /api/banners/admin:
 *   post:
 *     tags: [Banners]
 *     summary: POST /admin
 *     description: Endpoint POST para /admin
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
router.post('/admin',
  validateBody(createBannerSchema),
  createBanner
);

// PUT /api/banners/admin/:id - Actualizar banner

/**
 * @swagger
 * /api/banners/admin/{id}:
 *   put:
 *     tags: [Admin - Contenido]
 *     summary: PUT /admin/:id
 *     description: Endpoint PUT para /admin/:id
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
router.put('/admin/:id',
  validateParams(z.object({ id: objectIdSchema })),
  validateBody(updateBannerSchema),
  updateBanner
);

// DELETE /api/banners/admin/:id - Eliminar banner

/**
 * @swagger
 * /api/banners/admin/{id}:
 *   delete:
 *     tags: [Admin - Contenido]
 *     summary: DELETE /admin/:id
 *     description: Endpoint DELETE para /admin/:id
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
router.delete('/admin/:id',
  validateParams(z.object({ id: objectIdSchema })),
  deleteBanner
);

// PUT /api/banners/admin/order - Actualizar orden de banners

/**
 * @swagger
 * /api/banners/admin/order:
 *   put:
 *     tags: [Admin - Contenido]
 *     summary: PUT /admin/order
 *     description: Endpoint PUT para /admin/order
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
router.put('/admin/order',
  validateBody(updateBannerOrderSchema),
  updateBannerOrder
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
