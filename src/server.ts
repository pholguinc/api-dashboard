import { createApp } from './app';
import { connectToMongoDB } from './db/mongo';
import { env } from './config/env';
import { disconnectFromMongoDB } from './db/mongo';

async function startServer() {
  try {
    // Conectar a MongoDB
    await connectToMongoDB(env.mongoUri, { retries: 5, initialDelayMs: 1000 });
    console.log('✅ Conectado a MongoDB exitosamente');

    // Crear y configurar la aplicación Express
    const app = createApp();

    // Iniciar servidor
    const port = env.port || 4000;
    const server = app.listen(port, '0.0.0.0', () => {
      console.log(`Server listening on 0.0.0.0:${port}`);
    });

    // Graceful shutdown
    const shutdown = async () => {
      try {
        console.log('🛑 Apagando servidor...');
        server.close(() => console.log('HTTP server cerrado'));
        await disconnectFromMongoDB();
        process.exit(0);
      } catch (e) {
        console.error('Error en apagado:', e);
        process.exit(1);
      }
    };
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);

  } catch (error) {
    console.error('❌ Error iniciando servidor:', error);
    process.exit(1);
  }
}

// Iniciar servidor
startServer();
