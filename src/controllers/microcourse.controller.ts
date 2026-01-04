import { Request, Response } from 'express';
import { sendError, sendOk, sendCreated } from '../utils/response';
import { 
  MicrocourseModel, 
  MicrocourseLessonModel,
  CourseEnrollmentModel,
  LessonProgressModel,
  LessonCommentModel
} from '../models/microcourse.model';
import { UserModel } from '../models/user.model';
import { checkDailyLimit, incrementUsage, FREE_USER_DAILY_LIMITS } from '../models/daily-usage.model';
import { PointsActions, PointsService } from '../services/points.service';
import { AuthenticatedRequest } from '../middleware/auth';
import mongoose from 'mongoose';

// Obtener catálogo de microcursos
export async function getMicrocourses(req: Request, res: Response) {
  try {
    const {
      category,
      difficulty,
      price = 'all', // 'free', 'paid', 'all'
      search,
      sort = 'popular', // 'popular', 'newest', 'rating', 'price_low', 'price_high'
      page = 1,
      limit = 12
    } = req.query as any;

    const skip = (page - 1) * limit;
    const query: any = { status: 'published' }; // se retiro isActive: true' para incluir cursos inactivos

    // Filtros
    if (category) query.category = category;
    if (difficulty) query.difficulty = difficulty;
    if (price === 'free') query.price = 0;
    if (price === 'paid') query.price = { $gt: 0 };

    // Búsqueda por texto
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { shortDescription: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } },
        { 'instructor.name': { $regex: search, $options: 'i' } }
      ];
    }

    // Ordenamiento
    let sortQuery: any = {};
    switch (sort) {
      case 'newest':
        sortQuery = { publishedAt: -1 };
        break;
      case 'rating':
        sortQuery = { 'rating.average': -1, 'rating.count': -1 };
        break;
      case 'price_low':
        sortQuery = { price: 1, 'rating.average': -1 };
        break;
      case 'price_high':
        sortQuery = { price: -1, 'rating.average': -1 };
        break;
      default: // popular
        sortQuery = { isFeatured: -1, enrollmentCount: -1, 'rating.average': -1 };
    }

    const [courses, total] = await Promise.all([
      MicrocourseModel
        .find(query)
        .sort(sortQuery)
        .skip(skip)
        .limit(parseInt(limit))
        .select('-metadata -createdBy')
        .lean(),
      MicrocourseModel.countDocuments(query)
    ]);

    // Calcular estadísticas adicionales
    const coursesWithStats = courses.map(course => ({
      ...course,
      completionRate: course.enrollmentCount > 0 
        ? Math.round((course.completionCount / course.enrollmentCount) * 100) 
        : 0,
      isPopular: course.enrollmentCount > 100 || course.rating.average > 4.5,
      estimatedHours: Math.ceil(course.duration / 60),
      isFeatured: course.isFeatured || false,
      isActive: course.isActive !== false, // Default a true si no está definido
      lessonsCount: course.lessonsCount || 0
    }));

    return sendOk(res, {
      courses: coursesWithStats,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      },
      filters: { category, difficulty, price, search, sort }
    });
  } catch (error) {
    console.error('Error in getMicrocourses:', error);
    return sendError(res, 'Error al obtener microcursos', 500, 'COURSES_GET_ERROR');
  }
}


