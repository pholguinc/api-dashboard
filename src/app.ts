import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger';
import { env } from './config/env';

// Routes
import authRoutes from './routes/auth.routes';
import clipsRoutes from './routes/clips.routes';
import unityGamesRoutes from './routes/unity-games.routes';
import gamesRoutes from './routes/games.routes';
import adsRoutes from './routes/ads.routes';
import pointsAdminRoutes from './routes/points-admin.routes';
import pointsStatsRoutes from './routes/points-stats.routes';
import microcourseRoutes from './routes/microcourse.routes';
import jobsRoutes from './routes/jobs.routes';
import adminMicrocoursesRoutes from './routes/admin/microcourses.admin.routes';
import adminTiktokContentRoutes from './routes/admin/tiktok-content.admin.routes';
import marketplaceRoutes from './routes/marketplace.routes';
import metroDiscountRoutes from './routes/metro-discount.routes';
import notificationsRoutes from './routes/notifications.routes';
import pointsRoutes from './routes/points.routes';
import premiumRoutes from './routes/premium.routes';
import profileRoutes from './routes/profile.routes';
import profileCustomizationRoutes from './routes/profile-customization.routes';
import metroSessionsRoutes from './routes/metro-sessions.routes';
import streamingRoutes from './routes/streaming.routes';
import metroLiveRoutes from './routes/metro-live.routes';
import streakRoutes from './routes/streak.routes';
import streamingProRoutes from './routes/streaming-pro.routes';
import hlsProxyRoutes from './routes/hls-proxy.routes';
import streamingAuthRoutes from './routes/streaming-auth.routes';
import bannersRoutes from './routes/banners.routes';
import votoSeguroRoutes from './routes/voto-seguro.routes';
import referralRoutes from './routes/referral.routes';
import { adminAuthMiddleware } from './middleware/admin.auth.middleware';
import adminStatsRoutes from './routes/admin/stats.admin.routes';
import adminUsersRoutes from './routes/admin/users.admin.routes';
import adminStreamersRoutes from './routes/admin/streamers.admin.routes';
import adminSubscriptionsRoutes from './routes/admin/subscriptions.admin.routes';
import adminSubscriptionPlansRoutes from './routes/admin/subscription-plans.admin.routes';
import adminJobsRoutes from './routes/admin/jobs.admin.routes';
import adminMetroSessionsRoutes from './routes/admin/metro-sessions.admin.routes';
import adminRedemptionsRoutes from './routes/admin/redemptions.admin.routes';
import adminDonationsRoutes from './routes/admin/donations.admin.routes';
import adminMetroYaCouponsRoutes from './routes/admin/metro-ya-coupons.admin.routes';
import yapePlinPaymentRoutes from './routes/yape-plin-payment.routes';
import metroYaRoutes from './routes/metro-ya.routes';
import metroChatRoutes from './routes/metro-chat.routes';
import radioAiRoutes from './routes/radio-ai/radio.ai.routes';
import applicantProfileRoutes from './routes/applicant-profile.routes';
import microsegurosRoutes from './routes/microseguros.routes';
import streamersPublicRoutes from './routes/streamers.public.routes';

