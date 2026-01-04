import { Router } from 'express';
import { VotoSeguroController } from '../controllers/voto-seguro.controller';
import { authenticateJwt, requireRole } from '../middleware/auth';

const router = Router();

// Rutas públicas

/**
 * @swagger
 * /api/voto-seguro/parties:
 *   get:
 *     tags: [Sistema]
 *     summary: GET /parties
 *     description: Endpoint GET para /parties
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
router.get('/parties', VotoSeguroController.getPoliticalParties);

/**
 * @swagger
 * /parties/:partyId:
 *   get:
 *     tags: [Sistema]
 *     summary: GET /parties/:partyId
 *     description: Endpoint GET para /parties/:partyId
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
router.get('/parties/:partyId', VotoSeguroController.getPoliticalPartyDetails);

/**
 * @swagger
 * /candidates:
 *   get:
 *     tags: [Sistema]
 *     summary: GET /candidates
 *     description: Endpoint GET para /candidates
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
router.get('/candidates', VotoSeguroController.getCandidates);

/**
 * @swagger
 * /candidates/:candidateId:
 *   get:
 *     tags: [Sistema]
 *     summary: GET /candidates/:candidateId
 *     description: Endpoint GET para /candidates/:candidateId
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
router.get('/candidates/:candidateId', VotoSeguroController.getCandidateDetails);

/**
 * @swagger
 * /candidates/position/:position:
 *   get:
 *     tags: [Sistema]
 *     summary: GET /candidates/position/:position
 *     description: Endpoint GET para /candidates/position/:position
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
router.get('/candidates/position/:position', VotoSeguroController.getCandidatesByPosition);

/**
 * @swagger
 * /api/voto-seguro/search:
 *   get:
 *     tags: [Sistema]
 *     summary: GET /search
 *     description: Endpoint GET para /search
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
router.get('/search', VotoSeguroController.searchPolitical);

/**
 * @swagger
 * /api/voto-seguro/stats:
 *   get:
 *     tags: [Sistema]
 *     summary: GET /stats
 *     description: Endpoint GET para /stats
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
router.get('/stats', VotoSeguroController.getVotoSeguroStats);

// Rutas autenticadas
router.use(authenticateJwt);

// Interacciones de usuarios

/**
 * @swagger
 * /candidates/:candidateId/like:
 *   post:
 *     tags: [Sistema]
 *     summary: POST /candidates/:candidateId/like
 *     description: Endpoint POST para /candidates/:candidateId/like
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
router.post('/candidates/:candidateId/like', VotoSeguroController.likeCandidateProposal);

/**
 * @swagger
 * /candidates/:candidateId/share:
 *   post:
 *     tags: [Sistema]
 *     summary: POST /candidates/:candidateId/share
 *     description: Endpoint POST para /candidates/:candidateId/share
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
router.post('/candidates/:candidateId/share', VotoSeguroController.shareCandidate);

// Rutas de administración
router.use(requireRole(['admin', 'moderator']));

// Crear candidato (Admin)

/**
 * @swagger
 * /admin/candidates:
 *   post:
 *     tags: [Admin - Seguridad]
 *     summary: POST /admin/candidates
 *     description: Endpoint POST para /admin/candidates
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
router.post('/admin/candidates', VotoSeguroController.createCandidate);
// Actualizar candidato (Admin)

/**
 * @swagger
 * /admin/candidates/:candidateId:
 *   put:
 *     tags: [Admin - Seguridad]
 *     summary: PUT /admin/candidates/:candidateId
 *     description: Endpoint PUT para /admin/candidates/:candidateId
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
router.put('/admin/candidates/:candidateId', VotoSeguroController.updateCandidate);
// Eliminar candidato (Admin)

/**
 * @swagger
 * /admin/candidates/:candidateId:
 *   delete:
 *     tags: [Admin - Seguridad]
 *     summary: DELETE /admin/candidates/:candidateId
 *     description: Endpoint DELETE para /admin/candidates/:candidateId
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
router.delete('/admin/candidates/:candidateId', VotoSeguroController.deleteCandidate);

// Crear partido político (Admin)

/**
 * @swagger
 * /admin/parties:
 *   post:
 *     tags: [Admin - Seguridad]
 *     summary: POST /admin/parties
 *     description: Endpoint POST para /admin/parties
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
router.post('/admin/parties', VotoSeguroController.createPoliticalParty);
// Actualizar partido (Admin)

/**
 * @swagger
 * /admin/parties/:partyId:
 *   put:
 *     tags: [Admin - Seguridad]
 *     summary: PUT /admin/parties/:partyId
 *     description: Endpoint PUT para /admin/parties/:partyId
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
router.put('/admin/parties/:partyId', VotoSeguroController.updatePoliticalParty);
// Eliminar partido (Admin)

/**
 * @swagger
 * /admin/parties/:partyId:
 *   delete:
 *     tags: [Admin - Seguridad]
 *     summary: DELETE /admin/parties/:partyId
 *     description: Endpoint DELETE para /admin/parties/:partyId
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
router.delete('/admin/parties/:partyId', VotoSeguroController.deletePoliticalParty);

// Import CSV

/**
 * @swagger
 * /admin/candidates/import:
 *   post:
 *     tags: [Admin - Seguridad]
 *     summary: POST /admin/candidates/import
 *     description: Endpoint POST para /admin/candidates/import
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
router.post('/admin/candidates/import', VotoSeguroController.importCandidatesCsv);

/**
 * @swagger
 * /admin/parties/import:
 *   post:
 *     tags: [Admin - Seguridad]
 *     summary: POST /admin/parties/import
 *     description: Endpoint POST para /admin/parties/import
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
router.post('/admin/parties/import', VotoSeguroController.importPartiesCsv);

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
