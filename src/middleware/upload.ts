import multer from 'multer';
import path from 'path';
import fs from 'fs';
import sharp from 'sharp';
import { JobModel, ProductModel } from '../models';

// Crear directorio de uploads en la raíz del proyecto (coincide con app.use('/uploads', ...))
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Dimensiones estándar para banners
const BANNER_SIZES = {
  mobile: { width: 375, height: 120 },      // Para móviles
  tablet: { width: 768, height: 200 },      // Para tablets
  desktop: { width: 1200, height: 300 },    // Para escritorio
  square: { width: 400, height: 400 },      // Formato cuadrado
  wide: { width: 800, height: 200 },        // Formato ancho
} as const;

// Configuración de almacenamiento
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Generar nombre único: timestamp + extensión original
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    cb(null, `banner-${uniqueSuffix}${extension}`);
  }
});

// Filtro para tipos de archivo permitidos
const fileFilter = (req: any, file: any, cb: any) => {
  const allowedTypes = [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/gif',
    'image/webp'
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Tipo de archivo no permitido. Solo JPEG, PNG, GIF, WebP'), false);
  }
};

// Filtro para anuncios (imágenes, videos y audio)
const adFileFilter = (req: any, file: any, cb: any) => {
  const allowedTypes = [
    // Imágenes
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/gif',
    'image/webp',
    // Videos
    'video/mp4',
    'video/webm',
    'video/quicktime',
    'video/x-msvideo', // .avi
    // Audio
    'audio/mpeg', // .mp3
    'audio/wav',
    'audio/ogg',
    'audio/mp4', // .m4a
    'audio/webm'
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Tipo de archivo no permitido. Solo imágenes (JPEG, PNG, GIF, WebP), videos (MP4, WebM, MOV, AVI) o audio (MP3, WAV, OGG)'), false);
  }
};

// Configuración de multer
export const uploadBanner = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB máximo
  }
}).single('banner'); // Campo 'banner' en el formulario

// Middleware para manejar errores de multer
export const handleUploadError = (err: any, req: any, res: any, next: any) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Archivo demasiado grande. Máximo 10MB.',
          code: 'FILE_TOO_LARGE'
        }
      });
    }
  }
  
  if (err && err.message && err.message.includes('Tipo de archivo no permitido')) {
    return res.status(400).json({
      success: false,
      error: {
        message: err.message,
        code: 'INVALID_FILE_TYPE'
      }
    });
  }
  
  next(err);
};

// Función para redimensionar imagen automáticamente
export async function resizeBannerImage(
  inputPath: string, 
  outputBaseName: string,
  targetSize: 'mobile' | 'tablet' | 'desktop' | 'square' | 'wide' = 'mobile'
): Promise<string[]> {
  const generatedFiles: string[] = [];
  
  try {
    const size = BANNER_SIZES[targetSize];
    
    // Generar imagen optimizada para el tamaño específico
    const outputPath = path.join(uploadsDir, `${outputBaseName}-${targetSize}.webp`);
    
    await sharp(inputPath)
      .resize(size.width, size.height, {
        fit: 'cover',           // Mantener proporción, recortar si es necesario
        position: 'center',     // Centrar el recorte
        background: '#ffffff'   // Fondo blanco si hay transparencia
      })
      .webp({ 
        quality: 85,           // Calidad alta pero optimizada
        effort: 6              // Máxima compresión
      })
      .toFile(outputPath);
    
    generatedFiles.push(path.basename(outputPath));
    console.log(`✅ Banner redimensionado: ${targetSize} (${size.width}x${size.height})`);
    
    return generatedFiles;
  } catch (error) {
    console.error('❌ Error redimensionando banner:', error);
    throw error;
  }
}

