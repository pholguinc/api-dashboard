import { Router } from 'express';
import { auth } from '../middleware/auth';
import { PointsService, PointsActions } from '../services/points.service';
import { 
  validateBody, 
  validateQuery,
  paginationSchema 
} from '../utils/validation';
import { sendOk, sendError, sendCreated } from '../utils/response';
import { z } from 'zod';

const router = Router();

// Todas las rutas requieren autenticación
router.use(auth);

// Esquemas de validación
const earnPointsSchema = z.object({
  action: z.enum([
    'daily_login',
    'watch_ad', 
    'play_game',
    'like_content',
    'share_content',
    'use_metro',
    'complete_survey'
  ]),
  metadata: z.object({
    adId: z.string().optional(),
    gameId: z.string().optional(),
    score: z.number().optional(),
    contentId: z.string().optional(),
    contentType: z.string().optional(),
    platform: z.string().optional(),
    stationFrom: z.string().optional(),
    stationTo: z.string().optional(),
    surveyId: z.string().optional()
  }).optional()
});

// ========== RUTAS DE PUNTOS ==========

// GET /api/points/balance - Obtener balance actual

/**
 * @swagger
 * /api/points/balance:
 *   get:
 *     tags: [Puntos]
 *     summary: GET /balance
 *     description: Endpoint GET para /balance
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
router.get('/balance', async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const stats = await PointsService.getUserPointsStats(userId);
    
    return sendOk(res, {
      balance: stats.currentBalance,
      totalEarned: stats.totalEarned,
      isPremium: stats.isPremium
    });
  } catch (error) {
    console.error('Error getting points balance:', error);
    return sendError(res, 'Error al obtener balance de puntos', 500, 'POINTS_BALANCE_ERROR');
  }
});

// GET /api/points/stats - Obtener estadísticas detalladas

/**
 * @swagger
 * /api/points/stats:
 *   get:
 *     tags: [Puntos]
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
router.get('/stats', async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const stats = await PointsService.getUserPointsStats(userId);
    
    return sendOk(res, stats);
  } catch (error) {
    console.error('Error getting points stats:', error);
    return sendError(res, 'Error al obtener estadísticas de puntos', 500, 'POINTS_STATS_ERROR');
  }
});

// GET /api/points/history - Obtener historial de transacciones

/**
 * @swagger
 * /api/points/history:
 *   get:
 *     tags: [Puntos]
 *     summary: GET /history
 *     description: Endpoint GET para /history
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
router.get('/history', 
  validateQuery(paginationSchema),
  async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const { page, limit } = req.query as any;
      
      const history = await PointsService.getPointsHistory(userId, page, limit);
      
      return sendOk(res, history);
    } catch (error) {
      console.error('Error getting points history:', error);
      return sendError(res, 'Error al obtener historial de puntos', 500, 'POINTS_HISTORY_ERROR');
    }
  }
);

// POST /api/points/earn - Ganar puntos por acciones

/**
 * @swagger
 * /api/points/earn:
 *   post:
 *     tags: [Puntos]
 *     summary: POST /earn
 *     description: Endpoint POST para /earn
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
router.post('/earn',
  validateBody(earnPointsSchema),
  async (req, res) => {
    try {
      const { action, metadata = {} } = req.body;
      const userId = (req as any).user.id;

      let result;
      
      switch (action) {
        case 'daily_login':
          result = await PointsActions.dailyLogin(userId);
          break;
        case 'watch_ad':
          result = await PointsActions.watchAd(userId, metadata.adId);
          break;
        case 'play_game':
          result = await PointsActions.playGame(userId, metadata.gameId, metadata.score || 0);
          break;
        case 'like_content':
          result = await PointsActions.likeContent(userId, metadata.contentId, metadata.contentType);
          break;
        case 'share_content':
          result = await PointsActions.shareContent(userId, metadata.contentId, metadata.platform);
          break;
        case 'use_metro':
          result = await PointsActions.useMetro(userId, metadata.stationFrom, metadata.stationTo);
          break;
        case 'complete_survey':
          result = await PointsActions.completeSurvey(userId, metadata.surveyId);
          break;
        default:
          return sendError(res, 'Acción no válida', 400, 'INVALID_ACTION');
      }

      if (!result.success) {
        return sendError(res, result.message || 'No se pudieron otorgar puntos', 400, 'POINTS_EARN_FAILED');
      }

      return sendCreated(res, {
        pointsAwarded: result.pointsAwarded,
        newBalance: result.newBalance,
        message: result.message
      });
    } catch (error) {
      console.error('Error earning points:', error);
      return sendError(res, 'Error al ganar puntos', 500, 'POINTS_EARN_ERROR');
    }
  }
);

// GET /api/points/config - Obtener configuración de puntos (para mostrar en UI)

/**
 * @swagger
 * /api/points/config:
 *   get:
 *     tags: [Puntos]
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
router.get('/config', async (req, res) => {
  try {
    const { PointsConfigModel } = await import('../models/points.model');
    const configs = await PointsConfigModel.find({ isActive: true }).sort({ action: 1 });
    
    return sendOk(res, configs);
  } catch (error) {
    console.error('Error getting points config:', error);
    return sendError(res, 'Error al obtener configuración de puntos', 500, 'POINTS_CONFIG_ERROR');
  }
});

// GET /api/points/daily-progress - Obtener progreso diario del usuario

/**
 * @swagger
 * /daily-progress:
 *   get:
 *     tags: [Puntos]
 *     summary: GET /daily-progress
 *     description: Endpoint GET para /daily-progress
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
router.get('/daily-progress', async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const today = new Date().toISOString().split('T')[0];
    
    const { UserDailyActionsModel } = await import('../models/points.model');
    const dailyActions = await UserDailyActionsModel.findOne({ userId, date: today });
    
    const { PointsConfigModel } = await import('../models/points.model');
    const configs = await PointsConfigModel.find({ isActive: true });
    
    const progress = configs.map(config => {
      const actionData = (dailyActions?.actions as any)?.get(config.action);
      return {
        action: config.action,
        description: config.description,
        pointsPerAction: config.pointsAwarded,
        dailyLimit: config.dailyLimit || null,
        completed: actionData?.count || 0,
        pointsEarned: actionData?.pointsEarned || 0,
        canEarn: !config.dailyLimit || (actionData?.count || 0) < config.dailyLimit,
        nextAvailable: actionData?.lastAction && config.cooldownMinutes 
          ? new Date(actionData.lastAction.getTime() + config.cooldownMinutes * 60000)
          : null
      };
    });
    
    return sendOk(res, {
      date: today,
      totalPointsEarned: dailyActions?.totalPointsEarned || 0,
      actions: progress
    });
  } catch (error) {
    console.error('Error getting daily progress:', error);
    return sendError(res, 'Error al obtener progreso diario', 500, 'DAILY_PROGRESS_ERROR');
  }
});

// POST /api/points/referral/:referredUserId - Procesar referido

/**
 * @swagger
 * /referral/:referredUserId:
 *   post:
 *     tags: [Referidos]
 *     summary: POST /referral/:referredUserId
 *     description: Endpoint POST para /referral/:referredUserId
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
router.post('/referral/:referredUserId', async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { referredUserId } = req.params;
    
    if (userId === referredUserId) {
      return sendError(res, 'No puedes referirte a ti mismo', 400, 'SELF_REFERRAL');
    }
    
    // Verificar que el usuario referido existe y es nuevo
    const { UserModel } = await import('../models/user.model');
    const referredUser = await UserModel.findById(referredUserId);
    if (!referredUser) {
      return sendError(res, 'Usuario referido no encontrado', 404, 'USER_NOT_FOUND');
    }
    
    // Verificar que no se ha procesado este referido antes
    const { PointsTransactionModel } = await import('../models/points.model');
    const existingReferral = await PointsTransactionModel.findOne({
      userId,
      type: 'earned_referral',
      'metadata.referredUserId': referredUserId
    });
    
    if (existingReferral) {
      return sendError(res, 'Este referido ya fue procesado', 400, 'REFERRAL_ALREADY_PROCESSED');
    }
    
    const result = await PointsActions.referralSignup(userId, referredUserId);
    
    if (!result.success) {
      return sendError(res, result.message || 'No se pudieron otorgar puntos de referido', 400, 'REFERRAL_FAILED');
    }
    
    return sendCreated(res, {
      pointsAwarded: result.pointsAwarded,
      newBalance: result.newBalance,
      message: result.message
    });
  } catch (error) {
    console.error('Error processing referral:', error);
    return sendError(res, 'Error al procesar referido', 500, 'REFERRAL_ERROR');
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
