const mongoose = require('mongoose');

// Ad Schema
const AdSchema = new mongoose.Schema({
  title: { type: String, required: true, maxlength: 100, trim: true },
  description: { type: String, required: true, maxlength: 500, trim: true },
  type: { type: String, enum: ['banner', 'interstitial', 'video', 'native'], required: true, index: true },
  status: { type: String, enum: ['draft', 'active', 'paused', 'expired'], default: 'draft', index: true },
  placement: { type: String, enum: ['home_top', 'home_middle', 'home_bottom', 'marketplace', 'profile', 'streaming'], required: true, index: true },
  imageUrl: { type: String, required: true },
  videoUrl: { type: String },
  clickUrl: { type: String, required: true },
  impressions: { type: Number, default: 0, min: 0 },
  clicks: { type: Number, default: 0, min: 0 },
  budget: { type: Number, required: true, min: 0 },
  costPerClick: { type: Number, required: true, min: 0 },
  targetAudience: {
    ageMin: { type: Number, min: 13, max: 100 },
    ageMax: { type: Number, min: 13, max: 100 },
    gender: { type: String, enum: ['male', 'female', 'all'], default: 'all' },
    interests: [{ type: String, trim: true }],
    location: [{ type: String, trim: true }]
  },
  schedule: {
    startDate: { type: Date, required: true, index: true },
    endDate: { type: Date, required: true, index: true },
    timezone: { type: String, default: 'America/Lima' }
  },
  isActive: { type: Boolean, default: true, index: true },
  priority: { type: Number, default: 1, min: 1, max: 10 },
  advertiser: { type: String, required: true, trim: true, maxlength: 100 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true }
}, { timestamps: true });

const Ad = mongoose.models.Ad || mongoose.model('Ad', AdSchema);

// User Schema (needed for the script)
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

