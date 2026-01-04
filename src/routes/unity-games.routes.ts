import { Router } from 'express';
import { UnityGamesController } from '../controllers/unity-games.controller';
import { authenticateJwt } from '../middleware/auth';
import { validateBody, validateParams } from '../utils/validation';
import { z } from 'zod';

const router = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     UnityGameConfig:
 *       type: object
 *       properties:
 *         gameId:
 *           type: string
 *           example: "2048-metro"
 *         gameName:
 *           type: string
 *           example: "2048 Metro"
 *         version:
 *           type: string
 *           example: "1.2.0"
 *         apiVersion:
 *           type: string
 *           example: "2.0"
 *         config:
 *           type: object
 *           properties:
 *             maxPointsPerDay:
 *               type: integer
 *               example: 200
 *             pointsPerLevel:
 *               type: integer
 *               example: 10
 *             bonusMultiplier:
 *               type: number
 *               example: 1.5
 *             achievements:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                     example: "first_win"
 *                   name:
 *                     type: string
 *                     example: "Primera Victoria"
 *                   description:
 *                     type: string
 *                     example: "Gana tu primer juego"
 *                   points:
 *                     type: integer
 *                     example: 50
 *             leaderboard:
 *               type: object
 *               properties:
 *                 enabled:
 *                   type: boolean
 *                   example: true
 *                 maxEntries:
 *                   type: integer
 *                   example: 100
 *                 updateInterval:
 *                   type: integer
 *                   example: 300
 *     
 *     UnityGameEvent:
 *       type: object
 *       required:
 *         - eventType
 *         - eventData
 *       properties:
 *         eventType:
 *           type: string
 *           enum: [game_start, level_complete, game_complete, achievement, award_points]
 *           example: "level_complete"
 *         eventData:
 *           type: object
 *           additionalProperties: true
 *           example:
 *             level: 5
 *             score: 1500
 *             time: 120
 *             moves: 45
 *     
 *     AwardPointsRequest:
 *       type: object
 *       required:
 *         - points
 *       properties:
 *         points:
 *           type: integer
 *           minimum: 1
 *           maximum: 200
 *           example: 50
 *         reason:
 *           type: string
 *           example: "Level completed"
 *         gameScore:
 *           type: integer
 *           example: 1500
 *         gameLevel:
 *           type: integer
 *           example: 5
 *     
 *     LeaderboardEntry:
 *       type: object
 *       properties:
 *         rank:
 *           type: integer
 *           example: 1
 *         user:
 *           $ref: '#/components/schemas/User'
 *         score:
 *           type: integer
 *           example: 2500
 *         level:
 *           type: integer
 *           example: 10
 *         playedAt:
 *           type: string
 *           format: date-time
 *           example: "2024-01-15T10:30:00.000Z"
 *     
 *     GameLeaderboard:
 *       type: object
 *       properties:
 *         gameId:
 *           type: string
 *           example: "2048-metro"
 *         gameName:
 *           type: string
 *           example: "2048 Metro"
 *         totalPlayers:
 *           type: integer
 *           example: 1500
 *         userRank:
 *           type: integer
 *           example: 25
 *         userScore:
 *           type: integer
 *           example: 1800
 *         leaderboard:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/LeaderboardEntry'
 *         lastUpdated:
 *           type: string
 *           format: date-time
 *           example: "2024-01-15T10:30:00.000Z"
 */

// Rutas autenticadas
router.use(authenticateJwt);

/**
 * @swagger
 * /api/unity-games/{gameId}/config:
 *   get:
 *     tags: [Juegos Unity]
 *     summary: Obtener configuración de juego para Unity
 *     description: Obtiene la configuración específica de un juego para la integración con Unity
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: gameId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del juego Unity
 *         example: "2048-metro"
 *     responses:
 *       200:
 *         description: Configuración obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/UnityGameConfig'
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
router.get('/:gameId/config',
  validateParams(z.object({
    gameId: z.string()
  })),
  UnityGamesController.getGameConfig
);

/**
 * @swagger
 * /api/unity-games/{gameId}/event:
 *   post:
 *     tags: [Juegos Unity]
 *     summary: Manejar eventos de Unity
 *     description: Procesa eventos enviados desde el juego Unity
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: gameId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del juego Unity
 *         example: "2048-metro"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UnityGameEvent'
 *     responses:
 *       200:
 *         description: Evento procesado exitosamente
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
 *                         eventProcessed:
 *                           type: boolean
 *                           example: true
 *                         pointsAwarded:
 *                           type: integer
 *                           example: 10
 *                         achievements:
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
router.post('/:gameId/event',
  validateParams(z.object({
    gameId: z.string()
  })),
  validateBody(z.object({
    eventType: z.enum(['game_start', 'level_complete', 'game_complete', 'achievement', 'award_points']),
    eventData: z.record(z.any())
  })),
  UnityGamesController.handleGameEvent
);

/**
 * @swagger
 * /api/unity-games/{gameId}/award-points:
 *   post:
 *     tags: [Juegos Unity]
 *     summary: Otorgar puntos por juego completado
 *     description: Otorga puntos al usuario por completar un juego o nivel
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: gameId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del juego Unity
 *         example: "2048-metro"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AwardPointsRequest'
 *     responses:
 *       200:
 *         description: Puntos otorgados exitosamente
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
 *                         pointsAwarded:
 *                           type: integer
 *                           example: 50
 *                         newBalance:
 *                           type: integer
 *                           example: 1250
 *                         dailyLimit:
 *                           type: object
 *                           properties:
 *                             used:
 *                               type: integer
 *                               example: 150
 *                             remaining:
 *                               type: integer
 *                               example: 50
 *       400:
 *         description: Error en la validación o límite diario alcanzado
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
router.post('/:gameId/award-points',
  validateParams(z.object({
    gameId: z.string()
  })),
  validateBody(z.object({
    points: z.number().min(1).max(200),
    reason: z.string().optional(),
    gameScore: z.number().optional(),
    gameLevel: z.number().optional()
  })),
  UnityGamesController.awardGamePoints
);

/**
 * @swagger
 * /api/unity-games/{gameId}/leaderboard:
 *   get:
 *     tags: [Juegos Unity]
 *     summary: Obtener leaderboard del juego
 *     description: Obtiene el ranking de jugadores para un juego específico
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: gameId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del juego Unity
 *         example: "2048-metro"
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Cantidad de entradas en el leaderboard
 *     responses:
 *       200:
 *         description: Leaderboard obtenido exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/GameLeaderboard'
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
router.get('/:gameId/leaderboard',
  validateParams(z.object({
    gameId: z.string()
  })),
  UnityGamesController.getGameLeaderboard
);

export default router;
