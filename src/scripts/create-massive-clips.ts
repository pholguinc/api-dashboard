import { ClipModel } from '../models/clip.model';
import mongoose from 'mongoose';

// Script para crear contenido masivo de clips peruanos

const validYouTubeIds = [
  'dQw4w9WgXcQ', 'QH2-TGUlwu4', 'M7lc1UVf-VE', 'jNQXAC9IVRw', 'kJQP7kiw5Fk', 
  'ZZ5LpwO-An4', '9bZkp7q19f0', 'oHg5SJYRHA0', 'fJ9rUzIMcZQ', 'GHMjD0Lp5DY',
  'astISOttCQ0', 'SQoA_wjmE9w', 'hFZFjoX2cGg', 'y6120QOlsfU', 'Zi_XLOBDo_Y',
  '6kYco6109Ac', 'hHW1oY26kxQ', 'iik25wqIuFo', 'C0DPdy98e4c', 'OPf0YbXqDm0',
  'L_jWHffIx5E', 'YQHsXMglC9A', 'djV11Xbc914', 'ktvTqknDobU', 'BaW_jenozKc'
];

const contentTemplates = [
  { category: 'comedy', titles: [
    'Cuando tu mamá te dice que laves los platos',
    'Peruanos explicando direcciones',
    'Reacciones típicas en el mercado',
    'Cuando llueve en Lima',
    'El tráfico en Lima explicado',
    'Peruanos haciendo cola',
    'Vendedores ambulantes creativos',
    'Cuando el bus se demora',
    'Peruanos en el supermercado',
    'Explicando el fútbol peruano'
  ]},
  { category: 'food', titles: [
    'Ceviche peruano casero',
    'Anticuchos en la calle',
    'Papa rellena perfecta',
    'Ají de gallina tradicional',
    'Lomo saltado paso a paso',
    'Causa limeña original',
    'Picarones caseros',
    'Mazamorra morada',
    'Tacu tacu peruano',
    'Suspiro limeño'
  ]},
  { category: 'travel', titles: [
    'Lugares increíbles cerca de Lima',
    'Barranco de noche',
    'Miraflores desde el aire',
    'Centro histórico de Lima',
    'Playas del sur de Lima',
    'Cerros de Lima al amanecer',
    'Callao histórico',
    'Parques de Lima',
    'Museos imperdibles',
    'Lima colonial'
  ]},
  { category: 'music', titles: [
    'Música peruana moderna',
    'Cumbia en el Metro',
    'Artistas emergentes de Lima',
    'Salsa peruana en vivo',
    'Rock peruano underground',
    'Reggaeton peruano',
    'Folclore peruano',
    'Jazz en Lima',
    'Música criolla',
    'Bandas de Lima'
  ]},
  { category: 'news', titles: [
    'Nuevas estaciones del Metro',
    'Descuentos para estudiantes',
    'Ampliación del Metropolitano',
    'Noticias de transporte',
    'Mejoras en el Metro',
    'Nuevas rutas disponibles'
  ]}
];

const creators = [
  { name: 'Carlos Comedia', username: '@carloscomedia_pe' },
  { name: 'María Risas', username: '@mariarisas_lima' },
  { name: 'Chef Peruano', username: '@chefperuano_lima' },
  { name: 'Lima Explorer', username: '@lima_explorer' },
  { name: 'Metro News', username: '@metro_news_pe' },
  { name: 'Humor Lima', username: '@humor_lima' },
  { name: 'Viajero Peruano', username: '@viajero_peru' },
  { name: 'Música Lima', username: '@musica_lima' },
  { name: 'Food Blogger PE', username: '@food_blogger_pe' },
  { name: 'Lima Viral', username: '@lima_viral' }
];

async function createMassiveClips() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://telemetro:telemetro2024@telemetro.pqzgd.mongodb.net/telemetro?retryWrites=true&w=majority&appName=telemetro');
    
    console.log('🔄 Creando contenido masivo de clips peruanos...');

    let createdCount = 0;
    let idIndex = 0;

    for (const template of contentTemplates) {
      for (const title of template.titles) {
        if (idIndex >= validYouTubeIds.length) break;
        
        const creator = creators[Math.floor(Math.random() * creators.length)];
        const videoId = validYouTubeIds[idIndex];
        
        try {
          await ClipModel.create({
            title: title,
            description: `${title} 🇵🇪 #Peru #Lima #${template.category}`,
            category: template.category,
            status: 'active',
            youtubeId: videoId,
            youtubeUrl: `https://www.youtube.com/watch?v=${videoId}`,
            thumbnailUrl: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
            duration: Math.floor(Math.random() * 60) + 15,
            creator: {
              name: creator.name,
              channel: creator.username,
              avatarUrl: `https://via.placeholder.com/100x100/4ecdc4/ffffff?text=${creator.name.split(' ').map(n => n[0]).join('')}`
            },
            views: Math.floor(Math.random() * 500000) + 10000,
            likes: Math.floor(Math.random() * 50000) + 1000,
            shares: Math.floor(Math.random() * 5000) + 100,
            comments: Math.floor(Math.random() * 2000) + 50,
            isVertical: true,
            quality: 'high',
            isApproved: true,
            publishedAt: new Date(),
            moderatedBy: new mongoose.Types.ObjectId('68c63dcde7df080be8c6120e'),
            moderatedAt: new Date(),
            tags: [`Peru`, `Lima`, template.category],
            hashtags: [`Peru`, `Lima`, template.category, 'MetroLima'],
            priority: Math.floor(Math.random() * 10) + 1,
            externalId: `tiktok_${videoId}_${Date.now()}`,
            source: 'tiktok',
            isFeatured: Math.random() > 0.7, // 30% destacados
            isActive: true,
            createdBy: new mongoose.Types.ObjectId('68c63dcde7df080be8c6120e'),
            reportCount: 0
          });
          
          createdCount++;
          console.log(`✅ Clip creado: ${title} (${template.category})`);
          
        } catch (error) {
          console.log(`❌ Error creando clip "${title}":`, error.message);
        }
        
        idIndex++;
      }
    }

    console.log(`🎉 Creación completada! ${createdCount} clips creados`);
    
    // Mostrar estadísticas
    const totalClips = await ClipModel.countDocuments();
    const activeClips = await ClipModel.countDocuments({ status: 'active' });
    const featuredClips = await ClipModel.countDocuments({ isFeatured: true });
    
    console.log(`📈 Estadísticas finales:`);
    console.log(`   Total clips: ${totalClips}`);
    console.log(`   Clips activos: ${activeClips}`);
    console.log(`   Clips destacados: ${featuredClips}`);

  } catch (error) {
    console.error('❌ Error en creación masiva:', error);
  } finally {
    await mongoose.disconnect();
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  createMassiveClips();
}

export { createMassiveClips };
