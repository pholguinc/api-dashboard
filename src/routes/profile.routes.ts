import { Router } from 'express';
import { auth } from '../middleware/auth';
import { sendError, sendOk, sendCreated } from '../utils/response';
import { UserModel } from '../models/user.model';
import { 
  CourseEnrollmentModel,
  MicrocourseModel 
} from '../models/microcourse.model';
import { 
  StreamFollowModel,
  MetroLiveStreamModel 
} from '../models/metro-live.model';
import { 
  PointsTransactionModel,
  UserDailyActionsModel 
} from '../models/points.model';
import { RedemptionModel } from '../models/marketplace.model';
import { 
  validateBody, 
  validateParams,
  validateQuery,
  objectIdSchema,
  paginationSchema
} from '../utils/validation';
import { z } from 'zod';
import mongoose from 'mongoose';

const router = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     UserProfile:
 *       allOf:
 *         - $ref: '#/components/schemas/User'
 *         - type: object
 *           properties:
 *             stats:
 *               type: object
 *               properties:
 *                 courses:
 *                   type: object
 *                   properties:
 *                     enrolled:
 *                       type: integer
 *                       example: 5
 *                     completed:
 *                       type: integer
 *                       example: 3
 *                     completionRate:
 *                       type: integer
 *                       example: 60
 *                 streaming:
 *                   type: object
 *                   properties:
 *                     following:
 *                       type: integer
 *                       example: 10
 *                     isStreamer:
 *                       type: boolean
 *                       example: true
 *                 points:
 *                   type: object
 *                   properties:
 *                     current:
 *                       type: integer
 *                       example: 1500
 *                     totalEarned:
 *                       type: integer
 *                       example: 5000
 *                     totalSpent:
 *                       type: integer
 *                       example: 3500
 *                     lifetime:
 *                       type: integer
 *                       example: 5000
 *                 membership:
 *                   type: object
 *                   properties:
 *                     isPremium:
 *                       type: boolean
 *                       example: true
 *                     premiumExpiry:
 *                       type: string
 *                       format: date-time
 *                       example: "2024-12-31T23:59:59.000Z"
 *                     joinedAt:
 *                       type: string
 *                       format: date-time
 *                       example: "2024-01-15T10:30:00.000Z"
 *             recentActivity:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   type:
 *                     type: string
 *                     example: "game_complete"
 *                   amount:
 *                     type: integer
 *                     example: 50
 *                   description:
 *                     type: string
 *                     example: "Juego completado: 2048 Metro"
 *                   createdAt:
 *                     type: string
 *                     format: date-time
 *                     example: "2024-01-15T10:30:00.000Z"
 *     
 *     UpdateProfileRequest:
 *       type: object
 *       properties:
 *         displayName:
 *           type: string
 *           minLength: 2
 *           maxLength: 50
 *           example: "Juan Pérez"
 *         metroUsername:
 *           type: string
 *           minLength: 3
 *           maxLength: 20
 *           pattern: "^[a-zA-Z0-9_]+$"
 *           example: "juan_perez"
 *         fullName:
 *           type: string
 *           minLength: 2
 *           maxLength: 50
 *           example: "Juan Carlos Pérez García"
 *         email:
 *           type: string
 *           format: email
 *           example: "juan@example.com"
 *         avatarUrl:
 *           type: string
 *           format: uri
 *           example: "https://example.com/avatar.jpg"
 *     
 *     StreamerProfile:
 *       type: object
 *       properties:
 *         bio:
 *           type: string
 *           maxLength: 500
 *           example: "Streamer de gaming y contenido educativo"
 *         categories:
 *           type: array
 *           items:
 *             type: string
 *             enum: [IRL, Gaming, Music, Art, Food, Tech, Dance, Freestyle]
 *           maxItems: 3
 *           example: ["Gaming", "Tech"]
 *         socialLinks:
 *           type: object
 *           properties:
 *             instagram:
 *               type: string
 *               format: uri
 *               example: "https://instagram.com/juan_perez"
 *             tiktok:
 *               type: string
 *               format: uri
 *               example: "https://tiktok.com/@juan_perez"
 *             youtube:
 *               type: string
 *               format: uri
 *               example: "https://youtube.com/c/juanperez"
 *             twitch:
 *               type: string
 *               format: uri
 *               example: "https://twitch.tv/juan_perez"
 *         streamingEquipment:
 *           type: object
 *           properties:
 *             camera:
 *               type: string
 *               maxLength: 100
 *               example: "Logitech C920"
 *             microphone:
 *               type: string
 *               maxLength: 100
 *               example: "Blue Yeti"
 *             internet:
 *               type: string
 *               maxLength: 100
 *               example: "Fibra óptica 100MB"
 *         preferredStations:
 *           type: array
 *           items:
 *             type: string
 *             maxLength: 50
 *           maxItems: 10
 *           example: ["Estación Central", "Plaza San Martín"]
 *         streamingSchedule:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               day:
 *                 type: string
 *                 enum: [Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday]
 *                 example: "Monday"
 *               startTime:
 *                 type: string
 *                 pattern: "^([01]?[0-9]|2[0-3]):[0-5][0-9]$"
 *                 example: "19:00"
 *               endTime:
 *                 type: string
 *                 pattern: "^([01]?[0-9]|2[0-3]):[0-5][0-9]$"
 *                 example: "22:00"
 *               isActive:
 *                 type: boolean
 *                 example: true
 *           maxItems: 7
 *     
 *     ApplyStreamerRequest:
 *       type: object
 *       required:
 *         - bio
 *         - categories
 *       properties:
 *         bio:
 *           type: string
 *           minLength: 10
 *           maxLength: 500
 *           example: "Streamer de gaming y contenido educativo con experiencia en desarrollo de videojuegos"
 *         categories:
 *           type: array
 *           items:
 *             type: string
 *             enum: [IRL, Gaming, Music, Art, Food, Tech, Dance, Freestyle]
 *           minItems: 1
 *           maxItems: 3
 *           example: ["Gaming", "Tech"]
 *         preferredStations:
 *           type: array
 *           items:
 *             type: string
 *             maxLength: 50
 *           minItems: 1
 *           maxItems: 10
 *           example: ["Estación Central", "Plaza San Martín"]
 *         socialLinks:
 *           type: object
 *           properties:
 *             instagram:
 *               type: string
 *               format: uri
 *               example: "https://instagram.com/juan_perez"
 *             tiktok:
 *               type: string
 *               format: uri
 *               example: "https://tiktok.com/@juan_perez"
 *             youtube:
 *               type: string
 *               format: uri
 *               example: "https://youtube.com/c/juanperez"
 *             twitch:
 *               type: string
 *               format: uri
 *               example: "https://twitch.tv/juan_perez"
 */

