import { Router } from 'express';
import { YapePlinPaymentController } from '../controllers/yape-plin-payment.controller';
import { authenticateJwt } from '../middleware/auth';
import { validateBody, validateParams, validateQuery, objectIdSchema, paginationSchema } from '../utils/validation';
import { z } from 'zod';

const router = Router();

// Esquemas de validación
const createPaymentSchema = z.object({
  subscriptionId: objectIdSchema,
  paymentMethod: z.enum(['yape', 'plin'])
});

const uploadProofSchema = z.object({
  proofImageUrl: z.string().url('URL de imagen inválida'),
  notes: z.string().max(200).optional()
});

const verifyPaymentSchema = z.object({
  isVerified: z.boolean(),
  notes: z.string().max(500).optional()
});

const updateConfigSchema = z.object({
  yapeNumber: z.string().regex(/^(\+51)?9\d{8}$/, 'Número de Yape inválido').optional(),
  plinNumber: z.string().regex(/^(\+51)?9\d{8}$/, 'Número de Plin inválido').optional(),
  qrCodeYape: z.string().url().optional(),
  qrCodePlin: z.string().url().optional()
});

const paymentStatsSchema = z.object({
  period: z.enum(['7d', '30d', '90d']).default('30d')
});

// ========== RUTAS PÚBLICAS ==========

// GET /api/payments/config - Obtener números de pago (público)

/**
 * @swagger
 * /api/payments/config:
 *   get:
 *     tags: [Pagos]
 *     summary: GET /config
 *     description: Endpoint GET para /config
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
router.get('/config', YapePlinPaymentController.getPaymentConfig);

// ========== RUTAS AUTENTICADAS ==========

// Middleware de autenticación para rutas protegidas
router.use(authenticateJwt);

// POST /api/payments/create - Crear pago pendiente

/**
 * @swagger
 * /api/payments/create:
 *   post:
 *     tags: [Pagos]
 *     summary: POST /create
 *     description: Endpoint POST para /create
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
router.post('/create',
  validateBody(createPaymentSchema),
  YapePlinPaymentController.createPayment
);

// POST /api/payments/:paymentId/proof - Subir comprobante de pago

/**
 * @swagger
 * /api/payments:paymentId/proof:
 *   post:
 *     tags: [Pagos]
 *     summary: POST /:paymentId/proof
 *     description: Endpoint POST para /:paymentId/proof
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
router.post('/:paymentId/proof',
  validateParams(z.object({ paymentId: objectIdSchema })),
  validateBody(uploadProofSchema),
  YapePlinPaymentController.uploadPaymentProof
);

// GET /api/payments/my-payments - Historial de pagos del usuario

/**
 * @swagger
 * /my-payments:
 *   get:
 *     tags: [Pagos]
 *     summary: GET /my-payments
 *     description: Endpoint GET para /my-payments
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
router.get('/my-payments',
  validateQuery(paginationSchema),
  YapePlinPaymentController.getUserPayments
);

// ========== RUTAS ADMIN ==========

// GET /api/payments/pending - Pagos pendientes de verificación (Admin)

/**
 * @swagger
 * /pending:
 *   get:
 *     tags: [Pagos]
 *     summary: GET /pending
 *     description: Endpoint GET para /pending
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
router.get('/pending',
  validateQuery(paginationSchema.extend({
    status: z.enum(['pending', 'verified', 'rejected', 'expired']).default('pending')
  })),
  YapePlinPaymentController.getPendingPayments
);

// POST /api/payments/:paymentId/verify - Verificar pago (Admin)

/**
 * @swagger
 * /api/payments:paymentId/verify:
 *   post:
 *     tags: [Pagos]
 *     summary: POST /:paymentId/verify
 *     description: Endpoint POST para /:paymentId/verify
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
router.post('/:paymentId/verify',
  validateParams(z.object({ paymentId: objectIdSchema })),
  validateBody(verifyPaymentSchema),
  YapePlinPaymentController.verifyPayment
);

// PUT /api/payments/config - Actualizar configuración de números (Admin)

/**
 * @swagger
 * /api/payments/config:
 *   put:
 *     tags: [Pagos]
 *     summary: PUT /config
 *     description: Endpoint PUT para /config
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
router.put('/config',
  validateBody(updateConfigSchema),
  YapePlinPaymentController.updatePaymentConfig
);

// GET /api/payments/stats - Estadísticas de pagos (Admin)

/**
 * @swagger
 * /api/payments/stats:
 *   get:
 *     tags: [Pagos]
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
router.get('/stats',
  validateQuery(paymentStatsSchema),
  YapePlinPaymentController.getPaymentStats
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
