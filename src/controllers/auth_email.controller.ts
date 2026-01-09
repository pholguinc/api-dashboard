import bcrypt from "bcryptjs";
import { Request, Response } from "express";
import { sendError, sendOk } from "../utils/response";
import { UserModel } from "../models/user.model";
import jwt from "jsonwebtoken";
import { env } from "../config/env";

// Método para generar JWT token
function generateToken(user: any): string {
    return jwt.sign(
        {
            id: user._id.toString(),
            userId: user._id.toString(),
            role: user.role,
            metroUsername: user.metroUsername || null,
            displayName: user.displayName || null,
            avatar: user.avatarUrl || null,
        },
        env.jwtSecret,
        { expiresIn: "7d" }
    );
}

/**
 * Login con email y PIN (sin OTP)
 * Autentica usuarios ya registrados
 */
export async function loginEmail(req: Request, res: Response) {
    try {
        const { email, pin } = req.body;

        const user = await UserModel.findOne({ email });

        if (!user) {
            return sendError(res, "Usuario no registrado", 401, "USER_NOT_FOUND");
        }

        // Verificar si está activo
        if (user.isActive === false) {
            return sendError(
                res,
                "Cuenta desactivada. Contacta a soporte.",
                403,
                "ACCOUNT_DEACTIVATED"
            );
        }

        // Verificar PIN
        const pinValid = await bcrypt.compare(pin, user.pinHash || "");
        if (!pinValid) {
            return sendError(res, "Credenciales inválidas", 401, "INVALID_CREDENTIALS");
        }

        // Verificar que sea admin (dashboard es solo para admins)
        const allowedRoles = ['admin', 'moderator', 'staff'];
        if (!allowedRoles.includes(user.role)) {
            return sendError(
                res,
                "Acceso denegado. Este portal es solo para administradores.",
                403,
                "ACCESS_DENIED"
            );
        }

        const token = generateToken(user);

        return sendOk(res, {
            token,
            user: {
                id: user._id,
                displayName: user.displayName,
                role: user.role,
                pointsSmart: user.pointsSmart,
                hasMetroPremium: user.hasMetroPremium,
                metroPremiumExpiry: user.metroPremiumExpiry,
                avatarUrl: user.avatarUrl,
                isProfileComplete: user.isProfileComplete,
                metroUsername: user.metroUsername,
                fullName: user.fullName,
                dni: user.dni,
                birthDate: user.birthDate,
                email: user.email,
                phone: user.phone,
            },
        });
    } catch (error) {
        console.error("Error in loginEmail:", error);
        return sendError(res, "Error al iniciar sesión", 500, "LOGIN_ERROR");
    }
}

/**
 * Registrar nuevo usuario admin/staff
 * Crea un nuevo usuario con rol admin, moderator, o staff
 */
export async function registerAdmin(req: Request, res: Response) {
    try {
        const {
            email,
            pin,
            fullName,
            metroUsername,
            dni,
            birthDate,
            phone
        } = req.body;

        // Forzar rol admin (el usuario no puede elegir su rol)
        const role = 'admin';
        const existingEmail = await UserModel.findOne({ email });
        if (existingEmail) {
            return sendError(res, "El email ya está registrado", 400, "EMAIL_ALREADY_EXISTS");
        }

        // Verificar si el metroUsername ya existe
        if (metroUsername) {
            const existingUsername = await UserModel.findOne({ metroUsername });
            if (existingUsername) {
                return sendError(res, "El nombre de usuario ya está en uso", 400, "USERNAME_ALREADY_EXISTS");
            }
        }

        // Validar que el rol sea uno permitido para dashboard
        const allowedRoles = ['admin', 'moderator', 'staff'];
        if (!allowedRoles.includes(role)) {
            return sendError(
                res,
                "Rol inválido. Solo se permiten: admin, moderator, staff",
                400,
                "INVALID_ROLE"
            );
        }

        // Hash del PIN
        const pinHash = await bcrypt.hash(pin, env.security.bcryptRounds);

        // Crear usuario
        const user = await UserModel.create({
            email,
            pinHash,
            fullName,
            displayName: fullName || metroUsername,
            metroUsername,
            role,
            dni,
            birthDate,
            phone,
            isActive: true,
            isProfileComplete: true,
            pointsSmart: 0
        });

        const token = generateToken(user);

        return sendOk(res, {
            message: "Usuario creado exitosamente",
            token,
            user: {
                id: user._id,
                displayName: user.displayName,
                role: user.role,
                pointsSmart: user.pointsSmart,
                avatarUrl: user.avatarUrl,
                isProfileComplete: user.isProfileComplete,
                metroUsername: user.metroUsername,
                fullName: user.fullName,
                dni: user.dni,
                birthDate: user.birthDate,
                email: user.email,
                phone: user.phone,
            },
        }, 201);
    } catch (error) {
        console.error("Error in registerAdmin:", error);
        return sendError(res, "Error al registrar usuario", 500, "REGISTER_ERROR");
    }
}

