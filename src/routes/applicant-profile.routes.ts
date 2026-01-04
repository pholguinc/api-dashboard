import { Router } from 'express';
import { ApplicantProfileController, uploadCV } from '../controllers/applicant-profile.controller';
import { authenticateJwt } from '../middleware/auth';
import { validateBody } from '../utils/validation';
import { z } from 'zod';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticateJwt);

// Esquema de validación para actualizar perfil
const updateProfileSchema = z.object({
  // Datos personales
  fullName: z.string().min(2).max(100).optional(),
  email: z.string().email().max(100).optional(),
  phone: z.string().min(8).max(20).optional(),
  dni: z.string().min(8).max(20).optional(),
  birthDate: z.string().regex(/^\d{2}-\d{2}-\d{4}$/).optional(), // dd-mm-yyyy
  address: z.string().min(10).max(200).optional(),
  
  // Perfil profesional
  experience: z.string().min(10).max(2000).optional(),
  education: z.string().min(5).max(500).optional(),
  skills: z.array(z.string().max(100)).max(20).optional(),
  motivation: z.string().min(10).max(1000).optional()
});

/**
 * @swagger
 * components:
 *   schemas:
 *     ApplicantProfile:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           format: objectId
 *           example: "507f1f77bcf86cd799439011"
 *         userId:
 *           type: string
 *           format: objectId
 *           example: "507f1f77bcf86cd799439012"
 *         fullName:
 *           type: string
 *           example: "Juan Carlos Pérez García"
 *         email:
 *           type: string
 *           format: email
 *           example: "juan@example.com"
 *         phone:
 *           type: string
 *           example: "+51987654321"
 *         dni:
 *           type: string
 *           example: "12345678"
 *         birthDate:
 *           type: string
 *           example: "15-01-1990"
 *         address:
 *           type: string
 *           example: "Av. Principal 123, Lima, Perú"
 *         experience:
 *           type: string
 *           example: "5 años de experiencia en desarrollo web"
 *         education:
 *           type: string
 *           example: "Ingeniería de Sistemas - Universidad Nacional"
 *         skills:
 *           type: array
 *           items:
 *             type: string
 *           example: ["React", "Node.js", "MongoDB", "TypeScript"]
 *         motivation:
 *           type: string
 *           example: "Busco crecer profesionalmente en una empresa innovadora"
 *         cvFile:
 *           type: object
 *           nullable: true
 *           properties:
 *             filename:
 *               type: string
 *               example: "cv-123456.pdf"
 *             originalName:
 *               type: string
 *               example: "Mi_CV.pdf"
 *             path:
 *               type: string
 *               example: "uploads/cvs/cv-123456.pdf"
 *             size:
 *               type: integer
 *               example: 1024000
 *             uploadedAt:
 *               type: string
 *               format: date-time
 *               example: "2024-01-15T10:30:00.000Z"
 *         isComplete:
 *           type: boolean
 *           example: true
 *         createdAt:
 *           type: string
 *           format: date-time
 *           example: "2024-01-15T10:30:00.000Z"
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           example: "2024-01-15T10:30:00.000Z"
 *         lastUpdated:
 *           type: string
 *           format: date-time
 *           example: "2024-01-15T10:30:00.000Z"
 *     
 *     UpdateProfileRequest:
 *       type: object
 *       description: "Todos los campos son opcionales. Se puede crear o actualizar el perfil con cualquier combinación de campos."
 *       properties:
 *         fullName:
 *           type: string
 *           minLength: 2
 *           maxLength: 100
 *           example: "Juan Carlos Pérez García"
 *           description: "Nombre completo del aplicante"
 *         email:
 *           type: string
 *           format: email
 *           maxLength: 100
 *           example: "juan@example.com"
 *           description: "Correo electrónico único (no puede repetirse en otros perfiles)"
 *         phone:
 *           type: string
 *           minLength: 8
 *           maxLength: 20
 *           example: "+51987654321"
 *           description: "Número de teléfono de contacto"
 *         dni:
 *           type: string
 *           minLength: 8
 *           maxLength: 20
 *           example: "12345678"
 *           description: "DNI único (no puede repetirse en otros perfiles)"
 *         birthDate:
 *           type: string
 *           pattern: "^\\d{2}-\\d{2}-\\d{4}$"
 *           example: "15-01-1990"
 *           description: "Fecha de nacimiento en formato dd-mm-yyyy"
 *         address:
 *           type: string
 *           minLength: 10
 *           maxLength: 200
 *           example: "Av. Principal 123, Lima, Perú"
 *           description: "Dirección completa del aplicante"
 *         experience:
 *           type: string
 *           minLength: 10
 *           maxLength: 2000
 *           example: "5 años de experiencia en desarrollo web con React y Node.js"
 *           description: "Experiencia laboral relevante"
 *         education:
 *           type: string
 *           minLength: 5
 *           maxLength: 500
 *           example: "Ingeniería de Sistemas - Universidad Nacional del Callao"
 *           description: "Formación académica"
 *         skills:
 *           type: array
 *           items:
 *             type: string
 *             maxLength: 100
 *           maxItems: 20
 *           example: ["React", "Node.js", "MongoDB", "TypeScript", "AWS"]
 *           description: "Habilidades técnicas (máximo 20)"
 *         motivation:
 *           type: string
 *           minLength: 10
 *           maxLength: 1000
 *           example: "Busco crecer profesionalmente en una empresa innovadora que me permita desarrollar mis habilidades técnicas"
 *           description: "Carta de motivación (máximo 1000 caracteres)"
 */

