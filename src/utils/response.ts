import { Response } from 'express';

export type ApiError = {
  message: string;
  code?: string;
  details?: any;
};

export type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type ApiResponse<T> = {
  success: boolean;
  data: T | null;
  error: ApiError | null;
  meta?: {
    pagination?: PaginationMeta;
    timestamp: string;
    [key: string]: any;
  };
};

export function sendOk<T>(res: Response, data: T, statusCode: number = 200, meta?: any): Response {
  const payload: ApiResponse<T> = { 
    success: true, 
    data, 
    error: null,
    meta: {
      timestamp: new Date().toISOString(),
      ...meta
    }
  };
  return res.status(statusCode).json(payload);
}

export function sendError(res: Response, message: string, statusCode: number = 400, code?: string, details?: any): Response {
  const payload: ApiResponse<null> = { 
    success: false, 
    data: null, 
    error: { message, code, details },
    meta: {
      timestamp: new Date().toISOString()
    }
  };
  return res.status(statusCode).json(payload);
}

export function sendPaginated<T>(
  res: Response,
  data: T[],
  page: number,
  limit: number,
  total: number,
  statusCode: number = 200
): Response {
  const totalPages = Math.ceil(total / limit);
  return sendOk(res, data, statusCode, {
    pagination: { page, limit, total, totalPages }
  });
}

export function sendCreated<T>(res: Response, data: T, message?: string): Response {
  return sendOk(res, data, 201, { message: message || 'Recurso creado exitosamente' });
}

export function sendNoContent(res: Response): Response {
  return res.status(204).send();
}


