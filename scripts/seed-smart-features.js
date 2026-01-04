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

// Definir esquemas inline para el script
const gameSchema = new mongoose.Schema({
  name: String,
  description: String,
  type: String,
  difficulty: String,
  basePoints: Number,
  maxPoints: Number,
  primaryColor: String,
  secondaryColor: String,
  estimatedTimeMinutes: Number,
  instructions: [String],
  playCount: { type: Number, default: 0 },
  averageRating: { type: Number, default: 0 },
  isAvailable: { type: Boolean, default: true }
}, { timestamps: true });

const jobSchema = new mongoose.Schema({
  title: String,
  company: String,
  description: String,
  location: String,
  workType: String,
  salary: String,
  category: String,
  requirements: [String],
  contactEmail: String,
  isUrgent: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  applicantsCount: { type: Number, default: 0 },
  coordinates: {
    latitude: Number,
    longitude: Number
  }
}, { timestamps: true });

const subscriptionSchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  type: String,
  status: String,
  startDate: Date,
  endDate: Date,
  price: Number,
  currency: String,
  paymentMethod: String,
  benefits: [{
    name: String,
    description: String,
    isActive: Boolean
  }]
}, { timestamps: true });

const userSchema = new mongoose.Schema({
  phone: String,
  role: String,
  hasMetroPremium: Boolean,
  metroPremiumExpiry: Date,
  pointsSmart: Number
}, { timestamps: true });

const GameModel = mongoose.model('Game', gameSchema);
const JobModel = mongoose.model('Job', jobSchema);
const SubscriptionModel = mongoose.model('Subscription', subscriptionSchema);
const UserModel = mongoose.model('User', userSchema);

