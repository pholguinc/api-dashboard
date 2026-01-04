#!/bin/bash

# Metro Streaming Infrastructure - Professional Deployment Script
# Este script despliega la infraestructura completa de streaming de nivel empresarial

set -e

echo "🚀 DESPLEGANDO INFRAESTRUCTURA DE STREAMING PROFESIONAL"
echo "======================================================="

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Funciones de utilidad
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Verificar prerequisitos
check_prerequisites() {
    log_info "Verificando prerequisitos..."
    
    # Docker y Docker Compose
    if ! command -v docker &> /dev/null; then
        log_error "Docker no está instalado"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose no está instalado"
        exit 1
    fi
    
    # Node.js y npm
    if ! command -v node &> /dev/null; then
        log_error "Node.js no está instalado"
        exit 1
    fi
    
    # FFmpeg
    if ! command -v ffmpeg &> /dev/null; then
        log_warning "FFmpeg no está instalado globalmente (se instalará en Docker)"
    fi
    
    log_success "Prerequisitos verificados"
}

# Configurar variables de entorno
setup_environment() {
    log_info "Configurando variables de entorno..."
    
    # Crear archivo .env si no existe
    if [ ! -f .env.streaming ]; then
        cat > .env.streaming << EOF
# Metro Streaming - Production Environment

# Database
MONGODB_URI=mongodb://localhost:27017/telemetro_streaming

# AWS Configuration
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=us-east-1
AWS_S3_BUCKET=metro-streaming-recordings

# Redis
REDIS_URL=redis://localhost:6379

# InfluxDB
INFLUXDB_URL=http://localhost:8086
INFLUXDB_PASSWORD=metro_influx_2024

# Grafana
GRAFANA_PASSWORD=metro_grafana_2024

# SSL Certificates
SSL_CERT_PATH=./ssl/metro.crt
SSL_KEY_PATH=./ssl/metro.key

# Streaming Configuration
RTMP_PORT=1935
HLS_PORT=8000
WEBRTC_PORT=9000
MAX_CONCURRENT_STREAMS=100
MAX_VIEWERS_PER_STREAM=1000

# CDN Configuration
CDN_ENABLED=true
CDN_PROVIDER=cloudflare
CDN_ZONE_ID=your_cloudflare_zone_id
CDN_API_TOKEN=your_cloudflare_token

# Security
STREAM_AUTH_SECRET=your_stream_auth_secret
WEBHOOK_SECRET=your_webhook_secret

# Monitoring
ENABLE_METRICS=true
METRICS_RETENTION_DAYS=30
ALERT_WEBHOOK_URL=your_slack_webhook_url
EOF
        log_warning "Archivo .env.streaming creado. ¡CONFIGURA LAS VARIABLES ANTES DE CONTINUAR!"
        read -p "Presiona Enter cuando hayas configurado las variables..."
    fi
    
    # Cargar variables de entorno
    export $(cat .env.streaming | grep -v '#' | xargs)
    
    log_success "Variables de entorno configuradas"
}

# Generar certificados SSL
generate_ssl_certificates() {
    log_info "Generando certificados SSL..."
    
    mkdir -p ssl
    
    if [ ! -f ssl/metro.crt ] || [ ! -f ssl/metro.key ]; then
        # Generar certificado autofirmado para desarrollo
        openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
            -keyout ssl/metro.key \
            -out ssl/metro.crt \
            -subj "/C=PE/ST=Lima/L=Lima/O=Metro/OU=Streaming/CN=streaming.metro.pe"
        
        # Combinar para HAProxy
        cat ssl/metro.crt ssl/metro.key > ssl/metro.pem
        
        log_success "Certificados SSL generados"
    else
        log_info "Certificados SSL ya existen"
    fi
}