// Obtener detalles de un microcurso
export async function getCourseDetails(req: Request, res: Response) {
  try {
    const { courseId } = req.params;
    const userId = (req as any).user?.id;

    const course = await MicrocourseModel.findOne({
      _id: courseId,
      status: 'published',
      isActive: true
    }).lean();

    if (!course) {
      return sendError(res, 'Curso no encontrado', 404, 'COURSE_NOT_FOUND');
    }

    // Obtener lecciones del curso
    const lessons = await MicrocourseLessonModel
      .find({ courseId, isActive: true })
      .sort({ order: 1 })
      .select('title description order videoDuration isPreview thumbnailUrl')
      .lean();

    // Verificar si el usuario está inscrito
    let enrollment = null;
    let userProgress = null;
    
    if (userId) {
      enrollment = await CourseEnrollmentModel.findOne({
        userId,
        courseId,
        status: { $in: ['active', 'completed'] }
      }).lean();

      if (enrollment) {
        // Obtener progreso detallado
        const lessonProgresses = await LessonProgressModel
          .find({ userId, courseId })
          .lean();

        userProgress = {
          completionPercentage: enrollment.progress.completionPercentage,
          completedLessons: enrollment.progress.completedLessons.length,
          totalLessons: lessons.length,
          currentLessonId: enrollment.progress.currentLessonId,
          totalWatchTime: enrollment.progress.totalWatchTime,
          lastAccessedAt: enrollment.lastAccessedAt,
          lessonProgresses: lessonProgresses.reduce((acc, progress) => {
            acc[progress.lessonId.toString()] = {
              watchedPercentage: progress.watchedPercentage,
              isCompleted: progress.isCompleted,
              quizScore: progress.quizScore
            };
            return acc;
          }, {} as any)
        };
      }
    }

    // Obtener cursos relacionados
    const relatedCourses = await MicrocourseModel
      .find({
        _id: { $ne: courseId },
        category: course.category,
        status: 'published',
        isActive: true
      })
      .sort({ 'rating.average': -1, enrollmentCount: -1 })
      .limit(4)
      .select('title thumbnailUrl price rating duration instructor.name')
      .lean();

    const courseDetails = {
      ...course,
      lessons: lessons.map(lesson => ({
        ...lesson,
        canAccess: !userId ? lesson.isPreview : (enrollment || lesson.isPreview)
      })),
      isEnrolled: !!enrollment,
      userProgress,
      relatedCourses,
      completionRate: course.enrollmentCount > 0 
        ? Math.round((course.completionCount / course.enrollmentCount) * 100) 
        : 0,
      estimatedHours: Math.ceil(course.duration / 60)
    };

    return sendOk(res, courseDetails);
  } catch (error) {
    console.error('Error in getCourseDetails:', error);
    return sendError(res, 'Error al obtener detalles del curso', 500, 'COURSE_DETAILS_ERROR');
  }
}

// Inscribirse en un microcurso
export async function enrollInCourse(req: AuthenticatedRequest, res: Response) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { courseId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return sendError(res, 'Usuario no autenticado', 401);
    }

    // Verificar si el usuario es Premium
    const user = await UserModel.findById(userId).select('hasMetroPremium metroPremiumExpiry');
    const isPremium = user?.hasMetroPremium && 
                     user?.metroPremiumExpiry && 
                     user.metroPremiumExpiry > new Date();

    // Verificar límites diarios para acceso a cursos
    const dailyLimit = await checkDailyLimit(
      userId, 
      'microcourse_access', 
      FREE_USER_DAILY_LIMITS.microcourse_access, 
      isPremium
    );

    if (!dailyLimit.canUse) {
      return sendError(res, 'Límite diario de cursos alcanzado', 429, 'DAILY_LIMIT_REACHED', {
        currentUsage: dailyLimit.currentUsage,
        limit: dailyLimit.limit,
        feature: 'microcourse_access',
        upgradeUrl: '/subscription'
      });
    }

    // Verificar que el curso existe
    const course = await MicrocourseModel.findOne({
      _id: courseId,
      status: 'published',
      isActive: true
    });

    if (!course) {
      return sendError(res, 'Curso no encontrado', 404, 'COURSE_NOT_FOUND');
    }

    // Verificar acceso Premium si el curso lo requiere
    if (course.isPremium && !isPremium) {
      return sendError(res, 'Este curso requiere Metro Premium', 403, 'PREMIUM_REQUIRED', {
        feature: 'premium_course',
        upgradeUrl: '/subscription'
      });
    }

    // Verificar si ya está inscrito
    const existingEnrollment = await CourseEnrollmentModel.findOne({
      userId,
      courseId,
      status: { $in: ['active', 'completed'] }
    });

    if (existingEnrollment) {
      return sendError(res, 'Ya estás inscrito en este curso', 400, 'ALREADY_ENROLLED');
    }

    // Verificar puntos suficientes si el curso no es gratis
    if (course.price > 0) {
      const user = await UserModel.findById(userId);
      if (!user || user.pointsSmart < course.price) {
        return sendError(res, 'Puntos insuficientes', 400, 'INSUFFICIENT_POINTS');
      }

      // Descontar puntos
      await PointsActions.spendOnMarketplace(userId, courseId, course.price);
    }

    // Crear inscripción
    const enrollment = await CourseEnrollmentModel.create([{
      userId,
      courseId,
      pointsSpent: course.price,
      progress: {
        completedLessons: [],
        completionPercentage: 0,
        totalWatchTime: 0
      }
    }], { session });

    // Actualizar contador de inscripciones del curso
    await MicrocourseModel.findByIdAndUpdate(
      courseId,
      { $inc: { enrollmentCount: 1 } },
      { session }
    );

    // Obtener primera lección para establecer como actual
    const firstLesson = await MicrocourseLessonModel
      .findOne({ courseId, isActive: true })
      .sort({ order: 1 });

    if (firstLesson) {
      enrollment[0].progress.currentLessonId = firstLesson._id as any;
      await enrollment[0].save({ session });
    }

    // Registrar uso de acceso a curso
    await incrementUsage(userId, 'microcourse_access', isPremium, { 
      courseId, 
      courseTitle: course.title,
      courseDifficulty: course.difficulty,
      coursePrice: course.price
    });

    await session.commitTransaction();

    return sendCreated(res, {
      enrollmentId: enrollment[0]._id,
      courseTitle: course.title,
      pointsSpent: course.price,
      message: course.price > 0 
        ? `Te inscribiste exitosamente gastando ${course.price} puntos`
        : 'Te inscribiste exitosamente en el curso gratuito'
    });
  } catch (error) {
    await session.abortTransaction();
    console.error('Error in enrollInCourse:', error);
    return sendError(res, 'Error al inscribirse en el curso', 500, 'ENROLLMENT_ERROR');
  } finally {
    session.endSession();
  }
}

