import { Router } from 'express';
import { JobsController, uploadCV } from '../controllers/jobs.controller';
import rateLimit from 'express-rate-limit';
import { authenticateJwt, requireRole } from '../middleware/auth';

const router = Router();

// Endpoint público para obtener trabajos (sin autenticación para testing)

/**
 * @swagger
 * /api/jobs/public:
 *   get:
 *     tags: [Empleos]
 *     summary: Obtener trabajos públicos
 *     description: Obtiene una lista de trabajos públicos (sin autenticación). Devuelve los últimos 20 trabajos activos con información completa.
 *     responses:
 *       200:
 *         description: Lista de trabajos obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     jobs:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                             format: objectId
 *                             example: "68c6fcf5012cfacb52e84eee"
 *                           title:
 *                             type: string
 *                             example: "Desarrollador Frontend Senior"
 *                           company:
 *                             type: string
 *                             example: "TeleMetro PE"
 *                           description:
 *                             type: string
 *                             example: "Desarrollar interfaces de usuario modernas y responsivas"
 *                           location:
 *                             type: string
 *                             example: "Lima, Perú"
 *                           workType:
 *                             type: string
 *                             enum: [Presencial, Remoto, Híbrido]
 *                             example: "Remoto"
 *                           salary:
 *                             type: string
 *                             example: "S/ 4000 - S/ 6000"
 *                           category:
 *                             type: string
 *                             enum: [Tecnología, Ventas, Administración, Servicios, Construcción, Gastronomía, Salud, Educación, Transporte]
 *                             example: "Tecnología"
 *                           requirements:
 *                             type: array
 *                             items:
 *                               type: string
 *                             example: ["React", "TypeScript", "5+ años experiencia"]
 *                           contactEmail:
 *                             type: string
 *                             format: email
 *                             example: "recursos.humanos@telemetro.pe"
 *                           companyLogo:
 *                             type: string
 *                             nullable: true
 *                             example: "/uploads/company-logos/logo-123456.webp"
 *                           isUrgent:
 *                             type: boolean
 *                             example: false
 *                           isActive:
 *                             type: boolean
 *                             example: true
 *                           applicantsCount:
 *                             type: integer
 *                             example: 15
 *                           viewsCount:
 *                             type: integer
 *                             example: 245
 *                           expiresAt:
 *                             type: string
 *                             format: date-time
 *                             example: "2024-02-15T23:59:59.000Z"
 *                           source:
 *                             type: string
 *                             enum: [internal, computrabajo, laborum, indeed, linkedin]
 *                             example: "internal"
 *                           externalId:
 *                             type: string
 *                             nullable: true
 *                             example: "ext_123456"
 *                           coordinates:
 *                             type: object
 *                             nullable: true
 *                             properties:
 *                               latitude:
 *                                 type: number
 *                                 example: -12.0464
 *                               longitude:
 *                                 type: number
 *                                 example: -77.0428
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                             example: "2024-01-15T10:30:00.000Z"
 *                           updatedAt:
 *                             type: string
 *                             format: date-time
 *                             example: "2024-01-15T10:30:00.000Z"
 *                           __v:
 *                             type: integer
 *                             example: 0
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/public', JobsController.getPublicJobs);

// Rutas para usuarios (requieren autenticación y suscripción Premium)
router.use(authenticateJwt);

// Buscar empleos

/**
 * @swagger
 * /api/jobs/search:
 *   get:
 *     tags: [Empleos]
 *     summary: GET /search
 *     description: Endpoint GET para /search
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
router.get('/search', JobsController.searchJobs);

// Obtener empleos destacados

/**
 * @swagger
 * /featured:
 *   get:
 *     tags: [Empleos]
 *     summary: GET /featured
 *     description: Endpoint GET para /featured
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
router.get('/featured', JobsController.getFeaturedJobs);

// Obtener detalles de un empleo

/**
 * @swagger
 * /api/jobs/{jobId}:
 *   get:
 *     tags: [Empleos]
 *     summary: Obtener detalles de un trabajo
 *     description: Obtiene la información completa de un trabajo específico. Requiere suscripción MetroPremium activa.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: string
 *           format: objectId
 *         description: ID del trabajo a consultar
 *         example: "507f1f77bcf86cd799439011"
 *     responses:
 *       200:
 *         description: Detalles del trabajo obtenidos exitosamente
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
 *                         _id:
 *                           type: string
 *                           format: objectId
 *                           example: "507f1f77bcf86cd799439011"
 *                         title:
 *                           type: string
 *                           example: "Desarrollador Frontend Senior"
 *                         company:
 *                           type: string
 *                           example: "TeleMetro PE"
 *                         description:
 *                           type: string
 *                           example: "Desarrollar interfaces de usuario modernas y responsivas"
 *                         location:
 *                           type: string
 *                           example: "Lima, Perú"
 *                         workType:
 *                           type: string
 *                           enum: [Presencial, Remoto, Híbrido]
 *                           example: "Remoto"
 *                         category:
 *                           type: string
 *                           enum: [Tecnología, Ventas, Administración, Servicios, Construcción, Gastronomía, Salud, Educación, Transporte]
 *                           example: "Tecnología"
 *                         salary:
 *                           type: string
 *                           example: "S/ 4000 - S/ 6000"
 *                         requirements:
 *                           type: array
 *                           items:
 *                             type: string
 *                           example: ["React", "TypeScript", "5+ años experiencia"]
 *                         contactEmail:
 *                           type: string
 *                           format: email
 *                           example: "recursos.humanos@telemetro.pe"
 *                         companyLogo:
 *                           type: string
 *                           example: "/uploads/company-logos/logo-123456.webp"
 *                         isUrgent:
 *                           type: boolean
 *                           example: false
 *                         isActive:
 *                           type: boolean
 *                           example: true
 *                         applicantsCount:
 *                           type: integer
 *                           example: 15
 *                         viewsCount:
 *                           type: integer
 *                           example: 245
 *                         expiresAt:
 *                           type: string
 *                           format: date-time
 *                           example: "2024-02-15T23:59:59.000Z"
 *                         coordinates:
 *                           type: object
 *                           properties:
 *                             latitude:
 *                               type: number
 *                               example: -12.0464
 *                             longitude:
 *                               type: number
 *                               example: -77.0428
 *                         createdAt:
 *                           type: string
 *                           format: date-time
 *                           example: "2024-01-15T10:30:00.000Z"
 *                         updatedAt:
 *                           type: string
 *                           format: date-time
 *                           example: "2024-01-15T10:30:00.000Z"
 *       401:
 *         description: No autorizado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Requiere suscripción MetroPremium
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ErrorResponse'
 *                 - type: object
 *                   properties:
 *                     error:
 *                       type: object
 *                       properties:
 *                         message:
 *                           type: string
 *                           example: "Requiere suscripción MetroPremium"
 *                         code:
 *                           type: integer
 *                           example: 403
 *       404:
 *         description: Trabajo no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ErrorResponse'
 *                 - type: object
 *                   properties:
 *                     error:
 *                       type: object
 *                       properties:
 *                         message:
 *                           type: string
 *                           example: "Empleo no encontrado"
 *                         code:
 *                           type: integer
 *                           example: 404
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/:jobId', JobsController.getJobDetails);

// Aplicar a un empleo (con upload de CV) - limit 3 req/hour per IP
const applyLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 3 });

/**
 * @swagger
 * /api/jobs/{jobId}/apply:
 *   post:
 *     tags: [Empleos]
 *     summary: Aplicar a un trabajo
 *     description: |
 *       Permite a un usuario autenticado aplicar a un trabajo específico. 
 *       
 *       **Modo Inteligente:**
 *       - Si el usuario tiene un perfil completo guardado → Aplicación con un solo clic (sin formulario)
 *       - Si no tiene perfil completo → Aplicación tradicional (con formulario y CV)
 *       
 *       **Flujo:**
 *       1. El sistema verifica si existe un perfil completo del usuario
 *       2. Si existe perfil completo Y CV guardado → Usa datos del perfil automáticamente
 *       3. Si no existe perfil completo → Requiere llenar formulario y subir CV
 *       
 *       **Ejemplos de Uso:**
 *       - **Con perfil completo**: `POST /api/jobs/123/apply` (sin body) → Aplicación automática
 *       - **Sin perfil**: `POST /api/jobs/123/apply` (con formulario completo) → Aplicación tradicional
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: string
 *           format: objectId
 *         description: ID del trabajo al que se desea aplicar
 *         example: "507f1f77bcf86cd799439011"
 *     requestBody:
 *       required: false
 *       description: |
 *         **Campos opcionales si tienes perfil completo guardado.**
 *         **Campos requeridos si no tienes perfil completo.**
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               fullName:
 *                 type: string
 *                 example: "Juan Pérez García"
 *                 description: "Nombre completo del aplicante (opcional si tienes perfil)"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "juan.perez@email.com"
 *                 description: "Correo electrónico de contacto (opcional si tienes perfil)"
 *               phone:
 *                 type: string
 *                 example: "+51987654321"
 *                 description: "Número de teléfono de contacto (opcional si tienes perfil)"
 *               dni:
 *                 type: string
 *                 example: "12345678"
 *                 description: "DNI del aplicante (opcional si tienes perfil)"
 *               birthDate:
 *                 type: string
 *                 pattern: "^\\d{8}$"
 *                 example: "15011990"
 *                 description: "Fecha de nacimiento en formato DDMMYYYY (opcional si tienes perfil)"
 *               address:
 *                 type: string
 *                 example: "Av. Principal 123, Lima, Perú"
 *                 description: "Dirección completa del aplicante (opcional si tienes perfil)"
 *               experience:
 *                 type: string
 *                 example: "3 años desarrollando aplicaciones web con React y Node.js"
 *                 description: "Experiencia laboral relevante (opcional si tienes perfil)"
 *               education:
 *                 type: string
 *                 example: "Ingeniería de Sistemas - Universidad Nacional"
 *                 description: "Formación académica (opcional si tienes perfil)"
 *               skills:
 *                 type: string
 *                 example: "React, Node.js, TypeScript, MongoDB"
 *                 description: "Habilidades técnicas separadas por comas (opcional si tienes perfil)"
 *               motivation:
 *                 type: string
 *                 maxLength: 1000
 *                 example: "Me interesa esta posición porque..."
 *                 description: "Carta de motivación (máximo 1000 caracteres, opcional si tienes perfil)"
 *               cv:
 *                 type: string
 *                 format: binary
 *                 description: "Archivo PDF del currículum vitae (máximo 5MB, opcional si tienes perfil con CV)"
 *     responses:
 *       201:
 *         description: Aplicación enviada exitosamente
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
 *                         message:
 *                           type: string
 *                           examples:
 *                             - "Aplicación enviada exitosamente con un solo clic"
 *                             - "Aplicación enviada exitosamente"
 *                           description: "Mensaje de confirmación que indica el método usado"
 *                         applicationId:
 *                           type: string
 *                           format: objectId
 *                           example: "507f1f77bcf86cd799439011"
 *                           description: "ID único de la aplicación creada"
 *                         usedProfile:
 *                           type: boolean
 *                           example: true
 *                           description: "Indica si se usó el perfil guardado para la aplicación (true = un solo clic, false = formulario tradicional)"
 *       400:
 *         description: Error en la validación o datos incorrectos
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ErrorResponse'
 *                 - type: object
 *                   properties:
 *                     error:
 *                       type: object
 *                       properties:
 *                         message:
 *                           type: string
 *                           examples:
 *                             - "Debe subir su CV en formato PDF"
 *                             - "Ya has aplicado a este trabajo"
 *                             - "Campos requeridos faltantes"
 *                             - "Debes completar tu perfil de aplicante antes de aplicar a trabajos"
 *                             - "Debes subir tu CV en tu perfil de aplicante antes de aplicar"
 *                         code:
 *                           type: string
 *                           examples:
 *                             - "MISSING_CV"
 *                             - "ALREADY_APPLIED"
 *                             - "VALIDATION_ERROR"
 *                             - "INCOMPLETE_PROFILE"
 *                             - "NO_CV_IN_PROFILE"
 *       401:
 *         description: No autorizado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Trabajo no encontrado o expirado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       429:
 *         description: Límite diario de aplicaciones alcanzado
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ErrorResponse'
 *                 - type: object
 *                   properties:
 *                     error:
 *                       type: object
 *                       properties:
 *                         message:
 *                           type: string
 *                           example: "Límite diario de aplicaciones alcanzado"
 *                         code:
 *                           type: string
 *                           example: "DAILY_LIMIT_REACHED"
 *                         currentUsage:
 *                           type: integer
 *                           example: 3
 *                         limit:
 *                           type: integer
 *                           example: 3
 *                         feature:
 *                           type: string
 *                           example: "job_application"
 *                         upgradeUrl:
 *                           type: string
 *                           example: "/subscription"
 */
