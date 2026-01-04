import mongoose from 'mongoose';
import { UserModel } from '../models/user.model';

// Script para migrar usuarios existentes al nuevo sistema de puntos diferenciados

async function migratePointsBreakdown() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/telemetro');
    
    console.log('🔄 Iniciando migración de puntos diferenciados...');

    // Obtener usuarios que no tienen pointsBreakdown
    const usersToMigrate = await UserModel.find({
      $or: [
        { pointsBreakdown: { $exists: false } },
        { dailyLimits: { $exists: false } }
      ]
    });

    console.log(`📊 Encontrados ${usersToMigrate.length} usuarios para migrar`);

    let migratedCount = 0;

    for (const user of usersToMigrate) {
      // Inicializar pointsBreakdown si no existe
      if (!user.pointsBreakdown) {
        user.pointsBreakdown = {
          game: 0,
          ads: 0, 
          referrals: 0,
          daily: 0,
          admin: user.pointsSmart || 0 // Asignar puntos existentes a admin
        };
      }

      // Inicializar dailyLimits si no existe
      if (!user.dailyLimits) {
        const now = new Date();
        user.dailyLimits = {
          game: { earned: 0, limit: 200, lastReset: now },
          ads: { earned: 0, limit: 100, lastReset: now },
          daily: { earned: 0, limit: 20, lastReset: now }
        };
      }

      await user.save();
      migratedCount++;

      if (migratedCount % 10 === 0) {
        console.log(`✅ Migrados ${migratedCount}/${usersToMigrate.length} usuarios`);
      }
    }

    console.log(`🎉 Migración completada! ${migratedCount} usuarios migrados`);
    
    // Mostrar estadísticas
    const totalUsers = await UserModel.countDocuments();
    const usersWithBreakdown = await UserModel.countDocuments({ 
      pointsBreakdown: { $exists: true } 
    });
    
    console.log(`📈 Estadísticas finales:`);
    console.log(`   Total usuarios: ${totalUsers}`);
    console.log(`   Con breakdown: ${usersWithBreakdown}`);
    console.log(`   Cobertura: ${((usersWithBreakdown / totalUsers) * 100).toFixed(1)}%`);

  } catch (error) {
    console.error('❌ Error en migración:', error);
  } finally {
    await mongoose.disconnect();
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  migratePointsBreakdown();
}

export { migratePointsBreakdown };
