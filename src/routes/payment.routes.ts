import { Router } from 'express';
import { PaymentController } from '../controllers/payment.controller';
import { authenticateJwt, requireRole } from '../middleware/auth';

const router = Router();

// Rutas públicas

/**
 * @swagger
 * /api/payments/methods:
 *   get:
 *     tags: [Pagos]
 *     summary: Obtener métodos de pago disponibles
 *     description: Retorna una lista de todos los métodos de pago disponibles en el sistema
 *     responses:
 *       200:
 *         description: Lista de métodos de pago obtenida exitosamente
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
 *                         paymentMethods:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: string
 *                                 example: "card"
 *                               name:
 *                                 type: string
 *                                 example: "Tarjeta de Crédito/Débito"
 *                               description:
 *                                 type: string
 *                                 example: "Visa, Mastercard, American Express"
 *                               icon:
 *                                 type: string
 *                                 example: "credit_card"
 *                               enabled:
 *                                 type: boolean
 *                                 example: true
 *                               processingTime:
 *                                 type: string
 *                                 example: "Inmediato"
 *                               fees:
 *                                 type: string
 *                                 example: "3.5% + S/ 0.30"
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/methods', PaymentController.getPaymentMethods);

// Webhook de Culqi (sin autenticación)

/**
 * @swagger
 * /webhook/culqi:
 *   post:
 *     tags: [Pagos]
 *     summary: POST /webhook/culqi
 *     description: Endpoint POST para /webhook/culqi
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
router.post('/webhook/culqi', PaymentController.handleCulqiWebhook);

// Rutas autenticadas
router.use(authenticateJwt);

// Procesar pago de MetroPremium

/**
 * @swagger
 * /metropremium:
 *   post:
 *     tags: [Pagos]
 *     summary: POST /metropremium
 *     description: Endpoint POST para /metropremium
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
router.post('/metropremium', PaymentController.processMetroPremiumPayment);

// Procesar pago de microseguro

/**
 * @swagger
 * /insurance:
 *   post:
 *     tags: [Pagos]
 *     summary: POST /insurance
 *     description: Endpoint POST para /insurance
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
router.post('/insurance', PaymentController.processInsurancePayment);

// Consultar estado de pago

/**
 * @swagger
 * /status/:chargeId:
 *   get:
 *     tags: [Pagos]
 *     summary: GET /status/:chargeId
 *     description: Endpoint GET para /status/:chargeId
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
router.get('/status/:chargeId', PaymentController.getPaymentStatus);

// Rutas de administración
router.use(requireRole(['admin']));

// Crear reembolso

/**
 * @swagger
 * /refund:
 *   post:
 *     tags: [Admin - Finanzas]
 *     summary: POST /refund
 *     description: Endpoint POST para /refund
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
router.post('/refund', PaymentController.createRefund);

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
