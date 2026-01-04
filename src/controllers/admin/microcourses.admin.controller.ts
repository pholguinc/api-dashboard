import { Request, Response } from 'express';
import { sendOk, sendError, sendCreated, sendNoContent } from '../../utils/response';
import mongoose from 'mongoose';

export class MicrocoursesAdminController {

  // Listar todos los microcursos para admin
  static async listCourses(req: Request, res: Response) {
    try {
      const { MicrocourseModel } = await import('../../models/microcourse.model');
      
      const { 
        page = 1, 
        limit = 20, 
        search, 
        category, 
        status, 
        difficulty 
      } = req.query;

      const filters: any = {};
      
      if (search) {
        filters.$or = [
          { title: new RegExp(search as string, 'i') },
          { description: new RegExp(search as string, 'i') },
          { instructor: new RegExp(search as string, 'i') }
        ];
      }
      
      if (category && category !== 'all') filters.category = category;
      if (status && status !== 'all') filters.status = status;
      if (difficulty && difficulty !== 'all') filters.difficulty = difficulty;

      const skip = (Number(page) - 1) * Number(limit);
      
      const [courses, total] = await Promise.all([
        MicrocourseModel.find(filters)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(Number(limit))
          .lean(),
        MicrocourseModel.countDocuments(filters)
      ]);

      const mappedCourses = courses.map((course: any) => ({
        id: course._id,
        title: course.title,
        description: course.description,
        shortDescription: course.shortDescription,
        category: course.category,
        difficulty: course.difficulty,
        price: course.price,
        duration: course.duration,
        instructor: course.instructor,
        thumbnailUrl: course.thumbnailUrl,
        status: course.status,
        isActive: course.isActive,
        isFeatured: course.isFeatured,
        enrollmentCount: course.enrollmentCount || 0,
        completionCount: course.completionCount || 0,
        rating: course.rating || { average: 0, count: 0 },
        lessons: course.lessons?.length || 0,
        createdAt: course.createdAt,
        updatedAt: course.updatedAt
      }));

      return sendOk(res, {
        courses: mappedCourses,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit))
        }
      });
    } catch (error) {
      console.error('Error listing courses:', error);
      return sendError(res, 'Error obteniendo cursos', 500);
    }
  }

  // Crear nuevo microcurso
  static async createCourse(req: Request, res: Response) {
    try {
      const { MicrocourseModel } = await import('../../models/microcourse.model');
      
      console.log('Creating course with data:', JSON.stringify(req.body, null, 2));
      
      const courseData = {
        ...req.body,
        status: req.body.status || 'draft',
        isActive: req.body.isActive !== false,
        isFeatured: req.body.isFeatured || false,
        enrollmentCount: 0,
        completionCount: 0,
        rating: { average: 0, count: 0 },
        lessonsCount: req.body.lessonsCount || req.body.lessons?.length || 0,
        thumbnailUrl: req.body.thumbnailUrl || '',
        createdBy: new mongoose.Types.ObjectId('68c63dcde7df080be8c6120e'), // Admin user ID
        lessons: req.body.lessons || []
      };

      console.log('Final course data:', JSON.stringify(courseData, null, 2));
      
      const course = await MicrocourseModel.create(courseData);
      
      console.log('Course created successfully:', course._id);
      
      return sendCreated(res, {
        id: course._id,
        ...courseData
      });
    } catch (error) {
      console.error('Error creating course:', error);
      console.error('Error details:', error.message);
      return sendError(res, 'Error creando curso: ' + error.message, 500);
    }
  }

  // Actualizar microcurso
  static async updateCourse(req: Request, res: Response) {
    try {
      const { MicrocourseModel } = await import('../../models/microcourse.model');
      const { courseId } = req.params;
      
      console.log('Updating course:', courseId, 'with data:', JSON.stringify(req.body, null, 2));
      
      const course = await MicrocourseModel.findByIdAndUpdate(
        courseId,
        req.body,
        { new: true, runValidators: true }
      );
      
      if (!course) {
        return sendError(res, 'Curso no encontrado', 404);
      }
      
      console.log('Course updated successfully:', course._id, 'isActive:', course.isActive);
      
      return sendOk(res, {
        id: course._id,
        ...course.toObject()
      });
    } catch (error) {
      console.error('Error updating course:', error);
      return sendError(res, 'Error actualizando curso: ' + error.message, 500);
    }
  }

  // Eliminar microcurso
  static async deleteCourse(req: Request, res: Response) {
    try {
      const { MicrocourseModel } = await import('../../models/microcourse.model');
      const { courseId } = req.params;
      
      const course = await MicrocourseModel.findByIdAndDelete(courseId);
      
      if (!course) {
        return sendError(res, 'Curso no encontrado', 404);
      }
      
      return sendNoContent(res);
    } catch (error) {
      console.error('Error deleting course:', error);
      return sendError(res, 'Error eliminando curso', 500);
    }
  }

  // Obtener detalles de curso para edición
  static async getCourseDetails(req: Request, res: Response) {
    try {
      const { MicrocourseModel } = await import('../../models/microcourse.model');
      const { courseId } = req.params;
      
      const course = await MicrocourseModel.findById(courseId).lean();
      
      if (!course) {
        return sendError(res, 'Curso no encontrado', 404);
      }
      
      return sendOk(res, {
        id: course._id,
        ...course
      });
    } catch (error) {
      console.error('Error getting course details:', error);
      return sendError(res, 'Error obteniendo detalles del curso', 500);
    }
  }

  // Obtener estadísticas de microcursos para admin
  static async getStats(req: Request, res: Response) {
    try {
      const { MicrocourseModel, CourseEnrollmentModel } = await import('../../models/microcourse.model');
      
      const [
        totalCourses,
        publishedCourses,
        draftCourses,
        totalEnrollments,
        activeEnrollments,
        completedEnrollments,
        topCourses,
        recentCourses
      ] = await Promise.all([
        MicrocourseModel.countDocuments(),
        MicrocourseModel.countDocuments({ status: 'published' }),
        MicrocourseModel.countDocuments({ status: 'draft' }),
        CourseEnrollmentModel.countDocuments(),
        CourseEnrollmentModel.countDocuments({ status: 'active' }),
        CourseEnrollmentModel.countDocuments({ status: 'completed' }),
        MicrocourseModel.find({ status: 'published' })
          .sort({ enrollmentCount: -1 })
          .limit(5)
          .select('title enrollmentCount rating')
          .lean(),
        MicrocourseModel.find()
          .sort({ createdAt: -1 })
          .limit(5)
          .select('title status createdAt')
          .lean()
      ]);

      return sendOk(res, {
        overview: {
          totalCourses,
          publishedCourses,
          draftCourses,
          totalEnrollments,
          activeEnrollments,
          completedEnrollments,
          completionRate: totalEnrollments > 0 
            ? Math.round((completedEnrollments / totalEnrollments) * 100)
            : 0
        },
        topCourses: topCourses.map((course: any) => ({
          id: course._id,
          title: course.title,
          enrollments: course.enrollmentCount || 0,
          rating: course.rating?.average || 0
        })),
        recentCourses: recentCourses.map((course: any) => ({
          id: course._id,
          title: course.title,
          status: course.status,
          createdAt: course.createdAt
        }))
      });
    } catch (error) {
      console.error('Error getting microcourses stats:', error);
      return sendError(res, 'Error obteniendo estadísticas', 500);
    }
  }

  // Obtener inscripciones de un curso
  static async getCourseEnrollments(req: Request, res: Response) {
    try {
      const { CourseEnrollmentModel } = await import('../../models/microcourse.model');
      const { courseId } = req.params;
      const { page = 1, limit = 20, status } = req.query;

      const filters: any = { courseId: new mongoose.Types.ObjectId(courseId) };
      if (status && status !== 'all') filters.status = status;

      const skip = (Number(page) - 1) * Number(limit);
      
      const [enrollments, total] = await Promise.all([
        CourseEnrollmentModel.find(filters)
          .populate('userId', 'displayName email phone')
          .sort({ enrolledAt: -1 })
          .skip(skip)
          .limit(Number(limit))
          .lean(),
        CourseEnrollmentModel.countDocuments(filters)
      ]);

      return sendOk(res, {
        enrollments,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit))
        }
      });
    } catch (error) {
      console.error('Error getting course enrollments:', error);
      return sendError(res, 'Error obteniendo inscripciones', 500);
    }
  }
}
