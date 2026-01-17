import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';
import { sendError } from './response';

export const phoneSchema = z.string()
  .min(10, 'Número de teléfono debe tener al menos 10 dígitos')
  .max(15, 'Número de teléfono no puede tener más de 15 dígitos')
  .regex(/^\+?[1-9]\d{1,14}$/, 'Formato de teléfono inválido');

export const pinSchema = z.string()
  .min(4, 'PIN debe tener al menos 4 dígitos')
  .max(6, 'PIN no puede tener más de 6 dígitos')
  .regex(/^\d+$/, 'PIN debe contener solo números');

export const otpSchema = z.string()
  .length(6, 'Código OTP debe tener exactamente 6 dígitos')
  .regex(/^\d+$/, 'Código OTP debe contener solo números');

export const paginationSchema = z.object({
  page: z.coerce.number().min(1, 'La página debe ser mayor a 0').default(1),
  limit: z.coerce.number().min(1).max(100, 'El límite debe estar entre 1 y 100').default(10),
});

export const objectIdSchema = z.string()
  .regex(/^[0-9a-fA-F]{24}$/, 'ID de MongoDB inválido');

// Auth Schemas
export const requestOtpSchema = z.object({
  phone: phoneSchema,
});

export const verifyOtpSchema = z.object({
  phone: phoneSchema,
  code: otpSchema,
});

export const setPinSchema = z.object({
  phone: phoneSchema,
  pin: pinSchema,
});

export const loginPinSchema = z.object({
  phone: phoneSchema,
  pin: pinSchema,
});

export const googleSignInSchema = z.object({
  idToken: z.string().min(10, 'idToken inválido'),
});

export const loginEmailSchema = z.object({
  email: z.string().email('Formato de email inválido'),
  pin: pinSchema,
});

export const registerAdminSchema = z.object({
  email: z.string().email('Formato de email inválido'),
  pin: pinSchema,
  fullName: z.string()
    .min(2, 'Nombre completo debe tener al menos 2 caracteres')
    .max(100, 'Nombre completo no puede tener más de 100 caracteres'),
  metroUsername: z.string()
    .min(3, 'Nombre de usuario debe tener al menos 3 caracteres')
    .max(20, 'Nombre de usuario no puede tener más de 20 caracteres')
    .regex(/^[a-zA-Z0-9_]+$/, 'Solo letras, números y guiones bajos')
    .optional(),
  dni: z.string()
    .length(8, 'DNI debe tener exactamente 8 dígitos')
    .regex(/^\d+$/, 'DNI debe contener solo números')
    .optional(),
  birthDate: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha debe tener formato YYYY-MM-DD')
    .optional(),
  phone: phoneSchema.optional(),
});

export const completeProfileSchema = z.object({
  metroUsername: z.string()
    .min(3, 'Nombre de usuario debe tener al menos 3 caracteres')
    .max(20, 'Nombre de usuario no puede tener más de 20 caracteres')
    .regex(/^[a-zA-Z0-9_]+$/, 'Nombre de usuario solo puede contener letras, números y guiones bajos')
    .optional(),
  fullName: z.string()
    .min(2, 'Nombre completo debe tener al menos 2 caracteres')
    .max(50, 'Nombre completo no puede tener más de 50 caracteres')
    .optional(),
  dni: z.string()
    .length(8, 'DNI debe tener exactamente 8 dígitos')
    .regex(/^\d+$/, 'DNI debe contener solo números')
    .optional(),
  birthDate: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha de nacimiento debe tener formato YYYY-MM-DD')
    .refine(dateStr => {
      const birthDate = new Date(dateStr);
      const currentDate = new Date();

      // Validar que la fecha sea válida
      if (isNaN(birthDate.getTime())) return false;

      // Validar que la fecha no sea futura
      if (birthDate > currentDate) return false;

      // Validar que la persona tenga entre 13 y 100 años
      const age = currentDate.getFullYear() - birthDate.getFullYear();
      const monthDiff = currentDate.getMonth() - birthDate.getMonth();
      const dayDiff = currentDate.getDate() - birthDate.getDate();

      const actualAge = monthDiff < 0 || (monthDiff === 0 && dayDiff < 0) ? age - 1 : age;

      return actualAge >= 13 && actualAge <= 100;
    }, 'Fecha de nacimiento inválida o edad fuera del rango permitido (13-100 años)')
    .optional(),
  email: z.string()
    .email('Formato de email inválido')
    .optional()
});

