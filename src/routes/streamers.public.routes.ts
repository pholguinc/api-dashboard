import { Router } from 'express';
import { z } from 'zod';
import { validateBody, objectIdSchema } from '../utils/validation';
import { applyForStreamer } from '../controllers/streamers.application.controller';

const router = Router();

// Schema Zod del payload
const socialLinksSchema = z.object({
  twitter: z.string().max(100).optional(),
  instagram: z.string().max(100).optional(),
  youtube: z.string().max(100).optional(),
  tiktok: z.string().max(100).optional()
}).optional();

const categoryEnum = z.enum(['irl', 'gaming', 'music', 'art', 'food', 'tech', 'dance', 'freestyle', 'event']).optional();

export const applyStreamerSchema = z.object({
  userId: objectIdSchema,
  email: z.string().email('Formato de email inválido'),
  username: z.string().min(3).max(30),
  displayName: z.string().min(1).max(100).optional(),
  bio: z.string().max(500).optional(),
  category: categoryEnum,
  socialLinks: socialLinksSchema
});

router.post('/apply', validateBody(applyStreamerSchema), applyForStreamer);

export default router;




