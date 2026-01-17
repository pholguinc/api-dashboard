import { Router } from "express";
import { auth, requireRole } from "../middleware/auth";
import {
  listProducts,
  getProduct,
  redeemProduct,
  getUserRedemptions,
} from "../controllers/marketplace.controller";
import { ProductModel } from "../models/marketplace.model";
import { OfferModel } from "../models/offer.model";
import { OfferRedemptionModel } from "../models/offer_redemption.model";
import {
  validateBody,
  validateQuery,
  validateParams,
  redeemProductSchema,
  createProductSchema,
  updateProductSchema,
  paginationSchema,
  objectIdSchema,
} from "../utils/validation";
import { z } from "zod";
import { confirmRedemption } from "../controllers/marketplace.controller";
import { uploadImage, deleteOldImage } from '../middleware/upload';

const router = Router();

router.get(
  "/products",
  validateQuery(
    paginationSchema.extend({
      category: z
        .enum(["digital", "physical", "premium", "food_drink", "entertainment", "transport", "services", "shopping", "health", "education", "other"])
        .optional()
        .or(z.literal("undefined"))
        .transform((val) => (val === "undefined" ? undefined : val)),
      search: z
        .string()
        .optional()
        .or(z.literal("undefined"))
        .transform((val) => (val === "undefined" ? undefined : val)),
    })
  ),
  listProducts
);

router.get(
  "/products/:id",
  validateParams(z.object({ id: objectIdSchema })),
  getProduct
);

router.post("/redeem", auth, validateBody(redeemProductSchema), redeemProduct);

router.get(
  "/my-redemptions",
  auth,
  validateQuery(paginationSchema),
  getUserRedemptions
);

router.post(
  "/redemptions/:id/confirm",
  auth,
  validateParams(z.object({ id: objectIdSchema })),
  confirmRedemption
);

// ========== OFERTAS GEOGRÁFICAS ==========

router.get(
  "/offers/nearby",
  auth,
  validateQuery(
    z.object({
      lat: z.coerce.number().min(-90).max(90),
      lon: z.coerce.number().min(-180).max(180),
      km: z.coerce.number().min(0.1).max(50).default(3),
    })
  ),
  async (req, res) => {
    try {
      const { lat, lon, km } = req.query as any;
      const meters = km * 1000;

      const offers = await OfferModel.find({
        isActive: true,
        location: {
          $near: {
            $geometry: { type: "Point", coordinates: [lon, lat] },
            $maxDistance: meters,
          },
        },
      })
        .limit(200)
        .lean();

      res.json({
        success: true,
        data: offers,
        error: null,
        meta: {
          timestamp: new Date().toISOString(),
          searchRadius: km,
          location: { lat, lon },
        },
      });
    } catch (error) {
      console.error("Error in nearby offers:", error);
      res.status(500).json({
        success: false,
        data: null,
        error: { message: "Error al buscar ofertas cercanas" },
      });
    }
  }
);

router.post(
  "/offers/:id/redeem",
  auth,
  validateParams(z.object({ id: objectIdSchema })),
  async (req, res) => {
    try {
      const { id } = req.params;
      const userId = (req as any).user.id;

      const offer = await OfferModel.findById(id);
      if (!offer || !offer.isActive) {
        return res.status(404).json({
          success: false,
          data: null,
          error: {
            message: "Oferta no disponible",
            code: "OFFER_NOT_AVAILABLE",
          },
        });
      }

      const redemption = await OfferRedemptionModel.create({
        userId,
        offerId: id,
        code: offer.discountCode,
      });

      res.status(201).json({
        success: true,
        data: redemption,
        error: null,
        meta: {
          timestamp: new Date().toISOString(),
          message: "Oferta canjeada exitosamente",
        },
      });
    } catch (error) {
      console.error("Error in offer redemption:", error);
      res.status(500).json({
        success: false,
        data: null,
        error: { message: "Error al canjear oferta" },
      });
    }
  }
);

// ========== ADMIN ENDPOINTS ==========

router.get(
  "/admin/stats",
  auth,
  requireRole(["admin", "moderator"]),
  async (req, res) => {
    try {
      const stats = {
        products: { total: 0, active: 0 },
        redemptions: { total: 0, pending: 0, completed: 0 },
        offers: { total: 0, active: 0 },
      };

      res.json({
        success: true,
        data: stats,
        error: null,
        meta: { timestamp: new Date().toISOString() },
      });
    } catch (error) {
      console.error("Error getting marketplace stats:", error);
      res.status(500).json({
        success: false,
        data: null,
        error: { message: "Error al obtener estadísticas" },
      });
    }
  }
);

