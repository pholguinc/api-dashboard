import { Router } from 'express';
import { auth } from '../middleware/auth';
import {
  getStreamers,
  getStreamerProfile,
  toggleFollow,
  getStreamComments,
  sendStreamComment,
  donateToStream,
  getFollowedStreamers,
  getStreamCategories,
  getStreamMeta,
  toggleStreamReminder
} from '../controllers/metro-live.controller';
import { getVODs } from '../controllers/metro-live.controller';
import { deleteVOD } from '../controllers/metro-vod.controller';
import { 
  validateBody, 
  validateParams,
  validateQuery,
  objectIdSchema,
  paginationSchema
} from '../utils/validation';
import { z } from 'zod';
import { MetroLiveStreamModel } from '../models/metro-live.model';

const router = Router();

// Esquemas de validación
const getStreamersSchema = paginationSchema.extend({
  category: z.enum(['IRL', 'Gaming', 'Music', 'Art', 'Food', 'Tech', 'Dance', 'Freestyle']).optional(),
  status: z.enum(['live', 'offline', 'all']).default('live'),
  featured: z.enum(['true', 'false']).optional(),
  search: z.string().max(50).optional()
});

const sendCommentSchema = z.object({
  message: z.string().min(1, 'Mensaje es requerido').max(500, 'Mensaje muy largo'),
  type: z.enum(['text', 'emoji', 'sticker']).default('text'),
  metadata: z.object({
    stickerUrl: z.string().url().optional(),
    replyToId: objectIdSchema.optional()
  }).optional()
});

const donationSchema = z.object({
  amount: z.number().min(1, 'Monto mínimo: 1 punto').max(10000, 'Monto máximo: 10,000 puntos'),
  message: z.string().max(200, 'Mensaje muy largo').optional(),
  isAnonymous: z.boolean().default(false)
});

const commentsQuerySchema = paginationSchema.extend({
  pinned: z.enum(['true', 'false']).optional()
});

// Moderación
const slowModeSchema = z.object({ seconds: z.number().min(0).max(300) });
const muteSchema = z.object({ userId: objectIdSchema });
const banSchema = z.object({ userId: objectIdSchema });

// ========== RUTAS PÚBLICAS ==========

// GET /api/metro-live/streamers - Obtener lista de streamers

