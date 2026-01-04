import { Router } from 'express';
import { auth, requireRole } from '../../middleware/auth';
import * as Ctrl from '../../controllers/admin/jobs.admin.controller';
import { validateBody, validateQuery } from '../../utils/validation';
import { z } from 'zod';

const router = Router();
router.use(auth, requireRole(['admin']));

/**
 * @swagger
 * components:
 *   schemas:
 *     Job:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: objectId
 *           example: "507f1f77bcf86cd799439011"
 *         title:
 *           type: string
 *           example: "Desarrollador Frontend"
 *         description:
 *           type: string
 *           example: "Desarrollar interfaces de usuario modernas"
 *         company:
 *           type: string
 *           example: "TeleMetro PE"
 *         location:
 *           type: string
 *           example: "Lima, Perú"
 *         salary:
 *           type: string
 *           example: "S/ 3000 - S/ 5000"
 *         type:
 *           type: string
 *           enum: [full-time, part-time, contract, internship]
 *           example: "full-time"
 *         requirements:
 *           type: array
 *           items:
 *             type: string
 *           example: ["React", "TypeScript", "2+ años experiencia"]
 *         benefits:
 *           type: array
 *           items:
 *             type: string
 *           example: ["Seguro médico", "Bonos", "Trabajo remoto"]
 *         isActive:
 *           type: boolean
 *           example: true
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     CreateJobRequest:
 *       type: object
 *       required:
 *         - title
 *         - description
 *         - company
 *         - location
 *         - salary
 *         - type
 *       properties:
 *         title:
 *           type: string
 *           example: "Desarrollador Frontend"
 *         description:
 *           type: string
 *           example: "Desarrollar interfaces de usuario modernas"
 *         company:
 *           type: string
 *           example: "TeleMetro PE"
 *         location:
 *           type: string
 *           example: "Lima, Perú"
 *         salary:
 *           type: string
 *           example: "S/ 3000 - S/ 5000"
 *         type:
 *           type: string
 *           enum: [full-time, part-time, contract, internship]
 *           example: "full-time"
 *         requirements:
 *           type: array
 *           items:
 *             type: string
 *           example: ["React", "TypeScript", "2+ años experiencia"]
 *         benefits:
 *           type: array
 *           items:
 *             type: string
 *           example: ["Seguro médico", "Bonos", "Trabajo remoto"]
 *     UpdateJobRequest:
 *       type: object
 *       properties:
 *         title:
 *           type: string
 *           example: "Desarrollador Frontend Senior"
 *         description:
 *           type: string
 *           example: "Desarrollar interfaces de usuario modernas y liderar equipo"
 *         company:
 *           type: string
 *           example: "TeleMetro PE"
 *         location:
 *           type: string
 *           example: "Lima, Perú"
 *         salary:
 *           type: string
 *           example: "S/ 4000 - S/ 6000"
 *         type:
 *           type: string
 *           enum: [full-time, part-time, contract, internship]
 *           example: "full-time"
 *         requirements:
 *           type: array
 *           items:
 *             type: string
 *           example: ["React", "TypeScript", "5+ años experiencia"]
 *         benefits:
 *           type: array
 *           items:
 *             type: string
 *           example: ["Seguro médico", "Bonos", "Trabajo remoto"]
 *         isActive:
 *           type: boolean
 *           example: true
 *     JobApplication:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: objectId
 *           example: "507f1f77bcf86cd799439011"
 *         jobId:
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
 *               example: "Juan Pérez"
 *             email:
 *               type: string
 *               example: "juan@example.com"
 *             phone:
 *               type: string
 *               example: "+51987654321"
 *         resume:
 *           type: string
 *           example: "https://example.com/resume.pdf"
 *         coverLetter:
 *           type: string
 *           example: "Estoy interesado en esta posición..."
 *         status:
 *           type: string
 *           enum: [pending, reviewed, shortlisted, rejected, hired]
 *           example: "pending"
 *         appliedAt:
 *           type: string
 *           format: date-time
 *     JobStats:
 *       type: object
 *       properties:
 *         totalJobs:
 *           type: integer
 *           example: 25
 *         activeJobs:
 *           type: integer
 *           example: 18
 *         totalApplications:
 *           type: integer
 *           example: 150
 *         pendingApplications:
 *           type: integer
 *           example: 45
 *         jobsByType:
 *           type: object
 *           properties:
 *             fullTime:
 *               type: integer
 *               example: 12
 *             partTime:
 *               type: integer
 *               example: 5
 *             contract:
 *               type: integer
 *               example: 6
 *             internship:
 *               type: integer
 *               example: 2
 */

/**
 * @swagger
 * /api/admin/jobs:
 *   get:
 *     tags: [Admin - Empleos]
 *     summary: Listar trabajos
 *     description: Obtiene una lista paginada de todos los trabajos publicados
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
 *         description: Cantidad de trabajos por página
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [full-time, part-time, contract, internship]
 *         description: Filtrar por tipo de trabajo
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
 *         description: Lista de trabajos obtenida exitosamente
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
router.get('/', Ctrl.listJobs);

/**
 * @swagger
 * /api/admin/jobs:
 *   post:
 *     tags: [Admin - Empleos]
 *     summary: Crear nuevo trabajo
 *     description: Crea un nuevo trabajo en el sistema
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateJobRequest'
 *     responses:
 *       201:
 *         description: Trabajo creado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Job'
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
router.post('/', Ctrl.createJob);

/**
 * @swagger
 * /api/admin/jobs/{id}:
 *   put:
 *     tags: [Admin - Empleos]
 *     summary: Actualizar trabajo
 *     description: Actualiza un trabajo existente
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: objectId
 *         description: ID del trabajo
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateJobRequest'
 *     responses:
 *       200:
 *         description: Trabajo actualizado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Job'
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
 *         description: Trabajo no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.put('/:id', Ctrl.updateJob);

/**
 * @swagger
 * /api/admin/jobs/{id}:
 *   delete:
 *     tags: [Admin - Empleos]
 *     summary: Eliminar trabajo
 *     description: Elimina un trabajo del sistema
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: objectId
 *         description: ID del trabajo
 *     responses:
 *       200:
 *         description: Trabajo eliminado exitosamente
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
 *         description: Trabajo no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.delete('/:id', Ctrl.deleteJob);

/**
 * @swagger
 * /api/admin/jobs/stats:
 *   get:
 *     tags: [Admin - Empleos]
 *     summary: Obtener estadísticas de trabajos
 *     description: Obtiene estadísticas generales de trabajos y aplicaciones
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
 *                       $ref: '#/components/schemas/JobStats'
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
router.get('/stats', Ctrl.getJobStats);

/**
 * @swagger
 * /api/admin/jobs/applications:
 *   get:
 *     tags: [Admin - Empleos]
 *     summary: Listar aplicaciones de trabajo
 *     description: Obtiene una lista paginada de todas las aplicaciones de trabajo
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
 *         description: Cantidad de aplicaciones por página
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, reviewed, shortlisted, rejected, hired]
 *         description: Filtrar por estado de aplicación
 *       - in: query
 *         name: jobId
 *         schema:
 *           type: string
 *           format: objectId
 *         description: Filtrar por trabajo específico
 *     responses:
 *       200:
 *         description: Lista de aplicaciones obtenida exitosamente
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
router.get('/applications', Ctrl.listApplications);

export default router;