/**
 * @swagger
 * /api/applicant-profile:
 *   get:
 *     tags: [Perfil de Aplicante]
 *     summary: Obtener perfil de aplicante
 *     description: Obtiene el perfil de aplicante del usuario autenticado. Si no existe, crea uno vacío.
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
 *                     profile:
 *                       $ref: '#/components/schemas/ApplicantProfile'
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
router.get('/', ApplicantProfileController.getProfile);

/**
 * @swagger
 * /api/applicant-profile:
 *   put:
 *     tags: [Perfil de Aplicante]
 *     summary: Crear o actualizar perfil de aplicante
 *     description: |
 *       Crea un nuevo perfil de aplicante o actualiza uno existente.
 *       
 *       **Funcionalidad:**
 *       - Si no existe perfil → Crea uno nuevo
 *       - Si existe perfil → Actualiza los campos proporcionados
 *       - Todos los campos son opcionales
 *       - Valida que email y DNI sean únicos en el sistema
 *       - Calcula automáticamente si el perfil está completo
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
 *         description: Perfil creado o actualizado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     profile:
 *                       $ref: '#/components/schemas/ApplicantProfile'
 *                     message:
 *                       type: string
 *                       examples:
 *                         - "Perfil creado exitosamente"
 *                         - "Perfil actualizado exitosamente"
 *                       description: "Mensaje que indica si se creó o actualizó el perfil"
 *                     isComplete:
 *                       type: boolean
 *                       example: true
 *                       description: "Indica si el perfil tiene todos los campos requeridos"
 *                     wasCreated:
 *                       type: boolean
 *                       example: false
 *                       description: "Indica si se creó un nuevo perfil (true) o se actualizó uno existente (false)"
 *       400:
 *         description: Error en la validación o datos duplicados
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
 *                           example: "Este email ya está registrado en otro perfil"
 *                         code:
 *                           type: string
 *                           example: "EMAIL_TAKEN"
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
router.put('/', 
  validateBody(updateProfileSchema),
  ApplicantProfileController.updateProfile
);

/**
 * @swagger
 * /api/applicant-profile/cv:
 *   post:
 *     tags: [Perfil de Aplicante]
 *     summary: Subir CV
 *     description: Sube un archivo CV (PDF, DOC, DOCX) para el perfil de aplicante
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               cv:
 *                 type: string
 *                 format: binary
 *                 description: Archivo CV (PDF, DOC, DOCX) - máximo 5MB
 *     responses:
 *       200:
 *         description: CV subido exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     message:
 *                       type: string
 *                       example: "CV subido exitosamente"
 *                     cvFile:
 *                       type: object
 *                       properties:
 *                         filename:
 *                           type: string
 *                           example: "cv-123456.pdf"
 *                         originalName:
 *                           type: string
 *                           example: "Mi_CV.pdf"
 *                         path:
 *                           type: string
 *                           example: "uploads/cvs/cv-123456.pdf"
 *                         size:
 *                           type: integer
 *                           example: 1024000
 *                         uploadedAt:
 *                           type: string
 *                           format: date-time
 *                           example: "2024-01-15T10:30:00.000Z"
 *       400:
 *         description: Error en la validación
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
 *                           example: "No se proporcionó archivo CV"
 *                         code:
 *                           type: string
 *                           example: "NO_FILE"
 *       401:
 *         description: No autorizado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Perfil no encontrado
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
 *                           example: "Perfil de aplicante no encontrado"
 *                         code:
 *                           type: string
 *                           example: "PROFILE_NOT_FOUND"
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/cv', uploadCV.single('cv'), ApplicantProfileController.uploadCV);

/**
 * @swagger
 * /api/applicant-profile/cv:
 *   delete:
 *     tags: [Perfil de Aplicante]
 *     summary: Eliminar CV
 *     description: Elimina el archivo CV del perfil de aplicante
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: CV eliminado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     message:
 *                       type: string
 *                       example: "CV eliminado exitosamente"
 *       400:
 *         description: No hay CV para eliminar
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
 *                           example: "No hay CV para eliminar"
 *                         code:
 *                           type: string
 *                           example: "NO_CV"
 *       401:
 *         description: No autorizado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Perfil no encontrado
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
 *                           example: "Perfil de aplicante no encontrado"
 *                         code:
 *                           type: string
 *                           example: "PROFILE_NOT_FOUND"
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.delete('/cv', ApplicantProfileController.deleteCV);

export default router;
