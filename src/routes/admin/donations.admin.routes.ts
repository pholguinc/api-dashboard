import { Router } from 'express';
import { DonationsAdminController } from '../../controllers/admin/donations.admin.controller';
import { adminAuthMiddleware } from '../../middleware/admin.auth.middleware';
import { validateQuery, validateBody, paginationSchema } from '../../utils/validation';
import { z } from 'zod';

const router = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     DonationOverviewResponse:
 *       allOf:
 *         - $ref: '#/components/schemas/SuccessResponse'
 *         - type: object
 *           properties:
 *             data:
 *               type: object
 *               properties:
 *                 totalDonations:
 *                   type: number
 *                   example: 15000.00
 *                 totalCount:
 *                   type: integer
 *                   example: 500
 *                 averageDonation:
 *                   type: number
 *                   example: 30.00
 *                 topDonors:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       donor:
 *                         $ref: '#/components/schemas/User'
 *                       totalDonated:
 *                         type: number
 *                         example: 500.00
 *                       donationCount:
 *                         type: integer
 *                         example: 10
 *                 donationsByDay:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       date:
 *                         type: string
 *                         format: date
 *                         example: "2024-01-15"
 *                       amount:
 *                         type: number
 *                         example: 500.00
 *                       count:
 *                         type: integer
 *                         example: 15
 *     
 *     Donation:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: objectId
 *           example: "507f1f77bcf86cd799439011"
 *         donor:
 *           $ref: '#/components/schemas/User'
 *         streamer:
 *           $ref: '#/components/schemas/User'
 *         amount:
 *           type: number
 *           example: 50.00
 *         message:
 *           type: string
 *           example: "¡Excelente stream!"
 *         isAnonymous:
 *           type: boolean
 *           example: false
 *         status:
 *           type: string
 *           enum: [pending, completed, failed, refunded]
 *           example: "completed"
 *         platformFee:
 *           type: number
 *           example: 2.50
 *         streamerAmount:
 *           type: number
 *           example: 47.50
 *         createdAt:
 *           type: string
 *           format: date-time
 *           example: "2024-01-15T10:30:00.000Z"
 *     
 *     StreamerAnalyticsResponse:
 *       allOf:
 *         - $ref: '#/components/schemas/SuccessResponse'
 *         - type: object
 *           properties:
 *             data:
 *               type: object
 *               properties:
 *                 topStreamers:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       streamer:
 *                         $ref: '#/components/schemas/User'
 *                       totalDonations:
 *                         type: number
 *                         example: 2000.00
 *                       donationCount:
 *                         type: integer
 *                         example: 50
 *                       averageDonation:
 *                         type: number
 *                         example: 40.00
 *                       totalViewers:
 *                         type: integer
 *                         example: 5000
 *                 analytics:
 *                   type: object
 *                   properties:
 *                     totalDonations:
 *                       type: number
 *                       example: 15000.00
 *                     totalStreamers:
 *                       type: integer
 *                       example: 25
 *                     averageDonationPerStreamer:
 *                       type: number
 *                       example: 600.00
 *                     conversionRate:
 *                       type: number
 *                       example: 0.05
 *     
 *     CommissionConfig:
 *       type: object
 *       properties:
 *         streamerPercentage:
 *           type: number
 *           minimum: 0
 *           maximum: 100
 *           example: 85
 *         platformPercentage:
 *           type: number
 *           minimum: 0
 *           maximum: 100
 *           example: 15
 *         minDonation:
 *           type: number
 *           minimum: 1
 *           example: 5.00
 *         maxDonation:
 *           type: number
 *           maximum: 10000
 *           example: 1000.00
 *         processingFee:
 *           type: number
 *           example: 2.9
 *         fixedFee:
 *           type: number
 *           example: 0.30
 */

// Middleware de autenticación admin
router.use(adminAuthMiddleware);

// Esquemas de validación
const donationsOverviewSchema = z.object({
  period: z.enum(['7d', '30d', '90d', '1y']).default('30d')
});

const getDonationsSchema = paginationSchema.extend({
  streamerId: z.string().optional(),
  donorId: z.string().optional(),
  minAmount: z.string().transform(Number).optional(),
  maxAmount: z.string().transform(Number).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional()
});

const streamersAnalyticsSchema = z.object({
  period: z.enum(['7d', '30d', '90d']).default('30d')
});

const commissionConfigSchema = z.object({
  streamerPercentage: z.number().min(0).max(100),
  platformPercentage: z.number().min(0).max(100),
  minDonation: z.number().min(1),
  maxDonation: z.number().max(10000)
});

