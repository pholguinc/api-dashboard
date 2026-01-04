// PM2 Configuration for Production
module.exports = {
  apps: [{
    name: 'api-dashboard',
    script: 'dist/server.js',
    instances: 1, // En Hostinger shared, usar 1 instancia
    exec_mode: 'fork', // No cluster en shared hosting
    env: {
      NODE_ENV: 'development',
      PORT: 5000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 6000,
      watch: false,
      ignore_watch: ['node_modules', 'uploads', 'logs'],
      max_memory_restart: '500M',
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_file: './logs/combined.log',
      time: true
    },
    // Auto-restart configuración
    restart_delay: 4000,
    max_restarts: 10,
    min_uptime: '10s',
    
    // Configuración de memoria
    max_memory_restart: '500M',
    
    // Logs
    log_date_format: 'YYYY-MM-DD HH:mm Z',
    combine_logs: true,
    
    // Health monitoring
    health_check_http: {
      url: 'http://localhost:5000/api/health',
      interval: 30000,
      timeout: 5000,
      max_failures: 3
    }
  }]
};
