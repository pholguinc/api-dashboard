import { Router } from 'express';
import { requestOtp, verifyOtp, setPin, loginPin, googleSignIn } from '../controllers/auth_phone.controller';
import { 
  validateBody,
  requestOtpSchema,
  verifyOtpSchema,
  setPinSchema,
  loginPinSchema,
  googleSignInSchema
} from '../utils/validation';
import { sendOk } from '../utils/response';
import { env } from '../config/env';

const router = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     RequestOtpRequest:
 *       type: object
 *       required:
 *         - phone
 *       properties:
 *         phone:
 *           type: string
 *           example: "+51987654321"
 *           description: Número de teléfono en formato internacional
 *     
 *     RequestOtpResponse:
 *       allOf:
 *         - $ref: '#/components/schemas/SuccessResponse'
 *         - type: object
 *           properties:
 *             data:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "sent"
 *                 message:
 *                   type: string
 *                   example: "Código OTP enviado exitosamente"
 *     
 *     VerifyOtpRequest:
 *       type: object
 *       required:
 *         - phone
 *         - code
 *       properties:
 *         phone:
 *           type: string
 *           example: "+51987654321"
 *         code:
 *           type: string
 *           example: "123456"
 *           description: Código OTP de 6 dígitos
 *     
 *     VerifyOtpResponse:
 *       allOf:
 *         - $ref: '#/components/schemas/SuccessResponse'
 *         - type: object
 *           properties:
 *             data:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "OTP verificado. Procede a configurar tu PIN"
 *     
 *     SetPinRequest:
 *       type: object
 *       required:
 *         - phone
 *         - pin
 *       properties:
 *         phone:
 *           type: string
 *           example: "+51987654321"
 *         pin:
 *           type: string
 *           example: "1234"
 *           description: PIN de 4 dígitos
 *     
 *     LoginPinRequest:
 *       type: object
 *       required:
 *         - phone
 *         - pin
 *       properties:
 *         phone:
 *           type: string
 *           example: "+51987654321"
 *         pin:
 *           type: string
 *           example: "1234"
 *     
 *     GoogleSignInRequest:
 *       type: object
 *       required:
 *         - idToken
 *       properties:
 *         idToken:
 *           type: string
 *           example: "eyJhbGciOiJSUzI1NiIsImtpZCI6IjE2NzAyNzQ4..."
 *           description: Token ID de Google OAuth
 *     
 *     CompleteProfileRequest:
 *       type: object
 *       properties:
 *         metroUsername:
 *           type: string
 *           example: "juan_perez"
 *         fullName:
 *           type: string
 *           example: "Juan Carlos Pérez García"
 *         dni:
 *           type: string
 *           example: "12345678"
 *         birthDate:
 *           type: string
 *           format: date
 *           example: "1990-01-15"
 *         email:
 *           type: string
 *           format: email
 *           example: "juan@example.com"
 *         referralCode:
 *           type: string
 *           example: "REF123"
 *           description: Código de referido opcional. Si es válido, otorga 100 puntos al referidor y 50 puntos al usuario referido
 */

