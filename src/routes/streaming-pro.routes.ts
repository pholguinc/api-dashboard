import { Router } from 'express';
import { StreamingProController } from '../controllers/streaming-pro.controller';
import { authenticateJwt, requireRole } from '../middleware/auth';

const router = Router();

// POST /api/streaming-pro/test-no-auth - Endpoint de prueba sin autenticación (antes del middleware)
router.post('/test-no-auth', StreamingProController.createTestStreamNoAuth);

// Rutas autenticadas
router.use(authenticateJwt);

// ========== STREAMING PROFESIONAL ==========

// POST /api/streaming-pro/create - Crear stream profesional

/**
 * @swagger
 * /api/streaming-pro/create:
 *   post:
 *     tags: [Streaming]
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
router.post('/create', StreamingProController.createProfessionalStream);

// POST /api/streaming-pro/:streamId/start - Iniciar stream profesional

/**
 * @swagger
 * /api/streaming-pro/{streamId}/start:
 *   post:
 *     tags: [Streaming]
 *     summary: POST /:streamId/start
 *     description: Endpoint POST para /:streamId/start
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
router.post('/:streamId/start', StreamingProController.startProfessionalStream);

// GET /api/streaming-pro/:streamId/details - Obtener stream con calidades

/**
 * @swagger
 * /api/streaming-pro/{streamId}/details:
 *   get:
 *     tags: [Streaming]
 *     summary: GET /:streamId/details
 *     description: Endpoint GET para /:streamId/details
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
router.get('/:streamId/details', StreamingProController.getStreamWithQualities);

// POST /api/streaming-pro/:streamId/webrtc - Configurar WebRTC

/**
 * @swagger
 * /api/streaming-pro/{streamId}/webrtc:
 *   post:
 *     tags: [Streaming]
 *     summary: POST /:streamId/webrtc
 *     description: Endpoint POST para /:streamId/webrtc
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
router.post('/:streamId/webrtc', StreamingProController.setupWebRTC);

// POST /api/streaming-pro/:streamId/publish-token - Emitir token RTMP

/**
 * @swagger
 * /api/streaming-pro/{streamId}/publish-token:
 *   post:
 *     tags: [Streaming]
 *     summary: POST /:streamId/publish-token
 *     description: Endpoint POST para /:streamId/publish-token
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
router.post('/:streamId/publish-token', StreamingProController.issuePublishToken);

// POST /api/streaming-pro/:streamId/hls-token - Emitir token HLS

/**
 * @swagger
 * /api/streaming-pro/{streamId}/hls-token:
 *   post:
 *     tags: [Streaming]
 *     summary: POST /:streamId/hls-token
 *     description: Endpoint POST para /:streamId/hls-token
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
router.post('/:streamId/hls-token', StreamingProController.issueHlsToken);

// GET /api/streaming-pro/:streamId/analytics - Analytics en tiempo real

/**
 * @swagger
 * /api/streaming-pro/{streamId}/analytics:
 *   get:
 *     tags: [Streaming]
 *     summary: GET /:streamId/analytics
 *     description: Endpoint GET para /:streamId/analytics
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
router.get('/:streamId/analytics', StreamingProController.getStreamAnalytics);

// PUT /api/streaming-pro/:streamId/configure - Configuración avanzada

/**
 * @swagger
 * /api/streaming-pro/{streamId}/configure:
 *   put:
 *     tags: [Streaming]
 *     summary: PUT /:streamId/configure
 *     description: Endpoint PUT para /:streamId/configure
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
router.put('/:streamId/configure', StreamingProController.configureAdvancedStream);

// POST /api/streaming-pro/event - Crear stream de evento

/**
 * @swagger
 * /api/streaming-pro/event:
 *   post:
 *     tags: [Streaming]
 *     summary: POST /event
 *     description: Endpoint POST para /event
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
router.post('/event', StreamingProController.setupEventStream);

// GET /api/streaming-pro/dashboard - Dashboard profesional

/**
 * @swagger
 * /api/streaming-pro/dashboard:
 *   get:
 *     tags: [Streaming]
 *     summary: GET /dashboard
 *     description: Endpoint GET para /dashboard
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
router.get('/dashboard', StreamingProController.getStreamerProfessionalDashboard);

// POST /api/streaming-pro/test - Endpoint de prueba simplificado
router.post('/test', StreamingProController.createTestStream);

// ========== ADMINISTRACIÓN ==========

router.use(requireRole(['admin', 'moderator']));

// GET /api/streaming-pro/admin/server-status - Estado del servidor

/**
 * @swagger
 * /api/streaming-pro/admin/server-status:
 *   get:
 *     tags: [Admin]
 *     summary: GET /admin/server-status
 *     description: Endpoint GET para /admin/server-status
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
router.get('/admin/server-status', StreamingProController.getServerStatus);

// Rotar stream key (owner/admin)

/**
 * @swagger
 * /api/streaming-pro/{streamId}/rotate-key:
 *   post:
 *     tags: [Streaming]
 *     summary: POST /:streamId/rotate-key
 *     description: Endpoint POST para /:streamId/rotate-key
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
router.post('/:streamId/rotate-key', StreamingProController.rotateStreamKey);

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