router.post('/:jobId/apply', applyLimiter, uploadCV, JobsController.applyToJob);

// Obtener aplicaciones del usuario

/**
 * @swagger
 * /api/jobs/applications/my:
 *   get:
 *     tags: [Empleos]
 *     summary: Obtener mis aplicaciones
 *     description: Obtiene todas las aplicaciones realizadas por el usuario autenticado, con información del trabajo y estado de la aplicación.
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
 *           maximum: 50
 *           default: 10
 *         description: Cantidad de aplicaciones por página
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, reviewing, accepted, rejected, interview_scheduled]
 *         description: Filtrar por estado de la aplicación
 *     responses:
 *       200:
 *         description: Aplicaciones obtenidas exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     applications:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                             format: objectId
 *                             example: "507f1f77bcf86cd799439011"
 *                           jobId:
 *                             type: object
 *                             properties:
 *                               _id:
 *                                 type: string
 *                                 format: objectId
 *                                 example: "507f1f77bcf86cd799439012"
 *                               title:
 *                                 type: string
 *                                 example: "Desarrollador Frontend Senior"
 *                               company:
 *                                 type: string
 *                                 example: "TeleMetro PE"
 *                               location:
 *                                 type: string
 *                                 example: "Lima, Perú"
 *                               workType:
 *                                 type: string
 *                                 enum: [Presencial, Remoto, Híbrido]
 *                                 example: "Remoto"
 *                               salary:
 *                                 type: string
 *                                 example: "S/ 4000 - S/ 6000"
 *                               category:
 *                                 type: string
 *                                 example: "Tecnología"
 *                               isActive:
 *                                 type: boolean
 *                                 example: true
 *                           applicantInfo:
 *                             type: object
 *                             properties:
 *                               fullName:
 *                                 type: string
 *                                 example: "Juan Pérez García"
 *                               email:
 *                                 type: string
 *                                 example: "juan.perez@email.com"
 *                               phone:
 *                                 type: string
 *                                 example: "+51987654321"
 *                               dni:
 *                                 type: string
 *                                 example: "12345678"
 *                               birthDate:
 *                                 type: string
 *                                 example: "1990-05-15"
 *                               address:
 *                                 type: string
 *                                 example: "Av. Principal 123, Lima, Perú"
 *                               experience:
 *                                 type: string
 *                                 example: "3 años desarrollando aplicaciones web"
 *                               education:
 *                                 type: string
 *                                 example: "Ingeniería de Sistemas"
 *                               skills:
 *                                 type: array
 *                                 items:
 *                                   type: string
 *                                 example: ["React", "Node.js", "TypeScript"]
 *                               motivation:
 *                                 type: string
 *                                 example: "Me interesa esta posición porque..."
 *                           cvFile:
 *                             type: object
 *                             properties:
 *                               filename:
 *                                 type: string
 *                                 example: "cv-1234567890.pdf"
 *                               originalName:
 *                                 type: string
 *                                 example: "mi_curriculum.pdf"
 *                               path:
 *                                 type: string
 *                                 example: "/uploads/cvs/cv-1234567890.pdf"
 *                               size:
 *                                 type: integer
 *                                 example: 1024000
 *                               uploadedAt:
 *                                 type: string
 *                                 format: date-time
 *                                 example: "2024-01-15T10:30:00.000Z"
 *                           status:
 *                             type: string
 *                             enum: [pending, reviewing, accepted, rejected, interview_scheduled]
 *                             example: "pending"
 *                           reviewNotes:
 *                             type: string
 *                             nullable: true
 *                             example: "Candidato con buena experiencia"
 *                           reviewedBy:
 *                             type: string
 *                             format: objectId
 *                             nullable: true
 *                             example: "507f1f77bcf86cd799439013"
 *                           reviewedAt:
 *                             type: string
 *                             format: date-time
 *                             nullable: true
 *                             example: "2024-01-16T14:30:00.000Z"
 *                           interviewDate:
 *                             type: string
 *                             format: date-time
 *                             nullable: true
 *                             example: "2024-01-20T15:00:00.000Z"
 *                           interviewLocation:
 *                             type: string
 *                             nullable: true
 *                             example: "Oficina principal - Av. Principal 123"
 *                           interviewNotes:
 *                             type: string
 *                             nullable: true
 *                             example: "Entrevista técnica programada"
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                             example: "2024-01-15T10:30:00.000Z"
 *                           updatedAt:
 *                             type: string
 *                             format: date-time
 *                             example: "2024-01-15T10:30:00.000Z"
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                           example: 1
 *                         limit:
 *                           type: integer
 *                           example: 10
 *                         total:
 *                           type: integer
 *                           example: 25
 *                         pages:
 *                           type: integer
 *                           example: 3
 *       401:
 *         description: No autorizado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/applications/my', JobsController.getUserApplications);

// Descargar CV propio (usuario)

/**
 * @swagger
 * /applications/my/:applicationId/cv:
 *   get:
 *     tags: [Empleos]
 *     summary: GET /applications/my/:applicationId/cv
 *     description: Endpoint GET para /applications/my/:applicationId/cv
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
router.get('/applications/my/:applicationId/cv', JobsController.downloadMyCV);

// Rutas de administración
router.use(requireRole(['admin', 'moderator']));

// Obtener aplicaciones para un trabajo (Admin)

/**
 * @swagger
 * /api/jobs:jobId/applications:
 *   get:
 *     tags: [Admin - Empleos]
 *     summary: GET /:jobId/applications
 *     description: Endpoint GET para /:jobId/applications
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
router.get('/:jobId/applications', JobsController.getJobApplications);

// Actualizar estado de aplicación (Admin)

/**
 * @swagger
 * /applications/:applicationId/status:
 *   patch:
 *     tags: [Admin - Empleos]
 *     summary: PATCH /applications/:applicationId/status
 *     description: Endpoint PATCH para /applications/:applicationId/status
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
router.patch('/applications/:applicationId/status', JobsController.updateApplicationStatus);

// Descargar CV (Admin)

/**
 * @swagger
 * /applications/:applicationId/cv:
 *   get:
 *     tags: [Admin - Empleos]
 *     summary: GET /applications/:applicationId/cv
 *     description: Endpoint GET para /applications/:applicationId/cv
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
router.get('/applications/:applicationId/cv', JobsController.downloadCV);

// Obtener estadísticas de trabajos (Admin)

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
