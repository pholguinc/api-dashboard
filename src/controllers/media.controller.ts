import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { sendOk, sendError } from '../utils/response';
import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs';
import path from 'path';

export class MediaController {
    private static ffmpegFound = false;

    /**
     * Asegura que los paths de ffmpeg y ffprobe estén configurados
     */
    private static setupFfmpeg() {
        if (this.ffmpegFound) return;

        const commonPaths = [
            '/opt/homebrew/bin/',
            '/usr/local/bin/',
            '/usr/bin/'
        ];

        // Buscar ffprobe
        let ffprobePath = 'ffprobe';
        for (const p of commonPaths) {
            if (fs.existsSync(path.join(p, 'ffprobe'))) {
                ffprobePath = path.join(p, 'ffprobe');
                break;
            }
        }

        // Buscar ffmpeg (aunque ffprobe es lo principal aquí)
        let ffmpegPath = 'ffmpeg';
        for (const p of commonPaths) {
            if (fs.existsSync(path.join(p, 'ffmpeg'))) {
                ffmpegPath = path.join(p, 'ffmpeg');
                break;
            }
        }

        ffmpeg.setFfmpegPath(ffmpegPath);
        ffmpeg.setFfprobePath(ffprobePath);
        MediaController.ffmpegFound = true;
    }

    /**
     * Obtiene la información técnica de un video subido
     */
    static async getVideoInfo(req: AuthenticatedRequest, res: Response) {
        try {
            MediaController.setupFfmpeg();
            const file = req.file;

            if (!file) {
                return sendError(res, 'No se proporcionó ningún archivo de video', 400, 'NO_VIDEO_PROVIDED');
            }

            const filePath = file.path;

            // Usar ffprobe para obtener la metadata
            ffmpeg.ffprobe(filePath, (err, metadata) => {
                // Eliminar el archivo temporal después de procesarlo (o dejar que multer/otro middleware lo maneje)
                // En este caso, lo eliminamos si no lo vamos a guardar permanentemente
                try {
                    if (fs.existsSync(filePath)) {
                        fs.unlinkSync(filePath);
                    }
                } catch (cleanupErr) {
                    console.error('Error limpiando archivo temporal:', cleanupErr);
                }

                if (err) {
                    console.error('Error en ffprobe:', err);
                    return sendError(res, 'Error al procesar el video. Asegúrate de que sea un formato válido.', 400, 'FFPROBE_ERROR');
                }

                const format = metadata.format;
                const videoStream = metadata.streams.find(s => s.codec_type === 'video');
                const audioStream = metadata.streams.find(s => s.codec_type === 'audio');

                const videoInfo = {
                    filename: file.originalname,
                    size: format.size,
                    duration: format.duration,
                    bitrate: format.bit_rate,
                    format: format.format_name,
                    video: videoStream ? {
                        codec: videoStream.codec_name,
                        width: videoStream.width,
                        height: videoStream.height,
                        aspectRatio: videoStream.display_aspect_ratio,
                        fps: videoStream.avg_frame_rate,
                        bitrate: videoStream.bit_rate
                    } : null,
                    audio: audioStream ? {
                        codec: audioStream.codec_name,
                        channels: audioStream.channels,
                        sampleRate: audioStream.sample_rate,
                        bitrate: audioStream.bit_rate
                    } : null,
                    raw: metadata // Opcional: incluir toda la info si se necesita algo muy específico
                };

                return sendOk(res, videoInfo);
            });
        } catch (error) {
            console.error('Error en getVideoInfo:', error);
            return sendError(res, 'Error interno al obtener info del video', 500);
        }
    }
}
