import { Router } from 'express';
import { MicrocoursesAdminController } from '../../controllers/admin/microcourses.admin.controller';

const router = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Microcourse:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: objectId
 *           example: "507f1f77bcf86cd799439011"
 *         title:
 *           type: string
 *           example: "Introducción a React"
 *         description:
 *           type: string
 *           example: "Aprende los fundamentos de React desde cero"
 *         instructor:
 *           type: string
 *           example: "Juan Pérez"
 *         duration:
 *           type: integer
 *           example: 120
 *         price:
 *           type: number
 *           example: 99.99
 *         thumbnail:
 *           type: string
 *           example: "https://example.com/thumbnail.jpg"
 *         videoUrl:
 *           type: string
 *           example: "https://example.com/video.mp4"
 *         category:
 *           type: string
 *           example: "programming"
 *         level:
 *           type: string
 *           enum: [beginner, intermediate, advanced]
 *           example: "beginner"
 *         isActive:
 *           type: boolean
 *           example: true
 *         enrollments:
 *           type: integer
 *           example: 150
 *         rating:
 *           type: number
 *           example: 4.5
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     CreateMicrocourseRequest:
 *       type: object
 *       required:
 *         - title
 *         - description
 *         - instructor
 *         - duration
 *         - price
 *         - category
 *         - level
 *       properties:
 *         title:
 *           type: string
 *           example: "Introducción a React"
 *         description:
 *           type: string
 *           example: "Aprende los fundamentos de React desde cero"
 *         instructor:
 *           type: string
 *           example: "Juan Pérez"
 *         duration:
 *           type: integer
 *           example: 120
 *         price:
 *           type: number
 *           example: 99.99
 *         thumbnail:
 *           type: string
 *           example: "https://example.com/thumbnail.jpg"
 *         videoUrl:
 *           type: string
 *           example: "https://example.com/video.mp4"
 *         category:
 *           type: string
 *           example: "programming"
 *         level:
 *           type: string
 *           enum: [beginner, intermediate, advanced]
 *           example: "beginner"
 *     UpdateMicrocourseRequest:
 *       type: object
 *       properties:
 *         title:
 *           type: string
 *           example: "Introducción a React - Actualizado"
 *         description:
 *           type: string
 *           example: "Aprende los fundamentos de React desde cero con las últimas versiones"
 *         instructor:
 *           type: string
 *           example: "Juan Pérez"
 *         duration:
 *           type: integer
 *           example: 150
 *         price:
 *           type: number
 *           example: 129.99
 *         thumbnail:
 *           type: string
 *           example: "https://example.com/thumbnail.jpg"
 *         videoUrl:
 *           type: string
 *           example: "https://example.com/video.mp4"
 *         category:
 *           type: string
 *           example: "programming"
 *         level:
 *           type: string
 *           enum: [beginner, intermediate, advanced]
 *           example: "intermediate"
 *         isActive:
 *           type: boolean
 *           example: true
 *     CourseEnrollment:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: objectId
 *           example: "507f1f77bcf86cd799439011"
 *         courseId:
 *           type: string
 *           format: objectId
 *           example: "507f1f77bcf86cd799439012"
 *         userId:
 *           type: string
 *           format: objectId
 *           example: "507f1f77bcf86cd799439013"
 *         user:
 *           type: object
 *           properties:
 *             name:
 *               type: string
 *               example: "María García"
 *             email:
 *               type: string
 *               example: "maria@example.com"
 *         progress:
 *           type: number
 *           example: 75.5
 *         completed:
 *           type: boolean
 *           example: false
 *         enrolledAt:
 *           type: string
 *           format: date-time
 *         completedAt:
 *           type: string
 *           format: date-time
 *     MicrocourseStats:
 *       type: object
 *       properties:
 *         totalCourses:
 *           type: integer
 *           example: 25
 *         activeCourses:
 *           type: integer
 *           example: 20
 *         totalEnrollments:
 *           type: integer
 *           example: 1250
 *         totalRevenue:
 *           type: number
 *           example: 125000.50
 *         averageRating:
 *           type: number
 *           example: 4.3
 *         coursesByLevel:
 *           type: object
 *           properties:
 *             beginner:
 *               type: integer
 *               example: 10
 *             intermediate:
 *               type: integer
 *               example: 8
 *             advanced:
 *               type: integer
 *               example: 7
 */

