const mongoose = require('mongoose');

// Conectar a MongoDB
async function connectDB() {
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/telemetro-dev');
    console.log('✅ Conectado a MongoDB');
  } catch (error) {
    console.error('❌ Error conectando a MongoDB:', error);
    process.exit(1);
  }
}

// Esquemas simplificados
const jobSchema = new mongoose.Schema({
  title: String,
  description: String,
  company: String,
  location: String,
  category: String,
  type: String,
  salaryRange: { min: Number, max: Number },
  requirements: [String],
  benefits: [String],
  isPremiumOnly: Boolean,
  status: String
}, { timestamps: true });

const microseguroSchema = new mongoose.Schema({
  name: String,
  description: String,
  category: String,
  price: Number,
  coverage: Number,
  duration: Number,
  isActive: Boolean
}, { timestamps: true });

const sessionSchema = new mongoose.Schema({
  title: String,
  artist: String,
  genre: String,
  description: String,
  scheduledDate: Date,
  duration: Number,
  location: String,
  maxAttendees: Number,
  status: String
}, { timestamps: true });

const subscriptionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  plan: String,
  amount: Number,
  status: String,
  startDate: Date,
  endDate: Date
}, { timestamps: true });

// Modelos
const JobModel = mongoose.models.Job || mongoose.model('Job', jobSchema);
const MicroseguroProductModel = mongoose.models.MicroseguroProduct || mongoose.model('MicroseguroProduct', microseguroSchema);
const MetroSessionModel = mongoose.models.MetroSession || mongoose.model('MetroSession', sessionSchema);
const SubscriptionModel = mongoose.models.Subscription || mongoose.model('Subscription', subscriptionSchema);

