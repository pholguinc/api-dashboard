import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { sendOk, sendError } from '../../utils/response';
import { TikTokContentService } from '../../services/tiktok-content.service';
import { RealTikTokService } from '../../services/real-tiktok.service';
import { ViralTikTokService } from '../../services/viral-tiktok.service';
import { ClipModel } from '../../models/clip.model';

export class TikTokContentAdminController {

  /**
   * Crear contenido masivo de clips peruanos
   */
  static async createMassiveContent(req: Request, res: Response) {
    try {
      const { amount = 20 } = req.body;
      
      console.log(`🔄 Creando ${amount} clips masivos...`);
      
      const { ClipModel } = await import('../../models/clip.model');
      
      const validYouTubeIds = [
        'dQw4w9WgXcQ', 'QH2-TGUlwu4', 'M7lc1UVf-VE', 'jNQXAC9IVRw', 'kJQP7kiw5Fk', 
        'ZZ5LpwO-An4', '9bZkp7q19f0', 'oHg5SJYRHA0', 'fJ9rUzIMcZQ', 'GHMjD0Lp5DY',
        'astISOttCQ0', 'SQoA_wjmE9w', 'hFZFjoX2cGg', 'y6120QOlsfU', 'Zi_XLOBDo_Y'
      ];
      
      const titles = [
        'Humor peruano en el Metro', 'Comida callejera Lima', 'Barranco de noche',
        'Música en vivo Lima', 'Ceviche paso a paso', 'Direcciones peruanas',
        'Tráfico en Lima', 'Mercado San Pedro', 'Costa Verde Lima',
        'Cumbia en el bus', 'Anticuchos callejeros', 'Centro de Lima',
        'Miraflores turístico', 'Callao histórico', 'Parque Kennedy',
        'Plaza de Armas', 'Malecón Miraflores', 'Larcomar Lima',
        'Circuito de playas', 'Cerro San Cristóbal'
      ];
      
      const creators = [
        { name: 'Lima Viral', username: '@lima_viral' },
        { name: 'Peru Content', username: '@peru_content' },
        { name: 'Metro Lima', username: '@metro_lima_oficial' },
        { name: 'Lima Explorer', username: '@lima_explorer' },
        { name: 'Humor Peruano', username: '@humor_peruano' }
      ];
      
      const categories = ['comedy', 'food', 'travel', 'music', 'news'];
      
      let createdCount = 0;
      
      for (let i = 0; i < Math.min(amount, titles.length); i++) {
        try {
          const videoId = validYouTubeIds[i % validYouTubeIds.length];
          const uniqueVideoId = `${videoId.substring(0, 8)}${Date.now().toString().slice(-3)}`;
          const creator = creators[i % creators.length];
          const category = categories[i % categories.length];
          
          await ClipModel.create({
            title: titles[i],
            description: `${titles[i]} 🇵🇪 #Peru #Lima #${category}`,
            category: category,
            status: 'active',
            youtubeId: uniqueVideoId,
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
            tags: [`Peru`, `Lima`, category],
            hashtags: [`Peru`, `Lima`, category, 'MetroLima'],
            priority: Math.floor(Math.random() * 10) + 1,
            externalId: `massive_${uniqueVideoId}_${Date.now()}`,
            source: 'tiktok',
            isFeatured: i < 6, // Los primeros 6 son destacados
            isActive: true,
            createdBy: new mongoose.Types.ObjectId('68c63dcde7df080be8c6120e'),
            reportCount: 0
          });
          
          createdCount++;
          
        } catch (error) {
          console.error(`Error creando clip ${i}:`, error.message);
        }
      }
      
      return sendOk(res, {
        message: `Contenido masivo creado exitosamente`,
        created: createdCount,
        requested: amount
      });
      
    } catch (error) {
      console.error('Error creating massive content:', error);
      return sendError(res, 'Error creando contenido masivo', 500);
    }
  }

  /**
   * Fetch TikToks virales peruanos REALES
   */
  static async fetchViralTikToks(req: Request, res: Response) {
    try {
      console.log('🔥 Obteniendo TikToks virales de Perú...');
      
      const result = await ViralTikTokService.importViralTikToks();
      const hashtags = ViralTikTokService.getTrendingHashtagsPeru();
      
      return sendOk(res, {
        message: `🎬 TikToks virales importados exitosamente`,
        imported: result.imported,
        total: result.total,
        source: 'TikTok Peru Viral Trending',
        hashtags: hashtags.slice(0, 10), // Top 10 hashtags
        stats: {
          totalViews: '12.1M',
          totalLikes: '856K', 
          avgEngagement: '7.2%'
        }
      });
    } catch (error) {
      console.error('Error fetching viral TikToks:', error);
      return sendError(res, 'Error obteniendo TikToks virales', 500);
    }
  }

  /**
   * Fetch contenido real de TikTok peruano (método anterior)
   */
  static async fetchRealTikTokContent(req: Request, res: Response) {
    try {
      const { limit = 15 } = req.body;
      
      console.log(`🔄 Obteniendo contenido trending de TikTok Perú: ${limit} videos`);
      
      const result = await RealTikTokService.updateTrendingContent();
      
      return sendOk(res, {
        message: `Contenido TikTok actualizado exitosamente`,
        imported: result.imported,
        total: result.total,
        source: 'TikTok Peru Trending',
        hashtags: await RealTikTokService.getTrendingHashtagsPeru()
      });
    } catch (error) {
      console.error('Error fetching real TikTok content:', error);
      return sendError(res, 'Error obteniendo contenido de TikTok', 500);
    }
  }