const sampleAds = [
  {
    title: 'Descarga la App de Spotify',
    description: 'Disfruta de millones de canciones con Spotify Premium. Prueba gratis por 3 meses y descubre tu música favorita.',
    type: 'banner',
    status: 'active',
    placement: 'home_top',
    imageUrl: 'https://images.unsplash.com/photo-1611339555312-e607c8352fd7?w=600&h=300&fit=crop',
    clickUrl: 'https://spotify.com/premium',
    budget: 1000,
    costPerClick: 0.50,
    targetAudience: {
      ageMin: 16,
      ageMax: 35,
      gender: 'all',
      interests: ['música', 'entretenimiento', 'podcasts'],
      location: ['Lima', 'Arequipa', 'Trujillo']
    },
    schedule: {
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 días
    },
    priority: 8,
    advertiser: 'Spotify',
    impressions: 15420,
    clicks: 234
  },
  {
    title: 'Samsung Galaxy S24 - Oferta Limitada',
    description: 'El nuevo Samsung Galaxy S24 con cámara de 200MP y 5G. Aprovecha el 20% de descuento por tiempo limitado.',
    type: 'interstitial',
    status: 'active',
    placement: 'marketplace',
    imageUrl: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600&h=400&fit=crop',
    clickUrl: 'https://samsung.com/galaxy-s24',
    budget: 2500,
    costPerClick: 1.20,
    targetAudience: {
      ageMin: 25,
      ageMax: 50,
      gender: 'all',
      interests: ['tecnología', 'smartphones', 'fotografía'],
      location: ['Lima', 'Cusco', 'Piura']
    },
    schedule: {
      startDate: new Date(),
      endDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000) // 15 días
    },
    priority: 9,
    advertiser: 'Samsung',
    impressions: 8750,
    clicks: 156
  },
  {
    title: 'Aprende Programación Online',
    description: 'Curso completo de desarrollo web con certificación. Aprende JavaScript, React y Node.js desde cero.',
    type: 'native',
    status: 'active',
    placement: 'profile',
    imageUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600&h=300&fit=crop',
    clickUrl: 'https://platzi.com/cursos/desarrollo-web',
    budget: 800,
    costPerClick: 0.80,
    targetAudience: {
      ageMin: 18,
      ageMax: 40,
      gender: 'all',
      interests: ['programación', 'tecnología', 'educación', 'carrera'],
      location: ['Lima', 'Arequipa', 'Chiclayo']
    },
    schedule: {
      startDate: new Date(),
      endDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000) // 45 días
    },
    priority: 6,
    advertiser: 'Platzi',
    impressions: 12300,
    clicks: 189
  },
  {
    title: 'Nike Air Max - Nueva Colección',
    description: 'Descubre la nueva colección de Nike Air Max. Comodidad y estilo para tu día a día. Envío gratis.',
    type: 'banner',
    status: 'active',
    placement: 'home_middle',
    imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&h=300&fit=crop',
    clickUrl: 'https://nike.com/air-max',
    budget: 1500,
    costPerClick: 0.75,
    targetAudience: {
      ageMin: 16,
      ageMax: 45,
      gender: 'all',
      interests: ['deportes', 'moda', 'running', 'fitness'],
      location: ['Lima', 'Callao', 'Ica']
    },
    schedule: {
      startDate: new Date(),
      endDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000) // 20 días
    },
    priority: 7,
    advertiser: 'Nike',
    impressions: 22100,
    clicks: 331
  },
  {
    title: 'Netflix - Series y Películas',
    description: 'Disfruta de las mejores series y películas en Netflix. Primer mes gratis para nuevos suscriptores.',
    type: 'video',
    status: 'active',
    placement: 'streaming',
    imageUrl: 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=600&h=400&fit=crop',
    videoUrl: 'https://example.com/netflix-promo.mp4',
    clickUrl: 'https://netflix.com/signup',
    budget: 3000,
    costPerClick: 1.00,
    targetAudience: {
      ageMin: 18,
      ageMax: 55,
      gender: 'all',
      interests: ['entretenimiento', 'series', 'películas', 'streaming'],
      location: ['Lima', 'Arequipa', 'Trujillo', 'Huancayo']
    },
    schedule: {
      startDate: new Date(),
      endDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000) // 60 días
    },
    priority: 10,
    advertiser: 'Netflix',
    impressions: 35600,
    clicks: 712
  },
  {
    title: 'Banco de Crédito - Tarjeta Sin Cuota',
    description: 'Solicita tu tarjeta de crédito BCP sin cuota anual. Aprobación inmediata y beneficios exclusivos.',
    type: 'banner',
    status: 'paused',
    placement: 'home_bottom',
    imageUrl: 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=600&h=300&fit=crop',
    clickUrl: 'https://viabcp.com/tarjetas',
    budget: 2000,
    costPerClick: 1.50,
    targetAudience: {
      ageMin: 25,
      ageMax: 60,
      gender: 'all',
      interests: ['finanzas', 'bancos', 'tarjetas de crédito'],
      location: ['Lima', 'Arequipa', 'Cusco']
    },
    schedule: {
      startDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // Hace 5 días
      endDate: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000) // 25 días más
    },
    priority: 5,
    advertiser: 'BCP',
    impressions: 5200,
    clicks: 78
  }
];

async function seedAds() {
  try {
    await mongoose.connect('mongodb://localhost:27017/telemetro');
    console.log('Connected to MongoDB');

    // Get admin user
    const adminUser = await getAdminUser();
    if (!adminUser) {
      console.error('Admin user not found. Please run create-admin script first.');
      return;
    }

    // Clear existing ads
    await Ad.deleteMany({});
    console.log('Cleared existing ads');

    // Add createdBy field to all ads
    const adsWithCreator = sampleAds.map(ad => ({
      ...ad,
      createdBy: adminUser._id
    }));

    // Insert sample ads
    await Ad.insertMany(adsWithCreator);
    console.log(`✅ Successfully created ${sampleAds.length} sample ads!`);

    console.log('\n📢 Ads created:');
    sampleAds.forEach((ad, index) => {
      const ctr = ad.impressions > 0 ? ((ad.clicks / ad.impressions) * 100).toFixed(2) : '0.00';
      console.log(`${index + 1}. ${ad.title} - ${ad.advertiser} (${ad.type}) - CTR: ${ctr}%`);
    });

    console.log('\n📊 Ad Statistics:');
    console.log(`- Total Ads: ${sampleAds.length}`);
    console.log(`- Active: ${sampleAds.filter(ad => ad.status === 'active').length}`);
    console.log(`- Paused: ${sampleAds.filter(ad => ad.status === 'paused').length}`);
    console.log(`- Total Impressions: ${sampleAds.reduce((sum, ad) => sum + ad.impressions, 0).toLocaleString()}`);
    console.log(`- Total Clicks: ${sampleAds.reduce((sum, ad) => sum + ad.clicks, 0).toLocaleString()}`);

  } catch (error) {
    console.error('Error seeding ads:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

seedAds();
