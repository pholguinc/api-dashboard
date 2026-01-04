import { Router } from 'express';
import { RadioAiController } from '../../controllers/radio-ai/radio.ia.controller';
import { auth, requireRole } from '../../middleware/auth';

const router = Router();
const radioAiController = new RadioAiController();

// ========== RUTAS PÚBLICAS/USUARIO ==========
router.post('/generate-music', auth, radioAiController.generateMusicByEmotion as any);
router.get('/get-music-by-user', auth, radioAiController.getMusicByUser as any);
router.get('/get-all-music', auth, radioAiController.getAllMusic as any);
router.get('/get-music-by-emotion/:emotion', auth, radioAiController.getMusicByEmotion as any);
router.get('/get-music-by-id/:id', auth, radioAiController.getMusicById as any);
router.post('/webhook', radioAiController.handleWebhook as any);

// ========== RUTAS ADMIN ==========
router.get('/admin/music', auth, requireRole(['admin', 'moderator']), radioAiController.getAdminMusic as any);
router.get('/admin/music/stats', auth, requireRole(['admin', 'moderator']), radioAiController.getAdminStats as any);
router.put('/admin/music/:id', auth, requireRole(['admin']), radioAiController.updateMusic as any);
router.patch('/admin/music/:id/toggle', auth, requireRole(['admin']), radioAiController.toggleMusicStatus as any);
router.delete('/admin/music/:id', auth, requireRole(['admin']), radioAiController.deleteMusic as any);

export default router;