import { Router } from 'express';
import path from 'path';
import fs from 'fs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';

const router = Router();

function verifyToken(streamKey: string, token?: string): boolean {
  if (!token) return false;
  try {
    const payload = jwt.verify(token, env.streaming.jwtSecret) as any;
    return payload.streamKey === streamKey;
  } catch (_e) {
    return false;
  }
}

function safeJoin(base: string, target: string): string | null {
  const resolved = path.resolve(base, target);
  if (!resolved.startsWith(path.resolve(base))) return null;
  return resolved;
}

// GET /secure-hls/:streamKey/index.m3u8

/**
 * @swagger
 * /secure-hls/{streamKey}/index.m3u8:
 *   get:
 *     tags: [Streaming]
 *     summary: GET /:streamKey/index.m3u8
 *     description: Endpoint GET para /:streamKey/index.m3u8
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Operación exitosa
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: Error en la validación
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: No autorizado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/:streamKey/index.m3u8', (req, res) => {
  const { streamKey } = req.params as any;
  const token = (req.query.token || req.query.t) as string | undefined;
  if (!verifyToken(streamKey, token)) return res.status(403).send('invalid');
  const baseDir = path.join(process.cwd(), 'media', 'live', streamKey);
  const filePath = safeJoin(baseDir, 'index.m3u8');
  if (!filePath || !fs.existsSync(filePath)) return res.status(404).send('not found');
  res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
  return fs.createReadStream(filePath).pipe(res);
});

// GET /secure-hls/:streamKey/:file (variants and segments)

/**
 * @swagger
 * /secure-hls/{streamKey}/{file}:
 *   get:
 *     tags: [Streaming]
 *     summary: GET /:streamKey/:file
 *     description: Endpoint GET para /:streamKey/:file
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Operación exitosa
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: Error en la validación
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: No autorizado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/:streamKey/:file', (req, res) => {
  const { streamKey, file } = req.params as any;
  const token = (req.query.token || req.query.t) as string | undefined;
  if (!verifyToken(streamKey, token)) return res.status(403).send('invalid');
  const baseDir = path.join(process.cwd(), 'media', 'live', streamKey);
  const filePath = safeJoin(baseDir, file);
  if (!filePath || !fs.existsSync(filePath)) return res.status(404).send('not found');
  if (file.endsWith('.m3u8')) res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
  else if (file.endsWith('.ts')) res.setHeader('Content-Type', 'video/mp2t');
  return fs.createReadStream(filePath).pipe(res);
});

export default router;
/**
 * @swagger
 * components:
 *   schemas:
 *     GeneralResponse:
 *       allOf:
 *         - $ref: '#/components/schemas/SuccessResponse'
 *         - type: object
 *           properties:
 *             data:
 *               type: object
 *               description: Datos específicos del endpoint
 */


