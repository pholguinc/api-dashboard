import { Router } from 'express';
import { GamesController } from '../controllers/games.controller';
import { authenticateJwt } from '../middleware/auth';

const router = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Game:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: objectId
 *           example: "507f1f77bcf86cd799439011"
 *         name:
 *           type: string
 *           example: "2048 Metro"
 *         description:
 *           type: string
 *           example: "Juego de puzzle con temática del metro"
 *         category:
 *           type: string
 *           enum: [puzzle, arcade, strategy, action, trivia]
 *           example: "puzzle"
 *         thumbnailUrl:
 *           type: string
 *           format: uri
 *           example: "https://example.com/game-thumb.jpg"
 *         gameUrl:
 *           type: string
 *           format: uri
 *           example: "https://example.com/games/2048-metro"
 *         isActive:
 *           type: boolean
 *           example: true
 *         pointsReward:
 *           type: integer
 *           example: 50
 *         maxPointsPerDay:
 *           type: integer
 *           example: 200
 *         difficulty:
 *           type: string
 *           enum: [easy, medium, hard]
 *           example: "medium"
 *         estimatedDuration:
 *           type: integer
 *           example: 300
 *         instructions:
 *           type: string
 *           example: "Combina números para llegar a 2048"
 *         createdAt:
 *           type: string
 *           format: date-time
 *           example: "2024-01-15T10:30:00.000Z"
 *     
 *     GameResult:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: objectId
 *           example: "507f1f77bcf86cd799439011"
 *         user:
 *           $ref: '#/components/schemas/User'
 *         game:
 *           $ref: '#/components/schemas/Game'
 *         score:
 *           type: integer
 *           example: 1500
 *         level:
 *           type: integer
 *           example: 5
 *         duration:
 *           type: integer
 *           example: 180
 *         pointsEarned:
 *           type: integer
 *           example: 50
 *         completed:
 *           type: boolean
 *           example: true
 *         achievements:
 *           type: array
 *           items:
 *             type: string
 *           example: ["first_win", "high_score"]
 *         playedAt:
 *           type: string
 *           format: date-time
 *           example: "2024-01-15T10:30:00.000Z"
 *     
 *     GameStats:
 *       type: object
 *       properties:
 *         totalGamesPlayed:
 *           type: integer
 *           example: 25
 *         totalPointsEarned:
 *           type: integer
 *           example: 1250
 *         averageScore:
 *           type: number
 *           example: 1200.5
 *         bestScore:
 *           type: integer
 *           example: 2500
 *         totalPlayTime:
 *           type: integer
 *           example: 4500
 *         favoriteGame:
 *           $ref: '#/components/schemas/Game'
 *         recentGames:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/GameResult'
 *         achievements:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "First Win"
 *               description:
 *                 type: string
 *                 example: "Gana tu primer juego"
 *               unlockedAt:
 *                 type: string
 *                 format: date-time
 *                 example: "2024-01-15T10:30:00.000Z"
 *     
 *     SubmitGameResultRequest:
 *       type: object
 *       required:
 *         - score
 *         - completed
 *       properties:
 *         score:
 *           type: integer
 *           minimum: 0
 *           example: 1500
 *         level:
 *           type: integer
 *           minimum: 1
 *           example: 5
 *         duration:
 *           type: integer
 *           minimum: 1
 *           example: 180
 *         completed:
 *           type: boolean
 *           example: true
 *         achievements:
 *           type: array
 *           items:
 *             type: string
 *           example: ["first_win", "high_score"]
 *         metadata:
 *           type: object
 *           additionalProperties: true
 *           example:
 *             moves: 45
 *             timeBonus: 100
 */

/**
 * @swagger
 * /api/games:
 *   get:
 *     tags: [Juegos]
 *     summary: Obtener todos los juegos disponibles
 *     description: Obtiene una lista de todos los juegos disponibles en la plataforma
 *     responses:
 *       200:
 *         description: Lista de juegos obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Game'
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/', GamesController.getGames);

/**
 * @swagger
 * /api/games/{gameId}:
 *   get:
 *     tags: [Juegos]
 *     summary: Obtener un juego específico
 *     description: Obtiene los detalles de un juego específico
 *     parameters:
 *       - in: path
 *         name: gameId
 *         required: true
 *         schema:
 *           type: string
 *           format: objectId
 *         description: ID del juego
 *     responses:
 *       200:
 *         description: Juego obtenido exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Game'
 *       404:
 *         description: Juego no encontrado
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
router.get('/:gameId', GamesController.getGame);

/**
 * @swagger
 * /api/games/{gameId}/result:
 *   post:
 *     tags: [Juegos]
 *     summary: Enviar resultado de juego
 *     description: Envía el resultado de un juego jugado por el usuario
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: gameId
 *         required: true
 *         schema:
 *           type: string
 *           format: objectId
 *         description: ID del juego
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SubmitGameResultRequest'
 *     responses:
 *       201:
 *         description: Resultado enviado exitosamente
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
 *                         result:
 *                           $ref: '#/components/schemas/GameResult'
 *                         pointsEarned:
 *                           type: integer
 *                           example: 50
 *                         newAchievements:
 *                           type: array
 *                           items:
 *                             type: string
 *                           example: ["first_win"]
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
 *       404:
 *         description: Juego no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/:gameId/result', authenticateJwt, GamesController.submitGameResult);

/**
 * @swagger
 * /api/games/user/history:
 *   get:
 *     tags: [Juegos]
 *     summary: Obtener historial de juegos del usuario
 *     description: Obtiene el historial de juegos jugados por el usuario autenticado
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Número de página
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Cantidad de resultados por página
 *       - in: query
 *         name: gameId
 *         schema:
 *           type: string
 *           format: objectId
 *         description: Filtrar por juego específico
 *     responses:
 *       200:
 *         description: Historial obtenido exitosamente
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
 *                         results:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/GameResult'
 *                         pagination:
 *                           type: object
 *                           properties:
 *                             page:
 *                               type: integer
 *                               example: 1
 *                             limit:
 *                               type: integer
 *                               example: 20
 *                             total:
 *                               type: integer
 *                               example: 50
 *                             totalPages:
 *                               type: integer
 *                               example: 3
 *       401:
 *         description: No autorizado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/user/history', authenticateJwt, GamesController.getUserGameHistory);

/**
 * @swagger
 * /api/games/user/stats:
 *   get:
 *     tags: [Juegos]
 *     summary: Obtener estadísticas de juegos del usuario
 *     description: Obtiene las estadísticas generales de juegos del usuario autenticado
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Estadísticas obtenidas exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/GameStats'
 *       401:
 *         description: No autorizado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/user/stats', authenticateJwt, GamesController.getUserGameStats);

export default router;
