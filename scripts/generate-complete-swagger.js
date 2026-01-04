#!/usr/bin/env node

/**
 * Script para generar documentación completa de Swagger
 * Corrige problemas existentes y agrega documentación faltante
 */

const fs = require('fs');
const path = require('path');

console.log('🚀 Generando documentación completa de Swagger...');

// Función para leer archivos de rutas
function readRouteFiles() {
  const routesDir = path.join(__dirname, '../src/routes');
  const files = [];
  
  function readDir(dir, prefix = '') {
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        readDir(fullPath, `${prefix}${item}/`);
      } else if (item.endsWith('.ts') && !item.includes('.d.ts')) {
        files.push({
          path: fullPath,
          relativePath: `${prefix}${item}`,
          content: fs.readFileSync(fullPath, 'utf8')
        });
      }
    }
  }
  
  readDir(routesDir);
  return files;
}

// Función para extraer información de endpoints
function extractEndpointInfo(content) {
  const endpoints = [];
  const lines = content.split('\n');
  
  let currentEndpoint = null;
  let inSwaggerBlock = false;
  let swaggerContent = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Detectar inicio de bloque Swagger
    if (line.includes('/**') && lines[i + 1]?.includes('@swagger')) {
      inSwaggerBlock = true;
      swaggerContent = [];
      continue;
    }
    
    // Detectar fin de bloque Swagger
    if (inSwaggerBlock && line.includes('*/')) {
      inSwaggerBlock = false;
      
      // Buscar la definición de la ruta después del bloque Swagger
      for (let j = i + 1; j < lines.length; j++) {
        const routeLine = lines[j];
        if (routeLine.includes('router.') && (routeLine.includes('get') || routeLine.includes('post') || routeLine.includes('put') || routeLine.includes('delete') || routeLine.includes('patch'))) {
          currentEndpoint = {
            swaggerContent: swaggerContent.join('\n'),
            routeDefinition: routeLine.trim(),
            lineNumber: j + 1
          };
          break;
        }
      }
      
      if (currentEndpoint) {
        endpoints.push(currentEndpoint);
        currentEndpoint = null;
      }
      continue;
    }
    
    // Recopilar contenido del bloque Swagger
    if (inSwaggerBlock) {
      swaggerContent.push(line);
    }
  }
  
  return endpoints;
}

// Función para identificar problemas en la documentación
function identifyProblems(endpoints, filePath) {
  const problems = [];
  
  endpoints.forEach((endpoint, index) => {
    const swaggerContent = endpoint.swaggerContent;
    
    // Verificar si falta documentación
    if (!swaggerContent || swaggerContent.trim().length < 50) {
      problems.push({
        type: 'INCOMPLETE_DOCUMENTATION',
        severity: 'HIGH',
        file: filePath,
        line: endpoint.lineNumber,
        message: 'Documentación de Swagger incompleta o muy básica',
        endpoint: endpoint.routeDefinition
      });
    }
    
    // Verificar si falta información de request body
    if (endpoint.routeDefinition.includes('post') || endpoint.routeDefinition.includes('put') || endpoint.routeDefinition.includes('patch')) {
      if (!swaggerContent.includes('requestBody')) {
        problems.push({
          type: 'MISSING_REQUEST_BODY',
          severity: 'MEDIUM',
          file: filePath,
          line: endpoint.lineNumber,
          message: 'Falta documentación de requestBody para endpoint POST/PUT/PATCH',
          endpoint: endpoint.routeDefinition
        });
      }
    }
    
    // Verificar si faltan ejemplos
    if (!swaggerContent.includes('example')) {
      problems.push({
        type: 'MISSING_EXAMPLES',
        severity: 'MEDIUM',
        file: filePath,
        line: endpoint.lineNumber,
        message: 'Faltan ejemplos en la documentación',
        endpoint: endpoint.routeDefinition
      });
    }
    
    // Verificar si faltan códigos de respuesta
    if (!swaggerContent.includes('responses:') || !swaggerContent.includes('200:')) {
      problems.push({
        type: 'MISSING_RESPONSES',
        severity: 'HIGH',
        file: filePath,
        line: endpoint.lineNumber,
        message: 'Faltan códigos de respuesta documentados',
        endpoint: endpoint.routeDefinition
      });
    }
    
    // Verificar referencias incorrectas
    if (swaggerContent.includes('$ref') && swaggerContent.includes('ClipsListResponse')) {
      const routePath = endpoint.routeDefinition.match(/router\.(\w+)\('([^']+)'/);
      if (routePath && !routePath[2].includes('clips')) {
        problems.push({
          type: 'INCORRECT_SCHEMA_REFERENCE',
          severity: 'HIGH',
          file: filePath,
          line: endpoint.lineNumber,
          message: 'Referencia incorrecta a ClipsListResponse en endpoint que no es de clips',
          endpoint: endpoint.routeDefinition
        });
      }
    }
  });
  
  return problems;
}

