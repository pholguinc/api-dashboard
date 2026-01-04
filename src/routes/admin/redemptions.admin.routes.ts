import { Router } from 'express';
import { auth, requireRole } from '../../middleware/auth';
import * as Ctrl from '../../controllers/admin/redemptions.admin.controller';

const router = Router();
router.use(auth, requireRole(['admin', 'staff']));

router.post('/confirm-by-code', Ctrl.confirmByCode);

router.post('/mark-delivered-by-code', Ctrl.markDeliveredByCode);

router.get('/stats', Ctrl.getStats);

router.get('/export', Ctrl.exportCsv);

export default router;


