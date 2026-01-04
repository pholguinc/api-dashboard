const mongoose = require('mongoose');

// Clip Schema
const ClipSchema = new mongoose.Schema({
  title: { type: String, required: true, maxlength: 100, trim: true },
  description: { type: String, required: true, maxlength: 500, trim: true },
  category: { type: String, enum: ['comedy', 'music', 'dance', 'food', 'travel', 'news', 'sports', 'education'], required: true },
  status: { type: String, enum: ['draft', 'active', 'paused', 'reported', 'removed'], default: 'draft' },
  youtubeId: { type: String, required: true, unique: true },
  youtubeUrl: { type: String, required: true },
  thumbnailUrl: { type: String, required: true },
  duration: { type: Number, required: true, min: 1, max: 180 },
  creator: {
    name: { type: String, required: true, maxlength: 100, trim: true },
    channel: { type: String, required: true, maxlength: 100, trim: true },
    avatarUrl: { type: String }
  },
  views: { type: Number, default: 0, min: 0 },
  likes: { type: Number, default: 0, min: 0 },
  shares: { type: Number, default: 0, min: 0 },
  comments: { type: Number, default: 0, min: 0 },
  isVertical: { type: Boolean, default: true },
  quality: { type: String, enum: ['low', 'medium', 'high', 'hd'], default: 'medium' },
  isApproved: { type: Boolean, default: false },
  moderatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  moderatedAt: { type: Date },
  reportCount: { type: Number, default: 0, min: 0 },
  publishedAt: { type: Date },
  expiresAt: { type: Date },
  tags: [{ type: String, trim: true, maxlength: 50 }],
  hashtags: [{ type: String, trim: true, maxlength: 30 }],
  priority: { type: Number, default: 1, min: 1, max: 10 },
  isFeatured: { type: Boolean, default: false },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

const Clip = mongoose.models.Clip || mongoose.model('Clip', ClipSchema);

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

const sampleClips = [
  {
    title: '😂 Comedia en el Metro de Lima',
    description: 'Situaciones divertidas que solo pasan en el metro de Lima. ¡No podrás parar de reír!',
    category: 'comedy',
    status: 'active',
    youtubeId: 'dQw4w9WgXcQ', // Placeholder ID
    youtubeUrl: 'https://youtube.com/shorts/dQw4w9WgXcQ',
    thumbnailUrl: 'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=400&h=600&fit=crop',
    duration: 45,
    creator: {
      name: 'ComedyLima',
      channel: 'Humor Peruano',
      avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop'
    },
    views: 12500,
    likes: 890,
    shares: 156,
    comments: 234,
    isVertical: true,
    quality: 'hd',
    isApproved: true,
    priority: 9,
    isFeatured: true,
    tags: ['comedia', 'metro', 'lima', 'peru', 'divertido'],
    hashtags: ['comedyPeru', 'metroLima', 'humor', 'viral']
  },
  {
    title: '🎵 Música Criolla en Transporte',
    description: 'Músicos talentosos amenizando el viaje en el metro con música criolla tradicional.',
    category: 'music',
    status: 'active',
    youtubeId: 'abc123XYZ89', // Placeholder ID
    youtubeUrl: 'https://youtube.com/shorts/abc123XYZ89',
    thumbnailUrl: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=600&fit=crop',
    duration: 60,
    creator: {
      name: 'MúsicaPeruana',
      channel: 'Criolla Metro',
      avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop'
    },
    views: 8750,
    likes: 567,
    shares: 89,
    comments: 123,
    isVertical: true,
    quality: 'high',
    isApproved: true,
    priority: 8,
    isFeatured: false,
    tags: ['musica', 'criolla', 'metro', 'tradicion', 'peru'],
    hashtags: ['musicaCriolla', 'metroLima', 'tradicion', 'peru']
  },
  {
    title: '💃 Baile Urbano en Estación',
    description: 'Increíble performance de baile urbano en la estación del metro. ¡Talento peruano!',
    category: 'dance',
    status: 'active',
    youtubeId: 'def456ABC78', // Placeholder ID
    youtubeUrl: 'https://youtube.com/shorts/def456ABC78',
    thumbnailUrl: 'https://images.unsplash.com/photo-1547153760-18fc86324498?w=400&h=600&fit=crop',
    duration: 35,
    creator: {
      name: 'DanceUrbanoPeru',
      channel: 'Street Dance Lima',
      avatarUrl: 'https://images.unsplash.com/photo-1494790108755-2616c6d49e3c?w=100&h=100&fit=crop'
    },
    views: 15200,
    likes: 1240,
    shares: 298,
    comments: 456,
    isVertical: true,
    quality: 'hd',
    isApproved: true,
    priority: 7,
    isFeatured: true,
    tags: ['baile', 'urbano', 'metro', 'talento', 'lima'],
    hashtags: ['dancePeruana', 'talentoPeru', 'metroLima', 'baileUrbano']
  },
  {
    title: '🍽️ Comida Callejera en Metro',
    description: 'Los mejores snacks y comida que puedes encontrar cerca de las estaciones del metro.',
    category: 'food',
    status: 'active',
    youtubeId: 'ghi789DEF45', // Placeholder ID
    youtubeUrl: 'https://youtube.com/shorts/ghi789DEF45',
    thumbnailUrl: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400&h=600&fit=crop',
    duration: 55,
    creator: {
      name: 'FoodieMetro',
      channel: 'Sabores de Lima',
      avatarUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop'
    },
    views: 6890,
    likes: 445,
    shares: 67,
    comments: 89,
    isVertical: true,
    quality: 'high',
    isApproved: true,
    priority: 6,
    isFeatured: false,
    tags: ['comida', 'street food', 'metro', 'lima', 'gastronomia'],
    hashtags: ['comidaPeruana', 'streetFood', 'metroLima', 'saboresLima']
  },
  {
    title: '🚇 Viaje por el Metro Moderno',
    description: 'Recorrido completo por las nuevas estaciones del metro de Lima. ¡Infraestructura de primer mundo!',
    category: 'travel',
    status: 'active',
    youtubeId: 'jkl012GHI34', // Placeholder ID
    youtubeUrl: 'https://youtube.com/shorts/jkl012GHI34',
    thumbnailUrl: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=400&h=600&fit=crop',
    duration: 75,
    creator: {
      name: 'MetroLimaTours',
      channel: 'Explora Lima',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop'
    },
    views: 22300,
    likes: 1890,
    shares: 445,
    comments: 678,
    isVertical: true,
    quality: 'hd',
    isApproved: true,
    priority: 10,
    isFeatured: true,
    tags: ['metro', 'lima', 'transporte', 'moderno', 'infraestructura'],
    hashtags: ['metroLima', 'transportePeru', 'infraestructura', 'lima']
  },
  {
    title: '📰 Noticias del Metro en 60 Segundos',
    description: 'Resumen semanal de las noticias más importantes sobre el sistema de transporte metropolitano.',
    category: 'news',
    status: 'active',
    youtubeId: 'mno345JKL67', // Placeholder ID
    youtubeUrl: 'https://youtube.com/shorts/mno345JKL67',
    thumbnailUrl: 'https://images.unsplash.com/photo-1586339949916-3e9457bef6d3?w=400&h=600&fit=crop',
    duration: 60,
    creator: {
      name: 'NoticiasMetro',
      channel: 'Transporte Noticias',
      avatarUrl: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=100&h=100&fit=crop'
    },
    views: 4560,
    likes: 234,
    shares: 45,
    comments: 67,
    isVertical: true,
    quality: 'high',
    isApproved: true,
    priority: 5,
    isFeatured: false,
    tags: ['noticias', 'metro', 'transporte', 'actualidad', 'lima'],
    hashtags: ['noticiasMetro', 'transporteLima', 'actualidad']
  },
  {
    title: '⚽ Hinchas en el Metro - Clásico',
    description: 'La emoción de los hinchas peruanos viajando al estadio en metro. ¡Pasión futbolera!',
    category: 'sports',
    status: 'active',
    youtubeId: 'pqr678MNO90', // Placeholder ID
    youtubeUrl: 'https://youtube.com/shorts/pqr678MNO90',
    thumbnailUrl: 'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=400&h=600&fit=crop',
    duration: 40,
    creator: {
      name: 'FútbolMetro',
      channel: 'Deporte Peruano',
      avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop'
    },
    views: 18900,
    likes: 1456,
    shares: 289,
    comments: 445,
    isVertical: true,
    quality: 'hd',
    isApproved: true,
    priority: 8,
    isFeatured: true,
    tags: ['futbol', 'hinchas', 'metro', 'deporte', 'peru'],
    hashtags: ['futbolPeru', 'hinchas', 'metroLima', 'deporte']
  },
  {
    title: '📚 Tips de Seguridad en el Metro',
    description: 'Consejos importantes para viajar seguro en el metro de Lima. Educación ciudadana.',
    category: 'education',
    status: 'active',
    youtubeId: 'stu901PQR12', // Placeholder ID
    youtubeUrl: 'https://youtube.com/shorts/stu901PQR12',
    thumbnailUrl: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=400&h=600&fit=crop',
    duration: 50,
    creator: {
      name: 'SeguridadMetro',
      channel: 'Educación Vial',
      avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&h=100&fit=crop'
    },
    views: 7800,
    likes: 567,
    shares: 123,
    comments: 89,
    isVertical: true,
    quality: 'high',
    isApproved: true,
    priority: 6,
    isFeatured: false,
    tags: ['seguridad', 'educacion', 'metro', 'consejos', 'ciudadania'],
    hashtags: ['seguridadMetro', 'educacion', 'consejos', 'metroLima']
  }
];

async function seedClips() {
  try {
    await mongoose.connect('mongodb://localhost:27017/telemetro');
    console.log('Connected to MongoDB');

    // Get admin user
    const adminUser = await getAdminUser();
    if (!adminUser) {
      console.error('Admin user not found. Please run create-admin script first.');
      return;
    }

    // Clear existing clips
    await Clip.deleteMany({});
    console.log('Cleared existing clips');

    // Add createdBy field to all clips
    const clipsWithCreator = sampleClips.map(clip => ({
      ...clip,
      createdBy: adminUser._id,
      publishedAt: new Date()
    }));

    // Insert sample clips
    await Clip.insertMany(clipsWithCreator);
    console.log(`✅ Successfully created ${sampleClips.length} sample clips!`);

    console.log('\n🎬 Clips creados:');
    sampleClips.forEach((clip, index) => {
      const engagement = clip.views > 0 ? (((clip.likes + clip.shares) / clip.views) * 100).toFixed(1) : '0.0';
      console.log(`${index + 1}. ${clip.title} - ${clip.creator.name} (${clip.category}) - ${clip.views.toLocaleString()} vistas - ${engagement}% engagement`);
    });

    console.log('\n📊 Estadísticas de Clips:');
    console.log(`- Total Clips: ${sampleClips.length}`);
    console.log(`- Activos: ${sampleClips.filter(clip => clip.status === 'active').length}`);
    console.log(`- Aprobados: ${sampleClips.filter(clip => clip.isApproved).length}`);
    console.log(`- Destacados: ${sampleClips.filter(clip => clip.isFeatured).length}`);
    console.log(`- Total Vistas: ${sampleClips.reduce((sum, clip) => sum + clip.views, 0).toLocaleString()}`);
    console.log(`- Total Likes: ${sampleClips.reduce((sum, clip) => sum + clip.likes, 0).toLocaleString()}`);

    console.log('\n📱 Categorías:');
    const categories = [...new Set(sampleClips.map(clip => clip.category))];
    categories.forEach(category => {
      const count = sampleClips.filter(clip => clip.category === category).length;
      const totalViews = sampleClips.filter(clip => clip.category === category)
                                   .reduce((sum, clip) => sum + clip.views, 0);
      console.log(`- ${category}: ${count} clips, ${totalViews.toLocaleString()} vistas`);
    });

  } catch (error) {
    console.error('Error seeding clips:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

seedClips();
