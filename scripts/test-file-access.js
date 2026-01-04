#!/usr/bin/env node

/**
 * Script para probar el acceso a archivos estáticos
 * Este script verifica que los archivos se puedan acceder correctamente
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');

console.log('🧪 Probando acceso a archivos estáticos...');

// Configuración
const UPLOADS_PATH = path.join(__dirname, '../uploads/cvs');
const EXISTING_FILE = 'cv-1758750133243-110097015.pdf';
const MISSING_FILE = 'cv-1758754416693-3286920.pdf';

// Función para probar acceso HTTP
function testHttpAccess(url, description) {
  return new Promise((resolve) => {
    const client = url.startsWith('https:') ? https : http;
    const req = client.get(url, (res) => {
      let data = '';
      
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          success: true,
          statusCode: res.statusCode,
          headers: res.headers,
          description: description,
          url: url
        });
      });
    });
    
    req.on('error', (error) => {
      resolve({
        success: false,
        error: error.message,
        description: description,
        url: url
      });
    });
    
    req.setTimeout(5000, () => {
      req.destroy();
      resolve({
        success: false,
        error: 'Timeout',
        description: description,
        url: url
      });
    });
  });
}

// Función para verificar archivos locales
function checkLocalFiles() {
  console.log('\n📁 Verificando archivos locales...');
  console.log(`📂 Directorio: ${UPLOADS_PATH}`);
  
  if (!fs.existsSync(UPLOADS_PATH)) {
    console.log('❌ Directorio uploads/cvs no existe');
    return false;
  }
  
  const files = fs.readdirSync(UPLOADS_PATH);
  console.log(`📄 Archivos encontrados: ${files.length}`);
  
  files.forEach(file => {
    const filePath = path.join(UPLOADS_PATH, file);
    const stats = fs.statSync(filePath);
    console.log(`   ✅ ${file} (${stats.size} bytes)`);
  });
  
  // Verificar archivos específicos
  const existingPath = path.join(UPLOADS_PATH, EXISTING_FILE);
  const missingPath = path.join(UPLOADS_PATH, MISSING_FILE);
  
  console.log(`\n🔍 Verificando archivos específicos:`);
  console.log(`   ${fs.existsSync(existingPath) ? '✅' : '❌'} ${EXISTING_FILE}`);
  console.log(`   ${fs.existsSync(missingPath) ? '✅' : '❌'} ${MISSING_FILE}`);
  
  return fs.existsSync(existingPath);
}

// Función para probar diferentes URLs
async function testUrls() {
  console.log('\n🌐 Probando acceso HTTP...');
  
  const testUrls = [
    {
      url: `http://localhost:4000/uploads/cvs/${EXISTING_FILE}`,
      description: 'Archivo existente - Local (puerto 4000)'
    },
    {
      url: `http://localhost:4000/uploads/cvs/${MISSING_FILE}`,
      description: 'Archivo inexistente - Local (puerto 4000)'
    }
  ];
  
  const results = [];
  
  for (const test of testUrls) {
    console.log(`\n🔗 Probando: ${test.description}`);
    console.log(`   URL: ${test.url}`);
    
    const result = await testHttpAccess(test.url, test.description);
    results.push(result);
    
    if (result.success) {
      console.log(`   ✅ Status: ${result.statusCode}`);
      console.log(`   📄 Content-Type: ${result.headers['content-type'] || 'No especificado'}`);
      console.log(`   📏 Content-Length: ${result.headers['content-length'] || 'No especificado'}`);
    } else {
      console.log(`   ❌ Error: ${result.error}`);
    }
  }
  
  return results;
}

// Función para generar reporte
function generateReport(localOk, httpResults) {
  console.log('\n📋 REPORTE FINAL');
  console.log('='.repeat(50));
  
  console.log(`\n📁 Archivos locales:`);
  console.log(`   ${localOk ? '✅' : '❌'} Directorio y archivos accesibles`);
  
  console.log(`\n🌐 Acceso HTTP:`);
  httpResults.forEach(result => {
    const status = result.success ? '✅' : '❌';
    console.log(`   ${status} ${result.description}`);
    if (result.success) {
      console.log(`      Status: ${result.statusCode}`);
    } else {
      console.log(`      Error: ${result.error}`);
    }
  });
  
  // Recomendaciones
  console.log(`\n💡 RECOMENDACIONES:`);
  
  if (!localOk) {
    console.log(`   - Verificar que el directorio uploads/cvs existe`);
    console.log(`   - Verificar permisos de lectura en el directorio`);
  }
  
  const failedHttp = httpResults.filter(r => !r.success);
  if (failedHttp.length > 0) {
    console.log(`   - ${failedHttp.length} URLs no son accesibles`);
    console.log(`   - Verificar que el servidor esté ejecutándose`);
    console.log(`   - Verificar configuración de nginx`);
    console.log(`   - Verificar que los archivos existan en producción`);
  }
  
  const missingFileTests = httpResults.filter(r => 
    r.url.includes(MISSING_FILE) && r.success && r.statusCode === 200
  );
  
  if (missingFileTests.length > 0) {
    console.log(`   ⚠️ CRÍTICO: Archivo inexistente devuelve 200 OK`);
    console.log(`   - Esto indica un problema en la configuración`);
    console.log(`   - El archivo no debería ser accesible`);
  }
  
  const existingFileTests = httpResults.filter(r => 
    r.url.includes(EXISTING_FILE) && (!r.success || r.statusCode !== 200)
  );
  
  if (existingFileTests.length > 0) {
    console.log(`   ⚠️ CRÍTICO: Archivo existente no es accesible`);
    console.log(`   - Verificar configuración de archivos estáticos`);
    console.log(`   - Verificar que nginx esté configurado correctamente`);
  }
  
  console.log(`\n✅ Diagnóstico completado`);
}

// Función principal
async function main() {
  try {
    console.log('🚀 Iniciando diagnóstico de acceso a archivos...');
    
    // 1. Verificar archivos locales
    const localOk = checkLocalFiles();
    
    // 2. Probar acceso HTTP
    const httpResults = await testUrls();
    
    // 3. Generar reporte
    generateReport(localOk, httpResults);
    
  } catch (error) {
    console.error('❌ Error durante el diagnóstico:', error.message);
    process.exit(1);
  }
}

// Manejar interrupciones
process.on('SIGINT', () => {
  console.log('\n👋 Diagnóstico cancelado por el usuario');
  process.exit(0);
});

// Ejecutar si se llama directamente
if (require.main === module) {
  main();
}

module.exports = {
  checkLocalFiles,
  testUrls,
  generateReport
};