/**
 * @swagger
 * /api/admin/microcourses:
 *   get:
 *     tags: [Admin - Educación]
 *     summary: Listar microcursos
 *     description: Obtiene una lista paginada de todos los microcursos
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Número de página
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Cantidad de cursos por página
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filtrar por categoría
 *       - in: query
 *         name: level
 *         schema:
 *           type: string
 *           enum: [beginner, intermediate, advanced]
 *         description: Filtrar por nivel
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: string
 *           enum: [true, false]
 *         description: Filtrar por estado activo
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Buscar por título o descripción
 *     responses:
 *       200:
 *         description: Lista de microcursos obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       401:
 *         description: No autorizado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Sin permisos de administrador
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/', MicrocoursesAdminController.listCourses);

/**
 * @swagger
 * /api/admin/microcourses:
 *   post:
 *     tags: [Admin - Educación]
 *     summary: Crear nuevo microcurso
 *     description: Crea un nuevo microcurso en el sistema
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateMicrocourseRequest'
 *     responses:
 *       201:
 *         description: Microcurso creado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Microcourse'
 *       400:
 *         description: Error en los datos proporcionados
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
 *       403:
 *         description: Sin permisos de administrador
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/', MicrocoursesAdminController.createCourse);

/**
 * @swagger
 * /api/admin/microcourses/{courseId}:
 *   get:
 *     tags: [Admin - Educación]
 *     summary: Obtener detalles de microcurso
 *     description: Obtiene los detalles completos de un microcurso para edición
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *           format: objectId
 *         description: ID del microcurso
 *     responses:
 *       200:
 *         description: Detalles del microcurso obtenidos exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Microcourse'
 *       401:
 *         description: No autorizado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Sin permisos de administrador
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Microcurso no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/:courseId', MicrocoursesAdminController.getCourseDetails);

/**
 * @swagger
 * /api/admin/microcourses/{courseId}:
 *   put:
 *     tags: [Admin - Educación]
 *     summary: Actualizar microcurso
 *     description: Actualiza un microcurso existente
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *           format: objectId
 *         description: ID del microcurso
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateMicrocourseRequest'
 *     responses:
 *       200:
 *         description: Microcurso actualizado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Microcourse'
 *       400:
 *         description: Error en los datos proporcionados
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
 *       403:
 *         description: Sin permisos de administrador
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Microcurso no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.put('/:courseId', MicrocoursesAdminController.updateCourse);

/**
 * @swagger
 * /api/admin/microcourses/{courseId}:
 *   delete:
 *     tags: [Admin - Educación]
 *     summary: Eliminar microcurso
 *     description: Elimina un microcurso del sistema
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *           format: objectId
 *         description: ID del microcurso
 *     responses:
 *       200:
 *         description: Microcurso eliminado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       401:
 *         description: No autorizado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Sin permisos de administrador
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Microcurso no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.delete('/:courseId', MicrocoursesAdminController.deleteCourse);

/**
 * @swagger
 * /api/admin/microcourses/stats/overview:
 *   get:
 *     tags: [Admin - Educación]
 *     summary: Obtener estadísticas de microcursos
 *     description: Obtiene estadísticas generales de microcursos y inscripciones
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Estadísticas obtenidas exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/MicrocourseStats'
 *       401:
 *         description: No autorizado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Sin permisos de administrador
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/stats/overview', MicrocoursesAdminController.getStats);

/**
 * @swagger
 * /api/admin/microcourses/{courseId}/enrollments:
 *   get:
 *     tags: [Admin - Educación]
 *     summary: Obtener inscripciones de un curso
 *     description: Obtiene una lista paginada de las inscripciones de un microcurso específico
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *           format: objectId
 *         description: ID del microcurso
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Número de página
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Cantidad de inscripciones por página
 *       - in: query
 *         name: completed
 *         schema:
 *           type: string
 *           enum: [true, false]
 *         description: Filtrar por estado de completado
 *     responses:
 *       200:
 *         description: Lista de inscripciones obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       401:
 *         description: No autorizado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Sin permisos de administrador
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Microcurso no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/:courseId/enrollments', MicrocoursesAdminController.getCourseEnrollments);

export default router;