// Obtener lección específica
export async function getLesson(req: Request, res: Response) {
  try {
    const { courseId, lessonId } = req.params;
    const userId = (req as any).user.id;

    // Verificar acceso al curso
    const [course, enrollment] = await Promise.all([
      MicrocourseModel.findOne({ _id: courseId, status: 'published', isActive: true }),
      CourseEnrollmentModel.findOne({
        userId,
        courseId,
        status: { $in: ['active', 'completed'] }
      })
    ]);

    if (!course) {
      return sendError(res, 'Curso no encontrado', 404, 'COURSE_NOT_FOUND');
    }

    // Obtener lección
    const lesson = await MicrocourseLessonModel.findOne({
      _id: lessonId,
      courseId,
      isActive: true
    }).lean();

    if (!lesson) {
      return sendError(res, 'Lección no encontrada', 404, 'LESSON_NOT_FOUND');
    }

    // Verificar acceso a la lección
    const hasAccess = enrollment || lesson.isPreview;
    if (!hasAccess) {
      return sendError(res, 'Debes inscribirte para acceder a esta lección', 403, 'ACCESS_DENIED');
    }

    // Obtener progreso de la lección
    let progress = null;
    if (userId && enrollment) {
      progress = await LessonProgressModel.findOne({
        userId,
        lessonId
      }).lean();
    }

    // Obtener lecciones adyacentes
    const [previousLesson, nextLesson] = await Promise.all([
      MicrocourseLessonModel.findOne({
        courseId,
        order: { $lt: lesson.order },
        isActive: true
      }).sort({ order: -1 }).select('_id title order'),
      MicrocourseLessonModel.findOne({
        courseId,
        order: { $gt: lesson.order },
        isActive: true
      }).sort({ order: 1 }).select('_id title order')
    ]);

    const lessonData = {
      ...lesson,
      progress: progress ? {
        watchedPercentage: progress.watchedPercentage,
        isCompleted: progress.isCompleted,
        quizScore: progress.quizScore,
        quizAttempts: progress.quizAttempts,
        lastWatchedAt: progress.lastWatchedAt
      } : null,
      navigation: {
        previous: previousLesson,
        next: nextLesson
      },
      courseInfo: {
        id: course._id,
        title: course.title,
        instructor: course.instructor.name
      }
    };

    return sendOk(res, lessonData);
  } catch (error) {
    console.error('Error in getLesson:', error);
    return sendError(res, 'Error al obtener la lección', 500, 'LESSON_GET_ERROR');
  }
}

