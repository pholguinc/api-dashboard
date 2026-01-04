import { Router } from 'express';
import { auth } from '../middleware/auth';
import {
  getMicrocourses,
  getCourseDetails,
  enrollInCourse,
  getLesson,
  updateLessonProgress,
  getUserCourses,
  getCourseCategories,
  getLessonComments,
  createLessonComment,
  likeComment,
  updateVideoProgress,
  issueCertificate,
  getCertificate,
  rateCourse
} from '../controllers/microcourse.controller';
import { 
  validateBody, 
  validateParams,
  validateQuery,
  objectIdSchema,
  paginationSchema
} from '../utils/validation';
import { z } from 'zod';

const router = Router();

// Esquemas de validación
const getCoursesSchema = paginationSchema.extend({
  category: z.enum([
    'technology', 'business', 'personal_development', 'health_wellness',
    'arts_creativity', 'languages', 'finance', 'marketing',
    'programming', 'design', 'productivity', 'communication'
  ]).optional(),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  price: z.enum(['free', 'paid', 'all']).default('all'),
  search: z.string().max(100).optional(),
  sort: z.enum(['popular', 'newest', 'rating', 'price_low', 'price_high']).default('popular')
});

const updateProgressSchema = z.object({
  watchTime: z.number().min(0).optional(),
  watchedPercentage: z.number().min(0).max(100).optional(),
  isCompleted: z.boolean().optional(),
  quizScore: z.number().min(0).max(100).optional()
});

const getUserCoursesSchema = paginationSchema.extend({
  status: z.enum(['active', 'completed', 'cancelled', 'all']).default('all')
});

// ========== RUTAS PÚBLICAS ==========

// GET /api/microcourses - Obtener catálogo de microcursos

