#!/usr/bin/env node

/**
 * Script para diagnosticar y corregir problemas con el servido de archivos estáticos
 */

const fs = require('fs');
const path = require('path');
const express = require('express');
const mongoose = require('mongoose');

console.log('🔍 Diagnóstico de problemas con archivos estáticos...');

// Función para verificar archivos en uploads
function checkUploadsDirectory() {
  const uploadsPath = path.join(__dirname, '../uploads');
  const cvsPath = path.join(uploadsPath, 'cvs');
  
  console.log('\n📁 Verificando directorio de uploads...');
  console.log(`📂 Ruta uploads: ${uploadsPath}`);
  console.log(`📂 Ruta CVs: ${cvsPath}`);
  
  if (!fs.existsSync(uploadsPath)) {
    console.log('❌ Directorio uploads no existe');
    return false;
  }
  
  if (!fs.existsSync(cvsPath)) {
    console.log('❌ Directorio uploads/cvs no existe');
    return false;
  }
  
  const files = fs.readdirSync(cvsPath);
  console.log(`📄 Archivos encontrados en uploads/cvs: ${files.length}`);
  files.forEach(file => {
    const filePath = path.join(cvsPath, file);
    const stats = fs.statSync(filePath);
    console.log(`   - ${file} (${stats.size} bytes, ${stats.mtime})`);
  });
  
  return true;
}

// Función para verificar configuración de archivos estáticos
function checkStaticConfiguration() {
  console.log('\n⚙️ Verificando configuración de archivos estáticos...');
  
  const appPath = path.join(__dirname, '../src/app.ts');
  const content = fs.readFileSync(appPath, 'utf8');
  
  const staticConfigLines = content.split('\n').filter(line => 
    line.includes('express.static') || line.includes('/uploads')
  );
  
  console.log('📋 Configuración actual de archivos estáticos:');
  staticConfigLines.forEach((line, index) => {
    console.log(`   ${index + 1}. ${line.trim()}`);
  });
  
  // Verificar si hay problemas en la configuración
  const issues = [];
  
  if (!content.includes("app.use('/uploads', express.static(")) {
    issues.push('Falta configuración de archivos estáticos para /uploads');
  }
  
  if (content.includes("path.join(__dirname, './uploads')")) {
    issues.push('Configuración apunta a src/uploads en lugar de uploads/');
  }
  
  if (issues.length > 0) {
    console.log('\n⚠️ Problemas encontrados:');
    issues.forEach(issue => console.log(`   - ${issue}`));
    return false;
  }
  
  console.log('✅ Configuración de archivos estáticos parece correcta');
  return true;
}

// Función para crear un servidor de prueba
function createTestServer() {
  console.log('\n🧪 Creando servidor de prueba...');
  
  const app = express();
  const uploadsPath = path.join(__dirname, '../uploads');
  
  // Configuración de archivos estáticos
  app.use('/uploads', express.static(uploadsPath));
  
  // Endpoint de prueba
  app.get('/test-file/:filename', (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(uploadsPath, 'cvs', filename);
    
    console.log(`🔍 Intentando servir archivo: ${filePath}`);
    
    if (!fs.existsSync(filePath)) {
      console.log('❌ Archivo no encontrado');
      return res.status(404).json({ error: 'Archivo no encontrado', path: filePath });
    }
    
    console.log('✅ Archivo encontrado, sirviendo...');
    res.sendFile(filePath);
  });
  
  // Listar archivos disponibles
  app.get('/list-files', (req, res) => {
    const cvsPath = path.join(uploadsPath, 'cvs');
    const files = fs.readdirSync(cvsPath);
    
    const fileList = files.map(file => {
      const filePath = path.join(cvsPath, file);
      const stats = fs.statSync(filePath);
      return {
        filename: file,
        size: stats.size,
        modified: stats.mtime,
        path: `/uploads/cvs/${file}`,
        testUrl: `http://localhost:3001/test-file/${file}`
      };
    });
    
    res.json({
      message: 'Archivos disponibles en uploads/cvs',
      count: files.length,
      files: fileList
    });
  });
  
  const port = 3001;
  const server = app.listen(port, () => {
    console.log(`🚀 Servidor de prueba iniciado en http://localhost:${port}`);
    console.log(`📋 Listar archivos: http://localhost:${port}/list-files`);
    console.log(`🔗 Probar archivo: http://localhost:${port}/test-file/[filename]`);
    console.log(`📄 Archivo existente: http://localhost:${port}/test-file/cv-1758750133243-110097015.pdf`);
    
    console.log('\n⏰ Servidor se detendrá en 30 segundos...');
    setTimeout(() => {
      server.close();
      console.log('✅ Prueba completada');
      process.exit(0);
    }, 30000);
  });
}

