import { Router } from 'express';
import { MetroYaCouponsAdminController } from '../../controllers/admin/metro-ya-coupons.admin.controller';
import { authenticateJwt, requireRole } from '../../middleware/auth';
import { validateBody, validateQuery } from '../../utils/validation';
import { z } from 'zod';

const router = Router();

// Todas las rutas requieren autenticación y rol de admin
router.use(authenticateJwt);
router.use(requireRole(['admin']));

// Esquemas de validación
const createCouponSchema = z.object({
  code: z.string().min(3).max(50).regex(/^[A-Z0-9-_]+$/i, 'Código debe ser alfanumérico con guiones'),
  title: z.string().min(3).max(100),
  description: z.string().min(10).max(500),
  icon: z.string().optional(),
  benefitType: z.enum(['discount_percentage', 'discount_fixed', 'free_trip', 'points_bonus', 'custom']),
  discountPercentage: z.number().min(0).max(100).optional(),
  discountAmount: z.number().min(0).optional(),
  pointsBonus: z.number().min(0).optional(),
  customData: z.any().optional(),
  validFrom: z.string().datetime().optional(),
  validUntil: z.string().datetime().optional(),
  maxUsesPerCycle: z.number().min(1).optional(),
  category: z.enum(['transport', 'discount', 'special', 'bonus']).optional(),
  displayOrder: z.number().optional()
});

const updateCouponSchema = z.object({
  title: z.string().min(3).max(100).optional(),
  description: z.string().min(10).max(500).optional(),
  icon: z.string().optional(),
  discountPercentage: z.number().min(0).max(100).optional(),
  discountAmount: z.number().min(0).optional(),
  pointsBonus: z.number().min(0).optional(),
  customData: z.any().optional(),
  validFrom: z.string().datetime().optional(),
  validUntil: z.string().datetime().optional(),
  maxUsesPerCycle: z.number().min(1).optional(),
  category: z.enum(['transport', 'discount', 'special', 'bonus']).optional(),
  displayOrder: z.number().optional(),
  isActive: z.boolean().optional()
});

const listCouponsQuerySchema = z.object({
  page: z.string().optional().default('1'),
  limit: z.string().optional().default('20'),
  isActive: z.string().optional(),
  category: z.enum(['transport', 'discount', 'special', 'bonus']).optional(),
  benefitType: z.enum(['discount_percentage', 'discount_fixed', 'free_trip', 'points_bonus', 'custom']).optional(),
  search: z.string().optional()
});

/**
 * @swagger
 * /api/admin/metro-ya-coupons/templates:
 *   get:
 *     tags: [Admin - Metro Ya Coupons]
 *     summary: Obtener plantillas predefinidas de cupones
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Plantillas obtenidas
 */
router.get('/templates', MetroYaCouponsAdminController.getCouponTemplates);

/**
 * @swagger
 * /api/admin/metro-ya-coupons/stats/global:
 *   get:
 *     tags: [Admin - Metro Ya Coupons]
 *     summary: Obtener estadísticas globales de cupones
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Estadísticas obtenidas
 */
router.get('/stats/global', MetroYaCouponsAdminController.getGlobalStats);

/**
 * @swagger
 * /api/admin/metro-ya-coupons:
 *   post:
 *     tags: [Admin - Metro Ya Coupons]
 *     summary: Crear nuevo cupón
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *               - title
 *               - description
 *               - benefitType
 *             properties:
 *               code:
 *                 type: string
 *                 example: "VIAJE-GRATIS-2024"
 *               title:
 *                 type: string
 *                 example: "Viaje Gratis"
 *               description:
 *                 type: string
 *                 example: "Un viaje completamente gratis en cualquier línea"
 *               benefitType:
 *                 type: string
 *                 enum: [discount_percentage, discount_fixed, free_trip, points_bonus, custom]
 *               discountPercentage:
 *                 type: number
 *               discountAmount:
 *                 type: number
 *               pointsBonus:
 *                 type: number
 *     responses:
 *       200:
 *         description: Cupón creado exitosamente
 *       400:
 *         description: Código de cupón ya existe
 */
router.post('/',
  validateBody(createCouponSchema),
  MetroYaCouponsAdminController.createCoupon
);

/**
 * @swagger
 * /api/admin/metro-ya-coupons:
 *   get:
 *     tags: [Admin - Metro Ya Coupons]
 *     summary: Obtener todos los cupones (con filtros)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lista de cupones obtenida
 */
router.get('/',
  validateQuery(listCouponsQuerySchema),
  MetroYaCouponsAdminController.getAllCoupons
);

/**
 * @swagger
 * /api/admin/metro-ya-coupons/{couponId}:
 *   get:
 *     tags: [Admin - Metro Ya Coupons]
 *     summary: Obtener detalles de un cupón
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: couponId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Detalles del cupón con estadísticas
 *       404:
 *         description: Cupón no encontrado
 */
router.get('/:couponId', MetroYaCouponsAdminController.getCouponById);

/**
 * @swagger
 * /api/admin/metro-ya-coupons/{couponId}:
 *   put:
 *     tags: [Admin - Metro Ya Coupons]
 *     summary: Actualizar cupón
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: couponId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Cupón actualizado
 *       404:
 *         description: Cupón no encontrado
 */
router.put('/:couponId',
  validateBody(updateCouponSchema),
  MetroYaCouponsAdminController.updateCoupon
);

/**
 * @swagger
 * /api/admin/metro-ya-coupons/{couponId}/toggle:
 *   patch:
 *     tags: [Admin - Metro Ya Coupons]
 *     summary: Activar/Desactivar cupón
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: couponId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Estado del cupón cambiado
 */
router.patch('/:couponId/toggle', MetroYaCouponsAdminController.toggleCouponStatus);

/**
 * @swagger
 * /api/admin/metro-ya-coupons/{couponId}:
 *   delete:
 *     tags: [Admin - Metro Ya Coupons]
 *     summary: Eliminar cupón
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: couponId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Cupón eliminado
 *       400:
 *         description: Cupón tiene usos registrados
 *       404:
 *         description: Cupón no encontrado
 */
router.delete('/:couponId', MetroYaCouponsAdminController.deleteCoupon);

export default router;