/**
 * @swagger
 * /api/metro-live/streamers:
 *   get:
 *     tags: [Streaming]
 *     summary: GET /streamers
 *     description: Endpoint GET para /streamers
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
router.get('/streamers', 
  validateQuery(getStreamersSchema),
  getStreamers
);

// GET /api/metro-live/categories - Obtener categorías con estadísticas

/**
 * @swagger
 * /api/metro-live/categories:
 *   get:
 *     tags: [Streaming]
 *     summary: GET /categories
 *     description: Endpoint GET para /categories
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
router.get('/categories', getStreamCategories);

// VODs

/**
 * @swagger
 * /vods:
 *   get:
 *     tags: [Streaming]
 *     summary: GET /vods
 *     description: Endpoint GET para /vods
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
router.get('/vods', getVODs);
// Delete VOD (streamer or admin)

/**
 * @swagger
 * /vods/:streamId:
 *   delete:
 *     tags: [Streaming]
 *     summary: DELETE /vods/:streamId
 *     description: Endpoint DELETE para /vods/:streamId
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
router.delete('/vods/:streamId',
  auth,
  validateParams(z.object({ streamId: objectIdSchema })),
  deleteVOD
);

// GET /api/metro-live/streamers/:streamerId - Obtener perfil de streamer

/**
 * @swagger
 * /streamers/:streamerId:
 *   get:
 *     tags: [Streaming]
 *     summary: GET /streamers/:streamerId
 *     description: Endpoint GET para /streamers/:streamerId
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
router.get('/streamers/:streamerId',
  validateParams(z.object({ streamerId: objectIdSchema })),
  getStreamerProfile
);

// GET /api/metro-live/streams/:streamId/comments - Obtener comentarios de stream

/**
 * @swagger
 * /streams/:streamId/comments:
 *   get:
 *     tags: [Streaming]
 *     summary: GET /streams/:streamId/comments
 *     description: Endpoint GET para /streams/:streamId/comments
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
router.get('/streams/:streamId/comments',
  validateParams(z.object({ streamId: objectIdSchema })),
  validateQuery(commentsQuerySchema),
  getStreamComments
);

// GET /api/metro-live/streams/:streamId/meta - Obtener metadatos de stream

/**
 * @swagger
 * /streams/:streamId/meta:
 *   get:
 *     tags: [Streaming]
 *     summary: GET /streams/:streamId/meta
 *     description: Endpoint GET para /streams/:streamId/meta
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
router.get('/streams/:streamId/meta',
  auth,
  validateParams(z.object({ streamId: objectIdSchema })),
  getStreamMeta
);

// ========== RUTAS AUTENTICADAS ==========

// POST /api/metro-live/streamers/:streamerId/follow - Seguir/dejar de seguir streamer

/**
 * @swagger
 * /streamers/:streamerId/follow:
 *   post:
 *     tags: [Streaming]
 *     summary: POST /streamers/:streamerId/follow
 *     description: Endpoint POST para /streamers/:streamerId/follow
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
router.post('/streamers/:streamerId/follow',
  auth,
  validateParams(z.object({ streamerId: objectIdSchema })),
  toggleFollow
);

// GET /api/metro-live/following - Obtener streamers seguidos

/**
 * @swagger
 * /following:
 *   get:
 *     tags: [Streaming]
 *     summary: GET /following
 *     description: Endpoint GET para /following
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
router.get('/following',
  auth,
  validateQuery(paginationSchema),
  getFollowedStreamers
);

// POST /api/metro-live/streams/:streamId/comments - Enviar comentario

/**
 * @swagger
 * /streams/:streamId/comments:
 *   post:
 *     tags: [Streaming]
 *     summary: POST /streams/:streamId/comments
 *     description: Endpoint POST para /streams/:streamId/comments
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
router.post('/streams/:streamId/comments',
  auth,
  validateParams(z.object({ streamId: objectIdSchema })),
  validateBody(sendCommentSchema),
  sendStreamComment
);

// POST /api/metro-live/streams/:streamId/donate - Donar a stream

/**
 * @swagger
 * /streams/:streamId/donate:
 *   post:
 *     tags: [Streaming]
 *     summary: POST /streams/:streamId/donate
 *     description: Endpoint POST para /streams/:streamId/donate
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
router.post('/streams/:streamId/donate',
  auth,
  validateParams(z.object({ streamId: objectIdSchema })),
  validateBody(donationSchema),
  donateToStream
);

// POST /api/metro-live/streams/:streamId/remind - Suscribir/Anular recordatorio

/**
 * @swagger
 * /streams/:streamId/remind:
 *   post:
 *     tags: [Streaming]
 *     summary: POST /streams/:streamId/remind
 *     description: Endpoint POST para /streams/:streamId/remind
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
router.post('/streams/:streamId/remind',
  auth,
  validateParams(z.object({ streamId: objectIdSchema })),
  toggleStreamReminder
);

// ========== RUTAS DE MODERACIÓN (streamer o admin) ==========

/**
 * @swagger
 * /streams/:streamId/moderation/slow-mode:
 *   post:
 *     tags: [Streaming]
 *     summary: POST /streams/:streamId/moderation/slow-mode
 *     description: Endpoint POST para /streams/:streamId/moderation/slow-mode
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
router.post('/streams/:streamId/moderation/slow-mode',
  auth,
  validateParams(z.object({ streamId: objectIdSchema })),
  validateBody(slowModeSchema),
  async (req, res) => {
    const { streamId } = req.params as any;
    const { seconds } = req.body as any;
    const userId = (req as any).user.id;
    const userRole = (req as any).user.role;
    const stream = await MetroLiveStreamModel.findById(streamId);
    if (!stream) return res.status(404).json({ success: false, error: { message: 'Stream no encontrado' } });
    const isOwner = stream.streamerId.toString() === userId;
    if (!isOwner && userRole !== 'admin') return res.status(403).json({ success: false, error: { message: 'No autorizado' } });
    if (!stream.moderation) (stream as any).moderation = { slowModeSeconds: 0, mutedUserIds: [], bannedUserIds: [], lastMessageAtByUser: {} };
    (stream.moderation as any).slowModeSeconds = seconds;
    await stream.save();
    return res.json({ success: true, data: { slowModeSeconds: seconds } });
  }
);


/**
 * @swagger
 * /streams/:streamId/moderation/mute:
 *   post:
 *     tags: [Streaming]
 *     summary: POST /streams/:streamId/moderation/mute
 *     description: Endpoint POST para /streams/:streamId/moderation/mute
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
router.post('/streams/:streamId/moderation/mute',
  auth,
  validateParams(z.object({ streamId: objectIdSchema })),
  validateBody(muteSchema),
  async (req, res) => {
    const { streamId } = req.params as any;
    const { userId: targetId } = req.body as any;
    const userId = (req as any).user.id;
    const userRole = (req as any).user.role;
    const stream = await MetroLiveStreamModel.findById(streamId);
    if (!stream) return res.status(404).json({ success: false, error: { message: 'Stream no encontrado' } });
    const isOwner = stream.streamerId.toString() === userId;
    if (!isOwner && userRole !== 'admin') return res.status(403).json({ success: false, error: { message: 'No autorizado' } });
    if (!stream.moderation) (stream as any).moderation = { slowModeSeconds: 0, mutedUserIds: [], bannedUserIds: [], lastMessageAtByUser: {} };
    const list = new Set((stream.moderation.mutedUserIds || []).map(id => id.toString()));
    if (list.has(targetId)) list.delete(targetId); else list.add(targetId);
    (stream.moderation as any).mutedUserIds = Array.from(list);
    await stream.save();
    return res.json({ success: true, data: { mutedUserIds: stream.moderation?.mutedUserIds || [] } });
  }
);


/**
 * @swagger
 * /streams/:streamId/moderation/ban:
 *   post:
 *     tags: [Streaming]
 *     summary: POST /streams/:streamId/moderation/ban
 *     description: Endpoint POST para /streams/:streamId/moderation/ban
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
router.post('/streams/:streamId/moderation/ban',
  auth,
  validateParams(z.object({ streamId: objectIdSchema })),
  validateBody(banSchema),
  async (req, res) => {
    const { streamId } = req.params as any;
    const { userId: targetId } = req.body as any;
    const userId = (req as any).user.id;
    const userRole = (req as any).user.role;
    const stream = await MetroLiveStreamModel.findById(streamId);
    if (!stream) return res.status(404).json({ success: false, error: { message: 'Stream no encontrado' } });
    const isOwner = stream.streamerId.toString() === userId;
    if (!isOwner && userRole !== 'admin') return res.status(403).json({ success: false, error: { message: 'No autorizado' } });
    if (!stream.moderation) (stream as any).moderation = { slowModeSeconds: 0, mutedUserIds: [], bannedUserIds: [], lastMessageAtByUser: {} };
    const list = new Set((stream.moderation.bannedUserIds || []).map(id => id.toString()));
    if (list.has(targetId)) list.delete(targetId); else list.add(targetId);
    (stream.moderation as any).bannedUserIds = Array.from(list);
    await stream.save();
    return res.json({ success: true, data: { bannedUserIds: stream.moderation?.bannedUserIds || [] } });
  }
);

// ========== RUTAS DE ESTADÍSTICAS ==========

// GET /api/metro-live/stats/live - Estadísticas generales de streams en vivo

/**
 * @swagger
 * /stats/live:
 *   get:
 *     tags: [Streaming]
 *     summary: GET /stats/live
 *     description: Endpoint GET para /stats/live
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
router.get('/stats/live', async (req, res) => {
  try {
    const { MetroLiveStreamModel } = await import('../models/metro-live.model');
    
    const stats = await MetroLiveStreamModel.aggregate([
      {
        $match: { status: 'live' }
      },
      {
        $group: {
          _id: null,
          totalStreams: { $sum: 1 },
          totalViewers: { $sum: '$viewerCount' },
          averageViewers: { $avg: '$viewerCount' },
          maxViewers: { $max: '$viewerCount' }
        }
      }
    ]);

    const categoryStats = await MetroLiveStreamModel.aggregate([
      {
        $match: { status: 'live' }
      },
      {
        $group: {
          _id: '$category',
          streams: { $sum: 1 },
          viewers: { $sum: '$viewerCount' }
        }
      },
      {
        $sort: { streams: -1 }
      }
    ]);

    res.json({
      success: true,
      data: {
        general: stats[0] || { 
          totalStreams: 0, 
          totalViewers: 0, 
          averageViewers: 0, 
          maxViewers: 0 
        },
        byCategory: categoryStats
      },
      error: null,
      meta: {
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error getting live stats:', error);
    res.status(500).json({
      success: false,
      data: null,
      error: { message: 'Error al obtener estadísticas' }
    });
  }
});

// GET /api/metro-live/trending - Streamers en tendencia

/**
 * @swagger
 * /trending:
 *   get:
 *     tags: [Streaming]
 *     summary: GET /trending
 *     description: Endpoint GET para /trending
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
router.get('/trending', async (req, res) => {
  try {
    const { MetroLiveStreamModel } = await import('../models/metro-live.model');
    
    // Streamers con más crecimiento en las últimas 24 horas
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const trending = await MetroLiveStreamModel.aggregate([
      {
        $match: {
          updatedAt: { $gte: yesterday },
          status: { $in: ['live', 'offline'] }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'streamerId',
          foreignField: '_id',
          as: 'streamer'
        }
      },
      {
        $unwind: '$streamer'
      },
      {
        $group: {
          _id: '$streamerId',
          streamer: { $first: '$streamer' },
          totalViewers: { $sum: '$maxViewers' },
          streamsCount: { $sum: 1 },
          averageViewers: { $avg: '$viewerCount' },
          totalDonations: { $sum: '$totalDonations' }
        }
      },
      {
        $sort: { totalViewers: -1 }
      },
      {
        $limit: 10
      },
      {
        $project: {
          id: '$_id',
          displayName: '$streamer.displayName',
          avatarUrl: '$streamer.avatarUrl',
          categories: '$streamer.streamerProfile.categories',
          totalViewers: 1,
          streamsCount: 1,
          averageViewers: { $round: ['$averageViewers', 0] },
          totalDonations: 1
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        trending,
        period: '24h'
      },
      error: null,
      meta: {
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error getting trending streamers:', error);
    res.status(500).json({
      success: false,
      data: null,
      error: { message: 'Error al obtener streamers en tendencia' }
    });
  }
});

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