const exportReportSchema = z.object({
  format: z.enum(['json', 'csv']).default('json'),
  period: z.enum(['7d', '30d', '90d', '1y']).default('30d')
});

// ========== RUTAS DE DONACIONES ADMIN ==========

/**
 * @swagger
 * /api/admin/donations/overview:
 *   get:
 *     tags: [Admin - Donaciones]
 *     summary: Obtener resumen de donaciones
 *     description: Obtiene un resumen general de las donaciones en un período específico
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [7d, 30d, 90d, 1y]
 *           default: 30d
 *         description: Período de tiempo para el resumen
 *     responses:
 *       200:
 *         description: Resumen obtenido exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DonationOverviewResponse'
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
router.get('/overview',
  validateQuery(donationsOverviewSchema),
  DonationsAdminController.getDonationsOverview
);

/**
 * @swagger
 * /api/admin/donations:
 *   get:
 *     tags: [Admin - Donaciones]
 *     summary: Listar donaciones con filtros
 *     description: Obtiene una lista paginada de donaciones con filtros avanzados
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
 *         description: Cantidad de donaciones por página
 *       - in: query
 *         name: streamerId
 *         schema:
 *           type: string
 *           format: objectId
 *         description: Filtrar por streamer
 *       - in: query
 *         name: donorId
 *         schema:
 *           type: string
 *           format: objectId
 *         description: Filtrar por donante
 *       - in: query
 *         name: minAmount
 *         schema:
 *           type: number
 *         description: Monto mínimo de donación
 *       - in: query
 *         name: maxAmount
 *         schema:
 *           type: number
 *         description: Monto máximo de donación
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Fecha de inicio
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Fecha de fin
 *     responses:
 *       200:
 *         description: Lista de donaciones obtenida exitosamente
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
 *                         donations:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/Donation'
 *                         pagination:
 *                           type: object
 *                           properties:
 *                             page:
 *                               type: integer
 *                               example: 1
 *                             limit:
 *                               type: integer
 *                               example: 10
 *                             total:
 *                               type: integer
 *                               example: 100
 *                             totalPages:
 *                               type: integer
 *                               example: 10
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
router.get('/',
  validateQuery(getDonationsSchema),
  DonationsAdminController.getDonations
);

/**
 * @swagger
 * /api/admin/donations/streamers-analytics:
 *   get:
 *     tags: [Admin - Donaciones]
 *     summary: Obtener analytics de streamers
 *     description: Obtiene estadísticas detalladas de donaciones por streamer
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [7d, 30d, 90d]
 *           default: 30d
 *         description: Período de tiempo para el análisis
 *     responses:
 *       200:
 *         description: Analytics obtenidos exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/StreamerAnalyticsResponse'
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
router.get('/streamers-analytics',
  validateQuery(streamersAnalyticsSchema),
  DonationsAdminController.getStreamersAnalytics
);

/**
 * @swagger
 * /api/admin/donations/commission-config:
 *   get:
 *     tags: [Admin - Donaciones]
 *     summary: Obtener configuración de comisiones
 *     description: Obtiene la configuración actual de comisiones para donaciones
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
 *                       $ref: '#/components/schemas/CommissionConfig'
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
router.get('/commission-config',
  DonationsAdminController.getCommissionConfig
);

/**
 * @swagger
 * /api/admin/donations/commission-config:
 *   put:
 *     tags: [Admin - Donaciones]
 *     summary: Actualizar configuración de comisiones
 *     description: Actualiza la configuración de comisiones para donaciones
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CommissionConfig'
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
 *                       $ref: '#/components/schemas/CommissionConfig'
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
router.put('/commission-config',
  validateBody(commissionConfigSchema),
  DonationsAdminController.updateCommissionConfig
);

/**
 * @swagger
 * /api/admin/donations/export:
 *   get:
 *     tags: [Admin - Donaciones]
 *     summary: Exportar reporte de donaciones
 *     description: Exporta un reporte de donaciones en formato JSON o CSV
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [json, csv]
 *           default: json
 *         description: Formato de exportación
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [7d, 30d, 90d, 1y]
 *           default: 30d
 *         description: Período de tiempo para el reporte
 *     responses:
 *       200:
 *         description: Reporte exportado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     downloadUrl:
 *                       type: string
 *                       format: uri
 *                       example: "https://example.com/reports/donations-2024-01-15.json"
 *                     filename:
 *                       type: string
 *                       example: "donations-2024-01-15.json"
 *                     recordCount:
 *                       type: integer
 *                       example: 500
 *                     totalAmount:
 *                       type: number
 *                       example: 15000.00
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
router.get('/export',
  validateQuery(exportReportSchema),
  DonationsAdminController.exportDonationsReport
);

export default router;