// Crear datos de demo
async function createAllDemoData() {
  try {
    console.log('🚀 Creando datos de demostración para todas las secciones...\n');

    // ========== JOBS ==========
    console.log('💼 Creando ofertas laborales...');
    await JobModel.deleteMany({});
    
    const demoJobs = [
      {
        title: 'Desarrollador Frontend React',
        description: 'Únete a nuestro equipo como Frontend Developer. Trabajarás en proyectos innovadores usando React, TypeScript y tecnologías modernas.',
        company: 'TechPeru SAC',
        location: 'Lima, Perú',
        category: 'tecnologia',
        type: 'full-time',
        salaryRange: { min: 3500, max: 5500 },
        requirements: ['React', 'TypeScript', '2+ años experiencia', 'Git'],
        benefits: ['Trabajo remoto', 'Seguro de salud', 'Capacitaciones'],
        isPremiumOnly: false,
        status: 'active'
      },
      {
        title: 'Diseñador UX/UI Senior',
        description: 'Buscamos diseñador UX/UI con experiencia en aplicaciones móviles y web para liderar proyectos de diseño.',
        company: 'DesignStudio Lima',
        location: 'San Isidro, Lima',
        category: 'diseño',
        type: 'full-time',
        salaryRange: { min: 4000, max: 6000 },
        requirements: ['Figma', 'Adobe Creative Suite', '3+ años exp', 'Portfolio'],
        benefits: ['Horario flexible', 'Bono de productividad', 'MacBook Pro'],
        isPremiumOnly: true,
        status: 'active'
      },
      {
        title: 'Marketing Digital Specialist',
        description: 'Especialista en marketing digital para gestionar campañas en redes sociales y Google Ads.',
        company: 'AgenciaDigital360',
        location: 'Miraflores, Lima',
        category: 'marketing',
        type: 'part-time',
        salaryRange: { min: 2000, max: 3000 },
        requirements: ['Google Ads', 'Facebook Ads', 'Analytics', 'Creatividad'],
        benefits: ['Comisiones', 'Trabajo híbrido'],
        isPremiumOnly: false,
        status: 'active'
      },
      {
        title: 'Data Scientist',
        description: 'Analista de datos para proyectos de machine learning e inteligencia artificial.',
        company: 'DataCorp Peru',
        location: 'Surco, Lima',
        category: 'tecnologia',
        type: 'full-time',
        salaryRange: { min: 6000, max: 9000 },
        requirements: ['Python', 'SQL', 'Machine Learning', 'Estadística'],
        benefits: ['Stock options', 'Cursos pagados', 'Seguro premium'],
        isPremiumOnly: true,
        status: 'active'
      },
      {
        title: 'Community Manager',
        description: 'Gestiona nuestras redes sociales y crea contenido engaging para nuestra audiencia joven.',
        company: 'SocialBrand',
        location: 'Remoto',
        category: 'marketing',
        type: 'contract',
        salaryRange: { min: 1500, max: 2500 },
        requirements: ['Redes sociales', 'Canva', 'Copywriting', 'Trends'],
        benefits: ['100% remoto', 'Horario flexible'],
        isPremiumOnly: false,
        status: 'inactive'
      }
    ];

    const createdJobs = await JobModel.insertMany(demoJobs);
    console.log(`   ✅ ${createdJobs.length} ofertas laborales creadas`);

    // ========== MICROSEGUROS ==========
    console.log('⚡ Creando productos de microseguros...');
    await MicroseguroProductModel.deleteMany({});
    
    const demoMicroseguros = [
      {
        name: 'Metro Celular Básico',
        description: 'Protege tu celular contra robos y daños accidentales',
        category: 'phone',
        price: 15,
        coverage: 1500,
        duration: 30,
        isActive: true
      },
      {
        name: 'Metro Celular Premium',
        description: 'Cobertura completa para smartphones de alta gama',
        category: 'phone',
        price: 35,
        coverage: 4000,
        duration: 30,
        isActive: true
      },
      {
        name: 'Metro Laptop Estudiante',
        description: 'Seguro especial para laptops de estudiantes',
        category: 'laptop',
        price: 25,
        coverage: 2500,
        duration: 30,
        isActive: true
      },
      {
        name: 'Metro Salud Express',
        description: 'Consultas médicas de emergencia 24/7',
        category: 'health',
        price: 20,
        coverage: 500,
        duration: 30,
        isActive: true
      },
      {
        name: 'Metro Protección Total',
        description: 'Cobertura integral para múltiples dispositivos',
        category: 'general',
        price: 50,
        coverage: 5000,
        duration: 30,
        isActive: false
      }
    ];

    const createdMicroseguros = await MicroseguroProductModel.insertMany(demoMicroseguros);
    console.log(`   ✅ ${createdMicroseguros.length} productos de microseguros creados`);

    // ========== METRO SESSIONS ==========
    console.log('🎵 Creando sesiones musicales...');
    await MetroSessionModel.deleteMany({});
    
    const demoSessions = [
      {
        title: 'Noche de Rock Underground',
        artist: 'Los Mojarras',
        genre: 'Rock',
        description: 'Concierto exclusivo de rock underground peruano en el corazón de Lima',
        scheduledDate: new Date('2025-09-15T20:00:00'),
        duration: 120,
        location: 'Estación Central',
        maxAttendees: 200,
        status: 'scheduled'
      },
      {
        title: 'Cumbia Sónica Experimental',
        artist: 'Dengue Dengue Dengue',
        genre: 'Cumbia',
        description: 'Fusión de cumbia tradicional con sonidos electrónicos modernos',
        scheduledDate: new Date('2025-09-20T19:30:00'),
        duration: 90,
        location: 'Estación San Juan',
        maxAttendees: 150,
        status: 'scheduled'
      },
      {
        title: 'Hip Hop de la Calle',
        artist: 'Aczino & Invitados',
        genre: 'Hip Hop',
        description: 'Batalla de freestyle y presentaciones de hip hop nacional',
        scheduledDate: new Date('2025-09-25T21:00:00'),
        duration: 150,
        location: 'Estación Grau',
        maxAttendees: 300,
        status: 'scheduled'
      },
      {
        title: 'Indie Folk Acústico',
        artist: 'Bareto',
        genre: 'Folk',
        description: 'Sesión íntima acústica del reconocido grupo peruano',
        scheduledDate: new Date('2025-08-30T18:00:00'),
        duration: 75,
        location: 'Estación Bayóvar',
        maxAttendees: 100,
        status: 'completed'
      },
      {
        title: 'Electrónica Futurista',
        artist: 'Nicola Cruz',
        genre: 'Electronic',
        description: 'Set de música electrónica con influencias andinas',
        scheduledDate: new Date('2025-10-05T22:00:00'),
        duration: 180,
        location: 'Estación Villa El Salvador',
        maxAttendees: 400,
        status: 'scheduled'
      }
    ];

    const createdSessions = await MetroSessionModel.insertMany(demoSessions);
    console.log(`   ✅ ${createdSessions.length} sesiones musicales creadas`);

    // ========== SUBSCRIPTIONS ==========
    console.log('⭐ Creando suscripciones MetroPremium...');
    await SubscriptionModel.deleteMany({});
    
    // Crear suscripciones con IDs simulados
    const mockUserIds = [
      new mongoose.Types.ObjectId(),
      new mongoose.Types.ObjectId(),
      new mongoose.Types.ObjectId(),
      new mongoose.Types.ObjectId(),
      new mongoose.Types.ObjectId()
    ];
    
    const demoSubscriptions = mockUserIds.map((userId, index) => ({
      userId: userId,
      plan: index % 2 === 0 ? 'monthly' : 'yearly',
      amount: index % 2 === 0 ? 19.90 : 199.90,
      status: index < 4 ? 'active' : 'expired',
      startDate: new Date(2025, 7, 1 + index * 3),
      endDate: new Date(2025, index % 2 === 0 ? 8 : 19, 1 + index * 3)
    }));

    const createdSubscriptions = await SubscriptionModel.insertMany(demoSubscriptions);
    console.log(`   ✅ ${createdSubscriptions.length} suscripciones creadas`);

    // ========== RESUMEN FINAL ==========
    console.log('\n📊 RESUMEN DE DATOS CREADOS:');
    console.log(`   💼 Jobs: ${createdJobs.length} (${createdJobs.filter(j => j.isPremiumOnly).length} premium)`);
    console.log(`   ⚡ Microseguros: ${createdMicroseguros.length} (${createdMicroseguros.filter(m => m.isActive).length} activos)`);
    console.log(`   🎵 Sessions: ${createdSessions.length} (${createdSessions.filter(s => s.status === 'scheduled').length} programadas)`);
    console.log(`   ⭐ Subscriptions: ${await SubscriptionModel.countDocuments()}`);

    console.log('\n🎯 ¡Todos los datos de demo creados exitosamente!');
    console.log('   👉 Ve a http://localhost:4000/admin para gestionar todo desde el panel');

  } catch (error) {
    console.error('❌ Error creando datos de demo:', error);
  }
}

// Ejecutar script
async function main() {
  await connectDB();
  await createAllDemoData();
  await mongoose.connection.close();
  console.log('\n🔌 Conexión a MongoDB cerrada');
}

main().catch(console.error);
