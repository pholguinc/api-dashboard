#!/usr/bin/env node

/**
 * Script para limpiar referencias a archivos CV inexistentes en la base de datos
 */

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

console.log('🧹 Limpiando referencias a archivos inexistentes...');

// Función para verificar si un archivo existe
function fileExists(filePath) {
  try {
    return fs.existsSync(filePath);
  } catch (error) {
    return false;
  }
}

// Función para limpiar aplicaciones con archivos inexistentes
async function cleanupMissingFiles() {
  try {
    // Conectar a MongoDB
    const mongoUrl = process.env.MONGODB_URI || 'mongodb://localhost:27017/telemetro';
    console.log(`🔌 Conectando a MongoDB: ${mongoUrl}`);
    
    await mongoose.connect(mongoUrl);
    console.log('✅ Conectado a MongoDB');
    
    // Definir el modelo de JobApplication
    const JobApplicationSchema = new mongoose.Schema({}, { strict: false });
    const JobApplicationModel = mongoose.model('JobApplication', JobApplicationSchema);
    
    // Buscar todas las aplicaciones con archivos CV
    const applications = await JobApplicationModel.find({
      'cvFile.filename': { $exists: true, $ne: null }
    });
    
    console.log(`📊 Aplicaciones encontradas: ${applications.length}`);
    
    const uploadsPath = path.join(__dirname, '../uploads/cvs');
    const issues = [];
    const fixes = [];
    
    for (const app of applications) {
      const cvFile = app.cvFile;
      const filePath = path.join(uploadsPath, cvFile.filename);
      const exists = fileExists(filePath);
      
      console.log(`\n📄 Verificando aplicación ${app._id}:`);
      console.log(`   - Archivo: ${cvFile.filename}`);
      console.log(`   - Existe: ${exists ? '✅' : '❌'}`);
      
      if (!exists) {
        issues.push({
          applicationId: app._id,
          filename: cvFile.filename,
          userId: app.userId,
          jobId: app.jobId,
          createdAt: app.createdAt
        });
        
        console.log(`   ⚠️ PROBLEMA: Archivo no encontrado`);
        
        // Opciones para corregir:
        // 1. Marcar como archivo faltante
        // 2. Eliminar la aplicación
        // 3. Solicitar re-subida del archivo
        
        const fix = {
          applicationId: app._id,
          action: 'mark_missing', // o 'delete', 'request_reapload'
          filename: cvFile.filename
        };
        
        fixes.push(fix);
      }
    }
    
    if (issues.length === 0) {
      console.log('\n✅ No se encontraron problemas con archivos faltantes');
    } else {
      console.log(`\n⚠️ Se encontraron ${issues.length} aplicaciones con archivos faltantes:`);
      
      issues.forEach((issue, index) => {
        console.log(`\n${index + 1}. Aplicación ID: ${issue.applicationId}`);
        console.log(`   - Usuario: ${issue.userId}`);
        console.log(`   - Trabajo: ${issue.jobId}`);
        console.log(`   - Archivo: ${issue.filename}`);
        console.log(`   - Fecha: ${issue.createdAt}`);
      });
      
      // Generar reporte
      const report = {
        timestamp: new Date().toISOString(),
        totalApplications: applications.length,
        missingFiles: issues.length,
        issues: issues,
        fixes: fixes,
        uploadsPath: uploadsPath
      };
      
      const reportPath = path.join(__dirname, '../missing-files-report.json');
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
      console.log(`\n📋 Reporte guardado en: ${reportPath}`);
      
      // Aplicar correcciones si se solicita
      if (process.argv.includes('--fix')) {
        console.log('\n🔧 Aplicando correcciones...');
        
        for (const fix of fixes) {
          try {
            if (fix.action === 'mark_missing') {
              await JobApplicationModel.findByIdAndUpdate(fix.applicationId, {
                $set: {
                  'cvFile.missing': true,
                  'cvFile.missingSince': new Date()
                }
              });
              console.log(`✅ Marcada como faltante: ${fix.applicationId}`);
              
            } else if (fix.action === 'delete') {
              await JobApplicationModel.findByIdAndDelete(fix.applicationId);
              console.log(`🗑️ Eliminada aplicación: ${fix.applicationId}`);
              
            } else if (fix.action === 'request_reapload') {
              await JobApplicationModel.findByIdAndUpdate(fix.applicationId, {
                $set: {
                  'cvFile.requiresReupload': true,
                  'cvFile.originalPath': fix.filename
                }
              });
              console.log(`📤 Marcada para re-subida: ${fix.applicationId}`);
            }
          } catch (error) {
            console.error(`❌ Error aplicando corrección para ${fix.applicationId}:`, error.message);
          }
        }
        
        console.log(`\n✅ Se aplicaron ${fixes.length} correcciones`);
      } else {
        console.log('\n💡 Para aplicar correcciones automáticas, ejecuta:');
        console.log(`   node scripts/cleanup-missing-files.js --fix`);
      }
    }
    
    await mongoose.disconnect();
    console.log('\n✅ Desconectado de MongoDB');
    
  } catch (error) {
    console.error('❌ Error durante la limpieza:', error.message);
    
    if (error.message.includes('ECONNREFUSED')) {
      console.log('\n💡 Asegúrate de que MongoDB esté ejecutándose:');
      console.log('   - En desarrollo: mongod');
      console.log('   - En Docker: docker-compose up -d mongo');
      console.log('   - Verificar URL: echo $MONGODB_URI');
    }
    
    process.exit(1);
  }
}

// Función para mostrar estadísticas
async function showStatistics() {
  try {
    const mongoUrl = process.env.MONGODB_URI || 'mongodb://localhost:27017/telemetro';
    await mongoose.connect(mongoUrl);
    
    const JobApplicationSchema = new mongoose.Schema({}, { strict: false });
    const JobApplicationModel = mongoose.model('JobApplication', JobApplicationSchema);
    
    const total = await JobApplicationModel.countDocuments();
    const withFiles = await JobApplicationModel.countDocuments({ 'cvFile.filename': { $exists: true } });
    const missing = await JobApplicationModel.countDocuments({ 'cvFile.missing': true });
    
    console.log('\n📊 Estadísticas de aplicaciones:');
    console.log(`   - Total aplicaciones: ${total}`);
    console.log(`   - Con archivos CV: ${withFiles}`);
    console.log(`   - Con archivos faltantes: ${missing}`);
    console.log(`   - Con archivos válidos: ${withFiles - missing}`);
    
    await mongoose.disconnect();
    
  } catch (error) {
    console.error('❌ Error obteniendo estadísticas:', error.message);
  }
}

// Función principal
async function main() {
  const command = process.argv[2];
  
  switch (command) {
    case '--stats':
      await showStatistics();
      break;
    case '--fix':
      await cleanupMissingFiles();
      break;
    default:
      await cleanupMissingFiles();
      break;
  }
}

// Manejar interrupciones
process.on('SIGINT', () => {
  console.log('\n👋 Limpieza cancelada por el usuario');
  process.exit(0);
});

// Ejecutar si se llama directamente
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Error durante la ejecución:', error);
    process.exit(1);
  });
}

module.exports = {
  cleanupMissingFiles,
  showStatistics,
  fileExists
};
