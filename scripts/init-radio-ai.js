const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

async function initRadioAi() {
  try {
    console.log('🎵 Inicializando RADIO.ai...');
    
    // Obtener MONGODB_URI después de cargar dotenv
    const MONGODB_URI = process.env.MONGODB_URI || '';
    
    // Conectar a MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado a MongoDB');
    
    // Crear directorios necesarios
    const directories = [
      'uploads/radio-ai',
      'uploads/radio-ai/audio',
      'uploads/radio-ai/demo',
      'logs/radio-ai'
    ];
    
    for (const dir of directories) {
      const fullPath = path.join(__dirname, '..', dir);
      if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
        console.log('📁 Directorio creado:', dir);
      }
    }
    
    // Crear archivos demo de audio (placeholders)
    const demoTracks = [
      { name: 'sad-demo.mp3', mood: 'triste' },
      { name: 'happy-demo.mp3', mood: 'feliz' },
      { name: 'angry-demo.mp3', mood: 'enojado' },
      { name: 'relaxed-demo.mp3', mood: 'relajado' }
    ];
    
    for (const track of demoTracks) {
      const filePath = path.join(__dirname, '..', 'uploads/radio-ai/demo', track.name);
      if (!fs.existsSync(filePath)) {
        // Crear archivo placeholder (en producción estos serían archivos de audio reales)
        fs.writeFileSync(filePath, `# Demo track for ${track.mood} mood\n# This is a placeholder file`);
        console.log('🎵 Demo track creado:', track.name);
      }
    }
    
    // Verificar colecciones de MongoDB
    const collections = await mongoose.connection.db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);
    
    console.log('📊 Colecciones existentes:', collectionNames);
    
    // Crear índices si no existen
    const db = mongoose.connection.db;
    
    // Índices para MoodMusicCache
    try {
      await db.collection('moodmusiccaches').createIndex({ mood: 1, intensity: 1 });
      await db.collection('moodmusiccaches').createIndex({ cache_score: -1 });
      await db.collection('moodmusiccaches').createIndex({ last_used: -1 });
      console.log('✅ Índices creados para MoodMusicCache');
    } catch (error) {
      console.log('ℹ️ Índices ya existen para MoodMusicCache');
    }
    
    // Índices para UserMoodSession
    try {
      await db.collection('usermoodsessions').createIndex({ user_id: 1, created_at: -1 });
      await db.collection('usermoodsessions').createIndex({ mood_detected: 1, created_at: -1 });
      await db.collection('usermoodsessions').createIndex({ session_id: 1 });
      console.log('✅ Índices creados para UserMoodSession');
    } catch (error) {
      console.log('ℹ️ Índices ya existen para UserMoodSession');
    }
    
    // Insertar datos de ejemplo para testing
    const MoodMusicCache = mongoose.model('MoodMusicCache', new mongoose.Schema({
      mood: String,
      intensity: Number,
      generated_music: [{
        suno_track_id: String,
        audio_url: String,
        duration: Number,
        title: String,
        prompt_used: String,
        created_at: { type: Date, default: Date.now },
        play_count: { type: Number, default: 0 },
        file_size: { type: Number, default: 0 },
        format: { type: String, default: 'mp3' }
      }],
      user_demographics: {
        time_of_day: String,
        day_of_week: String
      },
      last_used: { type: Date, default: Date.now },
      total_plays: { type: Number, default: 0 },
      cache_score: { type: Number, default: 0 },
      created_at: { type: Date, default: Date.now },
      updated_at: { type: Date, default: Date.now }
    }));
    
    // Verificar si ya existen datos demo
    const existingCache = await MoodMusicCache.findOne();
    
    if (!existingCache) {
      const demoData = [
        {
          mood: 'feliz',
          intensity: 7,
          generated_music: [{
            suno_track_id: 'demo-happy-001',
            audio_url: '/uploads/radio-ai/demo/happy-demo.mp3',
            duration: 180,
            title: 'Alegría Demo',
            prompt_used: 'Música alegre y energética para testing',
            play_count: 5,
            file_size: 5242880,
            format: 'mp3'
          }],
          user_demographics: {
            time_of_day: 'mañana',
            day_of_week: 'lunes'
          },
          total_plays: 5,
          cache_score: 10
        },
        {
          mood: 'relajado',
          intensity: 4,
          generated_music: [{
            suno_track_id: 'demo-relaxed-001',
            audio_url: '/uploads/radio-ai/demo/relaxed-demo.mp3',
            duration: 180,
            title: 'Calma Demo',
            prompt_used: 'Música tranquila y serena para testing',
            play_count: 3,
            file_size: 4194304,
            format: 'mp3'
          }],
          user_demographics: {
            time_of_day: 'noche',
            day_of_week: 'domingo'
          },
          total_plays: 3,
          cache_score: 8
        }
      ];
      
      await MoodMusicCache.insertMany(demoData);
      console.log('🎵 Datos demo insertados en cache');
    } else {
      console.log('ℹ️ Datos demo ya existen en cache');
    }
    
    // Verificar configuración de variables de entorno
    console.log('\n🔧 Verificando configuración:');
    console.log('- RADIO_AI_ENABLED:', process.env.RADIO_AI_ENABLED || 'false');
    console.log('- MUBERT_AI_ENABLED:', process.env.MUBERT_AI_ENABLED || 'false');
    console.log('- MUBERT_API_KEY:', process.env.MUBERT_API_KEY ? '✅ Configurada' : '❌ No configurada');
    console.log('- OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? '✅ Configurada' : '❌ No configurada');
    console.log('- RADIO_AI_UPLOAD_DIR:', process.env.RADIO_AI_UPLOAD_DIR || 'uploads/radio-ai');
    
    console.log('\n🎉 RADIO.ai inicializado correctamente!');
    console.log('\n📋 Próximos pasos:');
    console.log('1. Configurar MUBERT_API_KEY en .env.radio-ai');
    console.log('2. Configurar OPENAI_API_KEY en .env.radio-ai');
    console.log('3. Ejecutar: npm run dev -- --env-file .env.radio-ai');
    // console.log('4. Probar endpoint: POST http://localhost:4100/api/radio-ai/get-music');
    
  } catch (error) {
    console.error('❌ Error inicializando RADIO.ai:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  // Cargar variables de entorno
  require('dotenv').config({ path: '.env' });
  initRadioAi();
}

module.exports = { initRadioAi };