// Función para generar documentación mejorada
function generateImprovedDocumentation(endpoint, routeDefinition) {
  const method = routeDefinition.match(/router\.(\w+)/)?.[1] || 'get';
  const path = routeDefinition.match(/router\.\w+\('([^']+)'/)?.[1] || '';
  
  // Extraer información de la ruta
  const isAuth = routeDefinition.includes('auth');
  const isAdmin = routeDefinition.includes('requireRole') || routeDefinition.includes('admin');
  const hasParams = path.includes(':');
  const hasBody = ['post', 'put', 'patch'].includes(method);
  
  let improvedDoc = `/**
 * @swagger
 * ${path}:
 *   ${method}:`;
  
  // Agregar información básica
  const summary = generateSummary(path, method);
  const description = generateDescription(path, method);
  
  improvedDoc += `
 *     tags: [${getTagFromPath(path)}]
 *     summary: ${summary}
 *     description: ${description}`;
  
  // Agregar seguridad si es necesario
  if (isAuth) {
    improvedDoc += `
 *     security:
 *       - bearerAuth: []`;
  }
  
  // Agregar parámetros de ruta
  if (hasParams) {
    const params = extractPathParams(path);
    params.forEach(param => {
      improvedDoc += `
 *     parameters:
 *       - in: path
 *         name: ${param}
 *         required: true
 *         schema:
 *           type: string
 *           format: objectId
 *         description: ID del ${getEntityName(param)}`;
    });
  }
  
  // Agregar request body si es necesario
  if (hasBody) {
    improvedDoc += `
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/${getSchemaName(path, method)}Request'`;
  }
  
  // Agregar respuestas
  improvedDoc += `
 *     responses:
 *       200:
 *         description: Operación exitosa
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       description: Datos específicos del endpoint`;
  
  if (isAuth) {
    improvedDoc += `
 *       401:
 *         description: No autorizado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'`;
  }
  
  if (isAdmin) {
    improvedDoc += `
 *       403:
 *         description: Sin permisos de administrador
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'`;
  }
  
  improvedDoc += `
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */`;
  
  return improvedDoc;
}

// Funciones auxiliares
function generateSummary(path, method) {
  const action = method.toUpperCase();
  const entity = getEntityFromPath(path);
  return `${action} ${path} - ${getActionDescription(method, entity)}`;
}

function generateDescription(path, method) {
  const entity = getEntityFromPath(path);
  return `${getActionDescription(method, entity)} para ${entity}`;
}

function getActionDescription(method, entity) {
  const actions = {
    'get': 'Obtener',
    'post': 'Crear',
    'put': 'Actualizar',
    'patch': 'Modificar',
    'delete': 'Eliminar'
  };
  return actions[method] || 'Procesar';
}

function getEntityFromPath(path) {
  if (path.includes('users')) return 'usuarios';
  if (path.includes('clips')) return 'clips';
  if (path.includes('streaming')) return 'streaming';
  if (path.includes('marketplace')) return 'marketplace';
  if (path.includes('points')) return 'puntos';
  if (path.includes('premium')) return 'premium';
  if (path.includes('payments')) return 'pagos';
  if (path.includes('admin')) return 'administración';
  return 'recursos';
}

