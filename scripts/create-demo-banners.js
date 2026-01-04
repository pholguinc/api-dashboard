const mongoose = require('mongoose');
const path = require('path');

// Conectar a MongoDB
async function connectDB() {
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/telemetro-dev', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Conectado a MongoDB');
  } catch (error) {
    console.error('❌ Error conectando a MongoDB:', error);
    process.exit(1);
  }
}

// Esquema de Banner
const bannerSchema = new mongoose.Schema({
  title: { type: String, required: true },
  subtitle: String,
  imageUrl: { type: String, required: true },
  actionUrl: String,
  actionType: {
    type: String,
    enum: ['internal', 'external', 'none'],
    default: 'internal'
  },
  textColor: { type: String, default: '#FFFFFF' },
  backgroundColor: { type: String, default: '#673AB7' },
  type: {
    type: String,
    enum: ['static', 'animated', 'video'],
    default: 'static'
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'scheduled'],
    default: 'active'
  },
  isActive: { type: Boolean, default: true },
  priority: { type: Number, default: 1 },
  clicks: { type: Number, default: 0 },
  impressions: { type: Number, default: 0 },
  metadata: {
    fileType: String,
    fileSize: Number,
    originalName: String,
    isAnimated: Boolean
  },
  startDate: Date,
  endDate: Date
}, {
  timestamps: true
});

const BannerModel = mongoose.models.Banner || mongoose.model('Banner', bannerSchema);

// Crear banners de demo
async function createDemoBanners() {
  try {
    console.log('🎨 Creando banners de demo...');

    // Limpiar banners existentes
    await BannerModel.deleteMany({});
    console.log('🗑️ Banners anteriores eliminados');

    const demoBanners = [
      {
        title: '🎮 Metro Gaming Zone',
        subtitle: '¡Nuevos juegos disponibles!',
        imageUrl: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800&h=200&fit=crop',
        actionUrl: '/games',
        actionType: 'internal',
        textColor: '#FFFFFF',
        backgroundColor: '#FF6B35',
        type: 'static',
        status: 'active',
        isActive: true,
        priority: 1,
        clicks: 127,
        impressions: 1543,
        metadata: {
          fileType: 'image/jpeg',
          fileSize: 45678,
          originalName: 'gaming-banner.jpg',
          isAnimated: false
        }
      },
      {
        title: '💼 Buscas Chamba?',
        subtitle: 'Ofertas exclusivas MetroPremium',
        imageUrl: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=800&h=200&fit=crop',
        actionUrl: '/jobs',
        actionType: 'internal',
        textColor: '#FFFFFF',
        backgroundColor: '#27AE60',
        type: 'static',
        status: 'active',
        isActive: true,
        priority: 2,
        clicks: 89,
        impressions: 987,
        metadata: {
          fileType: 'image/jpeg',
          fileSize: 52341,
          originalName: 'jobs-banner.jpg',
          isAnimated: false
        }
      },
      {
        title: '⚡ Metro/YA! Seguros',
        subtitle: 'Protege tu celular desde S/5',
        imageUrl: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&h=200&fit=crop',
        actionUrl: '/metro-ya',
        actionType: 'internal',
        textColor: '#FFFFFF',
        backgroundColor: '#3498DB',
        type: 'static',
        status: 'active',
        isActive: true,
        priority: 3,
        clicks: 156,
        impressions: 2103,
        metadata: {
          fileType: 'image/jpeg',
          fileSize: 48921,
          originalName: 'insurance-banner.jpg',
          isAnimated: false
        }
      },
      {
        title: '🎵 Metro Sessions LIVE',
        subtitle: 'Concierto de Bareto - Viernes 8PM',
        imageUrl: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&h=200&fit=crop',
        actionUrl: '/metro-sessions',
        actionType: 'internal',
        textColor: '#FFD700',
        backgroundColor: '#8E44AD',
        type: 'animated',
        status: 'active',
        isActive: true,
        priority: 4,
        clicks: 234,
        impressions: 3456,
        metadata: {
          fileType: 'image/gif',
          fileSize: 1234567,
          originalName: 'concert-animated.gif',
          isAnimated: true
        }
      },
      {
        title: '📺 Metro Streamers',
        subtitle: 'Únete a la comunidad underground',
        imageUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&h=200&fit=crop',
        actionUrl: '/streaming',
        actionType: 'internal',
        textColor: '#FFFFFF',
        backgroundColor: '#E74C3C',
        type: 'static',
        status: 'active',
        isActive: true,
        priority: 5,
        clicks: 78,
        impressions: 654,
        metadata: {
          fileType: 'image/jpeg',
          fileSize: 67890,
          originalName: 'streaming-banner.jpg',
          isAnimated: false
        }
      },
      {
        title: '🔥 Ofertas Flash',
        subtitle: 'Descuentos del 50% - Solo hoy',
        imageUrl: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800&h=200&fit=crop',
        actionUrl: '/marketplace',
        actionType: 'internal',
        textColor: '#FFFFFF',
        backgroundColor: '#FF6B35',
        type: 'animated',
        status: 'inactive',
        isActive: false,
        priority: 6,
        clicks: 45,
        impressions: 321,
        metadata: {
          fileType: 'image/gif',
          fileSize: 987654,
          originalName: 'flash-sale.gif',
          isAnimated: true
        }
      }
    ];

    // Insertar banners
    const createdBanners = await BannerModel.insertMany(demoBanners);
    
    console.log(`✅ ${createdBanners.length} banners de demo creados:`);
    createdBanners.forEach((banner, index) => {
      console.log(`   ${index + 1}. ${banner.title} - ${banner.type} (${banner.status})`);
    });

    // Mostrar estadísticas
    const stats = {
      total: createdBanners.length,
      active: createdBanners.filter(b => b.status === 'active').length,
      animated: createdBanners.filter(b => b.type === 'animated').length,
      static: createdBanners.filter(b => b.type === 'static').length,
      totalClicks: createdBanners.reduce((sum, b) => sum + b.clicks, 0),
      totalImpressions: createdBanners.reduce((sum, b) => sum + b.impressions, 0)
    };

    console.log('\n📊 Estadísticas de banners:');
    console.log(`   📸 Total: ${stats.total}`);
    console.log(`   ✅ Activos: ${stats.active}`);
    console.log(`   🎬 Animados: ${stats.animated}`);
    console.log(`   🖼️  Estáticos: ${stats.static}`);
    console.log(`   👆 Total clicks: ${stats.totalClicks}`);
    console.log(`   👁️  Total impresiones: ${stats.totalImpressions}`);
    console.log(`   📈 CTR promedio: ${stats.totalImpressions > 0 ? ((stats.totalClicks / stats.totalImpressions) * 100).toFixed(2) : 0}%`);

    console.log('\n🎯 Banners creados exitosamente para el panel admin!');
    console.log('   👉 Ve a http://localhost:4000/admin y haz clic en "Banners" para verlos');

  } catch (error) {
    console.error('❌ Error creando banners de demo:', error);
  }
}

// Ejecutar script
async function main() {
  await connectDB();
  await createDemoBanners();
  await mongoose.connection.close();
  console.log('\n🔌 Conexión a MongoDB cerrada');
}

main().catch(console.error);