router.get(
  "/admin/products",
  auth,
  requireRole(["admin", "moderator"]),
  async (req, res) => {
    try {
      // Para admin, traer TODOS los productos (activos e inactivos)
      const products = await ProductModel.find({})
        .sort({ createdAt: -1 })
        .lean();
      res.json({
        success: true,
        data: products,
        error: null,
        meta: {
          timestamp: new Date().toISOString(),
          pagination: { page: 1, limit: 50, total: products.length },
        },
      });
    } catch (error) {
      res
        .status(500)
        .json({
          success: false,
          data: null,
          error: { message: "Error al obtener productos" },
        });
    }
  }
);

router.post(
  "/admin/products",
  auth,
  requireRole(["admin"]),
  validateBody(createProductSchema),
  ...uploadImage("imageUrl", "products"),
  async (req, res) => {
    try {
      const newProduct = await ProductModel.create(req.body);
      res.status(201).json({
        success: true,
        data: newProduct,
        error: null,
        meta: {
          timestamp: new Date().toISOString(),
          message: "Producto creado exitosamente",
        },
      });
    } catch (error) {
      console.error("Error creating product:", error);
      res
        .status(500)
        .json({
          success: false,
          data: null,
          error: { message: "Error al crear producto" },
        });
    }
  }
);

router.put(
  "/admin/products/:id",
  auth,
  requireRole(["admin"]),
  validateBody(updateProductSchema),
  ...uploadImage("imageUrl", "products"),
  async (req, res) => {
    try {
      const { id } = req.params;

      // Obtener imagen anterior antes de actualizar
      const existing = await ProductModel.findById(id);
      const oldImageUrl = existing?.imageUrl;

      const updated = await ProductModel.findByIdAndUpdate(id, req.body, { new: true });
      if (!updated) {
        return res.status(404).json({ success: false, data: null, error: { message: 'Producto no encontrado' } });
      }

      // Eliminar imagen anterior si se subió una nueva
      if (req.file && oldImageUrl) {
        await deleteOldImage(oldImageUrl);
      }

      res.json({ success: true, data: updated, error: null, meta: { timestamp: new Date().toISOString() } });
    } catch (error) {
      res.status(500).json({ success: false, data: null, error: { message: 'Error al actualizar producto' } });
    }
  }
);

router.delete(
  "/admin/products/:id",
  auth,
  requireRole(["admin"]),
  async (req, res) => {
    try {
      const { id } = req.params;

      // Verificar si el producto existe
      const product = await ProductModel.findById(id);
      if (!product) {
        return res
          .status(404)
          .json({
            success: false,
            data: null,
            error: { message: "Producto no encontrado" },
          });
      }

      // Verificar si hay canjes pendientes o confirmados
      const { RedemptionModel } = require("../models/marketplace.model");
      const pendingRedemptions = await RedemptionModel.countDocuments({
        productId: id,
        status: { $in: ['pending', 'confirmed'] }
      });

      if (pendingRedemptions > 0) {
        return res
          .status(400)
          .json({
            success: false,
            data: null,
            error: {
              message: `No se puede eliminar el producto. Tiene ${pendingRedemptions} canje(s) pendiente(s) o confirmado(s). Solo puedes eliminar productos cuando todos sus canjes estén entregados.`,
              code: 'HAS_PENDING_REDEMPTIONS',
              details: {
                pendingRedemptions
              }
            },
          });
      }

      // Si no hay canjes pendientes/confirmados, permitir eliminar
      await ProductModel.findByIdAndDelete(id);

      res.json({
        success: true,
        data: { id },
        error: null,
        meta: {
          timestamp: new Date().toISOString(),
          message: "Producto eliminado exitosamente",
        },
      });
    } catch (error) {
      console.error("Error deleting product:", error);
      res
        .status(500)
        .json({
          success: false,
          data: null,
          error: { message: "Error al eliminar producto" },
        });
    }
  }
);

router.get(
  "/admin/redemptions",
  auth,
  requireRole(["admin", "staff"]),
  async (req, res) => {
    try {
      const { RedemptionModel } = require("../models/marketplace.model");
      const redemptions = await RedemptionModel.find()
        .populate("userId", "displayName phone email")
        .populate("productId", "name provider category")
        .sort({ createdAt: -1 })
        .lean();

      res.json({
        success: true,
        data: redemptions,
        error: null,
        meta: {
          timestamp: new Date().toISOString(),
          pagination: { page: 1, limit: 50, total: redemptions.length },
        },
      });
    } catch (error) {
      console.error("Error getting redemptions:", error);
      res
        .status(500)
        .json({
          success: false,
          data: null,
          error: { message: "Error al obtener canjes" },
        });
    }
  }
);