export function createApp() {
  const app = express();

  // Security middleware
  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
  }));
  
  // Configuración CORS dinámica basada en entorno
  const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:8085',
    'https://telemetro.pe',
    'http://telemetro.pe',
    'https://api.telemetro.pe',
    'https://admin.telemetro.pe',
    'https://streaming.telemetro.pe'
  ];

  // Agregar CLIENT_ORIGIN del entorno si está definido
  if (env.clientOrigin) {
    const clientOrigins = env.clientOrigin.split(',').map(origin => origin.trim());
    allowedOrigins.push(...clientOrigins);
  }

  // Middleware CORS personalizado - TEMPORALMENTE PERMISIVO PARA DEBUGGING
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    console.log('CORS Debug - Origin recibido:', origin);
    console.log('CORS Debug - Orígenes permitidos:', allowedOrigins);
    
    // TEMPORALMENTE: Permitir telemetro.pe específicamente
    if (origin && (origin.includes('telemetro.pe') || allowedOrigins.includes(origin))) {
      res.header('Access-Control-Allow-Origin', origin);
      console.log('CORS Debug - Origin permitido:', origin);
    } else if (!origin) {
      // Permitir requests sin origin
      console.log('CORS Debug - Request sin origin, permitido');
    } else {
      console.log('CORS Debug - Origin no permitido:', origin);
    }
    
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, X-API-Key');
    
    if (req.method === 'OPTIONS') {
      console.log('CORS Debug - Respondiendo a OPTIONS request');
      res.sendStatus(200);
    } else {
      next();
    }
  });

  // Body parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Rate limiting
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000 // limit each IP to 1000 requests per windowMs
  });
  app.use('/api', limiter);

  // Static: uploads (para imágenes y archivos) con CORS
  app.use('/uploads', (req, res, next) => {
    // Configurar headers CORS específicos para archivos estáticos
    const origin = req.headers.origin;
    
    // Permitir orígenes específicos o todos los orígenes permitidos
    if (origin && (allowedOrigins.includes(origin) || origin.includes('telemetro.pe'))) {
      res.header('Access-Control-Allow-Origin', origin);
    } else if (!origin) {
      // Permitir requests sin origin (como navegación directa)
      res.header('Access-Control-Allow-Origin', '*');
    } else {
      // Para desarrollo local, ser más permisivo
      if (origin.includes('localhost')) {
        res.header('Access-Control-Allow-Origin', origin);
      }
    }
    
    res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    res.header('Cross-Origin-Resource-Policy', 'cross-origin');
    
    // Configurar cache para imágenes
    res.header('Cache-Control', 'public, max-age=31536000'); // 1 año
    
    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
    } else {
      next();
    }
  }, express.static(path.join(__dirname, '../uploads')));
  
  // Fallback para archivos antiguos guardados en src/uploads durante desarrollo anterior
  app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

  // Static files for games
  app.use('/games', (req, res, next) => {
    res.header('Content-Security-Policy', "default-src * 'unsafe-inline' 'unsafe-eval'; script-src * 'unsafe-inline' 'unsafe-eval'; style-src * 'unsafe-inline'; img-src * data: blob:;");
    res.header('X-Frame-Options', 'ALLOWALL');
    res.header('Access-Control-Allow-Origin', '*');
    next();
  }, express.static(path.join(__dirname, '../public/games')));

  // Swagger Documentation
  app.use(env.api.swaggerPath, swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'TeleMetro PE API Documentation',
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      docExpansion: 'none',
      filter: true,
      showExtensions: true,
      showCommonExtensions: true
    }
  }));

  // Swagger JSON endpoint
  app.get(`${env.api.swaggerPath}.json`, (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });


  // API routes
  app.use('/api/auth', authRoutes);
  app.use('/api/clips', clipsRoutes);
  app.use('/api/unity-games', unityGamesRoutes);
  app.use('/api/games', gamesRoutes);
  app.use('/api/ads', adsRoutes);
  app.use('/api/admin/points', pointsAdminRoutes);
  app.use('/api/points-stats', pointsStatsRoutes);
  app.use('/api/microcourses', microcourseRoutes);
  app.use('/api/jobs', jobsRoutes);
  app.use('/api/applicant-profile', applicantProfileRoutes);
  app.use('/api/marketplace', marketplaceRoutes);
  app.use('/api/metro-discounts', metroDiscountRoutes);
  // Alias para compatibilidad con clientes que usan singular
  app.use('/api/metro-discount', metroDiscountRoutes);
  app.use('/api/notifications', notificationsRoutes);
  app.use('/api/points', pointsRoutes);
  app.use('/api/premium', premiumRoutes);
  app.use('/api/profile', profileRoutes);
  app.use('/api/profile', profileCustomizationRoutes);
  app.use('/api/metro-sessions', metroSessionsRoutes);
  app.use('/api/streaming', streamingRoutes);
  app.use('/api/streamers', streamersPublicRoutes);
  app.use('/api/metro-live', metroLiveRoutes);
  app.use('/api/streak', streakRoutes);
  app.use('/api/referral', referralRoutes);
  app.use('/api/streaming-pro', streamingProRoutes);
  
  // Ruta de prueba sin autenticación
  app.post('/api/test-stream', async (req, res) => {
    try {
      console.log('🧪 TEST DIRECT: Creando stream de prueba...');
      const { MetroLiveStreamModel } = await import('./models/metro-live.model');
      const { sendCreated, sendError } = await import('./utils/response');
      
      const stream = new MetroLiveStreamModel({
        streamerId: '68c668abb0148145e8ec4677',
        title: 'Stream Test Directo',
        description: 'Stream creado directamente',
        category: 'gaming',
        tags: ['test', 'direct'],
        status: 'scheduled',
        streamKey: 'test_direct_' + Date.now(),
        rtmpUrl: 'rtmp://localhost:1935/live/test',
        hlsUrl: 'http://localhost:8000/live/test/index.m3u8',
        viewerCount: 0,
        maxViewers: 0,
        totalDonations: 0,
        donationsCount: 0
      });

      await stream.save();
      console.log('✅ Stream directo creado:', stream._id);

      return res.status(201).json({
        success: true,
        message: 'Stream de prueba creado exitosamente (directo)',
        data: {
          id: stream._id,
          title: stream.title,
          streamKey: stream.streamKey,
          status: stream.status
        }
      });

    } catch (error) {
      console.error('❌ TEST DIRECT Error:', error);
      return res.status(500).json({
        success: false,
        error: {
          message: 'Error en stream directo',
          code: 'TEST_ERROR'
        }
      });
    }
  });
  
  app.use('/secure-hls', hlsProxyRoutes);
  app.use('/api/streaming-auth', streamingAuthRoutes);
  app.use('/api/banners', bannersRoutes);
  app.use('/api/voto-seguro', votoSeguroRoutes);

  // Admin routes
  app.use('/api/admin/microcourses', adminAuthMiddleware, adminMicrocoursesRoutes);
  app.use('/api/admin/tiktok-content', adminAuthMiddleware, adminTiktokContentRoutes);
  app.use('/api/admin/stats', adminStatsRoutes);
  app.use('/api/admin/users', adminUsersRoutes);
  app.use('/api/admin/streamers', adminStreamersRoutes);
  app.use('/api/admin/subscriptions', adminSubscriptionsRoutes);
  app.use('/api/microseguros', microsegurosRoutes);
  app.use('/api/admin/subscription-plans', adminSubscriptionPlansRoutes);
  app.use('/api/admin/jobs', adminJobsRoutes);
  app.use('/api/admin/metro-sessions', adminMetroSessionsRoutes);
  app.use('/api/admin/redemptions', adminRedemptionsRoutes);
  app.use('/api/admin/donations', adminDonationsRoutes);
  app.use('/api/admin/metro-ya-coupons', adminMetroYaCouponsRoutes);
  app.use('/api/payments', yapePlinPaymentRoutes);
  app.use('/api/metro-ya', metroYaRoutes);
  app.use('/api/metro-chat', metroChatRoutes);
  app.use('/api/radio-ai', radioAiRoutes);

  // Banners endpoint (para tu HomeScreen)
  app.get('/api/banners/active', (req, res) => {
    res.json({
      success: true,
      data: [], // Por ahora vacío, pero responde correctamente
      error: null,
      meta: {
        timestamp: new Date().toISOString()
      }
    });
  });


  // Health check
  app.get('/api/health', (req, res) => {
    res.json({
      success: true,
      data: {
        status: 'ok',
        timestamp: new Date().toISOString()
      },
      error: null,
      meta: {
        timestamp: new Date().toISOString()
      }
    });
  });

  return app;
}

