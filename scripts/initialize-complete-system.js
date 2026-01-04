const mongoose = require('mongoose');
const { seedMicrocourses } = require('./seed-microcourses');
const { PointsService } = require('../dist/services/points.service');

// Configuración de MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/telemetro';

async function initializeCompleteSystem() {
  try {
    console.log('🚀 Inicializando sistema completo de Telemetro...');
    
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado a MongoDB');

    // 1. Inicializar configuración de puntos
    console.log('⚙️  Inicializando configuración de puntos...');
    await PointsService.initializePointsConfig();
    
    // 2. Crear usuario administrador si no existe
    console.log('👑 Verificando usuario administrador...');
    const User = mongoose.models.User || mongoose.model('User', new mongoose.Schema({}, { strict: false }));
    let adminUser = await User.findOne({ role: 'admin' });
    
    if (!adminUser) {
      console.log('⚠️  Creando usuario administrador...');
      adminUser = await User.create({
        phone: '+51999999999',
        displayName: 'Admin Telemetro',
        role: 'admin',
        pinHash: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj6hsxq5S/kO', // PIN: 1234
        pointsSmart: 10000,
        isProfileComplete: true,
        metroUsername: 'admin_telemetro',
        fullName: 'Administrador Sistema',
        email: 'admin@telemetro.com'
      });
      console.log('✅ Usuario administrador creado');
    }

    // 3. Crear usuario streamer demo
    console.log('🎥 Creando streamer demo...');
    let demoStreamer = await User.findOne({ role: 'metro_streamer' });
    
    if (!demoStreamer) {
      demoStreamer = await User.create({
        phone: '+51888888888',
        displayName: 'Metro Streamer Demo',
        role: 'metro_streamer',
        pinHash: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj6hsxq5S/kO', // PIN: 1234
        pointsSmart: 5000,
        isProfileComplete: true,
        metroUsername: 'streamer_demo',
        fullName: 'Demo Streamer',
        email: 'streamer@telemetro.com',
        avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400',
        streamerProfile: {
          isVerified: true,
          followers: 1250,
          totalStreams: 45,
          totalViewers: 15000,
          totalDonations: 2500,
          streamingHours: 120,
          averageViewers: 85,
          categories: ['IRL', 'Music', 'Food'],
          bio: 'Streamer oficial de Metro de Lima. Comparto mi día a día viajando por la ciudad y descubriendo nuevos lugares.',
          socialLinks: {
            instagram: 'https://instagram.com/metrostreamer',
            tiktok: 'https://tiktok.com/@metrostreamer',
            youtube: 'https://youtube.com/@metrostreamer'
          },
          streamingEquipment: {
            camera: 'iPhone 14 Pro',
            microphone: 'AirPods Pro',
            internet: '5G Movistar'
          },
          preferredStations: ['Gamarra', 'Plaza Norte', 'Callao', 'Jorge Chávez'],
          streamingSchedule: [
            {
              day: 'Monday',
              startTime: '18:00',
              endTime: '20:00',
              isActive: true
            },
            {
              day: 'Wednesday',
              startTime: '19:00',
              endTime: '21:00',
              isActive: true
            },
            {
              day: 'Friday',
              startTime: '17:00',
              endTime: '19:00',
              isActive: true
            }
          ]
        }
      });
      console.log('✅ Streamer demo creado');
    }

    // 4. Poblar microcursos
    console.log('📚 Poblando microcursos...');
    await seedMicrocourses();

    // 5. Crear productos del marketplace de ejemplo
    console.log('🛍️  Creando productos del marketplace...');
    const Product = mongoose.model('Product', new mongoose.Schema({
      name: String,
      description: String,
      category: String,
      pointsCost: Number,
      stock: Number,
      imageUrl: String,
      provider: String,
      isActive: { type: Boolean, default: true }
    }, { timestamps: true }));

    const sampleProducts = [
      {
        name: 'Tarjeta Metro Recargable',
        description: 'Tarjeta oficial del Metro de Lima con S/10 de saldo incluido',
        category: 'physical',
        pointsCost: 100,
        stock: 50,
        imageUrl: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400',
        provider: 'Metro de Lima'
      },
      {
        name: 'Descuento 20% en KFC',
        description: 'Cupón de descuento del 20% en cualquier combo de KFC',
        category: 'digital',
        pointsCost: 50,
        stock: 100,
        imageUrl: 'https://images.unsplash.com/photo-1513185158878-8d8c2a2a3da3?w=400',
        provider: 'KFC Perú'
      },
      {
        name: 'Entrada al Circuito Mágico del Agua',
        description: 'Entrada gratuita al Circuito Mágico del Agua en el Parque de la Reserva',
        category: 'physical',
        pointsCost: 75,
        stock: 30,
        imageUrl: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=400',
        provider: 'Municipalidad de Lima'
      },
      {
        name: 'Suscripción Spotify Premium 1 Mes',
        description: 'Disfruta de un mes gratis de Spotify Premium',
        category: 'digital',
        pointsCost: 200,
        stock: 25,
        imageUrl: 'https://images.unsplash.com/photo-1611339555312-e607c8352fd7?w=400',
        provider: 'Spotify'
      }
    ];

    await Product.deleteMany({});
    await Product.insertMany(sampleProducts);
    console.log('✅ Productos del marketplace creados');

    // 6. Crear microseguros de ejemplo
    console.log('🛡️  Creando microseguros...');
    const Microseguro = mongoose.model('Microseguro', new mongoose.Schema({
      name: String,
      description: String,
      price: Number,
      coverage: Number,
      duration: Number,
      benefits: [String],
      isActive: { type: Boolean, default: true }
    }, { timestamps: true }));

    const sampleMicroseguros = [
      {
        name: 'Seguro de Viaje Metro',
        description: 'Protección durante tus viajes en el Metro de Lima',
        price: 15,
        coverage: 5000,
        duration: 30,
        benefits: [
          'Cobertura por accidentes en el metro',
          'Asistencia médica inmediata',
          'Reembolso por retrasos mayores a 30 min',
          'Seguro de equipaje personal'
        ]
      },
      {
        name: 'Seguro Móvil Express',
        description: 'Protege tu celular contra robos y daños',
        price: 25,
        coverage: 2000,
        duration: 30,
        benefits: [
          'Cobertura contra robo',
          'Reparación por daños accidentales',
          'Reposición en caso de pérdida total',
          'Asistencia técnica 24/7'
        ]
      },
      {
        name: 'Seguro Salud Básico',
        description: 'Atención médica básica para emergencias',
        price: 35,
        coverage: 10000,
        duration: 30,
        benefits: [
          'Consultas médicas generales',
          'Medicamentos básicos',
          'Exámenes de laboratorio',
          'Telemedicina 24/7'
        ]
      }
    ];

    await Microseguro.deleteMany({});
    await Microseguro.insertMany(sampleMicroseguros);
    console.log('✅ Microseguros creados');

    // 7. Crear banners de ejemplo
    console.log('🎨 Creando banners...');
    const Banner = mongoose.model('Banner', new mongoose.Schema({
      title: String,
      subtitle: String,
      type: String,
      imageUrl: String,
      backgroundColor: String,
      textColor: String,
      actionText: String,
      actionUrl: String,
      actionType: String,
      isActive: { type: Boolean, default: true },
      priority: Number,
      displayOrder: Number,
      schedule: {
        startDate: Date,
        endDate: Date
      }
    }, { timestamps: true }));

    const sampleBanners = [
      {
        title: '¡Bienvenido a Telemetro!',
        subtitle: 'La app oficial del Metro de Lima',
        type: 'promotional',
        imageUrl: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=800',
        backgroundColor: '#FF6B35',
        textColor: '#FFFFFF',
        actionText: 'Explorar',
        actionUrl: '/marketplace',
        actionType: 'internal',
        priority: 10,
        displayOrder: 1,
        schedule: {
          startDate: new Date(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 días
        }
      },
      {
        title: 'Nuevos Microcursos',
        subtitle: 'Aprende algo nuevo cada día',
        type: 'informational',
        imageUrl: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800',
        backgroundColor: '#4ECDC4',
        textColor: '#FFFFFF',
        actionText: 'Ver Cursos',
        actionUrl: '/education',
        actionType: 'internal',
        priority: 8,
        displayOrder: 2,
        schedule: {
          startDate: new Date(),
          endDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000) // 60 días
        }
      },
      {
        title: 'Metro Live',
        subtitle: 'Transmisiones en vivo desde el metro',
        type: 'service',
        imageUrl: 'https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?w=800',
        backgroundColor: '#9B59B6',
        textColor: '#FFFFFF',
        actionText: 'Ver Streams',
        actionUrl: '/streaming',
        actionType: 'internal',
        priority: 7,
        displayOrder: 3,
        schedule: {
          startDate: new Date(),
          endDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000) // 45 días
        }
      }
    ];

    await Banner.deleteMany({});
    await Banner.insertMany(sampleBanners);
    console.log('✅ Banners creados');

    // 8. Estadísticas finales
    const stats = {
      users: await User.countDocuments(),
      products: await Product.countDocuments(),
      microseguros: await Microseguro.countDocuments(),
      banners: await Banner.countDocuments(),
      microcourses: await mongoose.model('Microcourse').countDocuments()
    };

    console.log('\n🎉 ¡SISTEMA TELEMETRO COMPLETAMENTE INICIALIZADO!');
    console.log('=' .repeat(60));
    console.log('📊 ESTADÍSTICAS FINALES:');
    console.log(`👥 Usuarios: ${stats.users}`);
    console.log(`🛍️  Productos: ${stats.products}`);
    console.log(`🛡️  Microseguros: ${stats.microseguros}`);
    console.log(`🎨 Banners: ${stats.banners}`);
    console.log(`📚 Microcursos: ${stats.microcourses}`);
    
    console.log('\n🔑 CREDENCIALES DE ACCESO:');
    console.log('👑 ADMINISTRADOR:');
    console.log('   📱 Teléfono: +51999999999');
    console.log('   🔐 PIN: 1234');
    console.log('   🌐 Panel: http://localhost:4000/admin');
    
    console.log('\n🎥 STREAMER DEMO:');
    console.log('   📱 Teléfono: +51888888888');
    console.log('   🔐 PIN: 1234');
    console.log('   📺 Dashboard: http://localhost:4000/api/streaming/dashboard');

    console.log('\n🚀 FUNCIONALIDADES IMPLEMENTADAS:');
    console.log('✅ Sistema de autenticación completo (OTP + PIN)');
    console.log('✅ Carrito de compras funcional');
    console.log('✅ Sistema de puntos avanzado');
    console.log('✅ Metro Live con perfiles de streamers');
    console.log('✅ Microcursos con catálogo completo');
    console.log('✅ Perfil de usuario completo');
    console.log('✅ Subida de imágenes para admin');
    console.log('✅ Streaming y comentarios funcionales');
    console.log('✅ Panel de administración completo');
    console.log('✅ API REST completa con +100 endpoints');

    console.log('\n📱 PRÓXIMOS PASOS:');
    console.log('1. Iniciar el servidor: npm run dev');
    console.log('2. Abrir la app móvil en Flutter');
    console.log('3. Usar el botón de "Login de Desarrollo" en la app');
    console.log('4. Explorar todas las funcionalidades');

  } catch (error) {
    console.error('❌ Error durante la inicialización:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Desconectado de MongoDB');
    process.exit(0);
  }
}

// Ejecutar inicialización
if (require.main === module) {
  initializeCompleteSystem();
}

module.exports = { initializeCompleteSystem };