// Confirmar canje por código (Admin)
router.post(
  "/admin/redemptions/confirm-by-code",
  auth,
  requireRole(["admin", "staff", "moderator"]),
  async (req, res) => {
    try {
      const { code } = req.body;

      if (!code) {
        return res.status(400).json({
          success: false,
          data: null,
          error: { message: "El código es requerido" },
        });
      }

      const { RedemptionModel } = require("../models/marketplace.model");
      const redemption = await RedemptionModel.findOne({ code })
        .populate("userId", "displayName phone email")
        .populate("productId", "name provider category");

      if (!redemption) {
        return res.status(404).json({
          success: false,
          data: null,
          error: { message: "Canje no encontrado" },
        });
      }

      if (redemption.status === "confirmed" || redemption.status === "delivered") {
        return res.json({
          success: true,
          data: redemption,
          error: null,
          meta: {
            timestamp: new Date().toISOString(),
            message: "El canje ya fue confirmado anteriormente",
          },
        });
      }

      redemption.status = "confirmed";
      redemption.confirmedAt = new Date();
      await redemption.save();

      res.json({
        success: true,
        data: redemption,
        error: null,
        meta: {
          timestamp: new Date().toISOString(),
          message: "Canje confirmado exitosamente",
        },
      });
    } catch (error) {
      console.error("Error confirming redemption:", error);
      res.status(500).json({
        success: false,
        data: null,
        error: { message: "Error al confirmar el canje" },
      });
    }
  }
);

// Marcar canje como entregado por código (Admin)
router.post(
  "/admin/redemptions/mark-delivered-by-code",
  auth,
  requireRole(["admin", "staff", "moderator"]),
  async (req, res) => {
    try {
      const { code } = req.body;

      if (!code) {
        return res.status(400).json({
          success: false,
          data: null,
          error: { message: "El código es requerido" },
        });
      }

      const { RedemptionModel } = require("../models/marketplace.model");
      const redemption = await RedemptionModel.findOne({ code })
        .populate("userId", "displayName phone email")
        .populate("productId", "name provider category");

      if (!redemption) {
        return res.status(404).json({
          success: false,
          data: null,
          error: { message: "Canje no encontrado" },
        });
      }

      if (redemption.status === "delivered") {
        return res.json({
          success: true,
          data: redemption,
          error: null,
          meta: {
            timestamp: new Date().toISOString(),
            message: "El canje ya fue marcado como entregado",
          },
        });
      }

      redemption.status = "delivered";
      redemption.deliveredAt = new Date();
      await redemption.save();

      res.json({
        success: true,
        data: redemption,
        error: null,
        meta: {
          timestamp: new Date().toISOString(),
          message: "Canje marcado como entregado exitosamente",
        },
      });
    } catch (error) {
      console.error("Error marking redemption as delivered:", error);
      res.status(500).json({
        success: false,
        data: null,
        error: { message: "Error al marcar el canje como entregado" },
      });
    }
  }
);

// ============================================================================
// ADMIN: CRUD de Ofertas Geográficas
// ============================================================================

router.get(
  "/admin/offers",
  auth,
  requireRole(["admin", "moderator"]),
  async (req, res) => {
    try {
      const { search, category, isActive } = req.query;

      const filter: any = {};

      if (search) {
        filter.$or = [
          { title: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
          { merchantName: { $regex: search, $options: 'i' } },
        ];
      }

      if (category && category !== 'all') {
        filter.category = category;
      }

      if (isActive !== undefined && isActive !== 'undefined') {
        filter.isActive = isActive === 'true';
      }

      const offers = await OfferModel.find(filter)
        .sort({ createdAt: -1 })
        .lean();

      res.json({
        success: true,
        data: offers,
        error: null,
        meta: {
          timestamp: new Date().toISOString(),
          pagination: { page: 1, limit: 50, total: offers.length },
        },
      });
    } catch (error) {
      console.error("Error fetching offers:", error);
      res
        .status(500)
        .json({
          success: false,
          data: null,
          error: { message: "Error al obtener ofertas" },
        });
    }
  }
);

router.post(
  "/admin/offers",
  auth,
  requireRole(["admin"]),
  async (req, res) => {
    try {
      const {
        title,
        description,
        merchantName,
        merchantAddress,
        category,
        discountCode,
        discountPercentage,
        pointsReward,
        expiresAt,
        imageUrl,
        location,
        isActive,
        termsAndConditions,
        maxRedemptions,
      } = req.body;

      // Validaciones básicas
      if (!title || !description || !merchantName || !category || !location) {
        return res.status(400).json({
          success: false,
          data: null,
          error: { message: "Faltan campos obligatorios" },
        });
      }

      // Validar estructura de location
      if (!location.type || !location.coordinates) {
        return res.status(400).json({
          success: false,
          data: null,
          error: { message: "La ubicación debe tener type y coordinates" },
        });
      }

      const offer = await OfferModel.create({
        title,
        description,
        merchantName,
        merchantAddress,
        category,
        discountCode,
        discountPercentage,
        pointsReward,
        expiresAt: expiresAt ? new Date(expiresAt) : undefined,
        imageUrl,
        location,
        isActive: isActive !== false,
        termsAndConditions,
        maxRedemptions,
        currentRedemptions: 0,
      });

      res.status(201).json({
        success: true,
        data: offer,
        error: null,
        meta: {
          timestamp: new Date().toISOString(),
          message: "Oferta creada exitosamente",
        },
      });
    } catch (error) {
      console.error("Error creating offer:", error);
      res.status(500).json({
        success: false,
        data: null,
        error: { message: "Error al crear la oferta" },
      });
    }
  }
);

router.put(
  "/admin/offers/:id",
  auth,
  requireRole(["admin"]),
  async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = req.body;

      // Si hay expiresAt, convertirlo a Date
      if (updateData.expiresAt) {
        updateData.expiresAt = new Date(updateData.expiresAt);
      }

      const offer = await OfferModel.findByIdAndUpdate(
        id,
        { $set: updateData },
        { new: true, runValidators: true }
      );

      if (!offer) {
        return res.status(404).json({
          success: false,
          data: null,
          error: { message: "Oferta no encontrada" },
        });
      }

      res.json({
        success: true,
        data: offer,
        error: null,
        meta: {
          timestamp: new Date().toISOString(),
          message: "Oferta actualizada exitosamente",
        },
      });
    } catch (error) {
      console.error("Error updating offer:", error);
      res.status(500).json({
        success: false,
        data: null,
        error: { message: "Error al actualizar la oferta" },
      });
    }
  }
);

