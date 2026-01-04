import { Router } from 'express';
import { ReferralController } from '../controllers/referral.controller';
import { authenticateJwt } from '../middleware/auth';
import { validateBody } from '../utils/validation';
import { z } from 'zod';

const router = Router();

// Rutas autenticadas
router.use(authenticateJwt);

// Obtener código de referido del usuario

/**
 * @swagger
 * /api/referral/my-code:
 *   get:
 *     tags: [Puntos]
 *     summary: GET /my-code
 *     description: Endpoint GET para /my-code
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
router.get('/my-code', ReferralController.getReferralCode);

// Aplicar código de referido

/**
 * @swagger
 * /api/referral/apply:
 *   post:
 *     tags: [Puntos]
 *     summary: POST /apply
 *     description: Endpoint POST para /apply
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
router.post('/apply', 
  validateBody(z.object({
    referralCode: z.string().min(1, 'Código de referido requerido')
  })),
  ReferralController.applyReferralCode
);

// Obtener estadísticas de referidos

/**
 * @swagger
 * /api/referral/stats:
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
router.get('/stats', ReferralController.getReferralStats);

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