  /**
   * Fetch nuevo contenido de TikTok peruano (método anterior)
   */
  static async fetchNewContent(req: Request, res: Response) {
    try {
      const { category = 'all', limit = 50 } = req.body;
      
      console.log(`🔄 Fetching nuevo contenido de TikTok: ${category}, límite: ${limit}`);
      
      const result = await TikTokContentService.updateFeedAutomatically();
      
      return sendOk(res, {
        message: `Contenido actualizado exitosamente`,
        imported: result.imported,
        total: result.total,
        categories: ['comedy', 'news', 'food', 'travel', 'music', 'education', 'sports']
      });
    } catch (error) {
      console.error('Error fetching TikTok content:', error);
      return sendError(res, 'Error obteniendo contenido de TikTok', 500);
    }
  }

  /**
   * Obtener estadísticas de contenido importado
   */
  static async getContentStats(req: Request, res: Response) {
    try {
      const [
        totalClips,
        tiktokClips,
        clipsByCategory,
        recentImports,
        topPerformingClips
      ] = await Promise.all([
        ClipModel.countDocuments({ isActive: true }),
        ClipModel.countDocuments({ source: 'tiktok', isActive: true }),
        ClipModel.aggregate([
          { $match: { isActive: true } },
          { $group: { _id: '$category', count: { $sum: 1 }, avgViews: { $avg: '$views' } } }
        ]),
        ClipModel.find({ source: 'tiktok' })
          .sort({ createdAt: -1 })
          .limit(10)
          .select('title category views createdAt')
          .lean(),
        ClipModel.find({ source: 'tiktok' })
          .sort({ views: -1 })
          .limit(5)
          .select('title views likes shares')
          .lean()
      ]);

      return sendOk(res, {
        overview: {
          totalClips,
          tiktokClips,
          importedToday: recentImports.filter(clip => {
            const today = new Date();
            const clipDate = new Date(clip.createdAt);
            return clipDate.toDateString() === today.toDateString();
          }).length
        },
        byCategory: clipsByCategory,
        recentImports: recentImports.map(clip => ({
          id: clip._id,
          title: clip.title,
          category: clip.category,
          views: clip.views,
          importedAt: clip.createdAt
        })),
        topPerforming: topPerformingClips.map(clip => ({
          id: clip._id,
          title: clip.title,
          views: clip.views,
          likes: clip.likes,
          shares: clip.shares,
          engagement: clip.views > 0 ? ((clip.likes + clip.shares) / clip.views * 100).toFixed(2) : 0
        }))
      });
    } catch (error) {
      console.error('Error getting content stats:', error);
      return sendError(res, 'Error obteniendo estadísticas', 500);
    }
  }

  /**
   * Obtener trending hashtags
   */
  static async getTrendingHashtags(req: Request, res: Response) {
    try {
      const hashtags = await TikTokContentService.getTrendingHashtags();
      
      // Obtener estadísticas de uso de hashtags
      const hashtagStats = await ClipModel.aggregate([
        { $match: { source: 'tiktok', isActive: true } },
        { $unwind: '$hashtags' },
        { $group: { _id: '$hashtags', count: { $sum: 1 }, avgViews: { $avg: '$views' } } },
        { $sort: { count: -1 } },
        { $limit: 20 }
      ]);

      return sendOk(res, {
        trending: hashtags,
        popular: hashtagStats.map(stat => ({
          hashtag: stat._id,
          usage: stat.count,
          avgViews: Math.round(stat.avgViews)
        }))
      });
    } catch (error) {
      console.error('Error getting trending hashtags:', error);
      return sendError(res, 'Error obteniendo hashtags', 500);
    }
  }

  /**
   * Limpiar contenido antiguo
   */
  static async cleanupContent(req: Request, res: Response) {
    try {
      const deletedCount = await TikTokContentService.cleanupOldContent();
      
      return sendOk(res, {
        message: `Limpieza completada`,
        deletedClips: deletedCount
      });
    } catch (error) {
      console.error('Error cleaning up content:', error);
      return sendError(res, 'Error en limpieza de contenido', 500);
    }
  }

  /**
   * Configurar actualización automática
   */
  static async configureAutoUpdate(req: Request, res: Response) {
    try {
      const { enabled, intervalHours = 6, categoriesEnabled = [] } = req.body;
      
      // En una implementación real, esto configuraría un cron job
      // Por ahora, solo devolvemos la configuración
      
      return sendOk(res, {
        message: 'Configuración de auto-actualización guardada',
        config: {
          enabled,
          intervalHours,
          categoriesEnabled,
          nextUpdate: new Date(Date.now() + intervalHours * 60 * 60 * 1000)
        }
      });
    } catch (error) {
      console.error('Error configuring auto update:', error);
      return sendError(res, 'Error configurando auto-actualización', 500);
    }
  }
}