function getTagFromPath(path) {
  if (path.includes('admin')) return 'Admin';
  if (path.includes('clips')) return 'Clips';
  if (path.includes('streaming')) return 'Streaming';
  if (path.includes('marketplace')) return 'Marketplace';
  if (path.includes('points')) return 'Puntos';
  if (path.includes('premium')) return 'Premium';
  if (path.includes('payments')) return 'Pagos';
  if (path.includes('auth')) return 'Autenticación';
  return 'Sistema';
}

function extractPathParams(path) {
  const matches = path.match(/:(\w+)/g);
  return matches ? matches.map(match => match.substring(1)) : [];
}

function getEntityName(param) {
  if (param.includes('id')) return 'recurso';
  if (param.includes('userId')) return 'usuario';
  if (param.includes('streamId')) return 'stream';
  if (param.includes('clipId')) return 'clip';
  return param;
}

function getSchemaName(path, method) {
  const entity = getEntityFromPath(path);
  const action = method.charAt(0).toUpperCase() + method.slice(1);
  return `${entity}${action}`;
}

// Función principal
function main() {
  console.log('📖 Leyendo archivos de rutas...');
  const routeFiles = readRouteFiles();
  
  console.log(`📁 Encontrados ${routeFiles.length} archivos de rutas`);
  
  let totalProblems = 0;
  let totalEndpoints = 0;
  
  const report = {
    summary: {
      totalFiles: routeFiles.length,
      totalEndpoints: 0,
      totalProblems: 0,
      problemsByType: {},
      problemsBySeverity: {}
    },
    files: []
  };
  
  routeFiles.forEach(file => {
    console.log(`🔍 Analizando ${file.relativePath}...`);
    
    const endpoints = extractEndpointInfo(file.content);
    const problems = identifyProblems(endpoints, file.relativePath);
    
    totalEndpoints += endpoints.length;
    totalProblems += problems.length;
    
    // Agrupar problemas por tipo y severidad
    problems.forEach(problem => {
      report.summary.problemsByType[problem.type] = (report.summary.problemsByType[problem.type] || 0) + 1;
      report.summary.problemsBySeverity[problem.severity] = (report.summary.problemsBySeverity[problem.severity] || 0) + 1;
    });
    
    report.files.push({
      file: file.relativePath,
      endpoints: endpoints.length,
      problems: problems.length,
      details: problems
    });
    
    console.log(`   📊 ${endpoints.length} endpoints, ${problems.length} problemas`);
  });
  
  report.summary.totalEndpoints = totalEndpoints;
  report.summary.totalProblems = totalProblems;
  
  // Guardar reporte
  const reportPath = path.join(__dirname, '../swagger-analysis-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  console.log('\n📊 RESUMEN DEL ANÁLISIS:');
  console.log(`📁 Archivos analizados: ${report.summary.totalFiles}`);
  console.log(`🔗 Endpoints encontrados: ${report.summary.totalEndpoints}`);
  console.log(`⚠️  Problemas encontrados: ${report.summary.totalProblems}`);
  
  console.log('\n🚨 PROBLEMAS POR SEVERIDAD:');
  Object.entries(report.summary.problemsBySeverity).forEach(([severity, count]) => {
    console.log(`   ${severity}: ${count}`);
  });
  
  console.log('\n📋 TIPOS DE PROBLEMAS:');
  Object.entries(report.summary.problemsByType).forEach(([type, count]) => {
    console.log(`   ${type}: ${count}`);
  });
  
  console.log(`\n📄 Reporte detallado guardado en: ${reportPath}`);
  
  // Generar recomendaciones
  console.log('\n💡 RECOMENDACIONES:');
  console.log('1. Corregir documentación incompleta en endpoints críticos');
  console.log('2. Agregar ejemplos de request/response');
  console.log('3. Documentar todos los códigos de respuesta');
  console.log('4. Corregir referencias incorrectas a esquemas');
  console.log('5. Implementar validación de documentación en CI/CD');
  
  console.log('\n✅ Análisis completado!');
}

// Ejecutar si se llama directamente
if (require.main === module) {
  main();
}

module.exports = {
  readRouteFiles,
  extractEndpointInfo,
  identifyProblems,
  generateImprovedDocumentation
};
