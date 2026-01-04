import { Router } from 'express';
import { MicrosegurosController } from '../controllers/microseguros.controller';
import { authenticateJwt, requireRole } from '../middleware/auth';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = Router();

// Crear carpeta si no existe
const uploadDir = 'uploads/microseguros';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configuración de multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Solo se permiten imágenes (jpeg, jpg, png) o PDF'));
  }
});

// ============================================
// RUTAS PÚBLICAS (sin autenticación)
// ============================================

// ============================================
// RUTAS AUTENTICADAS
// ============================================
router.use(authenticateJwt);

// Upload de archivos
router.post('/upload', upload.single('file'), MicrosegurosController.uploadFile);

// Obtener microseguros disponibles (usuarios)
router.get('/', MicrosegurosController.getMicroseguros);

// Contratar microseguro
router.post('/contract', MicrosegurosController.contractInsurance);

// Obtener contratos del usuario
router.get('/my-contracts', MicrosegurosController.getUserContracts);

// Cancelar contrato
router.patch('/contracts/:contractId/cancel', MicrosegurosController.cancelContract);

// Crear reclamo
router.post('/claims', MicrosegurosController.createClaim);

// Obtener reclamos del usuario
router.get('/my-claims', MicrosegurosController.getUserClaims);

// ============================================
// RUTAS DE ADMINISTRACIÓN
// ============================================
router.use(requireRole(['admin', 'moderator']));

// ⚠️ IMPORTANTE: Las rutas específicas ANTES de las genéricas
router.get('/admin/all', MicrosegurosController.getAllMicroseguros);
router.get('/admin/stats', MicrosegurosController.getStats);
router.get('/admin/claims', MicrosegurosController.getAllClaims);
router.patch('/admin/claims/:claimId/process', MicrosegurosController.processClaim);

// CRUD de microseguros (Admin)
router.post('/', MicrosegurosController.createMicroseguro);
router.put('/:id', MicrosegurosController.updateMicroseguro);
router.delete('/:id', MicrosegurosController.deleteMicroseguro);
router.patch('/:id/status', MicrosegurosController.toggleStatus);

export default router;