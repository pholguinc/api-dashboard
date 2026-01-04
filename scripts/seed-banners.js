const mongoose = require('mongoose');

// Banner Schema
const BannerSchema = new mongoose.Schema({
  title: { type: String, required: true, maxlength: 60, trim: true },
  subtitle: { type: String, required: true, maxlength: 120, trim: true },
  description: { type: String, maxlength: 300, trim: true },
  type: { type: String, enum: ['promotional', 'informational', 'event', 'service', 'partnership'], required: true },
  status: { type: String, enum: ['draft', 'active', 'paused', 'expired'], default: 'draft' },
  imageUrl: { type: String, required: true },
  backgroundColor: { type: String, required: true },
  textColor: { type: String, required: true },
  gradient: {
    colors: [String],
    direction: { type: String, enum: ['horizontal', 'vertical', 'diagonal'], default: 'diagonal' }
  },
  actionText: { type: String, maxlength: 30, trim: true },
  actionUrl: { type: String },
  actionType: { type: String, enum: ['internal', 'external', 'none'], default: 'none' },
  targetAudience: {
    roles: [{ type: String, enum: ['user', 'admin', 'moderator'] }],
    ageMin: { type: Number, min: 13, max: 100 },
    ageMax: { type: Number, min: 13, max: 100 },
    location: [String]
  },
  schedule: {
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    timezone: { type: String, default: 'America/Lima' }
  },
  impressions: { type: Number, default: 0, min: 0 },
  clicks: { type: Number, default: 0, min: 0 },
  isActive: { type: Boolean, default: true },
  priority: { type: Number, default: 1, min: 1, max: 10 },
  displayOrder: { type: Number, default: 1, min: 1 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

const Banner = mongoose.models.Banner || mongoose.model('Banner', BannerSchema);

// User Schema (needed for script)
const UserSchema = new mongoose.Schema({
  email: { type: String, required: false, unique: true, sparse: true },
  passwordHash: { type: String, required: false },
  displayName: { type: String, required: true },
  avatarUrl: { type: String },
  role: { type: String, enum: ['user', 'admin', 'moderator'], default: 'user', index: true },
  pointsSmart: { type: Number, default: 0 },
  phone: { type: String, required: true, unique: true, index: true },
  pinHash: { type: String },
  pinSetupTokenHash: { type: String },
  pinSetupExpiresAt: { type: Date },
  fcmTokens: { type: [String], default: [] },
}, { timestamps: true });

// Get admin user
async function getAdminUser() {
  const User = mongoose.models.User || mongoose.model('User', UserSchema);
  return await User.findOne({ role: 'admin' });
}

const sampleBanners = [
  {
    title: '🚇 Metro de Lima',
    subtitle: 'Viaja seguro y cómodo por toda la ciudad',
    description: 'El sistema de transporte más moderno del Perú te conecta con toda Lima Metropolitana.',
    type: 'service',
    status: 'active',
    imageUrl: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=800&h=400&fit=crop',
    backgroundColor: '#1B4D8B',
    textColor: '#FFFFFF',
    gradient: {
      colors: ['#1B4D8B', '#3498DB'],
      direction: 'diagonal'
    },
    actionText: 'Explorar rutas',
    actionUrl: '/marketplace',
    actionType: 'internal',
    schedule: {
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 días
    },
    priority: 10,
    displayOrder: 1,
    isActive: true,
    impressions: 15420,
    clicks: 892
  },
  {
    title: '💰 Gana Puntos Smart',
    subtitle: 'Acumula recompensas en cada viaje',
    description: 'Por cada viaje en metro, streaming visto o producto canjeado, ganas puntos que puedes usar en nuestro marketplace.',
    type: 'promotional',
    status: 'active',
    imageUrl: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=800&h=400&fit=crop',
    backgroundColor: '#FF6B35',
    textColor: '#FFFFFF',
    gradient: {
      colors: ['#FF6B35', '#FF8A5B'],
      direction: 'diagonal'
    },
    actionText: 'Ver premios',
    actionUrl: '/marketplace',
    actionType: 'internal',
    schedule: {
      startDate: new Date(),
      endDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000) // 45 días
    },
    priority: 9,
    displayOrder: 2,
    isActive: true,
    impressions: 12350,
    clicks: 756
  },
  {
    title: '🎬 Entretenimiento',
    subtitle: 'Clips virales del metro peruano',
    description: 'Descubre los momentos más divertidos, emotivos y sorprendentes que suceden en el metro de Lima.',
    type: 'informational',
    status: 'active',
    imageUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&h=400&fit=crop',
    backgroundColor: '#9B59B6',
    textColor: '#FFFFFF',
    gradient: {
      colors: ['#9B59B6', '#E91E63'],
      direction: 'diagonal'
    },
    actionText: 'Ver clips',
    actionUrl: '/clips',
    actionType: 'internal',
    schedule: {
      startDate: new Date(),
      endDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000) // 60 días
    },
    priority: 8,
    displayOrder: 3,
    isActive: true,
    impressions: 9870,
    clicks: 445
  },
  {
    title: '📱 App Telemetro',
    subtitle: 'Tu compañero de viaje inteligente',
    description: 'Información en tiempo real, entretenimiento, marketplace y mucho más en la palma de tu mano.',
    type: 'promotional',
    status: 'active',
    imageUrl: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=800&h=400&fit=crop',
    backgroundColor: '#27AE60',
    textColor: '#FFFFFF',
    gradient: {
      colors: ['#27AE60', '#2ECC71'],
      direction: 'diagonal'
    },
    actionText: 'Descargar',
    actionUrl: 'https://play.google.com/store',
    actionType: 'external',
    schedule: {
      startDate: new Date(),
      endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) // 90 días
    },
    priority: 7,
    displayOrder: 4,
    isActive: true,
    impressions: 18920,
    clicks: 1234
  },
  {
    title: '🎉 Evento Especial',
    subtitle: 'Celebramos el aniversario del Metro',
    description: 'Únete a la celebración del aniversario del Metro de Lima con eventos especiales y promociones.',
    type: 'event',
    status: 'active',
    imageUrl: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&h=400&fit=crop',
    backgroundColor: '#F39C12',
    textColor: '#FFFFFF',
    gradient: {
      colors: ['#F39C12', '#E67E22'],
      direction: 'diagonal'
    },
    actionText: 'Participar',
    actionUrl: '/events',
    actionType: 'internal',
    schedule: {
      startDate: new Date(),
      endDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000) // 15 días
    },
    priority: 6,
    displayOrder: 5,
    isActive: true,
    impressions: 7650,
    clicks: 298
  }
];