# Construir imágenes Docker
build_docker_images() {
    log_info "Construyendo imágenes Docker..."
    
    # Imagen principal de streaming
    docker build -f Dockerfile.streaming -t metro-streaming:latest .
    log_success "Imagen de streaming construida"
    
    # Imagen de transcoding
    cat > Dockerfile.transcoding << EOF
FROM jrottenberg/ffmpeg:4.4-alpine
RUN apk add --no-cache nodejs npm redis
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist/ ./dist/
CMD ["node", "dist/transcoding-worker.js"]
EOF
    docker build -f Dockerfile.transcoding -t metro-transcoding:latest .
    log_success "Imagen de transcoding construida"
    
    # Imagen de grabaciones
    cat > Dockerfile.recording << EOF
FROM node:18-alpine
RUN apk add --no-cache ffmpeg
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist/ ./dist/
CMD ["node", "dist/recording-worker.js"]
EOF
    docker build -f Dockerfile.recording -t metro-recording:latest .
    log_success "Imagen de recording construida"
    
    # Imagen de analytics
    cat > Dockerfile.analytics << EOF
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist/ ./dist/
EXPOSE 3001
CMD ["node", "dist/analytics-server.js"]
EOF
    docker build -f Dockerfile.analytics -t metro-analytics:latest .
    log_success "Imagen de analytics construida"
}

# Configurar directorios
setup_directories() {
    log_info "Configurando directorios..."
    
    mkdir -p media/live
    mkdir -p recordings
    mkdir -p www
    mkdir -p grafana/dashboards
    mkdir -p grafana/datasources
    
    # Configurar permisos
    chmod 755 media recordings www
    
    log_success "Directorios configurados"
}

# Configurar Grafana dashboards
setup_grafana_dashboards() {
    log_info "Configurando dashboards de Grafana..."
    
    # Dashboard principal de streaming
    cat > grafana/dashboards/streaming-dashboard.json << EOF
{
  "dashboard": {
    "id": null,
    "title": "Metro Streaming - Professional Dashboard",
    "tags": ["streaming", "metro"],
    "timezone": "browser",
    "panels": [
      {
        "id": 1,
        "title": "Active Streams",
        "type": "stat",
        "targets": [
          {
            "expr": "streaming_active_streams",
            "refId": "A"
          }
        ],
        "gridPos": {"h": 8, "w": 6, "x": 0, "y": 0}
      },
      {
        "id": 2,
        "title": "Total Viewers",
        "type": "stat",
        "targets": [
          {
            "expr": "streaming_total_viewers",
            "refId": "A"
          }
        ],
        "gridPos": {"h": 8, "w": 6, "x": 6, "y": 0}
      },
      {
        "id": 3,
        "title": "Server Load",
        "type": "graph",
        "targets": [
          {
            "expr": "streaming_server_load",
            "refId": "A"
          }
        ],
        "gridPos": {"h": 8, "w": 12, "x": 12, "y": 0}
      }
    ],
    "time": {
      "from": "now-1h",
      "to": "now"
    },
    "refresh": "5s"
  }
}
EOF

    # Datasource para InfluxDB
    cat > grafana/datasources/influxdb.yml << EOF
apiVersion: 1
datasources:
  - name: InfluxDB
    type: influxdb
    access: proxy
    url: http://influxdb:8086
    database: streaming_metrics
    user: admin
    password: \${INFLUXDB_PASSWORD}
    isDefault: true
EOF

    log_success "Dashboards de Grafana configurados"
}

# Desplegar servicios
deploy_services() {
    log_info "Desplegando servicios con Docker Compose..."
    
    # Parar servicios existentes
    docker-compose -f docker-compose.streaming.yml down --remove-orphans
    
    # Iniciar servicios
    docker-compose -f docker-compose.streaming.yml up -d
    
    log_success "Servicios desplegados"
}

