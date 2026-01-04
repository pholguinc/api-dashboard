import { Request, Response, NextFunction } from 'express';

/**
 * Middleware para verificar si RADIO.ai está habilitado
 */
export const radioAiFeatureFlag = (req: Request, res: Response, next: NextFunction) => {
  const radioAiEnabled = process.env.RADIO_AI_ENABLED === 'true';
  
  if (!radioAiEnabled) {
    return res.status(503).json({
      success: false,
      error: 'RADIO.ai no está disponible en este momento',
      code: 'FEATURE_DISABLED'
    });
  }
  
  next();
};

/**
 * Middleware para validar entrada de análisis de ánimo
 */
export const validateMoodInput = (req: Request, res: Response, next: NextFunction) => {
  const { input, method } = req.body;
  
  if (!input || typeof input !== 'string' || input.trim().length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Input es requerido y debe ser un texto válido'
    });
  }
  
  if (input.length > 500) {
    return res.status(400).json({
      success: false,
      error: 'Input no puede exceder 500 caracteres'
    });
  }
  
  const validMethods = ['voice', 'text', 'selection'];
  if (method && !validMethods.includes(method)) {
    return res.status(400).json({
      success: false,
      error: `Método debe ser uno de: ${validMethods.join(', ')}`
    });
  }
  
  next();
};

/**
 * Middleware para validar parámetros de generación de música
 */
export const validateMusicGeneration = (req: Request, res: Response, next: NextFunction) => {
  const { mood, intensity } = req.body;
  
  const validMoods = [
    'triste', 'feliz', 'enojado', 'relajado', 
    'pensativo', 'motivado', 'nostalgico', 'energico'
  ];
  
  if (!mood || !validMoods.includes(mood)) {
    return res.status(400).json({
      success: false,
      error: `Mood debe ser uno de: ${validMoods.join(', ')}`
    });
  }
  
  if (!intensity || typeof intensity !== 'number' || intensity < 1 || intensity > 10) {
    return res.status(400).json({
      success: false,
      error: 'Intensity debe ser un número entre 1 y 10'
    });
  }
  
  next();
};

/**
 * Middleware para validar feedback del usuario
 */
export const validateFeedback = (req: Request, res: Response, next: NextFunction) => {
  const { session_id, liked, rating } = req.body;
  
  if (!session_id || typeof session_id !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'session_id es requerido'
    });
  }
  
  if (liked === undefined || typeof liked !== 'boolean') {
    return res.status(400).json({
      success: false,
      error: 'liked es requerido y debe ser boolean'
    });
  }
  
  if (rating !== undefined && (typeof rating !== 'number' || rating < 1 || rating > 5)) {
    return res.status(400).json({
      success: false,
      error: 'rating debe ser un número entre 1 y 5'
    });
  }
  
  next();
};

/**
 * Middleware para rate limiting específico de RADIO.ai
 */
export const radioAiRateLimit = (req: Request, res: Response, next: NextFunction) => {
  // Implementación básica de rate limiting
  // En producción se debería usar Redis o similar
  
  const userKey = req.ip || 'anonymous';
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minuto
  const maxRequests = 10; // máximo 10 requests por minuto
  
  // Simular almacenamiento en memoria (en producción usar Redis)
  if (!global.radioAiRateLimit) {
    global.radioAiRateLimit = new Map();
  }
  
  const userRequests = global.radioAiRateLimit.get(userKey) || [];
  const recentRequests = userRequests.filter((timestamp: number) => now - timestamp < windowMs);
  
  if (recentRequests.length >= maxRequests) {
    return res.status(429).json({
      success: false,
      error: 'Demasiadas solicitudes. Intenta de nuevo en un minuto.',
      code: 'RATE_LIMIT_EXCEEDED'
    });
  }
  
  recentRequests.push(now);
  global.radioAiRateLimit.set(userKey, recentRequests);
  
  next();
};

/**
 * Middleware para logging de actividad de RADIO.ai
 */
export const radioAiLogger = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  
  // Log de request
  console.log(`🎵 RADIO.ai ${req.method} ${req.path} - ${new Date().toISOString()}`);
  
  // Interceptar response para logging
  const originalSend = res.send;
  res.send = function(data) {
    const duration = Date.now() - startTime;
    const success = res.statusCode < 400;
    
    console.log(`🎵 RADIO.ai ${req.method} ${req.path} - ${res.statusCode} - ${duration}ms - ${success ? '✅' : '❌'}`);
    
    return originalSend.call(this, data);
  };
  
  next();
};

/**
 * Middleware para manejo de errores específicos de RADIO.ai
 */
export const radioAiErrorHandler = (error: any, req: Request, res: Response, next: NextFunction) => {
  console.error('🚨 RADIO.ai Error:', error);
  
  // Errores específicos de Suno AI
  if (error.message?.includes('Suno AI')) {
    return res.status(503).json({
      success: false,
      error: 'Servicio de generación de música temporalmente no disponible',
      code: 'SUNO_AI_ERROR'
    });
  }
  
  // Errores de OpenAI
  if (error.message?.includes('OpenAI')) {
    return res.status(503).json({
      success: false,
      error: 'Servicio de análisis de ánimo temporalmente no disponible',
      code: 'OPENAI_ERROR'
    });
  }
  
  // Error genérico
  res.status(500).json({
    success: false,
    error: 'Error interno en RADIO.ai',
    code: 'INTERNAL_ERROR'
  });
};
