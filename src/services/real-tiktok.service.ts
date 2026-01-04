import axios from 'axios';
import { ClipModel } from '../models/clip.model';
import mongoose from 'mongoose';

export interface TikTokVideo {
  id: string;
  title: string;
  description: string;
  videoUrl: string;
  thumbnailUrl: string;
  duration: number;
  creator: {
    username: string;
    displayName: string;
    avatarUrl: string;
    verified: boolean;
  };
  stats: {
    views: number;
    likes: number;
    shares: number;
    comments: number;
  };
  hashtags: string[];
  music?: {
    title: string;
    author: string;
    url: string;
  };
  createdAt: string;
  isVertical: boolean;
}

export class RealTikTokService {
  
  /**
   * Simula obtener contenido trending de TikTok Perú
   * En producción se conectaría a TikTok Research API o servicios de scraping
   */
  static async getTrendingPeruContent(limit: number = 20): Promise<TikTokVideo[]> {
    // Simular contenido viral peruano real
    const peruTrendingContent: TikTokVideo[] = [
      {
        id: 'peru_viral_001',
        title: 'POV: Explicando cómo llegar a tu casa en Lima',
        description: 'Así damos direcciones en Perú 😂 "Doblas donde está el pollo a la brasa" #Peru #Lima #Humor',
        videoUrl: 'https://v16-webapp.tiktok.com/peru_directions.mp4',
        thumbnailUrl: 'https://p16-sign-va.tiktokcdn.com/tos-maliva-p-0068/peru_directions_thumb.jpg',
        duration: 23,
        creator: {
          username: '@carloscomedia_pe',
          displayName: 'Carlos Comedia Perú',
          avatarUrl: 'https://p16-sign-va.tiktokcdn.com/tos-maliva-avt-0068/carlos_avatar.jpg',
          verified: false
        },
        stats: { views: 2340000, likes: 180000, shares: 45000, comments: 12000 },
        hashtags: ['#Peru', '#Lima', '#Humor', '#Direcciones', '#PeruanosMemes'],
        music: { title: 'Sonido Original', author: '@carloscomedia_pe', url: '' },
        createdAt: '2025-09-13T15:30:00.000Z',
        isVertical: true
      },
      {
        id: 'peru_viral_002', 
        title: 'Reacciones cuando llueve en Lima',
        description: 'Los limeños cuando cae una gota de lluvia 🌧️😱 #Lima #Lluvia #Peru',
        videoUrl: 'https://v16-webapp.tiktok.com/lima_rain.mp4',
        thumbnailUrl: 'https://p16-sign-va.tiktokcdn.com/tos-maliva-p-0068/lima_rain_thumb.jpg',
        duration: 18,
        creator: {
          username: '@lima_memes',
          displayName: 'Lima Memes Oficial',
          avatarUrl: 'https://p16-sign-va.tiktokcdn.com/tos-maliva-avt-0068/lima_memes_avatar.jpg',
          verified: true
        },
        stats: { views: 1890000, likes: 145000, shares: 32000, comments: 8500 },
        hashtags: ['#Lima', '#Lluvia', '#Peru', '#Clima', '#LimeñosProblems'],
        music: { title: 'Lluvia en Lima', author: '@lima_memes', url: '' },
        createdAt: '2025-09-13T12:15:00.000Z',
        isVertical: true
      },
      {
        id: 'peru_viral_003',
        title: 'Ceviche en 60 segundos',
        description: 'El secreto del ceviche peruano que tu abuela no te contó 🐟✨ #CevichePeru #ComidaPeruana',
        videoUrl: 'https://v16-webapp.tiktok.com/ceviche_tutorial.mp4',
        thumbnailUrl: 'https://p16-sign-va.tiktokcdn.com/tos-maliva-p-0068/ceviche_thumb.jpg',
        duration: 58,
        creator: {
          username: '@chef_peruano',
          displayName: 'Chef Peruano Oficial',
          avatarUrl: 'https://p16-sign-va.tiktokcdn.com/tos-maliva-avt-0068/chef_avatar.jpg',
          verified: true
        },
        stats: { views: 3200000, likes: 280000, shares: 75000, comments: 18000 },
        hashtags: ['#CevichePeru', '#ComidaPeruana', '#Recetas', '#Peru', '#Gastronomia'],
        music: { title: 'Música de Cocina', author: '@chef_peruano', url: '' },
        createdAt: '2025-09-12T18:45:00.000Z',
        isVertical: true
      },
      {
        id: 'peru_viral_004',
        title: 'Barranco by night 🌃',
        description: 'Los spots más instagrameables de Barranco de noche ✨ #Barranco #Lima #Travel',
        videoUrl: 'https://v16-webapp.tiktok.com/barranco_night.mp4',
        thumbnailUrl: 'https://p16-sign-va.tiktokcdn.com/tos-maliva-p-0068/barranco_thumb.jpg',
        duration: 45,
        creator: {
          username: '@lima_explorer',
          displayName: 'Lima Explorer',
          avatarUrl: 'https://p16-sign-va.tiktokcdn.com/tos-maliva-avt-0068/explorer_avatar.jpg',
          verified: false
        },
        stats: { views: 1560000, likes: 120000, shares: 28000, comments: 6500 },
        hashtags: ['#Barranco', '#Lima', '#Travel', '#Peru', '#Nightlife'],
        music: { title: 'Lofi Lima Nights', author: '@lima_explorer', url: '' },
        createdAt: '2025-09-12T21:20:00.000Z',
        isVertical: true
      },
      {
        id: 'peru_viral_005',
        title: 'Metro de Lima hacks que no sabías',
        description: 'Tips para usar el Metropolitano como un pro 🚇💡 #MetroLima #LifeHacks #Peru',
        videoUrl: 'https://v16-webapp.tiktok.com/metro_hacks.mp4',
        thumbnailUrl: 'https://p16-sign-va.tiktokcdn.com/tos-maliva-p-0068/metro_hacks_thumb.jpg',
        duration: 35,
        creator: {
          username: '@metro_pro_tips',
          displayName: 'Metro Pro Tips',
          avatarUrl: 'https://p16-sign-va.tiktokcdn.com/tos-maliva-avt-0068/metro_tips_avatar.jpg',
          verified: false
        },
        stats: { views: 980000, likes: 85000, shares: 15000, comments: 4200 },
        hashtags: ['#MetroLima', '#LifeHacks', '#Peru', '#Transporte', '#Tips'],
        music: { title: 'Metro Vibes', author: '@metro_pro_tips', url: '' },
        createdAt: '2025-09-13T09:10:00.000Z',
        isVertical: true
      },
      {
        id: 'peru_viral_006',
        title: 'Vendedores del Centro de Lima',
        description: 'La creatividad de los vendedores ambulantes peruanos no tiene límites 🛒✨ #Lima #Vendedores',
        videoUrl: 'https://v16-webapp.tiktok.com/vendedores_lima.mp4',
        thumbnailUrl: 'https://p16-sign-va.tiktokcdn.com/tos-maliva-p-0068/vendedores_thumb.jpg',
        duration: 42,
        creator: {
          username: '@lima_streets',
          displayName: 'Lima Streets',
          avatarUrl: 'https://p16-sign-va.tiktokcdn.com/tos-maliva-avt-0068/streets_avatar.jpg',
          verified: false
        },
        stats: { views: 1240000, likes: 95000, shares: 22000, comments: 5800 },
        hashtags: ['#Lima', '#Vendedores', '#Peru', '#CentroLima', '#Emprendimiento'],
        music: { title: 'Lima Hustler', author: '@lima_streets', url: '' },
        createdAt: '2025-09-12T14:30:00.000Z',
        isVertical: true
      },
      {
        id: 'peru_viral_007',
        title: 'Cumbia en el bus de Lima',
        description: 'Cuando ponen cumbia en el bus y todos empiezan a moverse 🎵🚌 #Cumbia #Lima #Música',
        videoUrl: 'https://v16-webapp.tiktok.com/cumbia_bus.mp4',
        thumbnailUrl: 'https://p16-sign-va.tiktokcdn.com/tos-maliva-p-0068/cumbia_bus_thumb.jpg',
        duration: 28,
        creator: {
          username: '@musica_peru',
          displayName: 'Música Perú',
          avatarUrl: 'https://p16-sign-va.tiktokcdn.com/tos-maliva-avt-0068/musica_avatar.jpg',
          verified: true
        },
        stats: { views: 2100000, likes: 165000, shares: 38000, comments: 9200 },
        hashtags: ['#Cumbia', '#Lima', '#Música', '#Peru', '#TransportePublico'],
        music: { title: 'Cumbia Limeña', author: '@musica_peru', url: '' },
        createdAt: '2025-09-13T16:45:00.000Z',
        isVertical: true
      },
      {
        id: 'peru_viral_008',
        title: 'Anticuchos de doña María',
        description: 'La mejor anticuchera de Lima te enseña sus secretos 🍢👵 #Anticuchos #ComidaPeruana',
        videoUrl: 'https://v16-webapp.tiktok.com/anticuchos_maria.mp4',
        thumbnailUrl: 'https://p16-sign-va.tiktokcdn.com/tos-maliva-p-0068/anticuchos_thumb.jpg',
        duration: 52,
        creator: {
          username: '@dona_maria_anticuchos',
          displayName: 'Doña María Anticuchos',
          avatarUrl: 'https://p16-sign-va.tiktokcdn.com/tos-maliva-avt-0068/dona_maria_avatar.jpg',
          verified: false
        },
        stats: { views: 1680000, likes: 125000, shares: 31000, comments: 7400 },
        hashtags: ['#Anticuchos', '#ComidaPeruana', '#Peru', '#Lima', '#Tradicion'],
        music: { title: 'Anticuchos Song', author: '@dona_maria_anticuchos', url: '' },
        createdAt: '2025-09-12T19:20:00.000Z',
        isVertical: true
      }
    ];

    // Filtrar y randomizar
    const shuffled = peruTrendingContent.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, limit);
  }

  /**
   * Convierte contenido de TikTok al formato de Clip del sistema
   */
  static async importTikTokContent(videos: TikTokVideo[]): Promise<number> {
    let importedCount = 0;

    for (const video of videos) {
      try {
        // Verificar si ya existe (solo por externalId para permitir títulos similares)
        const existingClip = await ClipModel.findOne({ externalId: video.id });

        if (existingClip) {
          console.log(`⏭️ Clip ya existe: ${video.title}`);
          continue;
        }

        // Crear clip con estructura TikTok
        await ClipModel.create({
          title: video.title,
          description: video.description,
          category: this.detectCategory(video.hashtags),
          status: 'active',
          youtubeId: video.id, // Usar ID de TikTok como youtubeId temporal
          youtubeUrl: video.videoUrl,
          thumbnailUrl: video.thumbnailUrl,
          duration: video.duration,
          creator: {
            name: video.creator.displayName,
            channel: video.creator.username,
            avatarUrl: video.creator.avatarUrl
          },
          views: video.stats.views,
          likes: video.stats.likes,
          shares: video.stats.shares,
          comments: video.stats.comments,
          isVertical: video.isVertical,
          quality: 'high',
          isApproved: true,
          publishedAt: new Date(video.createdAt),
          moderatedBy: new mongoose.Types.ObjectId('68c63dcde7df080be8c6120e'),
          moderatedAt: new Date(),
          tags: video.hashtags.map(h => h.replace('#', '')),
          hashtags: video.hashtags,
          priority: Math.floor(Math.random() * 10) + 1,
          externalId: video.id,
          source: 'tiktok',
          isFeatured: video.stats.views > 1000000, // Videos con +1M views son destacados
          isActive: true,
          createdBy: new mongoose.Types.ObjectId('68c63dcde7df080be8c6120e'),
          reportCount: 0
        });

        importedCount++;
        console.log(`✅ TikTok importado: ${video.title} (${video.stats.views} views)`);

      } catch (error) {
        console.error(`❌ Error importando TikTok ${video.title}:`, error.message);
      }
    }

    return importedCount;
  }

  /**
   * Detecta categoría basada en hashtags
   */
  private static detectCategory(hashtags: string[]): string {
    const categoryMap = {
      comedy: ['#Humor', '#Memes', '#Comedia', '#Funny'],
      food: ['#ComidaPeruana', '#Ceviche', '#Anticuchos', '#Recetas', '#Food'],
      travel: ['#Travel', '#Lima', '#Barranco', '#Miraflores', '#Turismo'],
      music: ['#Música', '#Cumbia', '#Salsa', '#Music', '#Reggaeton'],
      news: ['#Noticias', '#MetroLima', '#Transporte', '#News'],
      education: ['#Tips', '#LifeHacks', '#Educacion', '#Tutorial'],
      sports: ['#Futbol', '#Deportes', '#SeleccionPeru', '#Sports']
    };

    for (const [category, keywords] of Object.entries(categoryMap)) {
      if (keywords.some(keyword => hashtags.includes(keyword))) {
        return category;
      }
    }

    return 'comedy'; // Default
  }

  /**
   * Obtiene hashtags trending de Perú
   */
  static async getTrendingHashtagsPeru(): Promise<string[]> {
    return [
      '#Peru', '#Lima', '#PeruanosMemes', '#ComidaPeruana', '#MetroLima',
      '#Barranco', '#Miraflores', '#CentroLima', '#SeleccionPeru', '#Cumbia',
      '#Anticuchos', '#Ceviche', '#LimaDeNoche', '#PeruTravel', '#Gastronomia',
      '#Humor', '#LimaTrafico', '#Vendedores', '#TransportePublico', '#LimaCultural'
    ];
  }

  /**
   * Simula actualización automática de contenido trending
   */
  static async updateTrendingContent(): Promise<{ imported: number; total: number }> {
    try {
      console.log('🔄 Actualizando contenido trending de TikTok Perú...');
      
      const trendingVideos = await this.getTrendingPeruContent(15);
      const imported = await this.importTikTokContent(trendingVideos);
      
      console.log(`✅ Actualización TikTok completada: ${imported}/${trendingVideos.length} videos importados`);
      
      return {
        imported,
        total: trendingVideos.length
      };
    } catch (error) {
      console.error('❌ Error actualizando contenido TikTok:', error);
      throw error;
    }
  }

  /**
   * Obtiene estadísticas de engagement
   */
  static calculateEngagement(video: TikTokVideo): number {
    const totalEngagement = video.stats.likes + video.stats.shares + video.stats.comments;
    return video.stats.views > 0 ? (totalEngagement / video.stats.views) * 100 : 0;
  }
}
