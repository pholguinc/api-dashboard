# 🚇 Telemetro Backend API
### *Plataforma de Transporte Público Inteligente con IA Conversacional*

<div align="center">

![Telemetro Backend](https://img.shields.io/badge/Telemetro-Backend%20API-FF6B35?style=for-the-badge&logo=node.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Express.js](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white)

**🚀 Backend completo para el sistema Telemetro - Revolucionando el transporte público peruano con tecnología de vanguardia**

[![API Status](https://img.shields.io/badge/API-Online-success?style=flat-square)]()
[![Version](https://img.shields.io/badge/Version-2.0.0-blue?style=flat-square)]()
[![License](https://img.shields.io/badge/License-Private-red?style=flat-square)]()

</div>

---

## 📋 **Tabla de Contenidos**

- [🎯 **Visión General**](#-visión-general)
- [✨ **Características Principales**](#-características-principales)
- [🏗️ **Arquitectura del Sistema**](#️-arquitectura-del-sistema)
- [🛠️ **Stack Tecnológico**](#️-stack-tecnológico)
- [📦 **Instalación y Configuración**](#-instalación-y-configuración)
- [🔧 **Configuración de Variables**](#-configuración-de-variables)
- [📚 **Documentación de APIs**](#-documentación-de-apis)
- [🚀 **Despliegue**](#-despliegue)
- [🧪 **Testing**](#-testing)
- [📊 **Monitoreo y Logs**](#-monitoreo-y-logs)
- [🤝 **Contribución**](#-contribución)

---

## 🎯 **Visión General**

**Telemetro Backend** es el corazón tecnológico de la plataforma de transporte público más innovadora del Perú. Integra inteligencia artificial conversacional, streaming en tiempo real, y un ecosistema completo de servicios para revolucionar la experiencia de viaje en el Metro de Lima.

### 🎨 **Diagrama de Arquitectura General**

```mermaid
graph TB
    A[📱 Flutter App] --> B[🔒 API Gateway]
    C[🎛️ Admin Panel] --> B
    B --> D[🚇 Telemetro Backend]
    
    D --> E[🗄️ MongoDB Atlas]
    D --> F[🔥 Firebase]
    D --> G[📞 Twilio]
    D --> H[🎥 WebRTC Streaming]
    
    D --> I[🤖 IA Conversacional]
    D --> J[💰 Sistema de Puntos]
    D --> K[🛒 Marketplace]
    D --> L[📚 Microcursos]
    
    M[🐳 Docker] --> D
    N[☁️ Hostinger VPS] --> M
    
    style D fill:#FF6B35,stroke:#333,stroke-width:3px,color:#fff
    style A fill:#2196F3,stroke:#333,stroke-width:2px,color:#fff
    style C fill:#4CAF50,stroke:#333,stroke-width:2px,color:#fff
```

---

## ✨ **Características Principales**

### 🧠 **Inteligencia Artificial Conversacional**
- **Chat con IA del Metro** - Asistente virtual que responde preguntas sobre rutas, horarios y servicios
- **Procesamiento de lenguaje natural** - Comprensión de consultas en español peruano
- **Respuestas contextuales** - Información actualizada sobre el estado del metro
- **Aprendizaje continuo** - Mejora constante basada en interacciones

### 📺 **Streaming en Tiempo Real**
- **WebRTC** para transmisión de video de ultra baja latencia
- **HLS (HTTP Live Streaming)** para compatibilidad multiplataforma
- **Streaming profesional** con herramientas avanzadas
- **Donaciones en tiempo real** durante transmisiones
- **Grabación automática** de sesiones para VOD

### 💰 **Sistema de Puntos y Recompensas**
- **Acumulación automática** de puntos por uso del metro
- **Streaks diarios** para fomentar el uso constante
- **Sistema de referidos** con bonificaciones
- **Redención de puntos** en marketplace
- **Gamificación** completa de la experiencia

### 🛒 **Marketplace Integrado**
- **Productos y servicios** de proveedores locales
- **Geolocalización** para ofertas cercanas a estaciones
- **Sistema de redención** con códigos QR
- **Analytics para proveedores** con métricas detalladas
- **Integración con puntos** del sistema

### 📚 **Microcursos Educativos**
- **Contenido educativo** sobre transporte público
- **Sistema de certificación** digital
- **Progreso gamificado** con badges y logros
- **Contenido multimedia** (videos, quizzes, infografías)
- **Personalización** según intereses del usuario

---

## 🏗️ **Arquitectura del Sistema**

### 📊 **Diagrama de Microservicios**

```mermaid
graph LR
    A[🚪 API Gateway] --> B[🔐 Auth Service]
    A --> C[💬 Chat Service]
    A --> D[📺 Streaming Service]
    A --> E[💰 Points Service]
    A --> F[🛒 Marketplace Service]
    A --> G[📚 Education Service]
    A --> H[📢 Notification Service]
    A --> I[🎮 Games Service]
    
    B --> J[🗄️ User Database]
    C --> K[🤖 AI Engine]
    D --> L[🎥 Media Storage]
    E --> M[💎 Points Database]
    F --> N[🏪 Products Database]
    G --> O[📖 Courses Database]
    H --> P[📱 Firebase FCM]
    I --> Q[🎯 Games Database]
    
    style A fill:#FF6B35,stroke:#333,stroke-width:3px,color:#fff
    style K fill:#9C27B0,stroke:#333,stroke-width:2px,color:#fff
```

### 🔄 **Flujo de Datos Principal**

```mermaid
sequenceDiagram
    participant U as 👤 Usuario
    participant A as 📱 App Flutter
    participant B as 🚇 Backend API
    participant DB as 🗄️ MongoDB
    participant AI as 🤖 IA Service
    participant F as 🔥 Firebase
    
    U->>A: Login con teléfono
    A->>B: POST /api/auth/login
    B->>DB: Verificar usuario
    DB-->>B: Datos del usuario
    B->>F: Enviar notificación
    B-->>A: Token JWT
    A-->>U: Acceso autorizado
    
    U->>A: Pregunta al chat
    A->>B: POST /api/chat/message
    B->>AI: Procesar consulta
    AI-->>B: Respuesta generada
    B->>DB: Guardar conversación
    B-->>A: Respuesta del chat
    A-->>U: Mensaje de la IA
```

---

## 🛠️ **Stack Tecnológico**

### 🔧 **Backend Core**
| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| **Node.js** | 18.x+ | Runtime de JavaScript |
| **TypeScript** | 5.5+ | Tipado estático |
| **Express.js** | 4.19+ | Framework web |
| **Mongoose** | 8.6+ | ODM para MongoDB |

### 🗄️ **Base de Datos**
| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| **MongoDB Atlas** | 7.0+ | Base de datos principal |
| **Mongoose** | 8.6+ | Modelado de datos |
| **GridFS** | - | Almacenamiento de archivos |

### 🔥 **Servicios Externos**
| Servicio | Propósito |
|----------|-----------|
| **Firebase** | Notificaciones push, autenticación |
| **Twilio** | SMS, llamadas, comunicaciones |
| **OpenAI/Anthropic** | IA conversacional |
| **AWS S3** | Almacenamiento de archivos |
| **Stripe** | Procesamiento de pagos |

### 📺 **Streaming y Multimedia**
| Tecnología | Propósito |
|------------|-----------|
| **WebRTC** | Streaming de ultra baja latencia |
| **Node Media Server** | Servidor de streaming |
| **FFmpeg** | Procesamiento de video |
| **Sharp** | Procesamiento de imágenes |

### 🐳 **Infraestructura**
| Tecnología | Propósito |
|------------|-----------|
| **Docker** | Contenedorización |
| **Docker Compose** | Orquestación local |
| **Nginx** | Proxy reverso |
| **PM2** | Gestión de procesos |

---

## 📦 **Instalación y Configuración**

### 🚀 **Instalación Rápida**

```bash
# 1. Clonar el repositorio
git clone https://github.com/MarketrixPE/telemetro-backend.git
cd telemetro-backend

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp env.example .env
# Editar .env con tus credenciales

# 4. Ejecutar en desarrollo
npm run dev

# 5. Verificar instalación
curl http://localhost:4000/api/health
```

### 🔧 **Scripts Disponibles**

```json
{
  "dev": "ts-node-dev --respawn --transpile-only src/server.ts",
  "build": "tsc -p tsconfig.json",
  "start": "node dist/server.js",
  "test": "jest",
  "seed-data": "node scripts/seed-data.js",
  "setup": "node scripts/setup-complete.js",
  "deploy": "./deploy-hostinger.sh"
}
```

### 📁 **Estructura del Proyecto**

```
telemetro-backend/
├── 📁 src/
│   ├── 📁 config/          # Configuraciones
│   ├── 📁 controllers/     # Controladores de API
│   ├── 📁 middleware/      # Middlewares
│   ├── 📁 models/          # Modelos de datos
│   ├── 📁 routes/          # Rutas de API
│   ├── 📁 services/        # Servicios de negocio
│   ├── 📁 sockets/         # WebSocket handlers
│   ├── 📁 utils/           # Utilidades
│   └── 📄 server.ts        # Punto de entrada
├── 📁 scripts/             # Scripts de utilidad
├── 📁 public/              # Archivos estáticos
├── 📁 uploads/             # Archivos subidos
├── 📄 package.json         # Dependencias
├── 📄 tsconfig.json        # Configuración TypeScript
└── 📄 docker-compose.yml   # Configuración Docker
```

---

## 🔧 **Configuración de Variables**

### 📝 **Archivo .env (Ejemplo)**

```bash
# 🚇 CONFIGURACIÓN GENERAL
NODE_ENV=development
PORT=4000
API_VERSION=v1

# 🗄️ BASE DE DATOS
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/telemetro
DB_NAME=telemetro_production

# 🔐 AUTENTICACIÓN
JWT_SECRET=tu_jwt_secret_super_seguro
JWT_EXPIRES_IN=7d
BCRYPT_ROUNDS=12

# 🔥 FIREBASE
FIREBASE_PROJECT_ID=telemetro-pe
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@telemetro-pe.iam.gserviceaccount.com

# 📞 TWILIO
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=tu_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# 🤖 INTELIGENCIA ARTIFICIAL
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxxxxxxxxxx

# 💳 STRIPE
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret

# 📺 STREAMING
STREAMING_PORT=8000
HLS_SEGMENT_DURATION=10
HLS_LIST_SIZE=5

# 🛒 MARKETPLACE
MARKETPLACE_COMMISSION_RATE=0.05
POINTS_TO_MONEY_RATIO=100

# 📊 MONITOREO
LOG_LEVEL=info
ENABLE_METRICS=true
```

---

## 📚 **Documentación de APIs**

### 🔐 **Autenticación**

#### **POST /api/auth/login**
```http
POST /api/auth/login
Content-Type: application/json

{
  "phone": "+51999999999",
  "pin": "1234"
}
```

**Respuesta exitosa:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "64f1a2b3c4d5e6f7g8h9i0j1",
      "phone": "+51999999999",
      "name": "Juan Pérez",
      "points": 1250,
      "level": "Gold"
    }
  },
  "error": null
}
```

### 💬 **Chat con IA**

#### **POST /api/chat/message**
```http
POST /api/chat/message
Authorization: Bearer <token>
Content-Type: application/json

{
  "message": "¿Cuál es la próxima estación?",
  "context": {
    "currentStation": "San Juan",
    "direction": "Villa El Salvador"
  }
}
```

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "response": "La próxima estación es Atocongo. Llegará en aproximadamente 3 minutos.",
    "confidence": 0.95,
    "suggestions": [
      "¿Necesitas información sobre conexiones?",
      "¿Quieres ver el mapa de la línea?"
    ]
  }
}
```

### 📺 **Streaming**

#### **GET /api/streaming/live**
```http
GET /api/streaming/live
Authorization: Bearer <token>
```

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "streams": [
      {
        "id": "stream_123",
        "title": "Metro Lima - Línea 1",
        "viewerCount": 1250,
        "status": "live",
        "hlsUrl": "https://stream.telemetro.pe/live/stream_123.m3u8",
        "thumbnail": "https://cdn.telemetro.pe/thumbnails/stream_123.jpg"
      }
    ]
  }
}
```

### 💰 **Sistema de Puntos**

#### **GET /api/points/balance**
```http
GET /api/points/balance
Authorization: Bearer <token>
```

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "totalPoints": 1250,
    "availablePoints": 1000,
    "pendingPoints": 250,
    "level": "Gold",
    "nextLevel": "Platinum",
    "pointsToNextLevel": 750,
    "dailyStreak": 7,
    "weeklyEarnings": 500
  }
}
```

---

## 🚀 **Despliegue**

### 🐳 **Despliegue con Docker**

```bash
# 1. Construir imagen
docker build -t telemetro-backend .

# 2. Ejecutar contenedor
docker run -d \
  --name telemetro-backend \
  -p 4000:4000 \
  -p 8000:8000 \
  --env-file .env \
  telemetro-backend

# 3. Verificar estado
docker ps
docker logs telemetro-backend
```

### ☁️ **Despliegue en Producción (Hostinger)**

```bash
# 1. Configurar servidor
./deploy-hostinger.sh

# 2. Verificar servicios
curl https://api.telemetro.pe/api/health

# 3. Monitorear logs
pm2 logs telemetro-backend
```

### 📊 **Configuración de Nginx**

```nginx
server {
    listen 80;
    server_name api.telemetro.pe;
    
    location / {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
    
    location /streaming/ {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
    }
}
```

---

## 🧪 **Testing**

### 🔬 **Ejecutar Tests**

```bash
# Tests unitarios
npm test

# Tests de integración
npm run test:integration

# Tests de carga
npm run test:load

# Coverage
npm run test:coverage
```

### 📊 **Métricas de Testing**

```bash
# Resultado esperado
✅ Tests: 95% passing
✅ Coverage: 87%
✅ Performance: <200ms avg response
✅ Load: 1000 concurrent users
```

---

## 📊 **Monitoreo y Logs**

### 📈 **Métricas Disponibles**

- **Performance**: Tiempo de respuesta, throughput
- **Errores**: Rate de errores, tipos de error
- **Usuarios**: Usuarios activos, nuevas registros
- **Streaming**: Viewers concurrentes, calidad de stream
- **Puntos**: Transacciones, redenciones

### 📝 **Estructura de Logs**

```json
{
  "timestamp": "2024-01-15T10:30:00Z",
  "level": "info",
  "service": "telemetro-backend",
  "message": "User login successful",
  "userId": "64f1a2b3c4d5e6f7g8h9i0j1",
  "phone": "+51999999999",
  "ip": "192.168.1.100",
  "userAgent": "Telemetro/1.0.0 (Android 13)",
  "duration": 150
}
```

### 🚨 **Alertas Configuradas**

- **Error rate > 5%**
- **Response time > 1s**
- **Database connection failures**
- **Streaming service down**
- **High memory usage > 80%**

---

## 🤝 **Contribución**

### 🔄 **Flujo de Contribución**

```mermaid
gitgraph
    commit id: "Initial commit"
    branch feature/new-chat-ai
    checkout feature/new-chat-ai
    commit id: "Add new AI features"
    commit id: "Update documentation"
    checkout main
    merge feature/new-chat-ai
    commit id: "Release v2.1.0"
```

### 📋 **Proceso de Contribución**

1. **🍴 Fork** el repositorio
2. **🌿 Crear** una rama para tu feature (`git checkout -b feature/nueva-funcionalidad`)
3. **💾 Commit** tus cambios (`git commit -m 'feat: agregar nueva funcionalidad'`)
4. **📤 Push** a la rama (`git push origin feature/nueva-funcionalidad`)
5. **🔄 Abrir** un Pull Request
6. **✅ Revisión** y merge del código

### 🏷️ **Convenciones de Commits**

```bash
feat: nueva funcionalidad
fix: corrección de bug
docs: actualización de documentación
style: cambios de formato
refactor: refactorización de código
test: agregar o modificar tests
chore: tareas de mantenimiento
```

### 📊 **Estándares de Código**

- **ESLint** para linting de JavaScript/TypeScript
- **Prettier** para formato de código
- **Husky** para pre-commit hooks
- **Conventional Commits** para mensajes de commit
- **Semantic Versioning** para versionado

---

## 📞 **Soporte y Contacto**

### 🆘 **Soporte Técnico**

- **📧 Email**: dev@telemetro.pe
- **💬 Slack**: #telemetro-backend
- **📱 WhatsApp**: +51 999 999 999
- **🌐 Website**: https://telemetro.pe

### 📚 **Recursos Adicionales**

- [📖 Documentación Completa](./TELEMETRO_BACKEND_DOCUMENTATION.md)
- [🚀 Guía de Despliegue](./DEPLOYMENT_GUIDE.md)
- [🏗️ Arquitectura del Sistema](./TELEMETRO_COMPLETE_FLOWS_ARCHITECTURE.md)
- [🔧 API Reference](./docs/api-reference.md)
- [🧪 Testing Guide](./docs/testing.md)

---

<div align="center">

**🚇 Desarrollado con ❤️ para revolucionar el transporte público en Perú**

![Made with Love](https://img.shields.io/badge/Made%20with-❤️-red?style=for-the-badge)
![Powered by Marketrix](https://img.shields.io/badge/Powered%20by-MarketrixPE-blue?style=for-the-badge)

</div>