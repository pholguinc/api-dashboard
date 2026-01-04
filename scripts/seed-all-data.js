const mongoose = require('mongoose');

// Configuración de MongoDB
const MONGODB_URI = 'mongodb://localhost:27017/telemetro';

async function connectDB() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
}

// Definir esquemas
const microseguroSchema = new mongoose.Schema({
  name: String,
  description: String,
  category: String,
  monthlyPrice: Number,
  maxCoverage: Number,
  benefits: [String],
  icon: String,
  color: String,
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

const metroSessionSchema = new mongoose.Schema({
  artist: {
    name: String,
    bio: String,
    imageUrl: String,
    isVerified: Boolean
  },
  title: String,
  description: String,
  genre: String,
  scheduledDate: Date,
  duration: Number,
  location: {
    stationName: String,
    line: String
  },
  status: { type: String, default: 'scheduled' },
  setlist: [{
    songTitle: String,
    isOriginal: Boolean
  }],
  audience: {
    expectedAttendees: Number,
    actualAttendees: Number,
    onlineViewers: Number
  },
  streamingInfo: {
    isLiveStreamed: Boolean,
    streamKey: String
  }
}, { timestamps: true });

const MicroseguroModel = mongoose.model('Microseguro', microseguroSchema);
const MetroSessionModel = mongoose.model('MetroSession', metroSessionSchema);

async function seedAllData() {
  try {
    console.log('🚀 SEEDING ALL TELEMETRO DATA');
    console.log('==============================');

    await connectDB();

    // Limpiar datos existentes
    await MicroseguroModel.deleteMany({});
    await MetroSessionModel.deleteMany({});
    
    console.log('🛡️ Creando microseguros...');
    
    // Crear microseguros reales
    const microseguros = [
      {
        name: 'Protege tu Celular',
        description: 'Seguro contra robo, daños y pérdida de tu smartphone',
        category: 'dispositivos',
        monthlyPrice: 3.30,
        maxCoverage: 2000,
        benefits: [
          'Cobertura 24/7 en todo Lima',
          'Reemplazo inmediato por robo',
          'Reparación por daños accidentales',
          'Sin deducible'
        ],
        icon: 'phone_android',
        color: '#FF4757'
      },
      {
        name: 'Protege tu Laptop',
        description: 'Seguro integral para tu equipo de trabajo',
        category: 'dispositivos',
        monthlyPrice: 8.90,
        maxCoverage: 5000,
        benefits: [
          'Protección total contra robo',
          'Reparación express',
          'Backup automático de datos',
          'Soporte técnico incluido'
        ],
        icon: 'laptop_mac',
        color: '#2F3542'
      },
      {
        name: 'Metro Seguro',
        description: 'Protección durante tu viaje en el metro',
        category: 'transporte',
        monthlyPrice: 2.50,
        maxCoverage: 1000,
        benefits: [
          'Atención médica de emergencia',
          'Transporte alternativo',
          'Asistencia legal básica',
          'Cobertura familiar'
        ],
        icon: 'train',
        color: '#DC143C'
      },
      {
        name: 'Protege tu Bici',
        description: 'Seguro especializado para ciclistas urbanos',
        category: 'transporte',
        monthlyPrice: 4.20,
        maxCoverage: 1500,
        benefits: [
          'Sistema anti-robo GPS',
          'Reparaciones en talleres afiliados',
          'Accesorios incluidos',
          'Red de talleres en Lima'
        ],
        icon: 'pedal_bike',
        color: '#7bed9f'
      },
      {
        name: 'Protege tus Cosas',
        description: 'Seguro para pertenencias personales',
        category: 'pertenencias',
        monthlyPrice: 1.90,
        maxCoverage: 800,
        benefits: [
          'Objetos personales',
          'Documentos importantes',
          'Dinero en efectivo',
          'Reposición rápida'
        ],
        icon: 'backpack',
        color: '#70a1ff'
      },
      {
        name: 'Metro Salud',
        description: 'Atención médica express para viajeros del metro',
        category: 'salud',
        monthlyPrice: 6.50,
        maxCoverage: 2500,
        benefits: [
          'Telemedicina 24/7',
          'Consultas presenciales',
          'Medicamentos básicos',
          'Análisis de laboratorio'
        ],
        icon: 'local_hospital',
        color: '#ff6b9d'
      }
    ];

    await MicroseguroModel.insertMany(microseguros);
    console.log(`✅ ${microseguros.length} microseguros creados!`);

    console.log('🎵 Creando Metro Sessions...');

    // Crear sesiones musicales reales
    const sessions = [
      {
        artist: {
          name: 'Bareto',
          bio: 'Banda peruana de rock alternativo formada en 1999',
          imageUrl: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=300&fit=crop',
          isVerified: true
        },
        title: 'Concierto Acústico Underground',
        description: 'Sesión íntima de Bareto en el corazón del metro limeño',
        genre: 'Rock Peruano',
        scheduledDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // En 5 días
        duration: 45,
        location: {
          stationName: 'Estación Central',
          line: 'Línea 1'
        },
        status: 'live',
        setlist: [
          { songTitle: 'Desde Que Te Vi', isOriginal: true },
          { songTitle: 'Amor de Papel', isOriginal: true },
          { songTitle: 'Para Que No Te Vayas', isOriginal: true }
        ],
        audience: {
          expectedAttendees: 100,
          actualAttendees: 87,
          onlineViewers: 1250
        },
        streamingInfo: {
          isLiveStreamed: true,
          streamKey: 'session_bareto_live_2024'
        }
      },
      {
        artist: {
          name: 'Los Mirlos',
          bio: 'Pioneros de la cumbia psicodélica peruana',
          imageUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&h=300&fit=crop',
          isVerified: true
        },
        title: 'Cumbia Amazónica en Vivo',
        description: 'La cumbia que conquistó el mundo llega al metro',
        genre: 'Cumbia',
        scheduledDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // En 7 días
        duration: 60,
        location: {
          stationName: 'Estación Grau',
          line: 'Línea 1'
        },
        status: 'scheduled',
        setlist: [
          { songTitle: 'La Danza del Mirlo', isOriginal: true },
          { songTitle: 'Sonido Amazónico', isOriginal: true },
          { songTitle: 'Cumbia Espacial', isOriginal: true }
        ],
        audience: {
          expectedAttendees: 150,
          actualAttendees: 0,
          onlineViewers: 0
        },
        streamingInfo: {
          isLiveStreamed: true,
          streamKey: 'session_mirlos_upcoming_2024'
        }
      },
      {
        artist: {
          name: 'Dengue Dengue Dengue',
          bio: 'Dúo de música electrónica tropical peruana',
          imageUrl: 'https://images.unsplash.com/photo-1571266028243-d220c9c3b8b2?w=400&h=300&fit=crop',
          isVerified: true
        },
        title: 'Electrónica Tropical Underground',
        description: 'Fusión electrónica con ritmos ancestrales peruanos',
        genre: 'Electrónica',
        scheduledDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // En 10 días
        duration: 50,
        location: {
          stationName: 'Estación Canadá',
          line: 'Línea 1'
        },
        status: 'scheduled',
        setlist: [
          { songTitle: 'Cumbia Sobre el Río', isOriginal: true },
          { songTitle: 'Lima Moderna', isOriginal: true },
          { songTitle: 'Digital Folklore', isOriginal: true }
        ],
        audience: {
          expectedAttendees: 80,
          actualAttendees: 0,
          onlineViewers: 0
        },
        streamingInfo: {
          isLiveStreamed: true,
          streamKey: 'session_dengue_upcoming_2024'
        }
      }
    ];

    await MetroSessionModel.insertMany(sessions);
    console.log(`✅ ${sessions.length} Metro Sessions creadas!`);

    console.log('');
    console.log('🎉 ALL DATA SEEDING COMPLETADO');
    console.log('==============================');
    console.log('');
    console.log('📊 RESUMEN:');
    console.log(`🛡️ Microseguros: ${microseguros.length}`);
    console.log(`🎵 Metro Sessions: ${sessions.length}`);
    console.log('');
    console.log('🎯 APIS DISPONIBLES:');
    console.log('• /api/microseguros - Gestión de microseguros');
    console.log('• /api/metro-sessions - Sesiones musicales');
    console.log('• /api/streaming - Sistema de streaming');
    console.log('• /api/games - Sala de juegos');
    console.log('• /api/jobs - Buscas Chamba?');
    console.log('');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding data:', error);
    process.exit(1);
  }
}

seedAllData();