/**
 * @swagger
 * /api/auth/request-otp:
 *   post:
 *     tags: [Autenticación]
 *     summary: Solicitar código OTP
 *     description: Envía un código OTP al número de teléfono proporcionado para verificación
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RequestOtpRequest'
 *     responses:
 *       200:
 *         description: Código OTP enviado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RequestOtpResponse'
 *       400:
 *         description: Error en la solicitud
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/request-otp', validateBody(requestOtpSchema), requestOtp);

/**
 * @swagger
 * /api/auth/verify-otp:
 *   post:
 *     tags: [Autenticación]
 *     summary: Verificar código OTP
 *     description: Verifica el código OTP enviado y retorna token o preToken para configurar PIN
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/VerifyOtpRequest'
 *     responses:
 *       200:
 *         description: OTP verificado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/VerifyOtpResponse'
 *       400:
 *         description: Código OTP inválido o expirado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Usuario no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/verify-otp', validateBody(verifyOtpSchema), verifyOtp);

/**
 * @swagger
 * /api/auth/set-pin:
 *   post:
 *     tags: [Autenticación]
 *     summary: Configurar PIN y registrar usuario
 *     description: Configura el PIN de seguridad y registra al usuario si no existe. Esta función crea automáticamente el usuario si no existe.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SetPinRequest'
 *     responses:
 *       201:
 *         description: PIN configurado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         status:
 *                           type: string
 *                           example: "success"
 *                         message:
 *                           type: string
 *                           example: "PIN configurado exitosamente"
 *                         token:
 *                           type: string
 *                           example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                         user:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: string
 *                               example: "507f1f77bcf86cd799439011"
 *                             displayName:
 *                               type: string
 *                               example: "Usuario"
 *                             role:
 *                               type: string
 *                               example: "user"
 *                             pointsSmart:
 *                               type: number
 *                               example: 0
 *                             avatarUrl:
 *                               type: string
 *                               example: "https://example.com/avatar.jpg"
 *                             isProfileComplete:
 *                               type: boolean
 *                               example: false
 *                             metroUsername:
 *                               type: string
 *                               example: "usuario123"
 *                             fullName:
 *                               type: string
 *                               example: "Juan Pérez"
 *                             dni:
 *                               type: string
 *                               example: "12345678"
 *                             birthDate:
 *                               type: string
 *                               example: "150190"
 *                             email:
 *                               type: string
 *                               example: "juan@example.com"
 *       400:
 *         description: Error en la validación de datos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/set-pin', validateBody(setPinSchema), setPin);

/**
 * @swagger
 * /api/auth/login-pin:
 *   post:
 *     tags: [Autenticación]
 *     summary: Iniciar sesión con PIN
 *     description: Autentica al usuario usando su número de teléfono y PIN
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginPinRequest'
 *     responses:
 *       200:
 *         description: Inicio de sesión exitoso
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         token:
 *                           type: string
 *                           example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                         user:
 *                           $ref: '#/components/schemas/User'
 *       401:
 *         description: Credenciales inválidas
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/login-pin', validateBody(loginPinSchema), loginPin);

/**
 * @swagger
 * /api/auth/google:
 *   post:
 *     tags: [Autenticación]
 *     summary: Iniciar sesión con Google
 *     description: Autentica al usuario usando Google OAuth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/GoogleSignInRequest'
 *     responses:
 *       200:
 *         description: Inicio de sesión con Google exitoso
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         token:
 *                           type: string
 *                           example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                         user:
 *                           $ref: '#/components/schemas/User'
 *       401:
 *         description: Token de Google inválido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/google', validateBody(googleSignInSchema), googleSignIn);

// Completar perfil después del registro
import { completeProfile } from '../controllers/auth_phone.controller';
import { completeProfileSchema } from '../utils/validation';
import { auth } from '../middleware/auth';

/**
 * @swagger
 * /api/auth/complete-profile:
 *   put:
 *     tags: [Autenticación]
 *     summary: Completar perfil de usuario
 *     description: Completa la información del perfil del usuario autenticado. Si se proporciona un código de referido válido, se aplicará el sistema de referidos otorgando puntos tanto al referidor como al usuario referido.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CompleteProfileRequest'
 *     responses:
 *       200:
 *         description: Perfil completado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         message:
 *                           type: string
 *                           example: "Perfil completado exitosamente"
 *       400:
 *         description: Error en la validación o datos duplicados
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
 *       404:
 *         description: Usuario no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.put('/complete-profile', auth, validateBody(completeProfileSchema), completeProfile);

// Rutas de desarrollo (solo en desarrollo)
if (env.nodeEnv === 'development') {
  // Login directo sin OTP para testing
  router.post('/dev-login', validateBody(loginPinSchema), async (req, res) => {
    try {
      return loginPin(req, res);
    } catch (error) {
      console.error('Error in dev login:', error);
      return res.status(500).json({ success: false, error: { message: 'Error en login de desarrollo' } });
    }
  });

  // Verificar OTP con código fijo 000000
  router.post('/dev-verify', validateBody(verifyOtpSchema), async (req, res) => {
    try {
      // Forzar código 000000 para desarrollo
      const modifiedReq = {
        ...req,
        body: { ...req.body, code: '000000' }
      };
      return verifyOtp(modifiedReq as any, res);
    } catch (error) {
      console.error('Error in dev verify:', error);
      return res.status(500).json({ success: false, error: { message: 'Error en verificación de desarrollo' } });
    }
  });
}

export default router;



