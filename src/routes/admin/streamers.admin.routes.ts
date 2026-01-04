import { Router } from 'express';
import { auth, requireRole } from '../../middleware/auth';
import * as Ctrl from '../../controllers/admin/streamers.admin.controller';

const router = Router();

router.use(auth, requireRole(['admin']));

router.get('/all', Ctrl.listStreamers);

router.get('/sessions', Ctrl.getStreamSessions);

router.get('/search-users', Ctrl.searchUsers);

router.get('/applications', Ctrl.listApplications);

router.get('/stats', Ctrl.getStats);

router.get('/active-streams', Ctrl.getActiveStreams);

router.post('/', Ctrl.createStreamer);

router.put('/:userId/status', Ctrl.updateStatus);

router.put('/:streamerId/verify', Ctrl.verifyStreamer);

router.put('/:streamerId/toggle-verification', Ctrl.toggleVerification);

router.get('/:streamerId', Ctrl.getStreamer);

router.put('/:streamerId', Ctrl.updateStreamer);

router.delete('/:streamerId', Ctrl.deleteStreamer);

router.put('/:streamerId/change-status', Ctrl.changeStreamerStatus);

export default router;