// Actualizar progreso de lección
export async function updateLessonProgress(req: Request, res: Response) {
  try {
    const { courseId, lessonId } = req.params;
    const { watchTime, watchedPercentage, isCompleted = false, quizScore } = req.body;
    const userId = (req as any).user.id;

    // Verificar inscripción
    const enrollment = await CourseEnrollmentModel.findOne({
      userId,
      courseId,
      status: 'active'
    });

    if (!enrollment) {
      return sendError(res, 'No estás inscrito en este curso', 403, 'NOT_ENROLLED');
    }

    // Obtener o crear progreso de lección
    let progress = await LessonProgressModel.findOne({ userId, lessonId });
    
    if (!progress) {
      progress = new LessonProgressModel({
        userId,
        courseId,
        lessonId,
        watchTime: 0,
        watchedPercentage: 0,
        isCompleted: false,
        quizAttempts: 0
      });
    }

    // Actualizar progreso
    if (watchTime !== undefined && watchTime > progress.watchTime) {
      progress.watchTime = watchTime;
    }
    if (watchedPercentage !== undefined && watchedPercentage > progress.watchedPercentage) {
      progress.watchedPercentage = watchedPercentage;
    }
    if (isCompleted && !progress.isCompleted) {
      progress.isCompleted = true;
      progress.completedAt = new Date();
    }
    progress.lastWatchedAt = new Date();
    if (typeof quizScore === 'number') {
      const bounded = Math.max(0, Math.min(100, quizScore));
      // incrementar intentos si llega un quizScore
      progress.quizAttempts = (progress.quizAttempts || 0) + 1;
      // guardar mejor puntaje
      progress.quizScore = Math.max(progress.quizScore || 0, bounded);
      // si score >=70 marcar como completado
      if (bounded >= 70) {
        progress.isCompleted = true;
        progress.completedAt = progress.completedAt || new Date();
      }
    }

    await progress.save();

    // Actualizar progreso general del curso si la lección se completó
    if (isCompleted && !enrollment.progress.completedLessons.includes(lessonId as any)) {
      enrollment.progress.completedLessons.push(lessonId as any);
      
      // Calcular porcentaje de completación
      const totalLessons = await MicrocourseLessonModel.countDocuments({ courseId, isActive: true });
      enrollment.progress.completionPercentage = Math.round(
        (enrollment.progress.completedLessons.length / totalLessons) * 100
      );

      // Si completó el curso
      if (enrollment.progress.completionPercentage === 100) {
        enrollment.status = 'completed';
        enrollment.completedAt = new Date();
        
        // Actualizar contador de completaciones del curso
        await MicrocourseModel.findByIdAndUpdate(courseId, {
          $inc: { completionCount: 1 }
        });

        // Otorgar puntos por completar curso
        await PointsService.awardPoints(
          userId,
          'earned_promotion',
          50, // Puntos base por completar curso
          `Curso completado: ${(await MicrocourseModel.findById(courseId))?.title}`,
          { courseId, completedLessons: enrollment.progress.completedLessons.length }
        );
      }

      enrollment.lastAccessedAt = new Date();
      await enrollment.save();
    }

    return sendOk(res, {
      lessonProgress: {
        watchedPercentage: progress.watchedPercentage,
        isCompleted: progress.isCompleted,
        completedAt: progress.completedAt
      },
      courseProgress: {
        completionPercentage: enrollment.progress.completionPercentage,
        completedLessons: enrollment.progress.completedLessons.length,
        isCompleted: enrollment.status === 'completed'
      }
    });
  } catch (error) {
    console.error('Error in updateLessonProgress:', error);
    return sendError(res, 'Error al actualizar progreso', 500, 'PROGRESS_UPDATE_ERROR');
  }
}