// Marketplace Schemas
export const createProductSchema = z.object({
  name: z.string().min(1, 'Nombre es requerido').max(100, 'Nombre muy largo'),
  description: z.string().min(1, 'Descripción es requerida').max(500, 'Descripción muy larga'),
  category: z.enum(['digital', 'physical', 'premium', 'food_drink', 'entertainment', 'transport', 'services', 'shopping', 'health', 'education', 'other'], {
    errorMap: () => ({ message: 'Categoría inválida' })
  }),
  pointsCost: z.number().min(1, 'Costo en puntos debe ser mayor a 0'),
  stock: z.number().min(0, 'Stock no puede ser negativo').default(0),
  imageUrl: z.string().min(1, 'URL de imagen es requerida'),
  provider: z.string().min(1, 'Proveedor es requerido'),
  isActive: z.boolean().default(true),
});

export const updateProductSchema = createProductSchema.partial();

export const redeemProductSchema = z.object({
  productId: objectIdSchema,
});

// User Schemas
export const updateUserSchema = z.object({
  displayName: z.string().min(1, 'Nombre es requerido').max(50, 'Nombre muy largo').optional(),
  metroUsername: z.string().min(3).max(20).regex(/^[a-zA-Z0-9_]+$/).optional(),
  fullName: z.string().min(2).max(50).optional(),
  email: z.string().email('Formato de email inválido').optional(),
  phone: phoneSchema.optional(),
  role: z.enum(['user', 'admin', 'moderator', 'staff', 'metro_streamer', 'premium']).optional(),
  status: z.enum(['active', 'inactive']).optional(),
  pin: pinSchema.optional(),
  avatarUrl: z.string().url('URL de avatar inválida').optional(),
  pointsDelta: z.number().optional(), // Para ajustes de puntos
});

// Stream Schemas
export const createStreamSchema = z.object({
  title: z.string().min(1, 'Título es requerido').max(100, 'Título muy largo'),
});

export const sendMessageSchema = z.object({
  roomId: objectIdSchema,
  message: z.string().min(1, 'Mensaje es requerido').max(500, 'Mensaje muy largo'),
});

// Ad Schemas
export const createAdSchema = z.object({
  title: z.string().min(1, 'Título es requerido').max(100, 'Título muy largo'),
  description: z.string().min(1, 'Descripción es requerida').max(500, 'Descripción muy larga'),
  type: z.enum(['banner', 'interstitial', 'video', 'native', 'fullscreen'], {
    errorMap: () => ({ message: 'Tipo debe ser: banner, interstitial, video, native o fullscreen' })
  }),
  placement: z.enum(['home_top', 'home_middle', 'home_bottom', 'marketplace', 'profile', 'streaming', 'fullscreen'], {
    errorMap: () => ({ message: 'Ubicación inválida' })
  }),
  imageUrl: z.string().min(1, 'URL de imagen es requerida'),
  videoUrl: z.string().min(1, 'URL de video es requerida').optional(),
  clickUrl: z.string().url('URL de destino inválida'),
  destination: z.string().optional(),
  budget: z.number().min(0, 'Presupuesto no puede ser negativo'),
  costPerClick: z.number().min(0, 'Costo por clic no puede ser negativo'),
  targetAudience: z.object({
    ageMin: z.number().min(13).max(100).optional(),
    ageMax: z.number().min(13).max(100).optional(),
    gender: z.enum(['male', 'female', 'all']).default('all'),
    interests: z.array(z.string()).optional(),
    location: z.array(z.string()).optional(),
  }).optional(),
  schedule: z.object({
    startDate: z.string().datetime('Fecha de inicio inválida'),
    endDate: z.string().datetime('Fecha de fin inválida'),
    timezone: z.string().default('America/Lima'),
  }),
  status: z.enum(['draft', 'active', 'paused', 'expired']).default('draft'),
  isActive: z.boolean().default(true),
  priority: z.number().min(1).max(10).default(1),
  advertiser: z.string().min(1, 'Anunciante es requerido').max(100, 'Nombre muy largo'),
  duration: z.number().min(5, 'Duración mínima 5 segundos').max(60, 'Duración máxima 60 segundos').default(30),
  skippable: z.boolean().default(true),
}).refine(data => {
  if (data.targetAudience?.ageMin && data.targetAudience?.ageMax) {
    return data.targetAudience.ageMin <= data.targetAudience.ageMax;
  }
  return true;
}, {
  message: 'Edad mínima no puede ser mayor que la edad máxima',
  path: ['targetAudience']
}).refine(data => {
  const startDate = new Date(data.schedule.startDate);
  const endDate = new Date(data.schedule.endDate);
  return startDate < endDate;
}, {
  message: 'Fecha de fin debe ser posterior a la fecha de inicio',
  path: ['schedule']
});