// Función para corregir la configuración
function fixStaticConfiguration() {
  console.log('\n🔧 Corrigiendo configuración de archivos estáticos...');
  
  const appPath = path.join(__dirname, '../src/app.ts');
  let content = fs.readFileSync(appPath, 'utf8');
  
  // Backup del archivo original
  const backupPath = appPath + '.backup';
  fs.writeFileSync(backupPath, content);
  console.log(`💾 Backup creado en: ${backupPath}`);
  
  // Corregir la configuración
  const correctedContent = content.replace(
    /app\.use\('\/uploads', express\.static\(path\.join\(__dirname, '\.\/uploads'\)\)\);/g,
    "app.use('/uploads', express.static(path.join(__dirname, '../uploads')));"
  );
  
  if (content !== correctedContent) {
    fs.writeFileSync(appPath, correctedContent);
    console.log('✅ Configuración corregida');
  } else {
    console.log('ℹ️ No se necesitaron correcciones');
  }
}

// Función para verificar archivos en la base de datos
async function checkDatabaseFiles() {
  console.log('\n🗄️ Verificando archivos en la base de datos...');
  
  try {
    // Conectar a MongoDB (ajustar la URL según tu configuración)
    const mongoUrl = process.env.MONGODB_URI || 'mongodb://localhost:27017/telemetro';
    await mongoose.connect(mongoUrl);
    console.log('✅ Conectado a MongoDB');
    
    // Buscar aplicaciones de empleos con archivos CV
    const JobApplicationModel = mongoose.model('JobApplication', new mongoose.Schema({}, { strict: false }));
    const applications = await JobApplicationModel.find({
      'cvFile.filename': { $exists: true }
    }).limit(10);
    
    console.log(`📊 Aplicaciones encontradas: ${applications.length}`);
    
    applications.forEach((app, index) => {
      const cvFile = app.cvFile;
      const filePath = path.join(__dirname, '../uploads/cvs', cvFile.filename);
      const exists = fs.existsSync(filePath);
      
      console.log(`\n📄 Aplicación ${index + 1}:`);
      console.log(`   - ID: ${app._id}`);
      console.log(`   - Archivo: ${cvFile.filename}`);
      console.log(`   - Ruta: ${filePath}`);
      console.log(`   - Existe: ${exists ? '✅' : '❌'}`);
      
      if (!exists) {
        console.log(`   ⚠️ PROBLEMA: Archivo no encontrado en el sistema de archivos`);
      }
    });
    
    await mongoose.disconnect();
    console.log('✅ Desconectado de MongoDB');
    
  } catch (error) {
    console.log('❌ Error conectando a MongoDB:', error.message);
    console.log('ℹ️ Asegúrate de que MongoDB esté ejecutándose y la URL sea correcta');
  }
}

// Función principal
async function main() {
  console.log('🚀 Iniciando diagnóstico de archivos estáticos...\n');
  
  // 1. Verificar directorio de uploads
  const uploadsOk = checkUploadsDirectory();
  
  // 2. Verificar configuración
  const configOk = checkStaticConfiguration();
  
  // 3. Corregir configuración si es necesario
  if (!configOk) {
    fixStaticConfiguration();
  }
  
  // 4. Verificar archivos en la base de datos
  await checkDatabaseFiles();
  
  // 5. Crear servidor de prueba
  console.log('\n🧪 ¿Deseas iniciar un servidor de prueba? (Ctrl+C para cancelar)');
  console.log('Iniciando servidor de prueba en 3 segundos...');
  
  setTimeout(() => {
    createTestServer();
  }, 3000);
}

// Manejar interrupciones
process.on('SIGINT', () => {
  console.log('\n👋 Diagnóstico cancelado por el usuario');
  process.exit(0);
});

// Ejecutar si se llama directamente
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Error durante el diagnóstico:', error);
    process.exit(1);
  });
}

module.exports = {
  checkUploadsDirectory,
  checkStaticConfiguration,
  fixStaticConfiguration,
  checkDatabaseFiles,
  createTestServer
};
