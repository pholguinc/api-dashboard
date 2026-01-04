import { Router } from "express";
import { MetroDiscountController } from "../controllers/metro-discount.controller";
import { authenticateJwt, requireRole } from "../middleware/auth";

const router = Router();

// Rutas públicas
router.get("/validate/:code", MetroDiscountController.validateDiscountCode);

// Rutas autenticadas
router.use(authenticateJwt);

// Opciones de descuento (requiere autenticación para detectar Premium)
router.get("/options", MetroDiscountController.getDiscountOptions);

// Canjear puntos por descuento
router.post("/redeem", MetroDiscountController.redeemMetroDiscount);

// Obtener descuentos del usuario

router.get("/my-discounts", MetroDiscountController.getUserDiscounts);

// Rutas para operadores del metro

router.patch(
  "/use/:code",
  requireRole(["admin", "moderator"]),
  MetroDiscountController.useDiscount
);

// Rutas de administración

router.get(
  "/admin/stats",
  requireRole(["admin", "moderator"]),
  MetroDiscountController.getDiscountStats
);

router.get(
  "/admin/all",
  requireRole(["admin", "moderator"]),
  MetroDiscountController.getAllDiscounts
);

router.get(
  "/admin/export",
  requireRole(["admin", "moderator"]),
  MetroDiscountController.exportDiscounts
);

// Gestión de configuraciones

router.get(
  "/admin/pricing",
  requireRole(["admin"]),
  MetroDiscountController.getPricing
);

router.put(
  "/admin/pricing",
  requireRole(["admin"]),
  MetroDiscountController.updatePricing
);

router.get(
  "/admin/discount-options",
  requireRole(["admin"]),
  MetroDiscountController.getAdminDiscountOptions
);

router.put(
  "/admin/discount-options",
  requireRole(["admin"]),
  MetroDiscountController.updateDiscountOptions
);

// Gestión de suscripciones Premium

router.post(
  "/admin/toggle-premium/:userId",
  requireRole(["admin"]),
  MetroDiscountController.toggleUserPremium
);

router.post(
  "/admin/create",
  requireRole(["admin"]),
  MetroDiscountController.createDiscountOption
);

// ========== GESTIÓN DE OPCIONES PERSONALIZADAS ==========

router.get(
  "/admin/options",
  requireRole(["admin", "moderator"]),
  MetroDiscountController.getAllCustomOptions
);

router.put(
  "/admin/options/:id",
  requireRole(["admin"]),
  MetroDiscountController.updateCustomOption
);

router.delete(
  "/admin/options/:id",
  requireRole(["admin"]),
  MetroDiscountController.deleteCustomOption
);

router.patch(
  "/admin/options/:id/toggle",
  requireRole(["admin"]),
  MetroDiscountController.toggleCustomOption
);

// ========== GESTIÓN DE USUARIOS ==========

router.get(
  "/admin/users",
  requireRole(["admin", "moderator"]),
  MetroDiscountController.getUsers
);

export default router;
