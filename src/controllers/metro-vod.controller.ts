import { Request, Response } from 'express';
import { MetroLiveStreamModel } from '../models/metro-live.model';
import { sendError, sendOk } from '../utils/response';

export async function deleteVOD(req: Request, res: Response) {
  try {
    const { streamId } = req.params as any;
    const user = (req as any).user;

    const vod = await MetroLiveStreamModel.findById(streamId);
    if (!vod || !vod.isRecorded || !vod.recordingUrl) {
      return sendError(res, 'VOD no encontrado', 404, 'VOD_NOT_FOUND');
    }

    const isOwner = vod.streamerId.toString() === user.id;
    const isAdmin = user.role === 'admin';
    if (!isOwner && !isAdmin) {
      return sendError(res, 'No autorizado', 403, 'FORBIDDEN');
    }

    // Eliminar del almacenamiento si aplica
    const isS3 = process.env.AWS_ENABLED === 'true' && process.env.AWS_S3_BUCKET;
    try {
      if (vod.recordingUrl) {
        if (isS3) {
          // Lazy import to avoid bundling aws when disabled
          const AWS = (await import('aws-sdk')).default as any;
          const s3 = new AWS.S3({
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            region: process.env.AWS_REGION || 'us-east-1'
          });
          const bucket = process.env.AWS_S3_BUCKET as string;
          const url = new URL(vod.recordingUrl);
          const key = url.pathname.replace(/^\//, '');
          await s3.deleteObject({ Bucket: bucket, Key: key }).promise();
        } else {
          // If local path mapping exists, attempt best-effort delete
          // Not critical: the processRecording deletes local temp file already
        }
      }
    } catch (e) {
      console.warn('No se pudo eliminar el archivo físico del VOD:', (e as any)?.message || e);
    }

    await MetroLiveStreamModel.findByIdAndUpdate(streamId, {
      $set: {
        recordingUrl: null,
        thumbnailUrl: null,
        isRecorded: false,
        recordingSize: 0
      }
    });

    return sendOk(res, { message: 'VOD eliminado' });
  } catch (error) {
    console.error('Error deleting VOD:', error);
    return sendError(res, 'Error al eliminar VOD', 500, 'VOD_DELETE_ERROR');
  }
}
