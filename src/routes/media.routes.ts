import { Router } from 'express';
import { MediaController } from '../controllers/media.controller';
import { authenticateJwt } from '../middleware/auth';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = Router();

// Configuración de multer temporal para procesamiento
const tempDir = path.join(__dirname, '../../uploads/temp');
if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, tempDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, `temp-video-${uniqueSuffix}${path.extname(file.originalname)}`);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 100 * 1024 * 1024 } // 100MB límite para info
});

/**
 * @swagger
 * /api/media/info:
 *   post:
 *     tags: [Media]
 *     summary: Obtener información técnica de un video
 *     description: Sube un video y extrae su metadata (duración, resolución, etc.) utilizando ffmpeg/ffprobe. El archivo es procesado temporalmente y eliminado después de extraer la info. Este endpoint es público.
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               video:
 *                 type: string
 *                 format: binary
 *                 description: Archivo de video a analizar
 *     responses:
 *       200:
 *         description: Información del video obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/VideoMediaInfo'
 *       400:
 *         description: Error en el archivo o procesamiento
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/info', upload.single('video'), MediaController.getVideoInfo);

export default router;

/**
 * @swagger
 * components:
 *   schemas:
 *     VideoMediaInfo:
 *       type: object
 *       properties:
 *         filename:
 *           type: string
 *           example: "vacaciones.mp4"
 *         size:
 *           type: number
 *           description: Tamaño en bytes
 *           example: 10485760
 *         duration:
 *           type: number
 *           description: Duración en segundos
 *           example: 60.5
 *         bitrate:
 *           type: number
 *           example: 2500000
 *         format:
 *           type: string
 *           example: "mov,mp4,m4a,3gp,3g2,mj2"
 *         video:
 *           type: object
 *           nullable: true
 *           properties:
 *             codec:
 *               type: string
 *               example: "h264"
 *             width:
 *               type: number
 *               example: 1920
 *             height:
 *               type: number
 *               example: 1080
 *             aspectRatio:
 *               type: string
 *               example: "16:9"
 *             fps:
 *               type: string
 *               example: "30/1"
 *             bitrate:
 *               type: number
 *               example: 2000000
 *         audio:
 *           type: object
 *           nullable: true
 *           properties:
 *             codec:
 *               type: string
 *               example: "aac"
 *             channels:
 *               type: number
 *               example: 2
 *             sampleRate:
 *               type: number
 *               example: 44100
 *             bitrate:
 *               type: number
 *               example: 128000
 */
