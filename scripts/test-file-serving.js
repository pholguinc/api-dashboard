#!/usr/bin/env node

/**
 * Script simple para probar el servido de archivos estáticos
 */

const express = require('express');
const path = require('path');
const fs = require('fs');

console.log('🧪 Probando servido de archivos estáticos...');

const app = express();
const uploadsPath = path.join(__dirname, '../uploads');

// Configuración de archivos estáticos (igual que en app.ts)
app.use('/uploads', express.static(uploadsPath));

// Endpoint para listar archivos disponibles
app.get('/list-files', (req, res) => {
  const cvsPath = path.join(uploadsPath, 'cvs');
  
  if (!fs.existsSync(cvsPath)) {
    return res.status(404).json({ error: 'Directorio cvs no encontrado' });
  }
  
  const files = fs.readdirSync(cvsPath);
  
  const fileList = files.map(file => {
    const filePath = path.join(cvsPath, file);
    const stats = fs.statSync(filePath);
    return {
      filename: file,
      size: stats.size,
      modified: stats.mtime,
      url: `http://localhost:3002/uploads/cvs/${file}`,
      directPath: filePath
    };
  });
  
  res.json({
    message: 'Archivos disponibles en uploads/cvs',
    uploadsPath: uploadsPath,
    cvsPath: cvsPath,
    count: files.length,
    files: fileList
  });
});

// Endpoint de prueba para verificar que un archivo específico existe
app.get('/test/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(uploadsPath, 'cvs', filename);
  
  console.log(`🔍 Verificando archivo: ${filename}`);
  console.log(`📂 Ruta completa: ${filePath}`);
  
  if (!fs.existsSync(filePath)) {
    console.log('❌ Archivo no encontrado');
    return res.status(404).json({ 
      error: 'Archivo no encontrado',
      filename: filename,
      filePath: filePath,
      exists: false
    });
  }
  
  const stats = fs.statSync(filePath);
  console.log('✅ Archivo encontrado');
  
  res.json({
    success: true,
    filename: filename,
    filePath: filePath,
    size: stats.size,
    modified: stats.mtime,
    url: `http://localhost:3002/uploads/cvs/${filename}`,
    exists: true
  });
});

// Buscar un puerto disponible
function findAvailablePort(startPort = 3002) {
  return new Promise((resolve, reject) => {
    const server = require('http').createServer();
    
    server.listen(startPort, (err) => {
      if (err) {
        if (err.code === 'EADDRINUSE') {
          findAvailablePort(startPort + 1).then(resolve).catch(reject);
        } else {
          reject(err);
        }
      } else {
        server.close(() => resolve(startPort));
      }
    });
  });
}

async function startTestServer() {
  try {
    const port = await findAvailablePort();
    
    const server = app.listen(port, () => {
      console.log(`🚀 Servidor de prueba iniciado en http://localhost:${port}`);
      console.log(`📋 Listar archivos: http://localhost:${port}/list-files`);
      console.log(`🔍 Probar archivo existente: http://localhost:${port}/test/cv-1758750133243-110097015.pdf`);
      console.log(`📄 Acceder al PDF: http://localhost:${port}/uploads/cvs/cv-1758750133243-110097015.pdf`);
      console.log(`🔍 Probar archivo inexistente: http://localhost:${port}/test/cv-1758754416693-3286920.pdf`);
      
      console.log('\n⏰ Servidor se detendrá en 60 segundos...');
      console.log('💡 Abre las URLs en tu navegador para probar el servido de archivos');
      
      setTimeout(() => {
        server.close();
        console.log('✅ Prueba completada');
        process.exit(0);
      }, 60000);
    });
    
    server.on('error', (err) => {
      console.error('❌ Error del servidor:', err.message);
      process.exit(1);
    });
    
  } catch (error) {
    console.error('❌ Error iniciando servidor:', error.message);
    process.exit(1);
  }
}

// Manejar interrupciones
process.on('SIGINT', () => {
  console.log('\n👋 Prueba cancelada por el usuario');
  process.exit(0);
});

// Ejecutar
startTestServer();
