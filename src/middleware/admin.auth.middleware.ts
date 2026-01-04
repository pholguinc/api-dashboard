import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AppError } from '../utils/AppError';

interface AdminAuthRequest extends Request {
  user?: {
    id: string;
    phone: string;
    role: string;
    displayName?: string;
  };
}

/**
 * Middleware para autenticación de administradores
 * Verifica que el usuario tenga rol de admin y token válido
 */
export const adminAuthMiddleware = async (
  req: AdminAuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('Token de acceso requerido', 401);
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    if (!token) {
      throw new AppError('Token no proporcionado', 401);
    }

    // Verificar el token JWT
    let decoded: any;
    try {
      decoded = jwt.verify(token, env.jwtSecret);
    } catch (error) {
      throw new AppError('Token inválido o expirado', 401);
    }

    // Verificar que el usuario tenga rol de administrador
    if (decoded.role !== 'admin') {
      throw new AppError('Acceso denegado. Se requieren permisos de administrador', 403);
    }

    // Agregar información del usuario al request
    req.user = {
      id: decoded.id,
      phone: decoded.phone,
      role: decoded.role,
      displayName: decoded.displayName
    };

    next();
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        success: false,
        data: null,
        error: {
          message: error.message,
          code: error.statusCode
        },
        meta: {
          timestamp: new Date().toISOString()
        }
      });
    } else {
      res.status(500).json({
        success: false,
        data: null,
        error: {
          message: 'Error interno del servidor',
          code: 500
        },
        meta: {
          timestamp: new Date().toISOString()
        }
      });
    }
  }
};

/**
 * Middleware opcional para verificar permisos específicos
 */
export const requireAdminPermission = (permission: string) => {
  return (req: AdminAuthRequest, res: Response, next: NextFunction) => {
    // Por ahora, todos los admins tienen todos los permisos
    // En el futuro se puede implementar un sistema más granular
    if (req.user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        data: null,
        error: {
          message: 'Permisos insuficientes',
          code: 403
        },
        meta: {
          timestamp: new Date().toISOString()
        }
      });
    }
    next();
  };
};
