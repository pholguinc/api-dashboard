import * as cron from 'node-cron';
import { autoAwardDailyPoints } from '../models/daily-points.model';

export class DailyPointsService {
  private static cronJob: cron.ScheduledTask | null = null;

  // Inicializar el servicio de puntos diarios
  static initialize() {
    console.log('🎯 Inicializando servicio de puntos diarios...');
    
    // Programar para ejecutar todos los días a las 00:01
    this.cronJob = cron.schedule('1 0 * * *', async () => {
      console.log('⏰ Ejecutando auto-otorgamiento de puntos diarios...');
      try {
        const awarded = await autoAwardDailyPoints();
        console.log(`✅ Puntos otorgados a ${awarded} usuarios Premium`);
      } catch (error) {
        console.error('❌ Error en auto-otorgamiento de puntos:', error);
      }
    }, {
      timezone: 'America/Lima'
    });

    console.log('✅ Servicio de puntos diarios configurado');
  }

  // Iniciar el cron job
  static start() {
    if (this.cronJob) {
      this.cronJob.start();
      console.log('🚀 Cron job de puntos diarios iniciado');
    }
  }

  // Detener el cron job
  static stop() {
    if (this.cronJob) {
      this.cronJob.stop();
      console.log('⏹️ Cron job de puntos diarios detenido');
    }
  }

  // Ejecutar manualmente (para testing)
  static async runManually(): Promise<number> {
    console.log('🔄 Ejecutando otorgamiento manual de puntos...');
    try {
      const awarded = await autoAwardDailyPoints();
      console.log(`✅ Puntos otorgados manualmente a ${awarded} usuarios`);
      return awarded;
    } catch (error) {
      console.error('❌ Error en otorgamiento manual:', error);
      return 0;
    }
  }

  // Obtener estado del servicio
  static getStatus() {
    return {
      isRunning: this.cronJob ? true : false,
      nextRun: this.cronJob ? 'Todos los días a las 00:01 (Lima)' : 'No programado',
      timezone: 'America/Lima'
    };
  }
}