export const updateAdSchema = z.object({
  title: z.string().min(1, 'Título es requerido').max(100, 'Título muy largo').optional(),
  description: z.string().min(1, 'Descripción es requerida').max(500, 'Descripción muy larga').optional(),
  type: z.enum(['banner', 'interstitial', 'video', 'native', 'fullscreen']).optional(),
  placement: z.enum(['home_top', 'home_middle', 'home_bottom', 'marketplace', 'profile', 'streaming', 'fullscreen']).optional(),
  imageUrl: z.string().min(1).optional(),
  videoUrl: z.string().min(1).optional(),
  clickUrl: z.string().url('URL de destino inválida').optional(),
  destination: z.string().optional(),
  status: z.enum(['draft', 'active', 'paused', 'expired']).optional(),
  budget: z.number().min(0, 'Presupuesto no puede ser negativo').optional(),
  costPerClick: z.number().min(0, 'Costo por clic no puede ser negativo').optional(),
  targetAudience: z.object({
    ageMin: z.number().min(13).max(100).optional(),
    ageMax: z.number().min(13).max(100).optional(),
    gender: z.enum(['male', 'female', 'all']).optional(),
    interests: z.array(z.string()).optional(),
    location: z.array(z.string()).optional(),
  }).optional(),
  schedule: z.object({
    startDate: z.string().datetime('Fecha de inicio inválida'),
    endDate: z.string().datetime('Fecha de fin inválida'),
    timezone: z.string().default('America/Lima'),
  }).optional(),
  isActive: z.boolean().optional(),
  priority: z.number().min(1).max(10).optional(),
  advertiser: z.string().min(1, 'Anunciante es requerido').max(100, 'Nombre muy largo').optional(),
});

export const adStatusSchema = z.object({
  status: z.enum(['draft', 'active', 'paused', 'expired'], {
    errorMap: () => ({ message: 'Estado debe ser: draft, active, paused o expired' })
  }),
});

export const adInteractionSchema = z.object({
  type: z.enum(['impression', 'click', 'conversion'], {
    errorMap: () => ({ message: 'Tipo debe ser: impression, click o conversion' })
  }),
  userId: objectIdSchema.optional(),
  metadata: z.record(z.any()).optional(),
});