// Todas las rutas requieren autenticación
router.use(auth);

// Esquemas de validación
const updateProfileSchema = z.object({
  displayName: z.string().min(2, 'Nombre muy corto').max(50, 'Nombre muy largo').optional(),
  metroUsername: z.string()
    .min(3, 'Username muy corto')
    .max(20, 'Username muy largo')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username solo puede contener letras, números y guiones bajos')
    .optional(),
  fullName: z.string().min(2, 'Nombre completo muy corto').max(50, 'Nombre completo muy largo').optional(),
  email: z.string().email('Email inválido').optional(),
  avatarUrl: z.string().url('URL de avatar inválida').optional()
});

const updateStreamerProfileSchema = z.object({
  bio: z.string().max(500, 'Bio muy larga').optional(),
  categories: z.array(z.enum(['IRL', 'Gaming', 'Music', 'Art', 'Food', 'Tech', 'Dance', 'Freestyle'])).max(3, 'Máximo 3 categorías').optional(),
  socialLinks: z.object({
    instagram: z.string().url().optional(),
    tiktok: z.string().url().optional(),
    youtube: z.string().url().optional(),
    twitch: z.string().url().optional()
  }).optional(),
  streamingEquipment: z.object({
    camera: z.string().max(100).optional(),
    microphone: z.string().max(100).optional(),
    internet: z.string().max(100).optional()
  }).optional(),
  preferredStations: z.array(z.string().max(50)).max(10, 'Máximo 10 estaciones').optional(),
  streamingSchedule: z.array(z.object({
    day: z.enum(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']),
    startTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato de hora inválido (HH:MM)'),
    endTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato de hora inválido (HH:MM)'),
    isActive: z.boolean().default(true)
  })).max(7, 'Máximo 7 días de la semana').optional()
});

// Esquema para aplicar a streamer (subset seguro de los campos de streamerProfile)
const applyStreamerSchema = z.object({
  bio: z.string().min(10, 'Cuéntanos un poco más de ti').max(500),
  categories: z.array(z.enum(['IRL', 'Gaming', 'Music', 'Art', 'Food', 'Tech', 'Dance', 'Freestyle']))
    .min(1, 'Selecciona al menos una categoría')
    .max(3, 'Máximo 3 categorías'),
  preferredStations: z.array(z.string().max(50)).min(1, 'Selecciona al menos una estación').max(10).optional(),
  socialLinks: z.object({
    instagram: z.string().url().optional(),
    tiktok: z.string().url().optional(),
    youtube: z.string().url().optional(),
    twitch: z.string().url().optional()
  }).partial().optional()
});

// ========== RUTAS DEL PERFIL ==========

/**
 * @swagger
 * /api/profile:
 *   get:
 *     tags: [Perfil]
 *     summary: Obtener perfil completo del usuario
 *     description: Obtiene el perfil completo del usuario autenticado con estadísticas detalladas
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Perfil obtenido exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/UserProfile'
 *       401:
 *         description: No autorizado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Usuario no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/', async (req, res) => {
  try {
    const userId = (req as any).user.id;

    const user = await UserModel.findById(userId).select('-pinHash -pinSetupTokenHash');
    if (!user) {
      return sendError(res, 'Usuario no encontrado', 404, 'USER_NOT_FOUND');
    }

    // Obtener estadísticas adicionales
    const [
      enrolledCourses,
      completedCourses,
      followedStreamers,
      totalPointsEarned,
      totalPointsSpent,
      recentActivity
    ] = await Promise.all([
      CourseEnrollmentModel.countDocuments({ userId, status: { $in: ['active', 'completed'] } }),
      CourseEnrollmentModel.countDocuments({ userId, status: 'completed' }),
      StreamFollowModel.countDocuments({ followerId: userId }),
      PointsTransactionModel.aggregate([
        { $match: { userId: new mongoose.Types.ObjectId(userId), amount: { $gt: 0 } } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      PointsTransactionModel.aggregate([
        { $match: { userId: new mongoose.Types.ObjectId(userId), amount: { $lt: 0 } } },
        { $group: { _id: null, total: { $sum: { $abs: '$amount' } } } }
      ]),
      PointsTransactionModel.find({ userId })
        .sort({ createdAt: -1 })
        .limit(5)
        .select('type amount description createdAt')
    ]);

    const profile = {
      ...user.toObject(),
      stats: {
        courses: {
          enrolled: enrolledCourses,
          completed: completedCourses,
          completionRate: enrolledCourses > 0 ? Math.round((completedCourses / enrolledCourses) * 100) : 0
        },
        streaming: {
          following: followedStreamers,
          isStreamer: user.role === 'metro_streamer'
        },
        points: {
          current: user.pointsSmart,
          totalEarned: totalPointsEarned[0]?.total || 0,
          totalSpent: totalPointsSpent[0]?.total || 0,
          lifetime: user.totalPointsEarned
        },
        membership: {
          isPremium: user.hasMetroPremium,
          premiumExpiry: user.metroPremiumExpiry,
          joinedAt: user.createdAt
        }
      },
      recentActivity: recentActivity.map(activity => ({
        type: activity.type,
        amount: activity.amount,
        description: activity.description,
        date: activity.createdAt
      }))
    };

    return sendOk(res, profile);
  } catch (error) {
    console.error('Error in getProfile:', error);
    return sendError(res, 'Error al obtener perfil', 500, 'PROFILE_GET_ERROR');
  }
});

/**
 * @swagger
 * /api/profile:
 *   put:
 *     tags: [Perfil]
 *     summary: Actualizar perfil básico
 *     description: Actualiza la información básica del perfil del usuario
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateProfileRequest'
 *     responses:
 *       200:
 *         description: Perfil actualizado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/User'
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
 *       409:
 *         description: Username ya está en uso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.put('/', 
  validateBody(updateProfileSchema),
  async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const updateData = req.body;

      // Verificar que el username no esté en uso por otro usuario
      if (updateData.metroUsername) {
        const existingUser = await UserModel.findOne({ 
          metroUsername: updateData.metroUsername,
          _id: { $ne: userId }
        });
        if (existingUser) {
          return sendError(res, 'El nombre de usuario ya está en uso', 400, 'USERNAME_TAKEN');
        }
      }

      // Verificar que el email no esté en uso por otro usuario
      if (updateData.email) {
        const existingUser = await UserModel.findOne({ 
          email: updateData.email,
          _id: { $ne: userId }
        });
        if (existingUser) {
          return sendError(res, 'El email ya está registrado', 400, 'EMAIL_TAKEN');
        }
      }

      const updatedUser = await UserModel.findByIdAndUpdate(
        userId,
        { 
          ...updateData,
          isProfileComplete: true
        },
        { new: true, select: '-pinHash -pinSetupTokenHash' }
      );

      if (!updatedUser) {
        return sendError(res, 'Usuario no encontrado', 404, 'USER_NOT_FOUND');
      }

      return sendOk(res, { user: updatedUser, message: 'Perfil actualizado exitosamente' });
    } catch (error) {
      console.error('Error in updateProfile:', error);
      return sendError(res, 'Error al actualizar perfil', 500, 'PROFILE_UPDATE_ERROR');
    }
  }
);

// PUT /api/profile/streamer - Actualizar perfil de streamer
router.put('/streamer',
  validateBody(updateStreamerProfileSchema),
  async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const streamerData = req.body;

      const user = await UserModel.findById(userId);
      if (!user) {
        return sendError(res, 'Usuario no encontrado', 404, 'USER_NOT_FOUND');
      }

      if (user.role !== 'metro_streamer') {
        return sendError(res, 'Solo los streamers pueden actualizar este perfil', 403, 'NOT_STREAMER');
      }

      // Actualizar perfil de streamer
      const updateQuery: any = {};
      Object.keys(streamerData).forEach(key => {
        updateQuery[`streamerProfile.${key}`] = streamerData[key];
      });

      const updatedUser = await UserModel.findByIdAndUpdate(
        userId,
        { $set: updateQuery },
        { new: true, select: '-pinHash -pinSetupTokenHash' }
      );

      return sendOk(res, { user: updatedUser, message: 'Perfil de streamer actualizado exitosamente' });
    } catch (error) {
      console.error('Error in updateStreamerProfile:', error);
      return sendError(res, 'Error al actualizar perfil de streamer', 500, 'STREAMER_PROFILE_UPDATE_ERROR');
    }
  }
);

/**
 * @swagger
 * /api/profile/streamer/apply:
 *   post:
 *     tags: [Perfil]
 *     summary: Aplicar para ser streamer
 *     description: Envía una solicitud para convertirse en streamer de la plataforma
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ApplyStreamerRequest'
 *     responses:
 *       201:
 *         description: Solicitud enviada exitosamente
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
 *                         applicationId:
 *                           type: string
 *                           format: objectId
 *                           example: "507f1f77bcf86cd799439011"
 *                         status:
 *                           type: string
 *                           example: "pending"
 *                         message:
 *                           type: string
 *                           example: "Tu solicitud ha sido enviada y será revisada en 24-48 horas"
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
 *       409:
 *         description: Ya existe una solicitud pendiente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/streamer/apply',
  validateBody(applyStreamerSchema),
  async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const { bio, categories, preferredStations = [], socialLinks = {} } = req.body;

      const user = await UserModel.findById(userId);
      if (!user) {
        return sendError(res, 'Usuario no encontrado', 404, 'USER_NOT_FOUND');
      }

      // Si ya es streamer verificado, no permitir re-aplicar
      if (user.role === 'metro_streamer' && user.streamerProfile?.isVerified) {
        return sendError(res, 'Ya eres Metro Streamer verificado', 400, 'ALREADY_STREAMER');
      }

      // Guardar datos de aplicación en streamerProfile con isVerified=false
      const updated = await UserModel.findByIdAndUpdate(
        userId,
        {
          $set: {
            'streamerProfile.bio': bio,
            'streamerProfile.categories': categories,
            'streamerProfile.preferredStations': preferredStations,
            'streamerProfile.socialLinks': socialLinks,
            'streamerProfile.isVerified': false,
            'streamerProfile.verificationReason': 'Solicitud en revisión'
          }
        },
        { new: true, select: 'displayName role streamerProfile' }
      );

      return sendCreated(res, {
        message: 'Solicitud enviada. Te notificaremos cuando sea revisada',
        user: updated
      });
    } catch (error) {
      console.error('Error in applyStreamer:', error);
      return sendError(res, 'Error al enviar solicitud', 500, 'STREAMER_APPLY_ERROR');
    }
  }
);

// GET /api/profile/courses - Obtener cursos del usuario
router.get('/courses',
  validateQuery(paginationSchema.extend({
    status: z.enum(['active', 'completed', 'cancelled', 'all']).default('all')
  })),
  async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const { page, limit, status } = req.query as any;

      const skip = (page - 1) * limit;
      const query: any = { userId };

      if (status !== 'all') {
        query.status = status;
      }

      const [enrollments, total] = await Promise.all([
        CourseEnrollmentModel
          .find(query)
          .populate('courseId', 'title thumbnailUrl category difficulty duration instructor rating price')
          .sort({ enrolledAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        CourseEnrollmentModel.countDocuments(query)
      ]);

      const courses = enrollments.map(enrollment => ({
        enrollment: {
          id: enrollment._id,
          status: enrollment.status,
          enrolledAt: enrollment.enrolledAt,
          completedAt: enrollment.completedAt,
          lastAccessedAt: enrollment.lastAccessedAt,
          pointsSpent: enrollment.pointsSpent,
          progress: enrollment.progress,
          rating: enrollment.rating || null
        },
        course: enrollment.courseId,
        canRate: enrollment.status === 'completed' && !enrollment.rating
      }));

      return sendOk(res, {
        courses,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      console.error('Error in getUserCourses:', error);
      return sendError(res, 'Error al obtener cursos del usuario', 500, 'USER_COURSES_ERROR');
    }
  }
);

// GET /api/profile/following - Obtener streamers seguidos
router.get('/following',
  validateQuery(paginationSchema),
  async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const { page, limit } = req.query as any;

      const skip = (page - 1) * limit;

      const [follows, total] = await Promise.all([
        StreamFollowModel
          .find({ followerId: userId })
          .populate('streamerId', 'displayName avatarUrl streamerProfile')
          .sort({ followedAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        StreamFollowModel.countDocuments({ followerId: userId })
      ]);

      // Obtener streams actuales de los streamers seguidos
      const streamerIds = follows.map(f => f.streamerId._id);
      const currentStreams = await MetroLiveStreamModel
        .find({ 
          streamerId: { $in: streamerIds },
          status: 'live'
        })
        .select('streamerId title category viewerCount startedAt')
        .lean();

      const followsWithStreams = follows.map(follow => {
        const currentStream = currentStreams.find(
          s => s.streamerId.toString() === follow.streamerId._id.toString()
        );

        return {
          streamer: {
            ...follow.streamerId,
            isLive: !!currentStream,
            currentStream: currentStream || null
          },
          followedAt: follow.followedAt,
          notificationsEnabled: follow.notificationsEnabled
        };
      });

      return sendOk(res, {
        follows: followsWithStreams,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      console.error('Error in getUserFollowing:', error);
      return sendError(res, 'Error al obtener streamers seguidos', 500, 'USER_FOLLOWING_ERROR');
    }
  }
);

// GET /api/profile/points/history - Obtener historial de puntos
router.get('/points/history',
  validateQuery(paginationSchema.extend({
    type: z.enum(['earned', 'spent', 'all']).default('all')
  })),
  async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const { page, limit, type } = req.query as any;

      const skip = (page - 1) * limit;
      const query: any = { userId };

      if (type === 'earned') {
        query.amount = { $gt: 0 };
      } else if (type === 'spent') {
        query.amount = { $lt: 0 };
      }

      const [transactions, total] = await Promise.all([
        PointsTransactionModel
          .find(query)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .select('type amount description balanceAfter createdAt metadata')
          .lean(),
        PointsTransactionModel.countDocuments(query)
      ]);

      return sendOk(res, {
        transactions,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      console.error('Error in getPointsHistory:', error);
      return sendError(res, 'Error al obtener historial de puntos', 500, 'POINTS_HISTORY_ERROR');
    }
  }
);

// GET /api/profile/redemptions - Obtener historial de canjes
router.get('/redemptions',
  validateQuery(paginationSchema.extend({
    status: z.enum(['pending', 'confirmed', 'delivered', 'all']).default('all')
  })),
  async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const { page, limit, status } = req.query as any;

      const skip = (page - 1) * limit;
      const query: any = { userId };

      if (status !== 'all') {
        query.status = status;
      }

      const [redemptions, total] = await Promise.all([
        RedemptionModel
          .find(query)
          .populate('productId', 'name description imageUrl category provider')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        RedemptionModel.countDocuments(query)
      ]);

      return sendOk(res, {
        redemptions,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      console.error('Error in getUserRedemptions:', error);
      return sendError(res, 'Error al obtener historial de canjes', 500, 'USER_REDEMPTIONS_ERROR');
    }
  }
);

// GET /api/profile/activity - Obtener actividad reciente del usuario
router.get('/activity',
  validateQuery(paginationSchema.extend({
    days: z.coerce.number().min(1).max(90).default(30)
  })),
  async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const { page, limit, days } = req.query as any;

      const skip = (page - 1) * limit;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Obtener diferentes tipos de actividad
      const [
        pointsActivity,
        courseActivity,
        streamActivity
      ] = await Promise.all([
        PointsTransactionModel
          .find({ 
            userId, 
            createdAt: { $gte: startDate },
            amount: { $gt: 0 } // Solo puntos ganados
          })
          .sort({ createdAt: -1 })
          .limit(limit)
          .select('type amount description createdAt')
          .lean(),
        CourseEnrollmentModel
          .find({ 
            userId, 
            enrolledAt: { $gte: startDate }
          })
          .populate('courseId', 'title thumbnailUrl')
          .sort({ enrolledAt: -1 })
          .limit(limit)
          .lean(),
        StreamFollowModel
          .find({ 
            followerId: userId, 
            followedAt: { $gte: startDate }
          })
          .populate('streamerId', 'displayName avatarUrl')
          .sort({ followedAt: -1 })
          .limit(limit)
          .lean()
      ]);

      // Combinar y ordenar actividades
      const activities = [
        ...pointsActivity.map(p => ({
          type: 'points_earned',
          title: 'Puntos ganados',
          description: p.description,
          amount: p.amount,
          date: p.createdAt,
          metadata: { pointsType: p.type }
        })),
        ...courseActivity.map(c => ({
          type: 'course_enrolled',
          title: 'Nuevo curso',
          description: `Te inscribiste en: ${(c.courseId as any)?.title || 'Curso'}`,
          date: c.enrolledAt,
          metadata: { 
            courseId: (c.courseId as any)?._id || c.courseId,
            courseThumbnail: (c.courseId as any)?.thumbnailUrl || ''
          }
        })),
        ...streamActivity.map(s => ({
          type: 'streamer_followed',
          title: 'Nuevo seguimiento',
          description: `Ahora sigues a: ${(s.streamerId as any)?.displayName || 'Streamer'}`,
          date: s.followedAt,
          metadata: { 
            streamerId: (s.streamerId as any)?._id || s.streamerId,
            streamerAvatar: (s.streamerId as any)?.avatarUrl || ''
          }
        }))
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
       .slice(skip, skip + limit);

      const total = activities.length;

      return sendOk(res, {
        activities,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        },
        period: `${days} días`
      });
    } catch (error) {
      console.error('Error in getUserActivity:', error);
      return sendError(res, 'Error al obtener actividad del usuario', 500, 'USER_ACTIVITY_ERROR');
    }
  }
);

// DELETE /api/profile - Eliminar cuenta (soft delete)
router.delete('/', async (req, res) => {
  try {
    const userId = (req as any).user.id;

    // En lugar de eliminar completamente, desactivar la cuenta
    await UserModel.findByIdAndUpdate(userId, {
      isActive: false,
      deactivatedAt: new Date(),
      // Limpiar información sensible pero mantener datos para integridad referencial
      email: null,
      phone: `DELETED_${userId}`,
      displayName: 'Usuario Eliminado'
    });

    return sendOk(res, { message: 'Cuenta desactivada exitosamente' });
  } catch (error) {
    console.error('Error in deleteProfile:', error);
    return sendError(res, 'Error al eliminar cuenta', 500, 'PROFILE_DELETE_ERROR');
  }
});

export default router;