// Función para generar todos los tamaños de banner
export async function generateAllBannerSizes(inputPath: string, baseName: string): Promise<{
  mobile: string;
  tablet: string;
  desktop: string;
  square: string;
  wide: string;
  original: string;
}> {
  const results = {
    original: path.basename(inputPath),
    mobile: '',
    tablet: '',
    desktop: '',
    square: '',
    wide: ''
  };
  
  try {
    // Generar cada tamaño
    for (const [sizeName, dimensions] of Object.entries(BANNER_SIZES)) {
      const outputPath = path.join(uploadsDir, `${baseName}-${sizeName}.webp`);
      
      await sharp(inputPath)
        .resize(dimensions.width, dimensions.height, {
          fit: 'cover',
          position: 'center',
          background: '#ffffff'
        })
        .webp({ quality: 85, effort: 6 })
        .toFile(outputPath);
      
      results[sizeName as keyof typeof results] = path.basename(outputPath);
      console.log(`✅ Generado ${sizeName}: ${dimensions.width}x${dimensions.height}`);
    }
    
    return results;
  } catch (error) {
    console.error('❌ Error generando tamaños de banner:', error);
    throw error;
  }
}

// Middleware configurable para subir imágenes
export const uploadImage = (fieldName: string, destination: string = 'uploads') => {
  const fullPath = path.join(uploadsDir, destination);
  
  // Crear directorio si no existe
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
  }

  return [
    // Upload middleware
    (req: any, res: any, next: any) => {
      const upload = multer({
        storage: multer.diskStorage({
          destination: (req, file, cb) => {
            cb(null, fullPath);
          },
          filename: (req, file, cb) => {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            const extension = path.extname(file.originalname);
            cb(null, `${fieldName}-${uniqueSuffix}${extension}`);
          }
        }),
        fileFilter: fileFilter,
        limits: { fileSize: 10 * 1024 * 1024 }
      }).single(fieldName);
      
      upload(req, res, (err) => handleUploadError(err, req, res, next));
    },
    
    // Procesar imagen automáticamente
    (req: any, res: any, next: any) => {
      if (req.file) {
        // Guardar la URL de la nueva imagen
        req.body[fieldName] = `/uploads/${destination}/${req.file.filename}`;
      }
      next();
    }
  ];
};

// Función separada para limpiar imagen anterior (se llama desde el controller)
export const deleteOldImage = async (imageUrl: string) => {
  if (!imageUrl) return;
  
  try {
    const oldImagePath = path.join(uploadsDir, imageUrl.replace('/uploads/', ''));
    if (fs.existsSync(oldImagePath)) {
      fs.unlinkSync(oldImagePath);
      console.log(`🗑️ Imagen anterior eliminada: ${oldImagePath}`);
    }
  } catch (error) {
    console.error('Error eliminando imagen anterior:', error);
  }
};

// ========== MIDDLEWARE PARA ANUNCIOS ==========

// Configuración de almacenamiento para anuncios
const adStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const adUploadsDir = path.join(uploadsDir, 'ads');
    if (!fs.existsSync(adUploadsDir)) {
      fs.mkdirSync(adUploadsDir, { recursive: true });
    }
    cb(null, adUploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    const isVideo = file.mimetype.startsWith('video/');
    const prefix = isVideo ? 'ad-video' : 'ad-image';
    cb(null, `${prefix}-${uniqueSuffix}${extension}`);
  }
});

// Middleware para subir archivos de anuncios (imágenes y videos)
export const uploadAdFile = multer({
  storage: adStorage,
  fileFilter: adFileFilter,
  limits: { 
    fileSize: 50 * 1024 * 1024 // 50MB para videos
  }
}).single('file');

// Middleware de manejo de errores para anuncios
export const handleAdUploadError = (err: any, req: any, res: any, next: any) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        data: null,
        error: {
          message: 'El archivo es muy grande. Máximo 50MB permitido.',
          code: 'FILE_TOO_LARGE'
        }
      });
    }
    
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        data: null,
        error: {
          message: 'Campo de archivo inesperado.',
          code: 'UNEXPECTED_FIELD'
        }
      });
    }
  }
  
  if (err) {
    return res.status(400).json({
      success: false,
      data: null,
      error: {
        message: err.message || 'Error al subir archivo',
        code: 'UPLOAD_ERROR'
      }
    });
  }
  
  next();
};