// Obtener cursos del usuario
export async function getUserCourses(req: Request, res: Response) {
  try {
    const userId = (req as any).user.id;
    const { status = 'all', page = 1, limit = 10 } = req.query as any;

    const skip = (page - 1) * limit;
    const query: any = { userId };

    if (status !== 'all') {
      query.status = status;
    }

    const [enrollments, total] = await Promise.all([
      CourseEnrollmentModel
        .find(query)
        .populate('courseId', 'title thumbnailUrl category difficulty duration instructor rating')
        .sort({ enrolledAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      CourseEnrollmentModel.countDocuments(query)
    ]);

    const coursesWithProgress = enrollments.map(enrollment => ({
      enrollment: {
        id: enrollment._id,
        status: enrollment.status,
        enrolledAt: enrollment.enrolledAt,
        completedAt: enrollment.completedAt,
        lastAccessedAt: enrollment.lastAccessedAt,
        pointsSpent: enrollment.pointsSpent
      },
      course: enrollment.courseId,
      progress: enrollment.progress,
      canRate: enrollment.status === 'completed' && !enrollment.rating
    }));

    return sendOk(res, {
      courses: coursesWithProgress,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      },
      stats: {
        total,
        active: enrollments.filter(e => e.status === 'active').length,
        completed: enrollments.filter(e => e.status === 'completed').length
      }
    });
  } catch (error) {
    console.error('Error in getUserCourses:', error);
    return sendError(res, 'Error al obtener cursos del usuario', 500, 'USER_COURSES_ERROR');
  }
}

// Obtener categorías de cursos con estadísticas
export async function getCourseCategories(req: Request, res: Response) {
  try {
    const categories = await MicrocourseModel.aggregate([
      {
        $match: { status: 'published', isActive: true }
      },
      {
        $group: {
          _id: '$category',
          courseCount: { $sum: 1 },
          totalEnrollments: { $sum: '$enrollmentCount' },
          averageRating: { $avg: '$rating.average' },
          averagePrice: { $avg: '$price' },
          freeCourses: { $sum: { $cond: [{ $eq: ['$price', 0] }, 1, 0] } }
        }
      },
      {
        $sort: { courseCount: -1 }
      }
    ]);

    const enrichedCategories = categories.map(cat => ({
      name: cat._id,
      courseCount: cat.courseCount,
      totalEnrollments: cat.totalEnrollments,
      averageRating: Math.round(cat.averageRating * 10) / 10,
      averagePrice: Math.round(cat.averagePrice),
      freeCourses: cat.freeCourses,
      paidCourses: cat.courseCount - cat.freeCourses
    }));

    return sendOk(res, {
      categories: enrichedCategories,
      totalCourses: categories.reduce((sum, cat) => sum + cat.courseCount, 0),
      totalEnrollments: categories.reduce((sum, cat) => sum + cat.totalEnrollments, 0)
    });
  } catch (error) {
    console.error('Error in getCourseCategories:', error);
    return sendError(res, 'Error al obtener categorías', 500, 'CATEGORIES_ERROR');
  }
}

// ========== COMENTARIOS EN LECCIONES ==========

// Obtener comentarios de una lección
export async function getLessonComments(req: Request, res: Response) {
  try {
    const { lessonId } = req.params;
    const { page = 1, limit = 20, timestamp } = req.query as any;

    const skip = (page - 1) * limit;
    const query: any = { lessonId };

    // Filtrar por timestamp si se proporciona (comentarios cerca de un momento específico del video)
    if (timestamp) {
      const timestampNum = parseInt(timestamp);
      query.timestamp = {
        $gte: Math.max(0, timestampNum - 30), // 30 segundos antes
        $lte: timestampNum + 30 // 30 segundos después
      };
    }

    const [comments, total] = await Promise.all([
      LessonCommentModel
        .find({ ...query, parentCommentId: { $exists: false } }) // Solo comentarios principales
        .populate('userId', 'displayName avatarUrl')
        .sort({ isPinned: -1, timestamp: 1, createdAt: 1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      LessonCommentModel.countDocuments(query)
    ]);

    // Obtener respuestas para cada comentario
    const commentsWithReplies = await Promise.all(
      comments.map(async (comment) => {
        const replies = await LessonCommentModel
          .find({ parentCommentId: comment._id })
          .populate('userId', 'displayName avatarUrl')
          .sort({ createdAt: 1 })
          .limit(5) // Máximo 5 respuestas por comentario
          .lean();

        return {
          ...comment,
          replies,
          repliesCount: await LessonCommentModel.countDocuments({ parentCommentId: comment._id })
        };
      })
    );

    return sendOk(res, {
      comments: commentsWithReplies,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error in getLessonComments:', error);
    return sendError(res, 'Error al obtener comentarios', 500, 'COMMENTS_GET_ERROR');
  }
}

// Crear comentario en lección
export async function createLessonComment(req: Request, res: Response) {
  try {
    const userId = (req as any).user.id;
    const { lessonId } = req.params;
    const { content, timestamp, parentCommentId } = req.body;

    // Verificar que el usuario esté inscrito en el curso
    const lesson = await MicrocourseLessonModel.findById(lessonId);
    if (!lesson) {
      return sendError(res, 'Lección no encontrada', 404, 'LESSON_NOT_FOUND');
    }

    const enrollment = await CourseEnrollmentModel.findOne({
      userId,
      courseId: lesson.courseId,
      status: { $in: ['active', 'completed'] }
    });

    if (!enrollment) {
      return sendError(res, 'No estás inscrito en este curso', 403, 'NOT_ENROLLED');
    }

    // Crear comentario
    const comment = new LessonCommentModel({
      lessonId,
      courseId: lesson.courseId,
      userId,
      content: content.trim(),
      timestamp: timestamp || 0,
      parentCommentId
    });

    await comment.save();

    // Poblar datos del usuario
    await comment.populate('userId', 'displayName avatarUrl');

    return sendCreated(res, {
      message: 'Comentario creado exitosamente',
      comment
    });

  } catch (error) {
    console.error('Error in createLessonComment:', error);
    return sendError(res, 'Error al crear comentario', 500, 'COMMENT_CREATE_ERROR');
  }
}

// Dar like a un comentario
export async function likeComment(req: Request, res: Response) {
  try {
    const userId = (req as any).user.id;
    const { commentId } = req.params;

    const comment = await LessonCommentModel.findById(commentId);
    if (!comment) {
      return sendError(res, 'Comentario no encontrado', 404, 'COMMENT_NOT_FOUND');
    }

    // Incrementar likes
    await LessonCommentModel.findByIdAndUpdate(commentId, {
      $inc: { likes: 1 }
    });

    return sendOk(res, {
      message: 'Like agregado',
      newLikesCount: comment.likes + 1
    });

  } catch (error) {
    console.error('Error in likeComment:', error);
    return sendError(res, 'Error al dar like', 500, 'COMMENT_LIKE_ERROR');
  }
}

// Actualizar progreso de video con posición
export async function updateVideoProgress(req: Request, res: Response) {
  try {
    const userId = (req as any).user.id;
    const { lessonId } = req.params;
    const { currentPosition, watchTime, isCompleted } = req.body;

    // Verificar inscripción
    const lesson = await MicrocourseLessonModel.findById(lessonId);
    if (!lesson) {
      return sendError(res, 'Lección no encontrada', 404, 'LESSON_NOT_FOUND');
    }

    const enrollment = await CourseEnrollmentModel.findOne({
      userId,
      courseId: lesson.courseId,
      status: 'active'
    });

    if (!enrollment) {
      return sendError(res, 'No estás inscrito en este curso', 403, 'NOT_ENROLLED');
    }

    // Actualizar o crear progreso de lección
    let progress = await LessonProgressModel.findOne({
      enrollmentId: enrollment._id,
      lessonId,
      userId
    });

    if (!progress) {
      progress = new LessonProgressModel({
        enrollmentId: enrollment._id,
        lessonId,
        userId,
        watchTime: 0,
        lastPosition: 0,
        isCompleted: false,
        watchSessions: [],
        quiz: {
          attempts: 0,
          bestScore: 0,
          lastScore: 0,
          isPassed: false
        },
        notes: '',
        bookmarks: []
      });
    }

    // Actualizar progreso
    progress.lastPosition = currentPosition || 0;
    progress.watchTime = Math.max(progress.watchTime, watchTime || 0);
    
    if (isCompleted && !progress.isCompleted) {
      progress.isCompleted = true;
      progress.completedAt = new Date();
      
      // Actualizar progreso del curso
      if (!enrollment.progress.completedLessons.includes(lessonId.toString())) {
        enrollment.progress.completedLessons.push(lessonId.toString());
        
        // Calcular porcentaje de completitud
        const totalLessons = await MicrocourseLessonModel.countDocuments({
          courseId: lesson.courseId,
          isActive: true
        });
        
        enrollment.progress.completionPercentage = Math.round(
          (enrollment.progress.completedLessons.length / totalLessons) * 100
        );
        
        // Marcar curso como completado si terminó todas las lecciones
        if (enrollment.progress.completionPercentage >= 100) {
          enrollment.status = 'completed';
          enrollment.completedAt = new Date();
        }
        
        await enrollment.save();
      }
    }

    await progress.save();

    return sendOk(res, {
      message: 'Progreso actualizado',
      progress: {
        lessonId,
        currentPosition: progress.lastPosition,
        watchTime: progress.watchTime,
        isCompleted: progress.isCompleted,
        courseCompletionPercentage: enrollment.progress.completionPercentage
      }
    });

  } catch (error) {
    console.error('Error in updateVideoProgress:', error);
    return sendError(res, 'Error al actualizar progreso', 500, 'PROGRESS_UPDATE_ERROR');
  }
}

// Emitir certificado de curso completado
export async function issueCertificate(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user?.id;
    const { courseId } = req.params;

    if (!userId) {
      return sendError(res, 'Usuario no autenticado', 401);
    }

    // Verificar si el usuario es Premium
    const user = await UserModel.findById(userId).select('hasMetroPremium metroPremiumExpiry fullName displayName');
    const isPremium = user?.hasMetroPremium && 
                     user?.metroPremiumExpiry && 
                     user.metroPremiumExpiry > new Date();

    // Verificar límites para descarga de certificados (solo Premium)
    if (!isPremium) {
      return sendError(res, 'La descarga de certificados requiere Metro Premium', 403, 'PREMIUM_REQUIRED', {
        feature: 'certificate_download',
        upgradeUrl: '/subscription'
      });
    }

    const [enrollment, course] = await Promise.all([
      CourseEnrollmentModel.findOne({ userId, courseId }),
      MicrocourseModel.findById(courseId).select('title instructor')
    ]);

    if (!course) {
      return sendError(res, 'Curso no encontrado', 404, 'COURSE_NOT_FOUND');
    }
    if (!enrollment) {
      return sendError(res, 'No estás inscrito en este curso', 403, 'NOT_ENROLLED');
    }
    if (enrollment.status !== 'completed') {
      return sendError(res, 'Debes completar el curso para obtener el certificado', 400, 'COURSE_NOT_COMPLETED');
    }

    if (!enrollment.certificateIssued) {
      enrollment.certificateIssued = true;
      enrollment.certificateUrl = `/api/microcourses/certificates/${enrollment._id}`;
      await enrollment.save();
    }

    // Registrar uso de descarga de certificado
    await incrementUsage(userId, 'certificate_download', isPremium, { 
      courseId, 
      courseTitle: (course as any).title,
      certificateUrl: enrollment.certificateUrl
    });

    const certificate = {
      id: enrollment._id,
      user: {
        name: user?.fullName || user?.displayName || 'Alumno',
      },
      course: {
        id: courseId,
        title: (course as any).title,
        instructor: (course as any).instructor?.name || 'Instructor'
      },
      completedAt: enrollment.completedAt,
      issuedAt: new Date(),
      certificateUrl: enrollment.certificateUrl
    };

    return sendOk(res, { message: 'Certificado emitido', certificate });
  } catch (error) {
    console.error('Error in issueCertificate:', error);
    return sendError(res, 'Error al emitir certificado', 500, 'CERTIFICATE_ISSUE_ERROR');
  }
}

// Obtener certificado por enrollmentId
export async function getCertificate(req: Request, res: Response) {
  try {
    const userId = (req as any).user.id;
    const { enrollmentId } = req.params;

    const enrollment = await CourseEnrollmentModel.findById(enrollmentId);
    if (!enrollment) {
      return sendError(res, 'Inscripción no encontrada', 404, 'ENROLLMENT_NOT_FOUND');
    }
    if (enrollment.userId.toString() !== userId) {
      return sendError(res, 'No autorizado', 403, 'NOT_AUTHORIZED');
    }
    if (!enrollment.certificateIssued) {
      return sendError(res, 'Certificado no emitido', 400, 'CERTIFICATE_NOT_ISSUED');
    }

    const course = await MicrocourseModel.findById(enrollment.courseId).select('title instructor');
    const user = await UserModel.findById(userId).select('fullName displayName');

    const certificate = {
      id: enrollment._id,
      user: {
        name: user?.fullName || user?.displayName || 'Alumno',
      },
      course: {
        id: enrollment.courseId,
        title: (course as any)?.title || 'Curso',
        instructor: (course as any)?.instructor?.name || 'Instructor'
      },
      completedAt: enrollment.completedAt,
      issuedAt: enrollment.completedAt || new Date(),
      certificateUrl: enrollment.certificateUrl
    };

    return sendOk(res, { certificate });
  } catch (error) {
    console.error('Error in getCertificate:', error);
    return sendError(res, 'Error al obtener certificado', 500, 'CERTIFICATE_GET_ERROR');
  }
}

// Calificar curso completado
export async function rateCourse(req: Request, res: Response) {
  try {
    const userId = (req as any).user.id;
    const { courseId } = req.params;
    const { stars, comment } = req.body as { stars: number; comment?: string };

    if (stars < 1 || stars > 5) {
      return sendError(res, 'Calificación inválida', 400, 'INVALID_RATING');
    }

    const [enrollment, course] = await Promise.all([
      CourseEnrollmentModel.findOne({ userId, courseId }),
      MicrocourseModel.findById(courseId)
    ]);

    if (!course) {
      return sendError(res, 'Curso no encontrado', 404, 'COURSE_NOT_FOUND');
    }
    if (!enrollment) {
      return sendError(res, 'No estás inscrito en este curso', 403, 'NOT_ENROLLED');
    }
    if (enrollment.status !== 'completed') {
      return sendError(res, 'Solo puedes calificar cursos completados', 400, 'COURSE_NOT_COMPLETED');
    }

    const wasRated = !!enrollment.rating;
    const previousStars = enrollment.rating?.stars || 0;

    enrollment.rating = { stars, comment, ratedAt: new Date() } as any;
    await enrollment.save();

    // Actualizar rating del curso
    const currentAvg = course.rating?.average || 0;
    const currentCount = course.rating?.count || 0;
    let newAvg = currentAvg;
    let newCount = currentCount;
    if (wasRated) {
      // Recalcular reemplazando la calificación anterior
      if (currentCount > 0) {
        const total = currentAvg * currentCount - previousStars + stars;
        newAvg = Math.round((total / currentCount) * 10) / 10;
      } else {
        newAvg = stars;
        newCount = 1;
      }
    } else {
      const total = currentAvg * currentCount + stars;
      newCount = currentCount + 1;
      newAvg = Math.round((total / newCount) * 10) / 10;
    }

    await MicrocourseModel.findByIdAndUpdate(courseId, {
      $set: { 'rating.average': newAvg },
      $setOnInsert: {},
      $inc: { 'rating.count': wasRated ? 0 : 1 }
    });

    return sendOk(res, { message: 'Calificación guardada', rating: { stars, comment }, courseRating: { average: newAvg, count: wasRated ? currentCount : currentCount + 1 } });
  } catch (error) {
    console.error('Error in rateCourse:', error);
    return sendError(res, 'Error al calificar curso', 500, 'COURSE_RATE_ERROR');
  }
}
