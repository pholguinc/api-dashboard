import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth";
import {
  MicroseguroProductModel,
  MicroseguroContractModel,
  MicroseguroClaimModel,
} from "../models/microseguro.model";
import { UserModel } from "../models/user.model";
import { PaymentService } from "../services/payment.service";
import { sendOk, sendError, sendCreated } from "../utils/response";

export class MicrosegurosController {
  // Obtener todos los microseguros disponibles
  static async getMicroseguros(req: AuthenticatedRequest, res: Response) {
    try {
      const { category } = req.query;

      const filters: any = { isActive: true };
      if (category) filters.category = category;

      const microseguros = await (MicroseguroProductModel as any)
        .find(filters)
        .sort({ monthlyPrice: 1 });

      return sendOk(res, microseguros);
    } catch (error) {
      return sendError(res, "Error obteniendo microseguros", 500);
    }
  }

  // Contratar microseguro
  static async contratarMicroseguro(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const { microseguroId } = req.params;
      const { paymentMethod, months = 1 } = req.body;

      const microseguro = await (MicroseguroProductModel as any).findById(
        microseguroId
      );
      if (!microseguro || !microseguro.isActive) {
        return sendError(res, "Microseguro no disponible", 404);
      }

      // Verificar si ya tiene este microseguro activo
      const existingContract = await (MicroseguroContractModel as any).findOne({
        userId,
        microseguroId,
        status: "active",
        endDate: { $gt: new Date() },
      });

      if (existingContract) {
        return sendError(res, "Ya tienes este microseguro activo", 400);
      }

      // Crear contrato
      const startDate = new Date();
      const endDate = new Date(
        startDate.getTime() + months * 30 * 24 * 60 * 60 * 1000
      );

      const contract = new MicroseguroContractModel({
        userId,
        microseguroId,
        status: "active",
        startDate,
        endDate,
        monthlyPrice: microseguro.monthlyPrice,
        paymentMethod,
      });

      await contract.save();

      return sendOk(
        res,
        {
          contract,
          message: "Microseguro contratado exitosamente",
        },
        201
      );
    } catch (error) {
      return sendError(res, "Error contratando microseguro", 500);
    }
  }

  // Obtener microseguros del usuario
  static async getUserMicroseguros(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;

      const contracts = await (MicroseguroContractModel as any)
        .find({ userId })
        .populate("microseguroId")
        .sort({ createdAt: -1 });

      return sendOk(res, contracts);
    } catch (error) {
      return sendError(res, "Error obteniendo microseguros del usuario", 500);
    }
  }

  // ADMIN: Obtener todos los microseguros
  static async getAllMicroseguros(req: AuthenticatedRequest, res: Response) {
    try {
      const { page = 1, limit = 20, category, active } = req.query;

      const filters: any = {};
      if (category) filters.category = category;
      // ⭐ IMPORTANTE: Solo filtrar si viene el parámetro 'active'
      if (active !== undefined) filters.isActive = active === 'true';

      const microseguros = await (MicroseguroProductModel as any).find(filters)
        .sort({ createdAt: -1 })
        .limit(Number(limit))
        .skip((Number(page) - 1) * Number(limit));

      const total = await MicroseguroProductModel.countDocuments(filters);

      return sendOk(res, {
        microseguros,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      });
    } catch (error) {
      return sendError(res, 'Error obteniendo microseguros', 500);
    }
  }

  // ADMIN: Crear microseguro
  static async createMicroseguro(req: AuthenticatedRequest, res: Response) {
    try {
      console.log("📦 Datos recibidos:", req.body); // ⭐ DEBUG

      const microseguroData = req.body;

      // Validación básica
      if (
        !microseguroData.name ||
        !microseguroData.category ||
        !microseguroData.monthlyPrice
      ) {
        return sendError(
          res,
          "Faltan campos requeridos: name, category, monthlyPrice",
          400
        );
      }

      const microseguro = new MicroseguroProductModel(microseguroData);
      await microseguro.save();

      console.log("✅ Microseguro creado:", microseguro._id); // ⭐ DEBUG

      return sendOk(res, microseguro, 201);
    } catch (error: any) {
      console.error("❌ Error creando microseguro:", error); // ⭐ VER ERROR COMPLETO

      // Errores de validación de Mongoose
      if (error.name === "ValidationError") {
        const errors = Object.values(error.errors).map((e: any) => e.message);
        return sendError(
          res,
          `Errores de validación: ${errors.join(", ")}`,
          400
        );
      }

      return sendError(res, "Error creando microseguro", 500);
    }
  }

  // ADMIN: Estadísticas de microseguros
  static async getMicrosegurosStats(req: AuthenticatedRequest, res: Response) {
    try {
      const [
        totalMicroseguros,
        activeMicroseguros,
        totalContracts,
        activeContracts,
        totalClaims,
        pendingClaims,
        monthlyRevenue,
      ] = await Promise.all([
        MicroseguroProductModel.countDocuments(),
        MicroseguroProductModel.countDocuments({ isActive: true }),
        MicroseguroContractModel.countDocuments(),
        MicroseguroContractModel.countDocuments({
          status: "active",
          endDate: { $gt: new Date() },
        }),
        MicroseguroClaimModel.countDocuments(),
        MicroseguroClaimModel.countDocuments({ status: "pending" }),
        MicroseguroContractModel.aggregate([
          {
            $match: {
              status: "active",
              createdAt: {
                $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
              },
            },
          },
          {
            $group: {
              _id: null,
              revenue: { $sum: "$monthlyPrice" },
            },
          },
        ]),
      ]);

      return sendOk(res, {
        totalMicroseguros,
        activeMicroseguros,
        totalContracts,
        activeContracts,
        totalClaims,
        pendingClaims,
        monthlyRevenue: monthlyRevenue[0]?.revenue || 0,
      });
    } catch (error) {
      return sendError(res, "Error obteniendo estadísticas", 500);
    }
  }

  // Contratar microseguro
  static async contractInsurance(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const { microseguroId, paymentMethod, tokenId, duration = 30 } = req.body;

      // Verificar que el microseguro existe
      const microseguro = await (MicroseguroProductModel as any).findOne({
        _id: microseguroId,
        isActive: true,
      });

      if (!microseguro) {
        return sendError(res, "Microseguro no encontrado", 404);
      }

      // Verificar si ya tiene este seguro activo
      const existingContract = await (MicroseguroContractModel as any).findOne({
        userId,
        microseguroId,
        status: "active",
        endDate: { $gt: new Date() },
      });

      if (existingContract) {
        return sendError(res, "Ya tienes este microseguro activo", 400);
      }

      // Obtener datos del usuario
      const user = await UserModel.findById(userId);
      if (!user) {
        return sendError(res, "Usuario no encontrado", 404);
      }

      // Calcular fechas y precio
      const startDate = new Date();
      const endDate = new Date(
        startDate.getTime() + duration * 24 * 60 * 60 * 1000
      );
      const totalPrice = (microseguro.monthlyPrice / 30) * duration; // Precio proporcional

      let transactionId = null;

      // Procesar pago si no es con puntos
      if (paymentMethod === "card" && tokenId) {
        if (!user.email) {
          return sendError(res, "Email requerido para procesar pago", 400);
        }

        const paymentResult = await PaymentService.processInsurancePayment(
          userId,
          tokenId,
          user.email,
          {
            insuranceId: microseguroId,
            price: totalPrice,
            coverage: microseguro.name,
            duration,
          }
        );

        if (!paymentResult.success) {
          return sendError(
            res,
            paymentResult.error || "Error procesando pago",
            400
          );
        }

        transactionId = paymentResult.payment?.transactionId;
      } else if (paymentMethod === "points") {
        // Pagar con puntos (conversión: 1 sol = 100 puntos)
        const pointsRequired = Math.round(totalPrice * 100);

        if (user.pointsSmart < pointsRequired) {
          return sendError(res, "Puntos insuficientes", 400);
        }

        // Descontar puntos
        await UserModel.findByIdAndUpdate(userId, {
          $inc: { pointsSmart: -pointsRequired },
        });

        transactionId = `points_${Date.now()}`;
      }

      // Crear contrato
      const contract = new (MicroseguroContractModel as any)({
        userId,
        microseguroId,
        status: "active",
        startDate,
        endDate,
        monthlyPrice: totalPrice,
        paymentMethod,
        transactionId,
      });

      await contract.save();

      return sendCreated(res, {
        message: "Microseguro contratado exitosamente",
        contract: {
          id: contract._id,
          microseguroName: microseguro.name,
          startDate: contract.startDate,
          endDate: contract.endDate,
          price: contract.monthlyPrice,
          status: contract.status,
        },
      });
    } catch (error) {
      console.error("Error contracting insurance:", error);
      return sendError(res, "Error contratando microseguro", 500);
    }
  }

  // Obtener contratos del usuario
  static async getUserContracts(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const { status, page = 1, limit = 10 } = req.query;

      const filters: any = { userId };
      if (status) filters.status = status;

      const contracts = await (MicroseguroContractModel as any)
        .find(filters)
        .populate(
          "microseguroId",
          "name description category maxCoverage benefits icon color"
        )
        .sort({ createdAt: -1 })
        .limit(Number(limit))
        .skip((Number(page) - 1) * Number(limit));

      const total = await (MicroseguroContractModel as any).countDocuments(
        filters
      );

      // Agregar información calculada
      const contractsWithInfo = contracts.map((contract: any) => ({
        ...contract.toObject(),
        daysRemaining: contract.getDaysRemaining(),
        isActive: contract.isActive,
      }));

      return sendOk(res, {
        contracts: contractsWithInfo,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
      });
    } catch (error) {
      console.error("Error getting user contracts:", error);
      return sendError(res, "Error obteniendo contratos", 500);
    }
  }

  // Crear reclamo
  static async createClaim(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const {
        contractId,
        claimType,
        description,
        claimAmount,
        evidenceFiles = [],
      } = req.body;

      // Verificar que el contrato existe y está activo
      const contract = await (MicroseguroContractModel as any)
        .findOne({
          _id: contractId,
          userId,
          status: "active",
          endDate: { $gt: new Date() },
        })
        .populate("microseguroId");

      if (!contract) {
        return sendError(res, "Contrato no encontrado o inactivo", 404);
      }

      // Verificar que el monto no exceda la cobertura
      if (claimAmount > contract.microseguroId.maxCoverage) {
        return sendError(res, "El monto excede la cobertura máxima", 400);
      }

      // Crear reclamo
      const claim = new (MicroseguroClaimModel as any)({
        contractId,
        userId,
        microseguroId: contract.microseguroId._id,
        claimType,
        description,
        claimAmount,
        evidenceFiles,
      });

      await claim.save();

      // Actualizar contrato
      await (MicroseguroContractModel as any).findByIdAndUpdate(contractId, {
        $inc: { claimsCount: 1 },
        lastClaimDate: new Date(),
      });

      return sendCreated(res, {
        message: "Reclamo creado exitosamente",
        claim: {
          id: claim._id,
          claimType: claim.claimType,
          claimAmount: claim.claimAmount,
          status: claim.status,
          createdAt: claim.createdAt,
        },
      });
    } catch (error) {
      console.error("Error creating claim:", error);
      return sendError(res, "Error creando reclamo", 500);
    }
  }

  // Obtener reclamos del usuario
  static async getUserClaims(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const { status, page = 1, limit = 10 } = req.query;

      const filters: any = { userId };
      if (status) filters.status = status;

      const claims = await (MicroseguroClaimModel as any)
        .find(filters)
        .populate("microseguroId", "name category icon color")
        .populate("contractId", "startDate endDate")
        .sort({ createdAt: -1 })
        .limit(Number(limit))
        .skip((Number(page) - 1) * Number(limit));

      const total = await (MicroseguroClaimModel as any).countDocuments(
        filters
      );

      return sendOk(res, {
        claims,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
      });
    } catch (error) {
      console.error("Error getting user claims:", error);
      return sendError(res, "Error obteniendo reclamos", 500);
    }
  }

  // Cancelar contrato
  static async cancelContract(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const { contractId } = req.params;
      const { reason } = req.body;

      const contract = await (MicroseguroContractModel as any).findOne({
        _id: contractId,
        userId,
        status: "active",
      });

      if (!contract) {
        return sendError(res, "Contrato no encontrado o ya cancelado", 404);
      }

      // Cancelar contrato
      contract.status = "cancelled";
      contract.cancelledAt = new Date();
      contract.cancelReason = reason || "Cancelado por el usuario";
      await contract.save();

      return sendOk(res, {
        message: "Contrato cancelado exitosamente",
        contract: {
          id: contract._id,
          status: contract.status,
          cancelledAt: contract.cancelledAt,
        },
      });
    } catch (error) {
      console.error("Error cancelling contract:", error);
      return sendError(res, "Error cancelando contrato", 500);
    }
  }

  // ========== MÉTODOS DE ADMINISTRACIÓN ==========

  // Procesar reclamo (Admin)
  static async processClaim(req: AuthenticatedRequest, res: Response) {
    try {
      const { claimId } = req.params;
      const { status, adminNotes } = req.body;
      const processedBy = req.user?.id;

      const claim = await (MicroseguroClaimModel as any).findById(claimId);
      if (!claim) {
        return sendError(res, "Reclamo no encontrado", 404);
      }

      // Actualizar reclamo
      claim.status = status;
      claim.adminNotes = adminNotes;
      claim.processedAt = new Date();
      claim.processedBy = processedBy;
      await claim.save();

      return sendOk(res, {
        message: "Reclamo procesado exitosamente",
        claim: {
          id: claim._id,
          status: claim.status,
          processedAt: claim.processedAt,
        },
      });
    } catch (error) {
      console.error("Error processing claim:", error);
      return sendError(res, "Error procesando reclamo", 500);
    }
  }

  // Obtener todos los reclamos (Admin)
  static async getAllClaims(req: AuthenticatedRequest, res: Response) {
    try {
      const { status, page = 1, limit = 20 } = req.query;

      const filters: any = {};
      if (status) filters.status = status;

      const claims = await (MicroseguroClaimModel as any)
        .find(filters)
        .populate("userId", "displayName phone email")
        .populate("microseguroId", "name category")
        .populate("processedBy", "displayName")
        .sort({ createdAt: -1 })
        .limit(Number(limit))
        .skip((Number(page) - 1) * Number(limit));

      const total = await (MicroseguroClaimModel as any).countDocuments(
        filters
      );

      return sendOk(res, {
        claims,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
      });
    } catch (error) {
      console.error("Error getting all claims:", error);
      return sendError(res, "Error obteniendo reclamos", 500);
    }
  }

  // Obtener estadísticas (método faltante)
  static async getStats(req: AuthenticatedRequest, res: Response) {
    try {
      const [totalProducts, activeContracts, totalClaims, pendingClaims] =
        await Promise.all([
          (MicroseguroProductModel as any).countDocuments({ isActive: true }),
          (MicroseguroContractModel as any).countDocuments({
            status: "active",
          }),
          (MicroseguroClaimModel as any).countDocuments(),
          (MicroseguroClaimModel as any).countDocuments({ status: "pending" }),
        ]);

      return sendOk(res, {
        totalProducts,
        activeContracts,
        totalClaims,
        pendingClaims,
      });
    } catch (error) {
      return sendError(res, "Error obteniendo estadísticas", 500);
    }
  }

  // En microseguros.controller.ts

  // Actualizar microseguro
  static async updateMicroseguro(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const microseguro = await (
        MicroseguroProductModel as any
      ).findByIdAndUpdate(id, updateData, { new: true, runValidators: true });

      if (!microseguro) {
        return sendError(res, "Microseguro no encontrado", 404);
      }

      return sendOk(res, microseguro);
    } catch (error) {
      console.error("Error updating microseguro:", error);
      return sendError(res, "Error actualizando microseguro", 500);
    }
  }

  // Eliminar microseguro
  static async deleteMicroseguro(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;

      const microseguro = await (
        MicroseguroProductModel as any
      ).findByIdAndDelete(id);

      if (!microseguro) {
        return sendError(res, "Microseguro no encontrado", 404);
      }

      return sendOk(res, { message: "Microseguro eliminado exitosamente" });
    } catch (error) {
      console.error("Error deleting microseguro:", error);
      return sendError(res, "Error eliminando microseguro", 500);
    }
  }

  static async uploadFile(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.file) {
        return sendError(res, "No se proporcionó archivo", 400);
      }

      const fileUrl = `/uploads/microseguros/${req.file.filename}`;

      return sendOk(res, {
        url: fileUrl,
        filename: req.file.filename,
      });
    } catch (error) {
      console.error("Error uploading file:", error);
      return sendError(res, "Error subiendo archivo", 500);
    }
  }

  // Cambiar estado (activar/desactivar)
  static async toggleStatus(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const { isActive } = req.body;

      const microseguro = await (
        MicroseguroProductModel as any
      ).findByIdAndUpdate(id, { isActive }, { new: true });

      if (!microseguro) {
        return sendError(res, "Microseguro no encontrado", 404);
      }

      return sendOk(res, {
        message: `Microseguro ${
          isActive ? "activado" : "desactivado"
        } exitosamente`,
        microseguro,
      });
    } catch (error) {
      console.error("Error toggling status:", error);
      return sendError(res, "Error cambiando estado", 500);
    }
  }
}