/**
 * @swagger
 * /api/microcourses:
 *   get:
 *     tags: [Educación]
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
  validateQuery(getCoursesSchema),
  getMicrocourses
);

// GET /api/microcourses/categories - Obtener categorías con estadísticas

/**
 * @swagger
 * /api/microcourses/categories:
 *   get:
 *     tags: [Educación]
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
router.get('/categories', getCourseCategories);

// GET /api/microcourses/:courseId - Obtener detalles de un curso

/**
 * @swagger
 * /api/microcourses:courseId:
 *   get:
 *     tags: [Educación]
 *     summary: GET /:courseId
 *     description: Endpoint GET para /:courseId
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
router.get('/:courseId',
  validateParams(z.object({ courseId: objectIdSchema })),
  getCourseDetails
);

// ========== RUTAS AUTENTICADAS ==========

// POST /api/microcourses/:courseId/enroll - Inscribirse en un curso

/**
 * @swagger
 * /api/microcourses:courseId/enroll:
 *   post:
 *     tags: [Educación]
 *     summary: POST /:courseId/enroll
 *     description: Endpoint POST para /:courseId/enroll
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
router.post('/:courseId/enroll',
  auth,
  validateParams(z.object({ courseId: objectIdSchema })),
  enrollInCourse
);

// GET /api/microcourses/user/courses - Obtener cursos del usuario

/**
 * @swagger
 * /user/courses:
 *   get:
 *     tags: [Educación]
 *     summary: GET /user/courses
 *     description: Endpoint GET para /user/courses
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
router.get('/user/courses',
  auth,
  validateQuery(getUserCoursesSchema),
  getUserCourses
);

// GET /api/microcourses/:courseId/lessons/:lessonId - Obtener lección específica

/**
 * @swagger
 * /api/microcourses:courseId/lessons/:lessonId:
 *   get:
 *     tags: [Educación]
 *     summary: GET /:courseId/lessons/:lessonId
 *     description: Endpoint GET para /:courseId/lessons/:lessonId
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
router.get('/:courseId/lessons/:lessonId',
  auth,
  validateParams(z.object({ 
    courseId: objectIdSchema,
    lessonId: objectIdSchema 
  })),
  getLesson
);

// PUT /api/microcourses/:courseId/lessons/:lessonId/progress - Actualizar progreso de lección

/**
 * @swagger
 * /api/microcourses:courseId/lessons/:lessonId/progress:
 *   put:
 *     tags: [Educación]
 *     summary: PUT /:courseId/lessons/:lessonId/progress
 *     description: Endpoint PUT para /:courseId/lessons/:lessonId/progress
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
router.put('/:courseId/lessons/:lessonId/progress',
  auth,
  validateParams(z.object({ 
    courseId: objectIdSchema,
    lessonId: objectIdSchema 
  })),
  validateBody(updateProgressSchema),
  updateLessonProgress
);

// POST /api/microcourses/:courseId/certificate - Emitir certificado (si completado)

/**
 * @swagger
 * /api/microcourses:courseId/certificate:
 *   post:
 *     tags: [Educación]
 *     summary: POST /:courseId/certificate
 *     description: Endpoint POST para /:courseId/certificate
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
router.post('/:courseId/certificate',
  auth,
  validateParams(z.object({ courseId: objectIdSchema })),
  issueCertificate
);

// GET /api/microcourses/certificates/:enrollmentId - Obtener certificado

/**
 * @swagger
 * /certificates/:enrollmentId:
 *   get:
 *     tags: [Educación]
 *     summary: GET /certificates/:enrollmentId
 *     description: Endpoint GET para /certificates/:enrollmentId
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
router.get('/certificates/:enrollmentId',
  auth,
  validateParams(z.object({ enrollmentId: objectIdSchema })),
  getCertificate
);

// POST /api/microcourses/:courseId/rating - Calificar curso

/**
 * @swagger
 * /api/microcourses:courseId/rating:
 *   post:
 *     tags: [Educación]
 *     summary: POST /:courseId/rating
 *     description: Endpoint POST para /:courseId/rating
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
router.post('/:courseId/rating',
  auth,
  validateParams(z.object({ courseId: objectIdSchema })),
  validateBody(z.object({
    stars: z.number().min(1).max(5),
    comment: z.string().max(500).optional()
  })),
  rateCourse
);

// ========== RUTAS DE ESTADÍSTICAS Y RECOMENDACIONES ==========

// GET /api/microcourses/featured/courses - Cursos destacados

/**
 * @swagger
 * /featured/courses:
 *   get:
 *     tags: [Educación]
 *     summary: GET /featured/courses
 *     description: Endpoint GET para /featured/courses
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
router.get('/featured/courses', async (req, res) => {
  try {
    const { MicrocourseModel } = await import('../models/microcourse.model');
    
    const featuredCourses = await MicrocourseModel
      .find({ 
        status: 'published', 
        isActive: true, 
        isFeatured: true 
      })
      .sort({ enrollmentCount: -1, 'rating.average': -1 })
      .limit(8)
      .select('title thumbnailUrl shortDescription category difficulty price rating duration instructor enrollmentCount')
      .lean();

    res.json({
      success: true,
      data: {
        courses: featuredCourses.map(course => ({
          ...course,
          estimatedHours: Math.ceil(course.duration / 60),
          completionRate: course.enrollmentCount > 0 
            ? Math.round((course.completionCount || 0) / course.enrollmentCount * 100) 
            : 0
        }))
      },
      error: null,
      meta: {
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error getting featured courses:', error);
    res.status(500).json({
      success: false,
      data: null,
      error: { message: 'Error al obtener cursos destacados' }
    });
  }
});

// GET /api/microcourses/popular/courses - Cursos más populares

/**
 * @swagger
 * /popular/courses:
 *   get:
 *     tags: [Educación]
 *     summary: GET /popular/courses
 *     description: Endpoint GET para /popular/courses
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
router.get('/popular/courses', async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const { MicrocourseModel } = await import('../models/microcourse.model');
    
    const popularCourses = await MicrocourseModel
      .find({ status: 'published', isActive: true })
      .sort({ enrollmentCount: -1, 'rating.average': -1 })
      .limit(parseInt(limit as string))
      .select('title thumbnailUrl shortDescription category difficulty price rating duration instructor enrollmentCount')
      .lean();

    res.json({
      success: true,
      data: {
        courses: popularCourses.map(course => ({
          ...course,
          estimatedHours: Math.ceil(course.duration / 60),
          isPopular: course.enrollmentCount > 100 || course.rating.average > 4.5
        }))
      },
      error: null,
      meta: {
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error getting popular courses:', error);
    res.status(500).json({
      success: false,
      data: null,
      error: { message: 'Error al obtener cursos populares' }
    });
  }
});

// GET /api/microcourses/free/courses - Cursos gratuitos

/**
 * @swagger
 * /free/courses:
 *   get:
 *     tags: [Educación]
 *     summary: GET /free/courses
 *     description: Endpoint GET para /free/courses
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
router.get('/free/courses', async (req, res) => {
  try {
    const { limit = 12 } = req.query;
    const { MicrocourseModel } = await import('../models/microcourse.model');
    
    const freeCourses = await MicrocourseModel
      .find({ 
        status: 'published', 
        isActive: true, 
        price: 0 
      })
      .sort({ 'rating.average': -1, enrollmentCount: -1 })
      .limit(parseInt(limit as string))
      .select('title thumbnailUrl shortDescription category difficulty rating duration instructor enrollmentCount')
      .lean();

    res.json({
      success: true,
      data: {
        courses: freeCourses.map(course => ({
          ...course,
          estimatedHours: Math.ceil(course.duration / 60),
          isFree: true
        }))
      },
      error: null,
      meta: {
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error getting free courses:', error);
    res.status(500).json({
      success: false,
      data: null,
      error: { message: 'Error al obtener cursos gratuitos' }
    });
  }
});

// GET /api/microcourses/stats/general - Estadísticas generales

/**
 * @swagger
 * /stats/general:
 *   get:
 *     tags: [Educación]
 *     summary: GET /stats/general
 *     description: Endpoint GET para /stats/general
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
router.get('/stats/general', async (req, res) => {
  try {
    const { MicrocourseModel, CourseEnrollmentModel } = await import('../models/microcourse.model');
    
    const [courseStats, enrollmentStats] = await Promise.all([
      MicrocourseModel.aggregate([
        {
          $match: { status: 'published', isActive: true }
        },
        {
          $group: {
            _id: null,
            totalCourses: { $sum: 1 },
            totalEnrollments: { $sum: '$enrollmentCount' },
            totalCompletions: { $sum: '$completionCount' },
            averageRating: { $avg: '$rating.average' },
            freeCourses: { $sum: { $cond: [{ $eq: ['$price', 0] }, 1, 0] } },
            paidCourses: { $sum: { $cond: [{ $gt: ['$price', 0] }, 1, 0] } },
            totalHours: { $sum: { $divide: ['$duration', 60] } }
          }
        }
      ]),
      CourseEnrollmentModel.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ])
    ]);

    const stats = courseStats[0] || {
      totalCourses: 0,
      totalEnrollments: 0,
      totalCompletions: 0,
      averageRating: 0,
      freeCourses: 0,
      paidCourses: 0,
      totalHours: 0
    };

    const enrollmentsByStatus = enrollmentStats.reduce((acc, stat) => {
      acc[stat._id] = stat.count;
      return acc;
    }, {} as any);

    res.json({
      success: true,
      data: {
        courses: {
          total: stats.totalCourses,
          free: stats.freeCourses,
          paid: stats.paidCourses,
          totalHours: Math.round(stats.totalHours)
        },
        enrollments: {
          total: stats.totalEnrollments,
          active: enrollmentsByStatus.active || 0,
          completed: enrollmentsByStatus.completed || 0,
          cancelled: enrollmentsByStatus.cancelled || 0,
          completionRate: stats.totalEnrollments > 0 
            ? Math.round((stats.totalCompletions / stats.totalEnrollments) * 100)
            : 0
        },
        quality: {
          averageRating: Math.round(stats.averageRating * 10) / 10
        }
      },
      error: null,
      meta: {
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error getting general stats:', error);
    res.status(500).json({
      success: false,
      data: null,
      error: { message: 'Error al obtener estadísticas generales' }
    });
  }
});

// ========== COMENTARIOS EN LECCIONES ==========

// GET /api/microcourses/lessons/:lessonId/comments - Obtener comentarios de una lección

/**
 * @swagger
 * /lessons/:lessonId/comments:
 *   get:
 *     tags: [Educación]
 *     summary: GET /lessons/:lessonId/comments
 *     description: Endpoint GET para /lessons/:lessonId/comments
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
router.get('/lessons/:lessonId/comments',
  validateParams(z.object({ lessonId: objectIdSchema })),
  validateQuery(paginationSchema.extend({
    timestamp: z.string().optional()
  })),
  getLessonComments
);

// POST /api/microcourses/lessons/:lessonId/comments - Crear comentario en lección

/**
 * @swagger
 * /lessons/:lessonId/comments:
 *   post:
 *     tags: [Educación]
 *     summary: POST /lessons/:lessonId/comments
 *     description: Endpoint POST para /lessons/:lessonId/comments
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
router.post('/lessons/:lessonId/comments',
  auth,
  validateParams(z.object({ lessonId: objectIdSchema })),
  validateBody(z.object({
    content: z.string().min(1, 'Contenido requerido').max(1000, 'Comentario muy largo'),
    timestamp: z.number().min(0).optional(),
    parentCommentId: objectIdSchema.optional()
  })),
  createLessonComment
);

// POST /api/microcourses/comments/:commentId/like - Dar like a comentario

/**
 * @swagger
 * /comments/:commentId/like:
 *   post:
 *     tags: [Educación]
 *     summary: POST /comments/:commentId/like
 *     description: Endpoint POST para /comments/:commentId/like
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
router.post('/comments/:commentId/like',
  auth,
  validateParams(z.object({ commentId: objectIdSchema })),
  likeComment
);

// PUT /api/microcourses/lessons/:lessonId/video-progress - Actualizar progreso de video

/**
 * @swagger
 * /lessons/:lessonId/video-progress:
 *   put:
 *     tags: [Educación]
 *     summary: PUT /lessons/:lessonId/video-progress
 *     description: Endpoint PUT para /lessons/:lessonId/video-progress
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
router.put('/lessons/:lessonId/video-progress',
  auth,
  validateParams(z.object({ lessonId: objectIdSchema })),
  validateBody(z.object({
    currentPosition: z.number().min(0),
    watchTime: z.number().min(0).optional(),
    isCompleted: z.boolean().optional()
  })),
  updateVideoProgress
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
