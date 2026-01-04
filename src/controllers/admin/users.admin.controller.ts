import { Request, Response } from "express";
import { UserModel } from "../../models/user.model";
import {
  sendOk,
  sendError,
  sendNoContent,
  sendCreated,
} from "../../utils/response";
import bcrypt from "bcryptjs";

export async function listUsers(req: Request, res: Response) {
  try {
    const { page = 1, limit = 10, search, role, status } = req.query as any;
    const filter: any = {};

    // Role filter mapping (treat 'premium' as hasMetroPremium)
    if (role) {
      if (role === "premium") {
        filter.hasMetroPremium = true;
      } else {
        filter.role = role;
      }
    }

    // Status filter mapping
    if (status) {
      if (status === "active") filter.isActive = true;
      if (status === "inactive") filter.isActive = false;
    }

    if (search) {
      filter.$or = [
        { displayName: { $regex: search, $options: "i" } },
        { metroUsername: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }
    const skip = (Number(page) - 1) * Number(limit);
    const [users, total] = await Promise.all([
      UserModel.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      UserModel.countDocuments(filter),
    ]);

    const mapped = users.map((u: any) => ({
      id: u._id,
      name: u.displayName,
      username: u.metroUsername || "",
      phone: u.phone || "",
      email: u.email || "",
      role: u.hasMetroPremium ? "premium" : u.role,
      status: u.isActive ? "active" : "inactive",
      points: u.pointsSmart ?? 0,
      joinDate: u.createdAt,
    }));

    return sendOk(res, {
      users: mapped,
      pagination: { page: Number(page), limit: Number(limit), total },
    });
  } catch (e) {
    return sendError(res, "Error listando usuarios", 500);
  }
}

export async function createUser(req: Request, res: Response) {
  try {
    const {
      phone,
      pin,
      displayName,
      role,
      metroUsername,
      fullName,
      email,
      pointsSmart = 0,
      isProfileComplete = true,
    } = req.body;

    // Validar campos requeridos
    if (!phone || !pin || !displayName || !role) {
      return sendError(
        res,
        "Campos requeridos: phone, pin, displayName, role",
        400
      );
    }

    // Validar que el teléfono no exista
    const existingUser = await UserModel.findOne({ phone });
    if (existingUser) {
      return sendError(
        res,
        "Ya existe un usuario con ese número de teléfono",
        400
      );
    }

    // Validar que el username no exista (si se proporciona)
    if (metroUsername) {
      const existingUsername = await UserModel.findOne({ metroUsername });
      if (existingUsername) {
        return sendError(
          res,
          "Ya existe un usuario con ese nombre de usuario",
          400
        );
      }
    }

    // Hash del PIN
    const pinHash = await bcrypt.hash(pin, 12);

    // Crear perfil de streamer si el rol es metro_streamer
    let streamerProfile = undefined;
    if (role === "metro_streamer") {
      streamerProfile = {
        isVerified: true,
        followers: 0,
        totalStreams: 0,
        totalViewers: 0,
        totalDonations: 0,
        streamingHours: 0,
        averageViewers: 0,
        categories: ["IRL"],
        bio: "Nuevo streamer de Metro de Lima",
        socialLinks: {
          instagram: "",
          tiktok: "",
          youtube: "",
          twitch: "",
        },
        streamingEquipment: {
          camera: "Móvil",
          microphone: "Integrado",
          internet: "4G",
        },
        preferredStations: [],
        streamingSchedule: [],
      };
    }

    // Crear usuario
    const newUser = await UserModel.create({
      phone,
      pinHash,
      displayName,
      role,
      metroUsername,
      fullName,
      email,
      pointsSmart,
      isProfileComplete,
      isActive: true,
      streamerProfile,
    });

    const user = {
      id: newUser._id,
      name: newUser.displayName,
      username: newUser.metroUsername || "",
      phone: newUser.phone || "",
      email: newUser.email || "",
      role: newUser.role,
      status: "active",
      points: newUser.pointsSmart ?? 0,
      joinDate: newUser.createdAt,
    };

    return sendCreated(res, user, "Usuario creado exitosamente");
  } catch (error) {
    console.error("Error creating user:", error);
    return sendError(res, "Error al crear usuario", 500);
  }
}

export async function getUserById(req: Request, res: Response) {
  try {
    const u: any = await UserModel.findById(req.params.id).lean();
    if (!u) return sendError(res, "Usuario no encontrado", 404);
    const user = {
      id: u._id,
      name: u.displayName,
      username: u.metroUsername || "",
      phone: u.phone || "",
      email: u.email || "",
      role: u.hasMetroPremium ? "premium" : u.role,
      status: u.isActive ? "active" : "inactive",
      points: u.pointsSmart ?? 0,
      joinDate: u.createdAt,
    };
    return sendOk(res, user);
  } catch (e) {
    return sendError(res, "Error obteniendo usuario", 500);
  }
}

export async function updateUser(req: Request, res: Response) {
  try {
    const {
      displayName,
      metroUsername,
      fullName,
      email,
      phone,
      role,
      status,
      pin,
      avatarUrl,
      pointsDelta,
    } = req.body as any;

    const update: any = {};

    // Display name
    if (displayName) {
      update.displayName = displayName;
    }

    // Username
    if (metroUsername) {
      // Verificar que no exista otro usuario con ese username
      const existingUser = await UserModel.findOne({
        metroUsername,
        _id: { $ne: req.params.id },
      });
      if (existingUser) {
        return sendError(
          res,
          "Ya existe un usuario con ese nombre de usuario",
          400
        );
      }
      update.metroUsername = metroUsername;
    }

    // Full name
    if (fullName) {
      update.fullName = fullName;
    }

    // Email
    if (email) {
      update.email = email;
    }

    // Phone
    if (phone) {
      // Verificar que no exista otro usuario con ese teléfono
      const existingPhone = await UserModel.findOne({
        phone,
        _id: { $ne: req.params.id },
      });
      if (existingPhone) {
        return sendError(
          res,
          "Ya existe un usuario con ese número de teléfono",
          400
        );
      }
      update.phone = phone;
    }

    // Avatar
    if (avatarUrl) {
      update.avatarUrl = avatarUrl;
    }

    // PIN (solo si se proporciona uno nuevo)
    if (pin) {
      update.pinHash = await bcrypt.hash(pin, 12);
    }

    // Role handling
    if (role) {
      const allowedRoles = [
        "user",
        "admin",
        "moderator",
        "staff",
        "metro_streamer",
      ];
      if (role === "premium") {
        update.hasMetroPremium = true;
      } else if (role === "user") {
        update.hasMetroPremium = false;
        update.role = "user";
      } else if (allowedRoles.includes(role)) {
        update.role = role;
      }
    }

    // Status handling
    if (status) {
      if (status === "active") {
        update.isActive = true;
        update.deactivatedAt = null;
      } else if (status === "inactive") {
        update.isActive = false;
        update.deactivatedAt = new Date();
      }
    }

    // Points delta
    if (typeof pointsDelta === "number" && pointsDelta !== 0) {
      update.$inc = { pointsSmart: pointsDelta };
      if (pointsDelta > 0) {
        update.$inc.totalPointsEarned = pointsDelta;
      }
    }

    const u: any = await UserModel.findByIdAndUpdate(req.params.id, update, {
      new: true,
    });
    if (!u) return sendError(res, "Usuario no encontrado", 404);

    const user = {
      id: u._id,
      name: u.displayName,
      username: u.metroUsername || "",
      phone: u.phone || "",
      email: u.email || "",
      role: u.hasMetroPremium ? "premium" : u.role,
      status: u.isActive ? "active" : "inactive",
      points: u.pointsSmart ?? 0,
      joinDate: u.createdAt,
    };
    return sendOk(res, user);
  } catch (e) {
    console.error("Error actualizando usuario:", e);
    return sendError(res, "Error actualizando usuario", 500);
  }
}

export async function deleteUser(req: Request, res: Response) {
  try {
    const userId = req.params.id;

    // Verificar que el usuario existe
    const existingUser = await UserModel.findById(userId);
    if (!existingUser) {
      return sendError(res, "Usuario no encontrado", 404);
    }

    // Verificar que no sea el mismo usuario que está haciendo la eliminación
    const currentUserId = (req as any).user?.id;
    if (currentUserId === userId) {
      return sendError(res, "No puedes eliminar tu propia cuenta", 400);
    }

    // Eliminar físicamente el usuario de la base de datos
    await UserModel.findByIdAndDelete(userId);

    return sendOk(res, { message: "Usuario eliminado exitosamente" });
  } catch (e) {
    console.error("Error in deleteUser:", e);
    return sendError(res, "Error eliminando usuario", 500);
  }
}

export async function getUserStats(_req: Request, res: Response) {
  try {
    const [total, active, premium] = await Promise.all([
      UserModel.countDocuments(),
      UserModel.countDocuments({ isActive: true }),
      UserModel.countDocuments({ hasMetroPremium: true }),
    ]);
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const newLast7d = await UserModel.countDocuments({
      createdAt: { $gte: weekAgo },
    });
    return sendOk(res, { total, active, premium, newLast7d });
  } catch (e) {
    return sendError(res, "Error obteniendo estadísticas", 500);
  }
}
