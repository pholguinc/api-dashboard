/**
 * Clase personalizada para manejo de errores de la aplicación
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    
    // Mantener el stack trace correcto
    Error.captureStackTrace(this, this.constructor);
    
    // Establecer el nombre del error
    this.name = this.constructor.name;
  }

  /**
   * Crear un error de validación (400)
   */
  static badRequest(message: string = 'Solicitud inválida'): AppError {
    return new AppError(message, 400);
  }

  /**
   * Crear un error de autenticación (401)
   */
  static unauthorized(message: string = 'No autorizado'): AppError {
    return new AppError(message, 401);
  }

  /**
   * Crear un error de permisos (403)
   */
  static forbidden(message: string = 'Acceso denegado'): AppError {
    return new AppError(message, 403);
  }

  /**
   * Crear un error de recurso no encontrado (404)
   */
  static notFound(message: string = 'Recurso no encontrado'): AppError {
    return new AppError(message, 404);
  }

  /**
   * Crear un error de conflicto (409)
   */
  static conflict(message: string = 'Conflicto'): AppError {
    return new AppError(message, 409);
  }

  /**
   * Crear un error interno del servidor (500)
   */
  static internal(message: string = 'Error interno del servidor'): AppError {
    return new AppError(message, 500);
  }

  /**
   * Convertir a objeto JSON para respuestas de API
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      statusCode: this.statusCode,
      isOperational: this.isOperational,
      stack: process.env.NODE_ENV === 'development' ? this.stack : undefined
    };
  }
}
