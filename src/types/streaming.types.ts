// Tipos para sistema de streaming profesional

export interface StreamingConfig {
  rtmp: {
    port: number;
    chunk_size: number;
    gop_cache: boolean;
    ping: number;
    ping_timeout: number;
  };
  http: {
    port: number;
    allow_origin: string;
    mediaroot: string;
    webroot: string;
  };
  https: {
    port: number;
    key: string;
    cert: string;
  };
  recording: {
    enabled: boolean;
    path: string;
    format: string;
    cleanup: boolean;
    maxDuration: number;
  };
}

export const STREAMING_CONFIG: StreamingConfig = {
  rtmp: {
    port: 1935,
    chunk_size: 60000,
    gop_cache: true,
    ping: 30,
    ping_timeout: 60
  },
  http: {
    port: 8000,
    allow_origin: '*',
    mediaroot: './media',
    webroot: './www'
  },
  https: {
    port: 8443,
    key: './ssl/privatekey.pem',
    cert: './ssl/certificate.pem'
  },
  recording: {
    enabled: true,
    path: './recordings',
    format: 'mp4',
    cleanup: true,
    maxDuration: 3600
  }
};