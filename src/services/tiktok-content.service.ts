import axios from 'axios';
import mongoose from 'mongoose';
import { ClipModel } from '../models/clip.model';

export interface TikTokContentItem {
  id: string;
  title: string;
  description: string;
  videoUrl: string;
  thumbnailUrl: string;
  duration: number;
  creator: {
    name: string;
    username: string;
    avatarUrl: string;
  };
  stats: {
    views: number;
    likes: number;
    shares: number;
    comments: number;
  };
  hashtags: string[];
  category: string;
}

export class TikTokContentService {
  
  /**
   * Simula la obtención de contenido de TikTok peruano
   * En producción, esto se conectaría a APIs reales de TikTok o servicios de scraping
   */
  static async fetchPeruvianContent(category: string = 'all', limit: number = 20): Promise<TikTokContentItem[]> {
    
    // Base de IDs de YouTube válidos para usar como contenido
    const validYouTubeIds = [
      'dQw4w9WgXcQ', 'QH2-TGUlwu4', 'M7lc1UVf-VE', 'jNQXAC9IVRw', 'kJQP7kiw5Fk', 
      'ZZ5LpwO-An4', '9bZkp7q19f0', 'oHg5SJYRHA0', 'fJ9rUzIMcZQ', 'GHMjD0Lp5DY',
      'astISOttCQ0', 'SQoA_wjmE9w', 'hFZFjoX2cGg', 'y6120QOlsfU', 'Zi_XLOBDo_Y',
      '6kYco6109Ac', 'hHW1oY26kxQ', 'iik25wqIuFo', 'C0DPdy98e4c', 'OPf0YbXqDm0',
      'L_jWHffIx5E', 'YQHsXMglC9A', 'djV11Xbc914', 'ktvTqknDobU', 'BaW_jenozKc',
      'YbJOTdZBX1g', 'iqKdEhx-dD4', 'tAGnKpE4NCI', 'ZbZSe6N_BXs', 'HPPj6viIBmU'
    ];
    // Generar contenido dinámico usando IDs válidos
    const contentTemplates = [
      // Templates de comedia
      { category: 'comedy', titles: [
        'Cuando tu mamá te dice que laves los platos',
        'Peruanos explicando direcciones',
        'Reacciones típicas en el mercado',
        'Cuando llueve en Lima',
        'El tráfico en Lima explicado',
        'Peruanos haciendo cola',
        'Comida callejera peruana',
        'Vendedores ambulantes creativos'
      ]},
      // Templates de noticias
      { category: 'news', titles: [
        'Nuevas estaciones del Metro de Lima',
        'Descuentos para estudiantes en Metro',
        'Ampliación de líneas del Metropolitano',
        'Noticias de transporte público',
        'Mejoras en el sistema Metro',
        'Nuevas rutas del Metropolitano'
      ]},
      // Templates de comida
      { category: 'food', titles: [
        'Ceviche peruano casero',
        'Anticuchos en la calle',
        'Papa rellena perfecta',
        'Ají de gallina tradicional',
        'Lomo saltado paso a paso',
        'Causa limeña original'
      ]},
      // Templates de música
      { category: 'music', titles: [
        'Música peruana moderna',
        'Cumbia en el Metro',
        'Artistas emergentes de Lima',
        'Salsa peruana en vivo',
        'Rock peruano underground',
        'Reggaeton peruano'
      ]},
      // Templates de viajes
      { category: 'travel', titles: [
        'Lugares increíbles cerca de Lima',
        'Barranco de noche',
        'Miraflores desde el aire',
        'Centro histórico de Lima',
        'Playas del sur de Lima',
        'Cerros de Lima al amanecer'
      ]}
    ];

    // Generar contenido dinámico
    const generatedContent: TikTokContentItem[] = [];
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

    let idIndex = 0;
    for (const template of contentTemplates) {
      if (category === 'all' || category === template.category) {
        for (const title of template.titles) {
          if (idIndex >= validYouTubeIds.length) break;
          
          const creator = creators[Math.floor(Math.random() * creators.length)];
          const videoId = validYouTubeIds[idIndex];
          const uniqueId = `${videoId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          
          generatedContent.push({
            id: uniqueId,
            title: title,
            description: `${title} 🇵🇪 #Peru #Lima #${template.category}`,
            videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
            thumbnailUrl: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
            duration: Math.floor(Math.random() * 60) + 15, // 15-75 segundos
            creator: {
              name: creator.name,
              username: creator.username,
              avatarUrl: `/uploads/avatars/default-creator-${Math.floor(Math.random() * 10) + 1}.jpg`
            },
            stats: {
              views: Math.floor(Math.random() * 500000) + 10000,
              likes: Math.floor(Math.random() * 50000) + 1000,
              shares: Math.floor(Math.random() * 5000) + 100,
              comments: Math.floor(Math.random() * 2000) + 50
            },
            hashtags: [`#Peru`, `#Lima`, `#${template.category}`, '#MetroLima'],
            category: template.category
          });
          
          idIndex++;
        }
      }
    }

    // Contenido original como fallback
    const peruanContent = [
      // Comedia
      {
        id: 'QH2-TGUlwu4',
        title: 'Cuando tu mamá te dice que laves los platos',
        description: 'La reacción típica de todo peruano cuando le dicen que lave los platos 😂 #PeruanosMemes #Comedia',
        videoUrl: 'https://www.youtube.com/watch?v=QH2-TGUlwu4',
        thumbnailUrl: 'https://img.youtube.com/vi/QH2-TGUlwu4/maxresdefault.jpg',
        duration: 15,
        creator: {
          name: 'Carlos Comedia',
          username: '@carloscomedia_pe',
          avatarUrl: '/uploads/avatars/default-creator-1.jpg'
        },
        stats: { views: 125000, likes: 8500, shares: 1200, comments: 450 },
        hashtags: ['#PeruanosMemes', '#Comedia', '#Lima', '#Humor'],
        category: 'comedy'
      },
      {
        id: 'M7lc1UVf-VE', // Video de YouTube existente
        title: 'Peruanos explicando cómo llegar a un lugar',
        description: 'Así damos direcciones en Perú: "Vas por acá, doblas donde está el pollo a la brasa..." 🇵🇪',
        videoUrl: 'https://www.youtube.com/watch?v=M7lc1UVf-VE',
        thumbnailUrl: 'https://img.youtube.com/vi/M7lc1UVf-VE/maxresdefault.jpg',
        duration: 22,
        creator: {
          name: 'María Risas',
          username: '@mariarisas_lima',
          avatarUrl: '/uploads/avatars/default-creator-2.jpg'
        },
        stats: { views: 89000, likes: 6200, shares: 890, comments: 320 },
        hashtags: ['#PeruanosDirecciones', '#Lima', '#Humor', '#TipicoPeru'],
        category: 'comedy'
      },
      
      // Noticias
      {
        id: 'jNQXAC9IVRw', // Video de YouTube existente
        title: 'Nuevas estaciones del Metro de Lima 2024',
        description: 'Te contamos sobre las nuevas estaciones que se inaugurarán este año en el Metro de Lima 🚇',
        videoUrl: 'https://www.youtube.com/watch?v=jNQXAC9IVRw',
        thumbnailUrl: 'https://img.youtube.com/vi/jNQXAC9IVRw/maxresdefault.jpg',
        duration: 45,
        creator: {
          name: 'Noticias Lima',
          username: '@noticiaslima_oficial',
          avatarUrl: 'https://via.placeholder.com/100x100/3742fa/ffffff?text=NL'
        },
        stats: { views: 245000, likes: 12000, shares: 3400, comments: 1200 },
        hashtags: ['#MetroLima', '#Transporte', '#Noticias', '#Lima2024'],
        category: 'news'
      },
      {
        id: 'kJQP7kiw5Fk', // Video de YouTube existente
        title: 'Nuevos descuentos para estudiantes en el Metro',
        description: 'El Metropolitano anuncia nuevos beneficios para estudiantes universitarios 🎓',
        videoUrl: 'https://www.youtube.com/watch?v=kJQP7kiw5Fk',
        thumbnailUrl: 'https://img.youtube.com/vi/kJQP7kiw5Fk/maxresdefault.jpg',
        duration: 30,
        creator: {
          name: 'Metro Oficial',
          username: '@metro_lima_oficial',
          avatarUrl: 'https://via.placeholder.com/100x100/26de81/ffffff?text=MO'
        },
        stats: { views: 156000, likes: 9800, shares: 2100, comments: 780 },
        hashtags: ['#MetroLima', '#Estudiantes', '#Descuentos', '#Educacion'],
        category: 'news'
      },

      // Comida
      {
        id: 'ZZ5LpwO-An4', // Video de YouTube existente
        title: 'Cómo hacer un ceviche perfecto en 5 minutos',
        description: 'El secreto del ceviche peruano que tu abuela no te contó 🐟✨ #CevichePeru',
        videoUrl: 'https://www.youtube.com/watch?v=ZZ5LpwO-An4',
        thumbnailUrl: 'https://img.youtube.com/vi/ZZ5LpwO-An4/maxresdefault.jpg',
        duration: 35,
        creator: {
          name: 'Chef Peruano',
          username: '@chefperuano_lima',
          avatarUrl: 'https://via.placeholder.com/100x100/ff9ff3/ffffff?text=CP'
        },
        stats: { views: 320000, likes: 18500, shares: 4200, comments: 1850 },
        hashtags: ['#CevichePeru', '#ComidaPeruana', '#Recetas', '#Lima'],
        category: 'food'
      },

      // Viajes
      {
        id: 'peru_travel_1',
        title: 'Lugares increíbles cerca de Lima que no conocías',
        description: 'Descubre estos destinos espectaculares a menos de 3 horas de Lima 🏔️🌊',
        videoUrl: 'https://storage.googleapis.com/telemetro-clips/travel/lima_destinos.mp4',
        thumbnailUrl: 'https://via.placeholder.com/300x400/54a0ff/ffffff?text=🏔️+Viajes',
        duration: 60,
        creator: {
          name: 'Viajero Peruano',
          username: '@viajero_peru',
          avatarUrl: 'https://via.placeholder.com/100x100/54a0ff/ffffff?text=VP'
        },
        stats: { views: 198000, likes: 11200, shares: 2800, comments: 950 },
        hashtags: ['#ViajePeru', '#Lima', '#Turismo', '#Aventura'],
        category: 'travel'
      },

      // Música
      {
        id: 'peru_music_1',
        title: 'Los mejores artistas peruanos del momento',
        description: 'Conoce a los artistas peruanos que están conquistando el mundo 🎵🇵🇪',
        videoUrl: 'https://storage.googleapis.com/telemetro-clips/music/artistas_peru.mp4',
        thumbnailUrl: 'https://via.placeholder.com/300x400/5f27cd/ffffff?text=🎵+Música',
        duration: 40,
        creator: {
          name: 'Música Perú',
          username: '@musica_peru_oficial',
          avatarUrl: 'https://via.placeholder.com/100x100/5f27cd/ffffff?text=MP'
        },
        stats: { views: 167000, likes: 9500, shares: 1900, comments: 680 },
        hashtags: ['#MusicaPeru', '#ArtistasPeruanos', '#Musica', '#Peru'],
        category: 'music'
      },

      // Educación
      {
        id: 'peru_edu_1', 
        title: 'Historia del Metro de Lima en 60 segundos',
        description: 'Todo lo que necesitas saber sobre la historia del Metropolitano 📚🚇',
        videoUrl: 'https://storage.googleapis.com/telemetro-clips/education/metro_historia.mp4',
        thumbnailUrl: 'https://via.placeholder.com/300x400/2ed573/ffffff?text=📚+Historia',
        duration: 60,
        creator: {
          name: 'Aprende Perú',
          username: '@aprende_peru',
          avatarUrl: 'https://via.placeholder.com/100x100/2ed573/ffffff?text=AP'
        },
        stats: { views: 78000, likes: 4200, shares: 950, comments: 280 },
        hashtags: ['#HistoriaPeru', '#MetroLima', '#Educacion', '#Cultura'],
        category: 'education'
      },

      // Deportes
      {
        id: 'peru_sports_1',
        title: 'Los mejores goles de la selección peruana',
        description: 'Revive los momentos más emocionantes de la blanquirroja ⚽🇵🇪',
        videoUrl: 'https://storage.googleapis.com/telemetro-clips/sports/peru_goles.mp4',
        thumbnailUrl: 'https://via.placeholder.com/300x400/ff3838/ffffff?text=⚽+Fútbol',
        duration: 50,
        creator: {
          name: 'Deportes Perú',
          username: '@deportes_peru',
          avatarUrl: 'https://via.placeholder.com/100x100/ff3838/ffffff?text=DP'
        },
        stats: { views: 412000, likes: 25000, shares: 8900, comments: 3200 },
        hashtags: ['#SeleccionPeru', '#Futbol', '#Deportes', '#Peru'],
        category: 'sports'
      }
    ];

    // Combinar contenido generado con contenido original
    const allContent = [...generatedContent, ...peruanContent];
    
    // Filtrar por categoría si se especifica
    let filteredContent = allContent;
    if (category !== 'all') {
      filteredContent = allContent.filter(item => item.category === category);
    }

    // Simular variación aleatoria para parecer contenido fresco
    const shuffled = filteredContent.sort(() => Math.random() - 0.5);
    
    return shuffled.slice(0, limit);
  }

  /**
   * Importa contenido de TikTok a la base de datos
   */
  static async importContentToDatabase(content: TikTokContentItem[]): Promise<number> {
    let importedCount = 0;

    for (const item of content) {
      try {
        console.log(`🔍 Procesando clip: ${item.title}`);
        
        // Para testing, crear clips únicos sin verificar duplicados
        // En producción, esta verificación sería importante
        console.log(`🔍 Procesando clip: ${item.title} (ID: ${item.id})`);

        console.log(`➕ Creando nuevo clip: ${item.title}`);

        // Crear nuevo clip
        const youtubeId = item.videoUrl.includes('youtube.com/watch?v=') 
          ? item.videoUrl.split('v=')[1].split('&')[0]
          : item.id.split('_')[0]; // Extraer ID real de YouTube
          
        await ClipModel.create({
          title: item.title,
          description: item.description,
          category: this.mapCategoryToClipCategory(item.category),
          status: 'active',
          youtubeId: youtubeId,
          youtubeUrl: item.videoUrl,
          thumbnailUrl: item.thumbnailUrl,
          duration: item.duration,
          creator: {
            name: item.creator.name,
            channel: item.creator.username,
            avatarUrl: item.creator.avatarUrl
          },
          views: item.stats.views,
          likes: item.stats.likes,
          shares: item.stats.shares,
          comments: item.stats.comments,
          isVertical: true,
          quality: 'high',
          isApproved: true,
          publishedAt: new Date(),
          moderatedBy: new mongoose.Types.ObjectId('68c63dcde7df080be8c6120e'),
          moderatedAt: new Date(),
          tags: item.hashtags,
          hashtags: item.hashtags,
          priority: Math.floor(Math.random() * 10) + 1,
          externalId: item.id,
          source: 'tiktok',
          isFeatured: Math.random() > 0.7, // 30% chance de ser destacado
          isActive: true,
          createdBy: new mongoose.Types.ObjectId('68c63dcde7df080be8c6120e'), // Admin user
          reportCount: 0
        });

        importedCount++;
      } catch (error) {
        console.error(`Error importing content ${item.id}:`, error);
      }
    }

    return importedCount;
  }

  /**
   * Mapea categorías de TikTok a categorías de clips
   */
  private static mapCategoryToClipCategory(tiktokCategory: string): string {
    const categoryMap: { [key: string]: string } = {
      'comedy': 'comedy',
      'news': 'news', 
      'food': 'food',
      'travel': 'travel',
      'music': 'music',
      'education': 'education',
      'sports': 'sports',
      'dance': 'dance'
    };

    return categoryMap[tiktokCategory] || 'comedy';
  }

  /**
   * Actualiza el feed automáticamente
   */
  static async updateFeedAutomatically(): Promise<{ imported: number; total: number }> {
    try {
      console.log('🔄 Iniciando actualización automática de contenido...');
      
      const categories = ['comedy', 'news', 'food', 'travel', 'music', 'education', 'sports'];
      let totalImported = 0;
      let totalFetched = 0;

      for (const category of categories) {
        const content = await this.fetchPeruvianContent(category, 10);
        const imported = await this.importContentToDatabase(content);
        
        totalImported += imported;
        totalFetched += content.length;
        
        console.log(`📊 Categoría ${category}: ${imported}/${content.length} clips importados`);
      }

      console.log(`✅ Actualización completada: ${totalImported}/${totalFetched} clips nuevos`);
      
      return {
        imported: totalImported,
        total: totalFetched
      };
    } catch (error) {
      console.error('❌ Error en actualización automática:', error);
      throw error;
    }
  }

  /**
   * Obtiene trending hashtags peruanos
   */
  static async getTrendingHashtags(): Promise<string[]> {
    return [
      '#Peru', '#Lima', '#PeruanosMemes', '#ComidaPeruana', 
      '#MetroLima', '#CulturaPeruana', '#ViajePeru', '#MusicaPeru',
      '#FutbolPeru', '#SeleccionPeru', '#Gastronomia', '#TurismoLima'
    ];
  }

  /**
   * Limpia contenido antiguo o de baja calidad
   */
  static async cleanupOldContent(): Promise<number> {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Eliminar clips con muy pocas vistas después de 30 días
      const result = await ClipModel.deleteMany({
        createdAt: { $lt: thirtyDaysAgo },
        views: { $lt: 100 },
        source: 'tiktok'
      });

      console.log(`🧹 Limpieza: ${result.deletedCount} clips antiguos eliminados`);
      return result.deletedCount;
    } catch (error) {
      console.error('Error en limpieza:', error);
      return 0;
    }
  }
}
