import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import path from 'path';
import { env } from './config/env';

// Crear app
const app = express();

// Middleware básico
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
      imgSrc: ["'self'", "data:", "https:", "http:"],
      connectSrc: ["'self'", "ws:", "wss:"]
    }
  }
}));

// Configuración CORS dinámica basada en entorno
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:5173',
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

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-API-Key']
}));

app.use(morgan('dev'));
app.use(compression());
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

// Servir archivos estáticos
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: '1.0.0-professional'
    },
    error: null,
    meta: {
      timestamp: new Date().toISOString()
    }
  });
});

// Importar rutas solo las que funcionan
async function setupRoutes() {
  try {
    // Rutas básicas que sabemos que funcionan
    const healthRoutes = await import('./routes/health.routes');
    const authRoutes = await import('./routes/auth.routes');
    const bannersRoutes = await import('./routes/banners.routes');
    
    app.use('/api/health', healthRoutes.default);
    app.use('/api/auth', authRoutes.default);
    app.use('/api/banners', bannersRoutes.default);
    
    console.log('✅ Rutas básicas cargadas');
    
    // Intentar cargar rutas adicionales
    try {
      const marketplaceRoutes = await import('./routes/marketplace.routes');
      app.use('/api/marketplace', marketplaceRoutes.default);
      console.log('✅ Marketplace routes cargadas');
    } catch (error) {
      console.log('⚠️ Error cargando marketplace routes:', error);
    }
    
    try {
      const gamesRoutes = await import('./routes/games.routes');
      app.use('/api/games', gamesRoutes.default);
      console.log('✅ Games routes cargadas');
    } catch (error) {
      console.log('⚠️ Error cargando games routes:', error);
    }
    
  } catch (error) {
    console.error('❌ Error configurando rutas:', error);
  }
}

// Conectar a MongoDB y iniciar servidor
async function startServer() {
  try {
    console.log('🔌 Conectando a MongoDB...');
    await mongoose.connect('mongodb://127.0.0.1:27017/telemetro-dev');
    console.log('✅ Conectado a MongoDB');
    
    // Configurar rutas
    await setupRoutes();
    
    // Iniciar servidor
    const PORT = process.env.PORT || 4000;
    app.listen(PORT, () => {
      console.log(`🚀 Servidor profesional corriendo en puerto ${PORT}`);
      console.log(`📱 Panel Admin: http://localhost:${PORT}/admin`);
      console.log(`🔗 API Health: http://localhost:${PORT}/api/health`);
      console.log(`✅ Backend TypeScript profesional iniciado correctamente`);
    });
    
  } catch (error) {
    console.error('❌ Error iniciando servidor:', error);
    process.exit(1);
  }
}

// Manejar errores profesionalmente
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled Rejection:', error);
  process.exit(1);
});

// Iniciar servidor
startServer();