router.patch(
  "/admin/offers/:id/toggle",
  auth,
  requireRole(["admin"]),
  async (req, res) => {
    try {
      const { id } = req.params;

      const offer = await OfferModel.findById(id);
      if (!offer) {
        return res.status(404).json({
          success: false,
          data: null,
          error: { message: "Oferta no encontrada" },
        });
      }

      offer.isActive = !offer.isActive;
      await offer.save();

      res.json({
        success: true,
        data: offer,
        error: null,
        meta: {
          timestamp: new Date().toISOString(),
          message: `Oferta ${offer.isActive ? 'activada' : 'desactivada'} exitosamente`,
        },
      });
    } catch (error) {
      console.error("Error toggling offer:", error);
      res.status(500).json({
        success: false,
        data: null,
        error: { message: "Error al cambiar estado de la oferta" },
      });
    }
  }
);

router.delete(
  "/admin/offers/:id",
  auth,
  requireRole(["admin"]),
  async (req, res) => {
    try {
      const { id } = req.params;

      // Verificar si la oferta existe
      const offer = await OfferModel.findById(id);
      if (!offer) {
        return res.status(404).json({
          success: false,
          data: null,
          error: { message: "Oferta no encontrada" },
        });
      }

      // Verificar si hay canjes de esta oferta
      const redemptionCount = await OfferRedemptionModel.countDocuments({
        offerId: id,
      });

      if (redemptionCount > 0) {
        return res.status(400).json({
          success: false,
          data: null,
          error: {
            message: `No se puede eliminar la oferta. Tiene ${redemptionCount} canje(s) registrado(s).`,
            code: 'HAS_REDEMPTIONS',
            details: { redemptionCount },
          },
        });
      }

      // Si no hay canjes, permitir eliminar
      await OfferModel.findByIdAndDelete(id);

      res.json({
        success: true,
        data: { id },
        error: null,
        meta: {
          timestamp: new Date().toISOString(),
          message: "Oferta eliminada exitosamente",
        },
      });
    } catch (error) {
      console.error("Error deleting offer:", error);
      res.status(500).json({
        success: false,
        data: null,
        error: { message: "Error al eliminar la oferta" },
      });
    }
  }
);

// Upload de imagen para ofertas
router.post(
  "/admin/offers/upload",
  auth,
  requireRole(["admin"]),
  ...uploadImage('file', 'marketplace/offers'),
  async (req, res) => {
    try {
      if (!req.body.file) {
        return res.status(400).json({
          success: false,
          data: null,
          error: { message: "No se proporcionó ningún archivo" },
        });
      }

      res.json({
        success: true,
        data: { url: req.body.file },
        error: null,
        meta: {
          timestamp: new Date().toISOString(),
          message: "Archivo subido exitosamente",
        },
      });
    } catch (error) {
      console.error("Error uploading file:", error);
      res.status(500).json({
        success: false,
        data: null,
        error: { message: "Error al subir el archivo" },
      });
    }
  }
);

export default router;
