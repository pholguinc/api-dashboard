import { Router } from 'express';
import { PremiumController } from '../controllers/premium.controller';
import { authenticateJwt, requireRole } from '../middleware/auth';
import { validateBody, validateParams } from '../utils/validation';
import { z } from 'zod';

const router = Router();

// Rutas públicas

router.get('/plans', PremiumController.getPlans);

router.get('/payment-numbers', PremiumController.getPaymentNumbers);

// Rutas autenticadas
router.use(authenticateJwt);

// Gestión de suscripciones del usuario

router.get('/my-subscription', PremiumController.getUserSubscription);

router.post('/subscribe', 
  validateBody(z.object({
    plan: z.enum(['monthly', 'quarterly', 'yearly']),
    paymentMethod: z.enum(['yape', 'plin'])
  })),
  PremiumController.createSubscription
);

router.post('/confirm-payment',
  validateBody(z.object({
    subscriptionId: z.string(),
    paymentReference: z.string().min(1, 'Referencia de pago requerida'),
    paymentProof: z.string().url('URL de comprobante inválida')
  })),
  PremiumController.confirmPayment
);

router.post('/cancel',
  validateBody(z.object({
    reason: z.string().optional()
  })),
  PremiumController.cancelSubscription
);

// Rutas de administración

router.post('/admin/activate/:userId',
  requireRole(['admin']),
  validateParams(z.object({
    userId: z.string()
  })),
  validateBody(z.object({
    plan: z.enum(['monthly', 'quarterly', 'yearly']).default('monthly'),
    duration: z.number().min(1).max(12).default(1)
  })),
  PremiumController.activatePremiumByAdmin
);

router.get('/admin/stats',
  requireRole(['admin', 'moderator']),
  PremiumController.getPremiumStats
);

router.get('/admin/all',
  requireRole(['admin', 'moderator']),
  PremiumController.getAllSubscriptions
);

router.post('/admin/approve/:subscriptionId',
  requireRole(['admin']),
  PremiumController.approvePayment
);

router.post('/admin/reject/:subscriptionId',
  requireRole(['admin']),
  PremiumController.rejectPayment
);

router.get('/admin/payment-config',
  requireRole(['admin']),
  PremiumController.getPaymentConfig
);

router.put('/admin/payment-config',
  requireRole(['admin']),
  PremiumController.updatePaymentConfig
);

export default router;