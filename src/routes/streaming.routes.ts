import { Router } from 'express';
import { auth } from '../middleware/auth';
import { 
  createStream,
  startStream,
  endStream,
  getLiveStreams,
  getStreamDetails,
  updateStreamStatus,
  getStreamerDashboard,
  getFeaturedStreamers,
  donateToStreamer,
  getStreamDonations,
  updateStreamQuality
} from '../controllers/streaming.controller';
import { 
  validateBody, 
  validateParams,
  validateQuery,
  objectIdSchema,
  paginationSchema
} from '../utils/validation';
import { z } from 'zod';

const router = Router();

// Todas las rutas requieren autenticación
router.use(auth);

// Esquemas de validación
const createStreamSchema = z.object({
  title: z.string().min(1, 'Título es requerido').max(100, 'Título muy largo'),
  description: z.string().max(500, 'Descripción muy larga').optional(),
  category: z.enum(['IRL', 'Gaming', 'Music', 'Art', 'Food', 'Tech', 'Dance', 'Freestyle']),
  tags: z.array(z.string().max(30)).max(10).optional(),
  location: z.object({
    stationName: z.string().max(100).optional(),
    lineName: z.string().max(50).optional(),
    coordinates: z.array(z.number()).length(2).optional()
  }).optional(),
  isPrivate: z.boolean().default(false),
  chatEnabled: z.boolean().default(true),
  donationsEnabled: z.boolean().default(true)
});

const updateStreamStatusSchema = z.object({
  status: z.enum(['starting', 'live', 'ending', 'offline']),
  viewerCount: z.number().min(0).optional(),
  quality: z.object({
    resolution: z.string().optional(),
    bitrate: z.number().optional(),
    fps: z.number().optional()
  }).optional()
});

const updateStreamQualitySchema = z.object({
  resolution: z.enum(['1080p', '720p', '480p', '360p']).optional(),
  bitrate: z.number().min(300).max(10000).optional(),
  fps: z.number().min(15).max(60).optional(),
});

const donationSchema = z.object({
  amount: z.number().min(10, 'Mínimo 10 puntos').max(1000, 'Máximo 1000 puntos'),
  message: z.string().max(200, 'Mensaje muy largo').optional()
});

// ========== RUTAS PARA STREAMERS ==========

router.post('/create',
  validateBody(createStreamSchema),
  createStream
);

router.post('/:streamId/start',
  validateParams(z.object({ streamId: objectIdSchema })),
  startStream
);

// POST /api/streaming/:streamId/end - Terminar stream
router.post('/:streamId/end',
  validateParams(z.object({ streamId: objectIdSchema })),
  endStream
);

// PUT /api/streaming/:streamId/status - Actualizar estado del stream
router.put('/:streamId/status',
  validateParams(z.object({ streamId: objectIdSchema })),
  validateBody(updateStreamStatusSchema),
  updateStreamStatus
);

// PUT /api/streaming/:streamId/quality - Actualizar calidad del stream
router.put('/:streamId/quality',
  validateParams(z.object({ streamId: objectIdSchema })),
  validateBody(updateStreamQualitySchema),
  updateStreamQuality
);

// GET /api/streaming/dashboard - Dashboard del streamer
router.get('/dashboard', getStreamerDashboard);

// ========== RUTAS PÚBLICAS ==========

// GET /api/streaming/live - Obtener streams en vivo
router.get('/live',
  validateQuery(paginationSchema.extend({
    category: z.enum(['IRL', 'Gaming', 'Music', 'Art', 'Food', 'Tech', 'Dance', 'Freestyle']).optional(),
    sort: z.enum(['viewers', 'recent', 'featured']).default('viewers')
  })),
  getLiveStreams
);

// GET /api/streaming/streamers - Obtener lista pública de streamers
router.get('/streamers',
  validateQuery(paginationSchema.extend({
    category: z.enum(['IRL', 'Gaming', 'Music', 'Art', 'Food', 'Tech', 'Dance', 'Freestyle']).optional(),
    featured: z.boolean().optional()
  })),
  getFeaturedStreamers
);

// GET /api/streaming/:streamId - Obtener detalles de un stream
router.get('/:streamId',
  validateParams(z.object({ streamId: objectIdSchema })),
  getStreamDetails
);

// POST /api/streaming/:streamId/donate - Donar puntos al streamer
router.post('/:streamId/donate',
  validateParams(z.object({ streamId: objectIdSchema })),
  validateBody(donationSchema),
  donateToStreamer
);

// GET /api/streaming/:streamId/donations - Obtener donaciones del stream
router.get('/:streamId/donations',
  validateParams(z.object({ streamId: objectIdSchema })),
  validateQuery(paginationSchema),
  getStreamDonations
);

export default router;

