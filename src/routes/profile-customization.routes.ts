import { Router } from 'express';
import { ProfileCustomizationController } from '../controllers/profile-customization.controller';
import { authenticateJwt } from '../middleware/auth';
import { validateBody, validateParams, validateQuery, objectIdSchema } from '../utils/validation';
import { z } from 'zod';

const router = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     ProfileCustomization:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: objectId
 *           example: "507f1f77bcf86cd799439011"
 *         userId:
 *           type: string
 *           format: objectId
 *           example: "507f1f77bcf86cd799439011"
 *         customUsername:
 *           type: string
 *           example: "juan_metro_2024"
 *         primaryColor:
 *           type: integer
 *           example: 16711680
 *         secondaryColor:
 *           type: integer
 *           example: 65280
 *         accentColor:
 *           type: integer
 *           example: 255
 *         selectedBadgeId:
 *           type: string
 *           format: objectId
 *           example: "507f1f77bcf86cd799439011"
 *         profileTheme:
 *           type: string
 *           enum: [metro_classic, underground_neon, street_art, gaming_rgb, premium_gold, cyber_blue]
 *           example: "metro_classic"
 *         showAchievements:
 *           type: boolean
 *           example: true
 *         showStats:
 *           type: boolean
 *           example: true
 *         customBio:
 *           type: string
 *           example: "Amante del metro y los juegos"
 *         createdAt:
 *           type: string
 *           format: date-time
 *           example: "2024-01-15T10:30:00.000Z"
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           example: "2024-01-15T10:30:00.000Z"
 *     
 *     UpdateCustomizationRequest:
 *       type: object
 *       properties:
 *         customUsername:
 *           type: string
 *           minLength: 3
 *           maxLength: 30
 *           pattern: "^[a-zA-Z0-9_\\-\\.]+$"
 *           example: "juan_metro_2024"
 *         primaryColor:
 *           type: integer
 *           example: 16711680
 *         secondaryColor:
 *           type: integer
 *           example: 65280
 *         accentColor:
 *           type: integer
 *           example: 255
 *         selectedBadgeId:
 *           type: string
 *           format: objectId
 *           example: "507f1f77bcf86cd799439011"
 *         profileTheme:
 *           type: string
 *           enum: [metro_classic, underground_neon, street_art, gaming_rgb, premium_gold, cyber_blue]
 *           example: "metro_classic"
 *         showAchievements:
 *           type: boolean
 *           example: true
 *         showStats:
 *           type: boolean
 *           example: true
 *         customBio:
 *           type: string
 *           maxLength: 150
 *           example: "Amante del metro y los juegos"
 *     
 *     Badge:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: objectId
 *           example: "507f1f77bcf86cd799439011"
 *         name:
 *           type: string
 *           example: "Primer Viaje"
 *         description:
 *           type: string
 *           example: "Completa tu primer viaje en metro"
 *         iconUrl:
 *           type: string
 *           format: uri
 *           example: "https://example.com/badge-icon.png"
 *         rarity:
 *           type: string
 *           enum: [common, rare, epic, legendary]
 *           example: "common"
 *         pointsRequired:
 *           type: integer
 *           example: 100
 *         isUnlocked:
 *           type: boolean
 *           example: true
 *         unlockedAt:
 *           type: string
 *           format: date-time
 *           example: "2024-01-15T10:30:00.000Z"
 *     
 *     UsernameAvailabilityResponse:
 *       type: object
 *       properties:
 *         available:
 *           type: boolean
 *           example: true
 *         suggestions:
 *           type: array
 *           items:
 *             type: string
 *           example: ["juan_metro_2024", "juan_perez_metro", "juan_m"]
 */

// Todas las rutas requieren autenticación
router.use(authenticateJwt);

// Esquemas de validación
const updateCustomizationSchema = z.object({
  customUsername: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_\-\.]+$/).nullable().optional(),
  primaryColor: z.number().optional(),
  secondaryColor: z.number().optional(),
  accentColor: z.number().optional(),
  selectedBadgeId: z.string().nullable().optional(),
  profileTheme: z.enum(['metro_classic', 'underground_neon', 'street_art', 'gaming_rgb', 'premium_gold', 'cyber_blue']).nullable().optional(),
  showAchievements: z.boolean().optional(),
  showStats: z.boolean().optional(),
  customBio: z.string().max(150).nullable().optional()
});

const usernameCheckSchema = z.object({
  username: z.string().min(3).max(30)
});

const unlockBadgeSchema = z.object({
  badgeId: z.string().min(1)
});

// ========== RUTAS DE PERSONALIZACIÓN ==========

/**
 * @swagger
 * /api/profile/customization/{userId}:
 *   get:
 *     tags: [Personalización de Perfil]
 *     summary: Obtener personalización del usuario
 *     description: Obtiene la configuración de personalización de un usuario específico
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: objectId
 *         description: ID del usuario
 *     responses:
 *       200:
 *         description: Personalización obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/ProfileCustomization'
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
router.get('/customization/:userId',
  validateParams(z.object({ userId: objectIdSchema })),
  ProfileCustomizationController.getUserCustomization
);

/**
 * @swagger
 * /api/profile/customization:
 *   put:
 *     tags: [Personalización de Perfil]
 *     summary: Actualizar personalización del usuario
 *     description: Actualiza la configuración de personalización del usuario autenticado
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateCustomizationRequest'
 *     responses:
 *       200:
 *         description: Personalización actualizada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/ProfileCustomization'
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
router.put('/customization',
  validateBody(updateCustomizationSchema),
  ProfileCustomizationController.updateUserCustomization
);

/**
 * @swagger
 * /api/profile/username/check:
 *   get:
 *     tags: [Personalización de Perfil]
 *     summary: Verificar disponibilidad de username
 *     description: Verifica si un username personalizado está disponible
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: username
 *         required: true
 *         schema:
 *           type: string
 *           minLength: 3
 *           maxLength: 30
 *         description: Username a verificar
 *         example: "juan_metro_2024"
 *     responses:
 *       200:
 *         description: Verificación completada
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/UsernameAvailabilityResponse'
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
router.get('/username/check',
  validateQuery(usernameCheckSchema),
  ProfileCustomizationController.checkUsernameAvailability
);

// GET /api/profile/badges/:userId - Obtener insignias del usuario
router.get('/badges/:userId',
  validateParams(z.object({ userId: objectIdSchema })),
  ProfileCustomizationController.getUserBadges
);

// POST /api/profile/badges/:userId/unlock - Desbloquear insignia (admin only)
router.post('/badges/:userId/unlock',
  validateParams(z.object({ userId: objectIdSchema })),
  validateBody(unlockBadgeSchema),
  ProfileCustomizationController.unlockBadge
);

// GET /api/profile/stats/:userId - Obtener estadísticas del usuario
router.get('/stats/:userId',
  validateParams(z.object({ userId: objectIdSchema })),
  ProfileCustomizationController.getUserStats
);

// GET /api/profile/themes/:userId - Obtener temas disponibles
router.get('/themes/:userId',
  validateParams(z.object({ userId: objectIdSchema })),
  ProfileCustomizationController.getAvailableThemes
);

export default router;
