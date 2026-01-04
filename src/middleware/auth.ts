import { NextFunction, Request, Response } from 'express';
import * as jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { sendError } from '../utils/response';

export type UserRole = 'user' | 'admin' | 'moderator' | 'staff' | 'metro_streamer';

export interface JwtUserPayload {
  id: string;
  role: UserRole;
}

export interface AuthenticatedRequest extends Request {
  user?: JwtUserPayload;
}

export function authenticateJwt(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers['authorization'];
    const bearerToken = (authHeader && authHeader.startsWith('Bearer ')) ? authHeader.substring(7) : undefined;
    const cookieToken = (req as any).cookies?.token as string | undefined;
    const token = bearerToken ?? cookieToken;

    if (!token) {
      sendError(res, 'Unauthorized', 401, 'UNAUTHORIZED');
      return;
    }

    const decoded = jwt.verify(token, env.jwtSecret) as JwtUserPayload;
    req.user = decoded;
    next();
  } catch (err) {
    sendError(res, 'Invalid token', 401, 'INVALID_TOKEN');
  }
}

export function requireRole(roles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    const userRole = req.user?.role;
    if (!userRole || !roles.includes(userRole)) {
      sendError(res, 'Acceso denegado. Rol insuficiente.', 403, 'INSUFFICIENT_ROLE');
      return;
    }
    next();
  };
}

// Alias para compatibilidad
export const auth = authenticateJwt;