// Clip Schemas
export const createClipSchema = z.object({
  title: z.string().min(1, 'Título es requerido').max(100, 'Título muy largo'),
  description: z.string().min(1, 'Descripción es requerida').max(500, 'Descripción muy larga'),
  category: z.enum(['comedy', 'music', 'dance', 'food', 'travel', 'news', 'sports', 'education'], {
    errorMap: () => ({ message: 'Categoría debe ser válida' })
  }),
  status: z.enum(['draft', 'active', 'paused', 'reported', 'removed']).default('draft'),
  youtubeId: z.string().min(1, 'ID de video requerido').max(50, 'ID muy largo'),
  youtubeUrl: z.string().url('URL de video inválida'), // Permitir cualquier URL de video
  thumbnailUrl: z.string().url('URL de thumbnail inválida'),
  duration: z.number().min(1, 'Duración mínima 1 segundo').max(180, 'Duración máxima 3 minutos'),
  creator: z.object({
    name: z.string().min(1, 'Nombre del creador requerido').max(100, 'Nombre muy largo'),
    channel: z.string().min(1, 'Canal requerido').max(100, 'Nombre de canal muy largo'),
    avatarUrl: z.string().url('URL de avatar inválida').optional(),
  }),
  isVertical: z.boolean().default(true),
  quality: z.enum(['low', 'medium', 'high', 'hd']).default('medium'),
  publishedAt: z.string().datetime('Fecha de publicación inválida').optional(),
  expiresAt: z.string().datetime('Fecha de expiración inválida').optional(),
  hashtags: z.array(z.string().max(30, 'Hashtag muy largo')).optional(),
  priority: z.number().min(1).max(10).default(1),
  isFeatured: z.boolean().default(false),
}).refine(data => {
  if (data.publishedAt && data.expiresAt) {
    return new Date(data.publishedAt) < new Date(data.expiresAt);
  }
  return true;
}, {
  message: 'Fecha de expiración debe ser posterior a la fecha de publicación',
  path: ['expiresAt']
});

export const updateClipSchema = z.object({
  title: z.string().min(1, 'Título es requerido').max(100, 'Título muy largo').optional(),
  description: z.string().min(1, 'Descripción es requerida').max(500, 'Descripción muy larga').optional(),
  category: z.enum(['comedy', 'music', 'dance', 'food', 'travel', 'news', 'sports', 'education']).optional(),
  status: z.enum(['draft', 'active', 'paused', 'reported', 'removed']).optional(),
  youtubeId: z.string().min(1).max(50).optional(),
  youtubeUrl: z.string().url('URL de video inválida').optional(),
  thumbnailUrl: z.string().url('URL de thumbnail inválida').optional(),
  duration: z.number().min(1).max(180).optional(),
  creator: z.object({
    name: z.string().min(1).max(100).optional(),
    channel: z.string().min(1).max(100).optional(),
    avatarUrl: z.string().url().optional(),
  }).optional(),
  isVertical: z.boolean().optional(),
  quality: z.enum(['low', 'medium', 'high', 'hd']).optional(),
  publishedAt: z.string().datetime().optional(),
  expiresAt: z.string().datetime().optional(),
  hashtags: z.array(z.string().max(30)).optional(),
  priority: z.number().min(1).max(10).optional(),
  isFeatured: z.boolean().optional(),
});

export const moderateClipSchema = z.object({
  isApproved: z.boolean().optional(),
  status: z.enum(['draft', 'active', 'paused', 'reported', 'removed']).optional(),
});

export const clipInteractionSchema = z.object({
  type: z.enum(['view', 'like', 'share', 'comment', 'report'], {
    errorMap: () => ({ message: 'Tipo debe ser: view, like, share, comment o report' })
  }),
  metadata: z.object({
    watchTime: z.number().min(0).optional(),
    shareDestination: z.string().optional(),
    reportReason: z.string().optional(),
    deviceType: z.string().optional(),
    location: z.object({
      lat: z.number(),
      lon: z.number()
    }).optional(),
  }).optional(),
});