async function seedBanners() {
  try {
    await mongoose.connect('mongodb://localhost:27017/telemetro');
    console.log('Connected to MongoDB');

    // Get admin user
    const adminUser = await getAdminUser();
    if (!adminUser) {
      console.error('Admin user not found. Please run create-admin script first.');
      return;
    }

    // Clear existing banners
    await Banner.deleteMany({});
    console.log('Cleared existing banners');

    // Add createdBy field to all banners
    const bannersWithCreator = sampleBanners.map(banner => ({
      ...banner,
      createdBy: adminUser._id
    }));

    // Insert sample banners
    await Banner.insertMany(bannersWithCreator);
    console.log(`✅ Successfully created ${sampleBanners.length} sample banners!`);

    console.log('\n🎨 Banners creados:');
    sampleBanners.forEach((banner, index) => {
      const ctr = banner.impressions > 0 ? ((banner.clicks / banner.impressions) * 100).toFixed(2) : '0.00';
      console.log(`${index + 1}. ${banner.title} - ${banner.type} - CTR: ${ctr}% - Orden: ${banner.displayOrder}`);
    });

    console.log('\n📊 Estadísticas de Banners:');
    console.log(`- Total Banners: ${sampleBanners.length}`);
    console.log(`- Activos: ${sampleBanners.filter(banner => banner.status === 'active').length}`);
    console.log(`- Total Impresiones: ${sampleBanners.reduce((sum, banner) => sum + banner.impressions, 0).toLocaleString()}`);
    console.log(`- Total Clics: ${sampleBanners.reduce((sum, banner) => sum + banner.clicks, 0).toLocaleString()}`);
    console.log(`- CTR Promedio: ${(sampleBanners.reduce((sum, banner) => sum + (banner.impressions > 0 ? (banner.clicks / banner.impressions) * 100 : 0), 0) / sampleBanners.length).toFixed(2)}%`);

    console.log('\n🎯 Tipos de Banner:');
    const types = [...new Set(sampleBanners.map(banner => banner.type))];
    types.forEach(type => {
      const count = sampleBanners.filter(banner => banner.type === type).length;
      const totalClicks = sampleBanners.filter(banner => banner.type === type)
                                    .reduce((sum, banner) => sum + banner.clicks, 0);
      console.log(`- ${type}: ${count} banners, ${totalClicks.toLocaleString()} clics`);
    });

  } catch (error) {
    console.error('Error seeding banners:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

seedBanners();