# Verificar salud de servicios
health_check() {
    log_info "Verificando salud de servicios..."
    
    # Esperar a que los servicios estén listos
    sleep 30
    
    # Verificar RTMP
    if nc -z localhost 1935; then
        log_success "Servidor RTMP funcionando (puerto 1935)"
    else
        log_error "Servidor RTMP no responde"
    fi
    
    # Verificar HLS
    if curl -f http://localhost:8000/health &> /dev/null; then
        log_success "Servidor HLS funcionando (puerto 8000)"
    else
        log_error "Servidor HLS no responde"
    fi
    
    # Verificar WebRTC
    if nc -z localhost 9000; then
        log_success "Servidor WebRTC funcionando (puerto 9000)"
    else
        log_error "Servidor WebRTC no responde"
    fi
    
    # Verificar HAProxy
    if curl -f http://localhost:8404/stats &> /dev/null; then
        log_success "HAProxy funcionando (puerto 8404)"
    else
        log_warning "HAProxy stats no disponibles"
    fi
    
    # Verificar Grafana
    if curl -f http://localhost:3000 &> /dev/null; then
        log_success "Grafana funcionando (puerto 3000)"
    else
        log_warning "Grafana no disponible"
    fi
}

# Mostrar información de despliegue
show_deployment_info() {
    echo ""
    echo "🎉 DESPLIEGUE COMPLETADO EXITOSAMENTE"
    echo "===================================="
    echo ""
    echo "📡 ENDPOINTS DE STREAMING:"
    echo "   RTMP Ingest: rtmp://localhost:1935/live/{STREAM_KEY}"
    echo "   HLS Playback: http://localhost:8000/live/{STREAM_KEY}/index.m3u8"
    echo "   WebRTC: ws://localhost:9000/webrtc/{STREAM_KEY}"
    echo ""
    echo "🎛️  PANELES DE ADMINISTRACIÓN:"
    echo "   HAProxy Stats: http://localhost:8404/stats (admin:metro2024)"
    echo "   Grafana Dashboard: http://localhost:3000 (admin:${GRAFANA_PASSWORD})"
    echo "   Nginx RTMP Stats: http://localhost:4000/stat"
    echo ""
    echo "🔧 SERVICIOS DESPLEGADOS:"
    echo "   ✅ Streaming Server (RTMP/HLS/WebRTC)"
    echo "   ✅ Nginx RTMP (Load Balancing)"
    echo "   ✅ HAProxy (Load Balancer)"
    echo "   ✅ Redis (Cache/Sessions)"
    echo "   ✅ InfluxDB (Métricas)"
    echo "   ✅ Grafana (Visualización)"
    echo "   ✅ Transcoding Workers (2x)"
    echo "   ✅ Recording Server"
    echo "   ✅ Analytics Server"
    echo ""
    echo "📊 CARACTERÍSTICAS PROFESIONALES:"
    echo "   🎬 Transcoding automático (4 calidades)"
    echo "   ⚡ WebRTC ultra-baja latencia (< 1s)"
    echo "   ☁️  Upload automático a S3"
    echo "   🌍 CDN integration"
    echo "   📈 Analytics en tiempo real"
    echo "   🔄 Load balancing y failover"
    echo "   🔒 SSL/TLS encryption"
    echo "   📊 Monitoreo con Grafana"
    echo ""
    echo "🎯 PRÓXIMOS PASOS:"
    echo "   1. Configurar DNS: streaming.metro.pe -> tu servidor"
    echo "   2. Configurar certificados SSL reales"
    echo "   3. Configurar CDN (CloudFlare/AWS CloudFront)"
    echo "   4. Configurar monitoreo y alertas"
    echo "   5. Realizar pruebas de carga"
    echo ""
}

# Función principal
main() {
    log_info "Iniciando despliegue de infraestructura de streaming..."
    
    check_prerequisites
    setup_environment
    generate_ssl_certificates
    setup_directories
    setup_grafana_dashboards
    build_docker_images
    deploy_services
    health_check
    show_deployment_info
    
    log_success "¡Infraestructura de streaming desplegada exitosamente!"
}

# Manejo de errores
trap 'log_error "Error en línea $LINENO. Saliendo..."; exit 1' ERR

# Ejecutar función principal
main "$@"
