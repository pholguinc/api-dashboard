import { Router } from 'express';
import { MetroYaController } from '../controllers/metro-ya.controller';
import { authenticateJwt } from '../middleware/auth';
import { validateBody, objectIdSchema } from '../utils/validation';
import { z } from 'zod';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticateJwt);

// Esquemas de validación
const purchaseOfferSchema = z.object({
  offerId: z.string().min(1),
  paymentMethod: z.enum(['points', 'yape', 'plin']).default('points'),
  usePoints: z.boolean().default(true)
});

// GET /api/metro-ya/offers - Obtener ofertas disponibles

/**
 * @swagger
 * /api/metro-ya/offers:
 *   get:
 *     tags: [Marketplace]
 *     summary: GET /offers
 *     description: Endpoint GET para /offers
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
router.get('/offers', MetroYaController.getOffers);

// POST /api/metro-ya/purchase - Comprar oferta

/**
 * @swagger
 * /purchase:
 *   post:
 *     tags: [Marketplace]
 *     summary: POST /purchase
 *     description: Endpoint POST para /purchase
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
router.post('/purchase',
  validateBody(purchaseOfferSchema),
  MetroYaController.purchaseOffer
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
