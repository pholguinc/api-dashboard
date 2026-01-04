import { Router } from 'express';
import { MetroChatController } from '../controllers/metro-chat.controller';
import { authenticateJwt } from '../middleware/auth';
import { validateBody, validateParams, validateQuery, objectIdSchema, paginationSchema } from '../utils/validation';
import { z } from 'zod';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticateJwt);

// Esquemas de validación
const sendMessageSchema = z.object({
  messageType: z.enum(['text', 'voice', 'emoji', 'sticker']).default('text'),
  content: z.string().min(1).max(1000),
  voiceDuration: z.number().min(1).max(60).optional(),
  replyTo: objectIdSchema.optional()
});

const banUserSchema = z.object({
  targetUserId: objectIdSchema,
  reason: z.string().min(1).max(500),
  banType: z.enum(['temporary', 'permanent']).default('temporary'),
  duration: z.number().min(1).max(43200).optional() // Máximo 30 días en minutos
});

const updateConfigSchema = z.object({
  isActive: z.boolean().optional(),
  maxMessagesPerMinute: z.number().min(1).max(60).optional(),
  maxVoiceDuration: z.number().min(10).max(300).optional(),
  moderationEnabled: z.boolean().optional(),
  profanityFilterEnabled: z.boolean().optional()
});

const chatStatsSchema = z.object({
  period: z.enum(['1h', '24h', '7d']).default('24h')
});

// ========== RUTAS DE METROCHAT ==========

// GET /api/metro-chat/access - Verificar acceso al chat

/**
 * @swagger
 * /api/metro-chat/access:
 *   get:
 *     tags: [Streaming]
 *     summary: GET /access
 *     description: Endpoint GET para /access
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
router.get('/access', MetroChatController.checkChatAccess);

// GET /api/metro-chat/messages - Obtener mensajes del chat

/**
 * @swagger
 * /api/metro-chat/messages:
 *   get:
 *     tags: [Streaming]
 *     summary: GET /messages
 *     description: Endpoint GET para /messages
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
router.get('/messages',
  validateQuery(paginationSchema),
  MetroChatController.getMessages
);

// POST /api/metro-chat/send - Enviar mensaje

/**
 * @swagger
 * /api/metro-chat/send:
 *   post:
 *     tags: [Streaming]
 *     summary: POST /send
 *     description: Endpoint POST para /send
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
router.post('/send',
  validateBody(sendMessageSchema),
  MetroChatController.sendMessage
);

// DELETE /api/metro-chat/messages/:messageId - Eliminar mensaje

/**
 * @swagger
 * /messages/:messageId:
 *   delete:
 *     tags: [Streaming]
 *     summary: DELETE /messages/:messageId
 *     description: Endpoint DELETE para /messages/:messageId
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
router.delete('/messages/:messageId',
  validateParams(z.object({ messageId: objectIdSchema })),
  MetroChatController.deleteMessage
);

// ========== RUTAS ADMIN ==========

// POST /api/metro-chat/ban - Banear usuario (admin)

/**
 * @swagger
 * /api/metro-chat/ban:
 *   post:
 *     tags: [Streaming]
 *     summary: POST /ban
 *     description: Endpoint POST para /ban
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
router.post('/ban',
  validateBody(banUserSchema),
  MetroChatController.banUser
);

// GET /api/metro-chat/stats - Estadísticas del chat (admin)

/**
 * @swagger
 * /api/metro-chat/stats:
 *   get:
 *     tags: [Streaming]
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
  validateQuery(chatStatsSchema),
  MetroChatController.getChatStats
);

// PUT /api/metro-chat/config - Actualizar configuración (admin)

/**
 * @swagger
 * /api/metro-chat/config:
 *   put:
 *     tags: [Streaming]
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
  MetroChatController.updateChatConfig
);

// GET /api/metro-chat/banned - Obtener usuarios baneados (admin)

/**
 * @swagger
 * /banned:
 *   get:
 *     tags: [Streaming]
 *     summary: GET /banned
 *     description: Endpoint GET para /banned
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
router.get('/banned', MetroChatController.getBannedUsers);

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
