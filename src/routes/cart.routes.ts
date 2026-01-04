import { Router } from 'express';
import { auth } from '../middleware/auth';
import { 
  getCart, 
  addToCart, 
  updateCartItem, 
  removeFromCart, 
  clearCart,
  checkoutCart 
} from '../controllers/cart.controller';
import { 
  validateBody, 
  validateParams,
  objectIdSchema 
} from '../utils/validation';
import { z } from 'zod';

const router = Router();

// Todas las rutas requieren autenticación
router.use(auth);

// Esquemas de validación
const addToCartSchema = z.object({
  productId: objectIdSchema,
  productType: z.enum(['microseguro', 'marketplace_product', 'premium_service']),
  quantity: z.number().min(1, 'Cantidad debe ser mayor a 0').max(100, 'Cantidad máxima: 100').default(1),
  metadata: z.record(z.any()).optional()
});

const updateCartItemSchema = z.object({
  quantity: z.number().min(1, 'Cantidad debe ser mayor a 0').max(100, 'Cantidad máxima: 100')
});

const checkoutSchema = z.object({
  paymentMethod: z.enum(['points', 'stripe', 'cash']).default('points'),
  deliveryAddress: z.object({
    street: z.string().optional(),
    city: z.string().optional(),
    postalCode: z.string().optional(),
    additionalInfo: z.string().optional()
  }).optional(),
  notes: z.string().max(500, 'Notas muy largas').optional()
});

// ========== RUTAS DEL CARRITO ==========

// GET /api/cart - Obtener carrito del usuario

/**
 * @swagger
 * /api/cart:
 *   get:
 *     tags: [Marketplace]
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
router.get('/', getCart);

// POST /api/cart/add - Agregar producto al carrito

/**
 * @swagger
 * /api/cart/add:
 *   post:
 *     tags: [Marketplace]
 *     summary: POST /add
 *     description: Endpoint POST para /add
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
router.post('/add', 
  validateBody(addToCartSchema), 
  addToCart
);

// PUT /api/cart/items/:itemId - Actualizar cantidad de producto

/**
 * @swagger
 * /items/:itemId:
 *   put:
 *     tags: [Marketplace]
 *     summary: PUT /items/:itemId
 *     description: Endpoint PUT para /items/:itemId
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
router.put('/items/:itemId',
  validateParams(z.object({ itemId: objectIdSchema })),
  validateBody(updateCartItemSchema),
  updateCartItem
);

// DELETE /api/cart/items/:itemId - Remover producto del carrito

/**
 * @swagger
 * /items/:itemId:
 *   delete:
 *     tags: [Marketplace]
 *     summary: DELETE /items/:itemId
 *     description: Endpoint DELETE para /items/:itemId
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
router.delete('/items/:itemId',
  validateParams(z.object({ itemId: objectIdSchema })),
  removeFromCart
);

// DELETE /api/cart/clear - Limpiar carrito completo

/**
 * @swagger
 * /api/cart/clear:
 *   delete:
 *     tags: [Marketplace]
 *     summary: DELETE /clear
 *     description: Endpoint DELETE para /clear
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
router.delete('/clear', clearCart);

// POST /api/cart/checkout - Procesar compra del carrito

/**
 * @swagger
 * /api/cart/checkout:
 *   post:
 *     tags: [Marketplace]
 *     summary: POST /checkout
 *     description: Endpoint POST para /checkout
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
router.post('/checkout',
  validateBody(checkoutSchema),
  checkoutCart
);

// GET /api/cart/count - Obtener solo el conteo de items (para UI)

/**
 * @swagger
 * /api/cart/count:
 *   get:
 *     tags: [Marketplace]
 *     summary: GET /count
 *     description: Endpoint GET para /count
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
router.get('/count', async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { CartSummaryModel } = await import('../models/cart.model');
    
    const summary = await CartSummaryModel.findOne({ userId });
    
    res.json({
      success: true,
      data: {
        totalItems: summary?.totalItems || 0,
        totalPointsPrice: summary?.totalPointsPrice || 0,
        totalSolesPrice: summary?.totalSolesPrice || 0
      },
      error: null,
      meta: {
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error getting cart count:', error);
    res.status(500).json({
      success: false,
      data: null,
      error: { message: 'Error al obtener conteo del carrito' }
    });
  }
});

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