// Banner Schemas
export const createBannerSchema = z.object({
  title: z.string().min(1, 'Título es requerido').max(60, 'Título muy largo'),
  subtitle: z.string().min(1, 'Subtítulo es requerido').max(120, 'Subtítulo muy largo'),
  description: z.string().max(300, 'Descripción muy larga').optional(),
  type: z.enum(['promotional', 'informational', 'event', 'service', 'partnership'], {
    errorMap: () => ({ message: 'Tipo debe ser válido' })
  }),
  imageUrl: z.string().min(1, 'URL de imagen es requerida'),
  backgroundColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Color de fondo inválido (formato hex)'),
  textColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Color de texto inválido (formato hex)'),
  gradient: z.object({
    colors: z.array(z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Color de gradiente inválido')),
    direction: z.enum(['horizontal', 'vertical', 'diagonal']).default('diagonal'),
  }).optional(),
  actionText: z.string().max(30, 'Texto de acción muy largo').optional(),
  actionUrl: z.string().optional(),
  actionType: z.enum(['internal', 'external', 'none']).default('none'),
  targetAudience: z.object({
    roles: z.array(z.enum(['user', 'admin', 'moderator'])).optional(),
    ageMin: z.number().min(13).max(100).optional(),
    ageMax: z.number().min(13).max(100).optional(),
    location: z.array(z.string()).optional(),
  }).optional(),
  schedule: z.object({
    startDate: z.string().datetime('Fecha de inicio inválida'),
    endDate: z.string().datetime('Fecha de fin inválida'),
    timezone: z.string().default('America/Lima'),
  }),
  isActive: z.boolean().default(true),
  priority: z.number().min(1).max(10).default(1),
  displayOrder: z.number().min(1).default(1),
}).refine(data => {
  if (data.targetAudience?.ageMin && data.targetAudience?.ageMax) {
    return data.targetAudience.ageMin <= data.targetAudience.ageMax;
  }
  return true;
}, {
  message: 'Edad mínima no puede ser mayor que la edad máxima',
  path: ['targetAudience']
}).refine(data => {
  const startDate = new Date(data.schedule.startDate);
  const endDate = new Date(data.schedule.endDate);
  return startDate < endDate;
}, {
  message: 'Fecha de fin debe ser posterior a la fecha de inicio',
  path: ['schedule']
});

export const updateBannerSchema = z.object({
  title: z.string().min(1).max(60).optional(),
  subtitle: z.string().min(1).max(120).optional(),
  description: z.string().max(300).optional(),
  type: z.enum(['promotional', 'informational', 'event', 'service', 'partnership']).optional(),
  status: z.enum(['draft', 'active', 'paused', 'expired']).optional(),
  imageUrl: z.string().min(1).optional(),
  backgroundColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).optional(),
  textColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).optional(),
  gradient: z.object({
    colors: z.array(z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)),
    direction: z.enum(['horizontal', 'vertical', 'diagonal']),
  }).optional(),
  actionText: z.string().max(30).optional(),
  actionUrl: z.string().optional(),
  actionType: z.enum(['internal', 'external', 'none']).optional(),
  targetAudience: z.object({
    roles: z.array(z.enum(['user', 'admin', 'moderator'])).optional(),
    ageMin: z.number().min(13).max(100).optional(),
    ageMax: z.number().min(13).max(100).optional(),
    location: z.array(z.string()).optional(),
  }).optional(),
  schedule: z.object({
    startDate: z.string().datetime(),
    endDate: z.string().datetime(),
    timezone: z.string().default('America/Lima'),
  }).optional(),
  isActive: z.boolean().optional(),
  priority: z.number().min(1).max(10).optional(),
  displayOrder: z.number().min(1).optional(),
});

export const bannerInteractionSchema = z.object({
  type: z.enum(['impression', 'click'], {
    errorMap: () => ({ message: 'Tipo debe ser: impression o click' })
  }),
  userId: objectIdSchema.optional(),
  metadata: z.record(z.any()).optional(),
});

export const updateBannerOrderSchema = z.object({
  bannerOrders: z.array(z.object({
    id: objectIdSchema,
    displayOrder: z.number().min(1)
  }))
});

// Middleware para validar request body
export function validateBody<T extends z.ZodSchema>(schema: T) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = schema.parse(req.body);
      req.body = result;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
        }));
        return sendError(res, 'Datos de entrada inválidos', 400, 'VALIDATION_ERROR', errors);
      }
      next(error);
    }
  };
}

// Middleware para validar query parameters
export function validateQuery<T extends z.ZodSchema>(schema: T) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = schema.parse(req.query);
      req.query = result as any;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
        }));
        return sendError(res, 'Parámetros de consulta inválidos', 400, 'VALIDATION_ERROR', errors);
      }
      next(error);
    }
  };
}

// Middleware para validar params
export function validateParams<T extends z.ZodSchema>(schema: T) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = schema.parse(req.params);
      req.params = result as any;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
        }));
        return sendError(res, 'Parámetros de ruta inválidos', 400, 'VALIDATION_ERROR', errors);
      }
      next(error);
    }
  };
}
