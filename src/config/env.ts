import * as dotenv from 'dotenv';

dotenv.config();

function requireEnv(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function getBooleanEnv(name: string, fallback = false): boolean {
  const value = process.env[name];
  if (!value) return fallback;
  return value.toLowerCase() === 'true';
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? '4000'),
  mongoUri: requireEnv('MONGODB_URI', 'mongodb://localhost:27017/telemetro'),
  jwtSecret: requireEnv('JWT_SECRET', 'change_me_please'),
  clientOrigin: requireEnv('CLIENT_ORIGIN', 'http://localhost:5173'),
  
  // API Configuration
  api: {
    baseUrl: process.env.API_BASE_URL ?? (process.env.NODE_ENV === 'production' 
      ? 'https://api-dashboard.telemetro.pe' 
      : `http://localhost:${process.env.PORT ?? '4000'}`),
    swaggerPath: process.env.SWAGGER_PATH ?? '/api-docs',
  },
  
  // Twilio Configuration
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    verifyServiceSid: process.env.TWILIO_VERIFY_SERVICE_SID,
    enabled: getBooleanEnv('TWILIO_ENABLED', false),
  },

  // File Upload Configuration
  upload: {
    maxFileSize: Number(process.env.MAX_FILE_SIZE ?? '5242880'), // 5MB default
    allowedImageTypes: ['image/jpeg', 'image/png', 'image/webp'],
    uploadDir: process.env.UPLOAD_DIR ?? 'uploads',
  },

  // Security
  security: {
    bcryptRounds: Number(process.env.BCRYPT_ROUNDS ?? '12'),
    jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
    rateLimitWindowMs: Number(process.env.RATE_LIMIT_WINDOW_MS ?? '900000'), // 15 minutes
    rateLimitMax: Number(process.env.RATE_LIMIT_MAX ?? '100'),
  },

  // Firebase Configuration
  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    enabled: getBooleanEnv('FIREBASE_ENABLED', true),
  },

  // Google OAuth
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
  },

  // Payment Configuration
  culqi: {
    publicKey: process.env.CULQI_PUBLIC_KEY,
    secretKey: process.env.CULQI_SECRET_KEY,
    webhookSecret: process.env.CULQI_WEBHOOK_SECRET,
    enabled: getBooleanEnv('CULQI_ENABLED', false),
  },

  // AWS Configuration
  aws: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION ?? 'us-east-1',
    s3Bucket: process.env.AWS_S3_BUCKET,
    enabled: getBooleanEnv('AWS_ENABLED', false),
  },

  // Streaming Configuration
  streaming: {
    rtmpPort: Number(process.env.RTMP_PORT ?? '1935'),
    hlsPort: Number(process.env.HLS_PORT ?? '8000'),
    webrtcPort: Number(process.env.WEBRTC_PORT ?? '9000'),
    maxConcurrentStreams: Number(process.env.MAX_CONCURRENT_STREAMS ?? '100'),
    maxViewersPerStream: Number(process.env.MAX_VIEWERS_PER_STREAM ?? '1000'),
    enabled: getBooleanEnv('STREAMING_ENABLED', true),
    jwtSecret: process.env.STREAMING_JWT_SECRET || process.env.JWT_SECRET || 'change_me_please',
    recordingRetentionDays: Number(process.env.RECORDING_RETENTION_DAYS ?? '30'),
  },

  // Features
  features: {
    adminDashboard: getBooleanEnv('ENABLE_ADMIN_DASHBOARD', true),
    fileUploads: getBooleanEnv('ENABLE_FILE_UPLOADS', true),
    socketIo: getBooleanEnv('ENABLE_SOCKET_IO', true),
    streaming: getBooleanEnv('ENABLE_STREAMING', true),
    payments: getBooleanEnv('ENABLE_PAYMENTS', true),
    notifications: getBooleanEnv('ENABLE_NOTIFICATIONS', true),
    staffPinRequired: getBooleanEnv('STAFF_PIN_REQUIRED', false),
    redemptionDedupWindowSec: Number(process.env.REDEMPTION_DEDUP_WINDOW_SEC ?? '90'),
  },
} as const;


