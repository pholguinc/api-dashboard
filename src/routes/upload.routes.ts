// TEMPORALMENTE DESHABILITADO - CONFLICTO CON NUEVO SISTEMA DE BANNERS
/*
import { Router } from 'express';
import { auth } from '../middleware/auth';
import { 
  uploadSingle, 
  uploadMultiple, 
  requireAdmin, 
  handleUploadError,
  deleteImageFiles 
} from '../middleware/upload';
import { sendOk, sendCreated, sendError } from '../utils/response';
import { validateParams, objectIdSchema } from '../utils/validation';
import { z } from 'zod';
import fs from 'fs';
import path from 'path';

const router = Router();

// Todas las rutas requieren autenticación y permisos de admin
router.use(auth);
router.use(requireAdmin);

// ========== RUTAS DE SUBIDA ==========

// POST /api/upload/single - Subir imagen individual
router.post('/single', 
  ...uploadSingle('image'),
  async (req, res) => {
    try {
      const processedFile = (req as any).processedFile;
      
      if (!processedFile) {
        return sendError(res, 'No se proporcionó ningún archivo', 400, 'NO_FILE_PROVIDED');
      }

      return sendCreated(res, {
        file: processedFile,
        message: 'Imagen subida exitosamente'
      });
    } catch (error) {
      console.error('Error in single upload:', error);
      return sendError(res, 'Error al subir la imagen', 500, 'UPLOAD_ERROR');
    }
  }
);

// POST /api/upload/multiple - Subir múltiples imágenes
router.post('/multiple', 
  ...uploadMultiple('images', 5),
  async (req, res) => {
    try {
      const processedFiles = (req as any).processedFiles;
      
      if (!processedFiles || processedFiles.length === 0) {
        return sendError(res, 'No se proporcionaron archivos', 400, 'NO_FILES_PROVIDED');
      }

      return sendCreated(res, {
        files: processedFiles,
        count: processedFiles.length,
        message: `${processedFiles.length} imágenes subidas exitosamente`
      });
    } catch (error) {
      console.error('Error in multiple upload:', error);
      return sendError(res, 'Error al subir las imágenes', 500, 'UPLOAD_ERROR');
    }
  }
);

// POST /api/upload/product - Subir imagen para producto
router.post('/product', 
  ...uploadSingle('productImage'),
  async (req, res) => {
    try {
      const processedFile = (req as any).processedFile;
      
      if (!processedFile) {
        return sendError(res, 'No se proporcionó imagen del producto', 400, 'NO_PRODUCT_IMAGE');
      }

      // Aquí podrías actualizar directamente un producto si se proporciona el ID
      const { productId } = req.body;
      if (productId) {
        const { ProductModel } = await import('../models/marketplace.model');
        await ProductModel.findByIdAndUpdate(productId, {
          imageUrl: processedFile.urls.medium // Usar versión mediana como principal
        });
      }

      return sendCreated(res, {
        file: processedFile,
        productId,
        message: 'Imagen del producto subida exitosamente'
      });
    } catch (error) {
      console.error('Error in product image upload:', error);
      return sendError(res, 'Error al subir imagen del producto', 500, 'PRODUCT_UPLOAD_ERROR');
    }
  }
);

// POST /api/upload/banner - Subir imagen para banner
router.post('/banner', 
  ...uploadSingle('bannerImage'),
  async (req, res) => {
    try {
      const processedFile = (req as any).processedFile;
      
      if (!processedFile) {
        return sendError(res, 'No se proporcionó imagen del banner', 400, 'NO_BANNER_IMAGE');
      }

      const { bannerId } = req.body;
      if (bannerId) {
        const { BannerModel } = await import('../models/banner.model');
        await BannerModel.findByIdAndUpdate(bannerId, {
          imageUrl: processedFile.urls.original // Usar versión original para banners
        });
      }

      return sendCreated(res, {
        file: processedFile,
        bannerId,
        message: 'Imagen del banner subida exitosamente'
      });
    } catch (error) {
      console.error('Error in banner image upload:', error);
      return sendError(res, 'Error al subir imagen del banner', 500, 'BANNER_UPLOAD_ERROR');
    }
  }
);

// POST /api/upload/course - Subir imagen para microcurso
router.post('/course', 
  ...uploadSingle('courseImage'),
  async (req, res) => {
    try {
      const processedFile = (req as any).processedFile;
      
      if (!processedFile) {
        return sendError(res, 'No se proporcionó imagen del curso', 400, 'NO_COURSE_IMAGE');
      }

      const { courseId } = req.body;
      if (courseId) {
        const { MicrocourseModel } = await import('../models/microcourse.model');
        await MicrocourseModel.findByIdAndUpdate(courseId, {
          thumbnailUrl: processedFile.urls.medium
        });
      }

      return sendCreated(res, {
        file: processedFile,
        courseId,
        message: 'Imagen del curso subida exitosamente'
      });
    } catch (error) {
      console.error('Error in course image upload:', error);
      return sendError(res, 'Error al subir imagen del curso', 500, 'COURSE_UPLOAD_ERROR');
    }
  }
);

// POST /api/upload/avatar - Subir avatar de usuario
router.post('/avatar', 
  ...uploadSingle('avatar'),
  async (req, res) => {
    try {
      const processedFile = (req as any).processedFile;
      
      if (!processedFile) {
        return sendError(res, 'No se proporcionó imagen de avatar', 400, 'NO_AVATAR_IMAGE');
      }

      const { userId } = req.body;
      if (userId) {
        const { UserModel } = await import('../models/user.model');
        const user = await UserModel.findByIdAndUpdate(userId, {
          avatarUrl: processedFile.urls.medium
        }, { new: true });

        if (!user) {
          return sendError(res, 'Usuario no encontrado', 404, 'USER_NOT_FOUND');
        }
      }

      return sendCreated(res, {
        file: processedFile,
        userId,
        message: 'Avatar subido exitosamente'
      });
    } catch (error) {
      console.error('Error in avatar upload:', error);
      return sendError(res, 'Error al subir avatar', 500, 'AVATAR_UPLOAD_ERROR');
    }
  }
);

// ========== RUTAS DE GESTIÓN ==========

// GET /api/upload/gallery - Obtener galería de imágenes subidas
router.get('/gallery', async (req, res) => {
  try {
    const { page = 1, limit = 20, type = 'all' } = req.query as any;
    
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    
    if (!fs.existsSync(uploadDir)) {
      return sendOk(res, { images: [], total: 0 });
    }

    const files = fs.readdirSync(uploadDir);
    
    // Filtrar solo archivos originales para evitar duplicados
    const originalFiles = files
      .filter(file => file.includes('-original.webp'))
      .map(file => {
        const filename = file.replace('-original.webp', '');
        const stats = fs.statSync(path.join(uploadDir, file));
        
        return {
          filename,
          urls: {
            original: `/uploads/${filename}-original.webp`,
            medium: `/uploads/${filename}-medium.webp`,
            thumbnail: `/uploads/${filename}-thumb.webp`
          },
          size: stats.size,
          uploadedAt: stats.birthtime,
          modifiedAt: stats.mtime
        };
      })
      .sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime());

    const skip = (page - 1) * limit;
    const paginatedFiles = originalFiles.slice(skip, skip + limit);

    return sendOk(res, {
      images: paginatedFiles,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: originalFiles.length,
        totalPages: Math.ceil(originalFiles.length / limit)
      }
    });
  } catch (error) {
    console.error('Error in gallery:', error);
    return sendError(res, 'Error al obtener galería', 500, 'GALLERY_ERROR');
  }
});

// DELETE /api/upload/:filename - Eliminar imagen
router.delete('/:filename',
  validateParams(z.object({ filename: z.string().min(1) })),
  async (req, res) => {
    try {
      const { filename } = req.params;
      
      const uploadDir = path.join(process.cwd(), 'public', 'uploads');
      const originalFile = path.join(uploadDir, `${filename}-original.webp`);
      
      if (!fs.existsSync(originalFile)) {
        return sendError(res, 'Imagen no encontrada', 404, 'IMAGE_NOT_FOUND');
      }

      // Eliminar todas las versiones del archivo
      deleteImageFiles(filename);

      return sendOk(res, { 
        filename,
        message: 'Imagen eliminada exitosamente' 
      });
    } catch (error) {
      console.error('Error in delete image:', error);
      return sendError(res, 'Error al eliminar imagen', 500, 'DELETE_ERROR');
    }
  }
);

// GET /api/upload/stats - Obtener estadísticas de imágenes
router.get('/stats', async (req, res) => {
  try {
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    
    if (!fs.existsSync(uploadDir)) {
      return sendOk(res, {
        totalImages: 0,
        totalSize: 0,
        storageUsed: '0 MB'
      });
    }

    const files = fs.readdirSync(uploadDir);
    const originalFiles = files.filter(file => file.includes('-original.webp'));
    
    let totalSize = 0;
    for (const file of files) {
      const stats = fs.statSync(path.join(uploadDir, file));
      totalSize += stats.size;
    }

    const storageUsedMB = (totalSize / (1024 * 1024)).toFixed(2);

    return sendOk(res, {
      totalImages: originalFiles.length,
      totalFiles: files.length, // Incluye todas las versiones
      totalSize,
      storageUsed: `${storageUsedMB} MB`,
      averageSize: originalFiles.length > 0 ? Math.round(totalSize / files.length) : 0
    });
  } catch (error) {
    console.error('Error in upload stats:', error);
    return sendError(res, 'Error al obtener estadísticas', 500, 'STATS_ERROR');
  }
});

// Middleware de manejo de errores
router.use(handleUploadError);

export default router;
*/

// EXPORTAR ROUTER VACÍO TEMPORALMENTE
import { Router } from 'express';
const router = Router();
export default router;