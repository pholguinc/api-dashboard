#!/usr/bin/env node

/**
 * Script para corregir automáticamente los problemas más críticos en la documentación de Swagger
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 Corrigiendo documentación de Swagger...');

// Leer el reporte de análisis
const reportPath = path.join(__dirname, '../swagger-analysis-report.json');
if (!fs.existsSync(reportPath)) {
  console.error('❌ No se encontró el reporte de análisis. Ejecuta primero generate-complete-swagger.js');
  process.exit(1);
}

const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));

// Función para corregir documentación de un archivo
function fixFileDocumentation(filePath) {
  const fullPath = path.join(__dirname, '../src/routes', filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  Archivo no encontrado: ${filePath}`);
    return false;
  }
  
  let content = fs.readFileSync(fullPath, 'utf8');
  let hasChanges = false;
  
  // Corregir referencias incorrectas a ClipsListResponse
  const incorrectRefs = content.match(/\$ref: '#\/components\/schemas\/ClipsListResponse'/g);
  if (incorrectRefs) {
    console.log(`🔧 Corrigiendo ${incorrectRefs.length} referencias incorrectas en ${filePath}`);
    
    // Determinar el esquema correcto basado en el contexto
    let correctSchema = 'SuccessResponse';
    if (filePath.includes('marketplace')) {
      correctSchema = 'MarketplaceListResponse';
    } else if (filePath.includes('users')) {
      correctSchema = 'UsersListResponse';
    } else if (filePath.includes('streaming')) {
      correctSchema = 'StreamsListResponse';
    } else if (filePath.includes('premium')) {
      correctSchema = 'SubscriptionsListResponse';
    }
    
    content = content.replace(/\$ref: '#\/components\/schemas\/ClipsListResponse'/g, `$ref: '#/components/schemas/${correctSchema}'`);
    hasChanges = true;
  }
  
  // Corregir documentación genérica
  const genericDescriptions = [
    {
      pattern: /description: "Endpoint GET para \/[^"]+"/g,
      replacement: (match) => {
        const path = match.match(/\/[^"]+/)[0];
        return `description: "Obtiene ${getEntityDescription(path)}"`;
      }
    },
    {
      pattern: /description: "Endpoint POST para \/[^"]+"/g,
      replacement: (match) => {
        const path = match.match(/\/[^"]+/)[0];
        return `description: "Crea ${getEntityDescription(path)}"`;
      }
    },
    {
      pattern: /description: "Endpoint PUT para \/[^"]+"/g,
      replacement: (match) => {
        const path = match.match(/\/[^"]+/)[0];
        return `description: "Actualiza ${getEntityDescription(path)}"`;
      }
    },
    {
      pattern: /description: "Endpoint DELETE para \/[^"]+"/g,
      replacement: (match) => {
        const path = match.match(/\/[^"]+/)[0];
        return `description: "Elimina ${getEntityDescription(path)}"`;
      }
    }
  ];
  
  genericDescriptions.forEach(({ pattern, replacement }) => {
    if (pattern.test(content)) {
      content = content.replace(pattern, replacement);
      hasChanges = true;
    }
  });
  
  // Agregar ejemplos básicos donde falten
  if (content.includes('responses:') && !content.includes('example:')) {
    console.log(`📝 Agregando ejemplos básicos en ${filePath}`);
    
    // Agregar ejemplo en respuesta 200
    content = content.replace(
      /(200:\s*description: "[^"]+"\s*content:\s*application\/json:\s*schema:\s*\$ref: '#\/components\/schemas\/[^']+')/g,
      `$1
 *             example:
 *               success: true
 *               data: {}
 *               error: null
 *               meta:
 *                 timestamp: "2024-01-15T10:30:00.000Z"`
    );
    hasChanges = true;
  }
  
  // Agregar códigos de respuesta faltantes
  if (content.includes('responses:') && !content.includes('400:')) {
    console.log(`📝 Agregando códigos de respuesta faltantes en ${filePath}`);
    
    const errorResponses = `
 *       400:
 *         description: Error en la validación
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'`;
    
    // Insertar antes del cierre del bloque de respuestas
    content = content.replace(/(\s*)\*\/\s*$/gm, `${errorResponses}\n$1*/`);
    hasChanges = true;
  }
  
  if (hasChanges) {
    fs.writeFileSync(fullPath, content);
    console.log(`✅ Archivo corregido: ${filePath}`);
    return true;
  }
  
  return false;
}

// Función para obtener descripción de entidad basada en la ruta
function getEntityDescription(path) {
  if (path.includes('users')) return 'información de usuarios';
  if (path.includes('clips')) return 'clips de video';
  if (path.includes('streaming')) return 'streams en vivo';
  if (path.includes('marketplace')) return 'productos del marketplace';
  if (path.includes('points')) return 'información de puntos';
  if (path.includes('premium')) return 'suscripciones premium';
  if (path.includes('payments')) return 'información de pagos';
  if (path.includes('notifications')) return 'notificaciones';
  if (path.includes('games')) return 'juegos';
  if (path.includes('banners')) return 'banners publicitarios';
  if (path.includes('ads')) return 'anuncios';
  if (path.includes('jobs')) return 'empleos';
  if (path.includes('microcourses')) return 'microcursos';
  if (path.includes('microseguros')) return 'microseguros';
  if (path.includes('metro-live')) return 'streams del metro';
  if (path.includes('metro-chat')) return 'mensajes del chat del metro';
  if (path.includes('metro-sessions')) return 'sesiones del metro';
  if (path.includes('metro-ya')) return 'servicios de delivery';
  if (path.includes('voto-seguro')) return 'información de votación';
  if (path.includes('referral')) return 'información de referidos';
  if (path.includes('streak')) return 'rachas del usuario';
  if (path.includes('cart')) return 'elementos del carrito';
  if (path.includes('daily-points')) return 'puntos diarios';
  if (path.includes('profile')) return 'información del perfil';
  return 'información del sistema';
}

// Función principal
function main() {
  console.log(`📊 Procesando ${report.files.length} archivos...`);
  
  let fixedFiles = 0;
  let totalProblems = 0;
  
  // Procesar archivos con más problemas primero
  const filesByProblems = report.files.sort((a, b) => b.problems - a.problems);
  
  filesByProblems.forEach(file => {
    console.log(`\n🔍 Procesando ${file.file} (${file.problems} problemas)...`);
    
    if (fixFileDocumentation(file.file)) {
      fixedFiles++;
    }
    
    totalProblems += file.problems;
  });
  
  console.log(`\n📊 RESUMEN DE CORRECCIONES:`);
  console.log(`📁 Archivos procesados: ${report.files.length}`);
  console.log(`✅ Archivos corregidos: ${fixedFiles}`);
  console.log(`⚠️  Problemas totales: ${totalProblems}`);
  
  // Generar reporte de correcciones
  const correctionsReport = {
    timestamp: new Date().toISOString(),
    summary: {
      totalFiles: report.files.length,
      fixedFiles,
      totalProblems,
      problemsByType: report.summary.problemsByType,
      problemsBySeverity: report.summary.problemsBySeverity
    },
    files: filesByProblems.map(file => ({
      file: file.file,
      problems: file.problems,
      fixed: fixFileDocumentation(file.file)
    }))
  };
  
  const correctionsReportPath = path.join(__dirname, '../swagger-corrections-report.json');
  fs.writeFileSync(correctionsReportPath, JSON.stringify(correctionsReport, null, 2));
  
  console.log(`\n📄 Reporte de correcciones guardado en: ${correctionsReportPath}`);
  
  console.log('\n💡 PRÓXIMOS PASOS:');
  console.log('1. Revisar los archivos corregidos manualmente');
  console.log('2. Ejecutar npm run build para verificar que no hay errores');
  console.log('3. Probar la documentación de Swagger en /api-docs');
  console.log('4. Completar la documentación faltante manualmente');
  console.log('5. Agregar ejemplos más específicos para cada endpoint');
  
  console.log('\n✅ Correcciones automáticas completadas!');
}

// Ejecutar si se llama directamente
if (require.main === module) {
  main();
}

module.exports = {
  fixFileDocumentation,
  getEntityDescription
};