async function seedSmartFeatures() {
  try {
    console.log('🚀 SEEDING TELEMETRO SMART FEATURES');
    console.log('===================================');

    await connectDB();

    // Limpiar datos existentes
    await GameModel.deleteMany({});
    await JobModel.deleteMany({});
    
    console.log('🎮 Creando juegos...');
    
    // Crear juegos
    const games = [
      {
        name: 'Memoria de Cartas',
        description: 'Encuentra las parejas de cartas en el menor tiempo posible',
        type: 'memory',
        difficulty: 'easy',
        basePoints: 20,
        maxPoints: 50,
        primaryColor: '#2196F3',
        secondaryColor: '#03A9F4',
        estimatedTimeMinutes: 3,
        instructions: [
          'Voltea las cartas para encontrar parejas',
          'Memoriza la posición de cada carta',
          'Completa el juego en el menor tiempo'
        ],
        playCount: 1250,
        averageRating: 4.2
      },
      {
        name: 'Trivia de Lima',
        description: 'Demuestra cuánto sabes sobre la capital del Perú',
        type: 'trivia',
        difficulty: 'medium',
        basePoints: 25,
        maxPoints: 75,
        primaryColor: '#4CAF50',
        secondaryColor: '#8BC34A',
        estimatedTimeMinutes: 5,
        instructions: [
          'Responde preguntas sobre Lima',
          'Tienes 30 segundos por pregunta',
          'Más puntos por respuestas rápidas'
        ],
        playCount: 890,
        averageRating: 4.5
      },
      {
        name: 'Rompecabezas del Metro',
        description: 'Arma el mapa del sistema de transporte de Lima',
        type: 'puzzle',
        difficulty: 'medium',
        basePoints: 30,
        maxPoints: 80,
        primaryColor: '#FF9800',
        secondaryColor: '#FF5722',
        estimatedTimeMinutes: 7,
        instructions: [
          'Arrastra las piezas para formar el mapa',
          'Conecta las estaciones correctamente',
          'Completa antes que se acabe el tiempo'
        ],
        playCount: 567,
        averageRating: 4.0
      },
      {
        name: 'Tiempo de Reacción',
        description: 'Pon a prueba qué tan rápidos son tus reflejos',
        type: 'reaction',
        difficulty: 'easy',
        basePoints: 15,
        maxPoints: 40,
        primaryColor: '#F44336',
        secondaryColor: '#E91E63',
        estimatedTimeMinutes: 2,
        instructions: [
          'Toca la pantalla cuando aparezca el color',
          'Reacciona lo más rápido posible',
          'Evita tocar en el momento incorrecto'
        ],
        playCount: 2100,
        averageRating: 4.1
      },
      {
        name: 'Cadena de Palabras',
        description: 'Forma palabras conectadas en español',
        type: 'strategy',
        difficulty: 'hard',
        basePoints: 35,
        maxPoints: 100,
        primaryColor: '#9C27B0',
        secondaryColor: '#673AB7',
        estimatedTimeMinutes: 10,
        instructions: [
          'Conecta letras para formar palabras',
          'Cada palabra debe tener mínimo 3 letras',
          'Usa todas las letras disponibles'
        ],
        playCount: 340,
        averageRating: 4.3
      },
      {
        name: 'Carrera Matemática',
        description: 'Resuelve operaciones matemáticas contra el tiempo',
        type: 'trivia',
        difficulty: 'medium',
        basePoints: 20,
        maxPoints: 60,
        primaryColor: '#009688',
        secondaryColor: '#00BCD4',
        estimatedTimeMinutes: 4,
        instructions: [
          'Resuelve las operaciones matemáticas',
          'Cada respuesta correcta suma puntos',
          'La dificultad aumenta progresivamente'
        ],
        playCount: 756,
        averageRating: 3.9
      }
    ];

    await GameModel.insertMany(games);
    console.log(`✅ ${games.length} juegos creados exitosamente!`);

    console.log('💼 Creando ofertas laborales...');
    
    // Crear ofertas laborales
    const jobs = [
      {
        title: 'Desarrollador Frontend React',
        company: 'TechLima Solutions',
        description: 'Buscamos desarrollador Frontend con experiencia en React, TypeScript y diseño responsivo. Trabajarás en proyectos innovadores para clientes internacionales.',
        location: 'San Isidro, Lima',
        workType: 'Híbrido',
        salary: 'S/ 3,500 - S/ 5,000',
        category: 'Tecnología',
        requirements: [
          '2+ años de experiencia con React',
          'Conocimiento en TypeScript',
          'Experiencia con Git y metodologías ágiles',
          'Inglés intermedio'
        ],
        contactEmail: 'rrhh@techlima.com',
        isUrgent: false,
        applicantsCount: 23,
        coordinates: { latitude: -12.0955, longitude: -77.0364 }
      },
      {
        title: 'Vendedor de Campo - Zona Norte',
        company: 'Distribuidora Lima Norte',
        description: 'Vendedor con experiencia en ventas B2B para la zona norte de Lima. Excelente oportunidad de crecimiento y comisiones atractivas.',
        location: 'Los Olivos, Lima',
        workType: 'Presencial',
        salary: 'S/ 1,200 + comisiones',
        category: 'Ventas',
        requirements: [
          'Experiencia en ventas B2B',
          'Licencia de conducir A1',
          'Disponibilidad para viajar',
          'Orientación a resultados'
        ],
        contactEmail: 'ventas@distribuidoralima.com',
        isUrgent: true,
        applicantsCount: 45,
        coordinates: { latitude: -11.9608, longitude: -77.0617 }
      },
      {
        title: 'Asistente Administrativo',
        company: 'Corporación Andina',
        description: 'Buscamos asistente administrativo para apoyo en gestión documental, atención al cliente y tareas administrativas generales.',
        location: 'Miraflores, Lima',
        workType: 'Presencial',
        salary: 'S/ 1,800 - S/ 2,200',
        category: 'Administración',
        requirements: [
          'Estudios técnicos o universitarios',
          'Manejo de Office avanzado',
          'Experiencia en atención al cliente',
          'Proactividad y organización'
        ],
        contactEmail: 'admin@corporacionandina.com',
        applicantsCount: 67,
        coordinates: { latitude: -12.1196, longitude: -77.0365 }
      },
      {
        title: 'Cocinero para Restaurante',
        company: 'Sabores de Lima',
        description: 'Cocinero con experiencia en cocina peruana e internacional. Ambiente de trabajo dinámico en restaurante de alta calidad.',
        location: 'Barranco, Lima',
        workType: 'Presencial',
        salary: 'S/ 1,500 - S/ 2,000',
        category: 'Gastronomía',
        requirements: [
          'Experiencia mínima 2 años',
          'Conocimiento de cocina peruana',
          'Disponibilidad de horarios',
          'Trabajo en equipo'
        ],
        contactEmail: 'chef@saboreslima.com',
        applicantsCount: 34,
        coordinates: { latitude: -12.1406, longitude: -77.0217 }
      },
      {
        title: 'Conductor de Transporte Público',
        company: 'Metropolitano Lima',
        description: 'Convocatoria para conductores del sistema Metropolitano. Excelente oportunidad de trabajo estable con beneficios.',
        location: 'Toda Lima',
        workType: 'Presencial',
        salary: 'S/ 2,100 + beneficios',
        category: 'Transporte',
        requirements: [
          'Licencia de conducir A2b vigente',
          'Experiencia en transporte público',
          'Certificado médico vigente',
          'Antecedentes penales limpios'
        ],
        contactEmail: 'rrhh@metropolitano.gob.pe',
        isUrgent: true,
        applicantsCount: 156,
        coordinates: { latitude: -12.0464, longitude: -77.0428 }
      },
      {
        title: 'Enfermero(a) - Turno Noche',
        company: 'Clínica San Gabriel',
        description: 'Enfermero(a) titulado(a) para turno nocturno. Experiencia en hospitalización y cuidados intensivos preferible.',
        location: 'San Borja, Lima',
        workType: 'Presencial',
        salary: 'S/ 2,800 - S/ 3,200',
        category: 'Salud',
        requirements: [
          'Título de Enfermería',
          'Colegiatura vigente',
          'Experiencia mínima 1 año',
          'Disponibilidad turno noche'
        ],
        contactEmail: 'enfermeria@clinicasangabriel.com',
        isUrgent: true,
        applicantsCount: 28,
        coordinates: { latitude: -12.0856, longitude: -76.9961 }
      }
    ];

    await JobModel.insertMany(jobs);
    console.log(`✅ ${jobs.length} ofertas laborales creadas exitosamente!`);

    // Crear suscripción de prueba para el admin
    const adminUser = await UserModel.findOne({ role: 'admin' });
    if (adminUser) {
      const subscription = new SubscriptionModel({
        userId: adminUser._id,
        type: 'MetroPremium',
        status: 'active',
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        price: 9.90,
        currency: 'PEN',
        paymentMethod: 'card',
        benefits: [
          { name: 'Buscas Chamba?', description: 'Acceso exclusivo a ofertas laborales', isActive: true },
          { name: 'Micro-cursos', description: 'Capacitación profesional', isActive: true },
          { name: 'Streaming IRL', description: 'Contenido exclusivo', isActive: true },
          { name: 'Bonificación Diaria', description: '50 puntos diarios', isActive: true },
          { name: 'Ofertas Prioritarias', description: 'Acceso anticipado', isActive: true },
          { name: 'Sin Anuncios', description: 'Experiencia premium', isActive: true }
        ]
      });
      
      await subscription.save();
      
      // Actualizar usuario admin
      await UserModel.findByIdAndUpdate(adminUser._id, {
        hasMetroPremium: true,
        metroPremiumExpiry: subscription.endDate
      });
      
      console.log('✅ Suscripción MetroPremium creada para usuario admin');
    }

    console.log('');
    console.log('🎉 SMART FEATURES SEEDING COMPLETADO');
    console.log('=====================================');
    console.log('');
    console.log('📊 RESUMEN:');
    console.log(`🎮 Juegos creados: ${games.length}`);
    console.log(`💼 Ofertas laborales: ${jobs.length}`);
    console.log('✅ Suscripción premium para admin');
    console.log('');
    console.log('🎯 NUEVAS FUNCIONALIDADES DISPONIBLES:');
    console.log('• Sección Smart (antes Marketplace)');
    console.log('• Sistema de puntos completo');
    console.log('• Sala de juegos con 6 juegos');
    console.log('• Buscas Chamba? (Premium)');
    console.log('• Suscripción MetroPremium S/9.90');
    console.log('• Panel admin actualizado');
    console.log('');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding smart features:', error);
    process.exit(1);
  }
}

seedSmartFeatures();
