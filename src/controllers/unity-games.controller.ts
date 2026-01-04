import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { GameModel, GameResultModel } from '../models/game.model';
import { UserModel } from '../models/user.model';
import { PointsService } from '../services/points.service';
import { updateStreak } from '../models/streak.model';
import { trackPointsTransaction } from '../models/points-tracking.model';
import { sendOk, sendError, sendCreated } from '../utils/response';
import { PointsManagerService } from '../services/points-manager.service';
import mongoose from 'mongoose';

export class UnityGamesController {

  // Obtener configuración de juego para Unity
  static async getGameConfig(req: AuthenticatedRequest, res: Response) {
    try {
      const { gameId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return sendError(res, 'Usuario no autenticado', 401);
      }

      const [game, user] = await Promise.all([
        GameModel.findOne({ _id: gameId, isAvailable: true }),
        UserModel.findById(userId).select('hasMetroPremium pointsSmart')
      ]);

      if (!game) {
        return sendError(res, 'Juego no encontrado', 404);
      }

      // Configuración específica para Unity
      const config = {
        gameId: game._id,
        gameName: game.name,
        difficulty: game.difficulty,
        basePoints: game.basePoints,
        maxPoints: game.maxPoints,
        user: {
          id: userId,
          isPremium: user?.hasMetroPremium || false,
          currentPoints: user?.pointsSmart || 0
        },
        pointsMultiplier: user?.hasMetroPremium ? 1.5 : 1.0, // Premium bonus
        apiEndpoint: process.env.API_BASE_URL || 'http://localhost:4000',
        features: {
          achievements: true,
          leaderboards: true,
          socialSharing: true,
          progressSaving: true
        }
      };

      return sendOk(res, config);
    } catch (error) {
      console.error('Error getting game config:', error);
      return sendError(res, 'Error obteniendo configuración', 500);
    }
  }

  // Manejar eventos de Unity
  static async handleGameEvent(req: AuthenticatedRequest, res: Response) {
    try {
      const { gameId } = req.params;
      const userId = req.user?.id;
      const { eventType, eventData } = req.body;

      if (!userId) {
        return sendError(res, 'Usuario no autenticado', 401);
      }

      const game = await GameModel.findById(gameId);
      if (!game) {
        return sendError(res, 'Juego no encontrado', 404);
      }

      let response = {};

      switch (eventType) {
        case 'game_start':
          response = await UnityGamesController._handleGameStart(userId, gameId, eventData);
          break;
        case 'level_complete':
          response = await UnityGamesController._handleLevelComplete(userId, gameId, eventData);
          break;
        case 'game_complete':
          response = await UnityGamesController._handleGameComplete(userId, gameId, eventData);
          break;
        case 'achievement':
          response = await UnityGamesController._handleAchievement(userId, gameId, eventData);
          break;
        case 'award_points':
          response = await UnityGamesController._handleAwardPoints(userId, gameId, eventData);
          break;
      }

      return sendOk(res, response);
    } catch (error) {
      console.error('Error handling game event:', error);
      return sendError(res, 'Error procesando evento de juego', 500);
    }
  }

  // Otorgar puntos por completar juego
  static async awardGamePoints(req: AuthenticatedRequest, res: Response) {
    try {
      const { gameId } = req.params;
      const userId = req.user?.id;
      const { points, reason, gameScore, gameLevel } = req.body;

      if (!userId) {
        return sendError(res, 'Usuario no autenticado', 401);
      }

      // Verificar límites de puntos
      const maxPointsPerGame = 200;
      const pointsToAward = Math.min(points, maxPointsPerGame);

      // Mapear gameId a nombre (ya que usamos IDs de string, no ObjectIds)
      const gameNames = {
        '2048-metro': '2048 Metro',
        'flappy-metro': 'Flappy Metro',
        'tetris-metro': 'Tetris Metro',
        'snake-metro': 'Snake Metro',
        'quiz-lima': 'Quiz Lima Metro'
      };
      
      const gameName = gameNames[gameId] || 'Juego desconocido';

      // Otorgar puntos usando el nuevo sistema diferenciado
      let result;
      try {
        result = await PointsManagerService.awardPoints(
          userId,
          'game',
          pointsToAward,
          reason || 'Juego completado',
          {
            sourceDetails: {
              gameId,
              gameName,
              gameScore,
              gameLevel,
              originalPoints: points
            },
            platform: 'mobile',
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
            gameSession: `${gameId}_${Date.now()}`
          }
        );

        if (!result.success) {
          console.error('PointsManagerService failed:', result.message);
          return sendError(res, result.message, 400);
        }
      } catch (error) {
        console.error('PointsManagerService error:', error);
        return sendError(res, 'Error en el sistema de puntos: ' + error.message, 500);
      }

      // Actualizar contador de juegos del usuario
      await UserModel.findByIdAndUpdate(userId, {
        $inc: { 
          gamesPlayed: 1
        }
      });

      // Respuesta exitosa con información detallada
      return sendOk(res, {
        pointsAwarded: result.pointsAwarded,
        newBalance: result.newBalance,
        sourceBalance: result.sourceBalance,
        source: 'games',
        message: result.message,
        gameSession: `${gameId}_${Date.now()}`,
        limitReached: result.limitReached || false
      });
    } catch (error) {
      console.error('Error awarding game points:', error);
      return sendError(res, 'Error otorgando puntos', 500);
    }
  }

  // Handlers privados para eventos específicos
  private static async _handleGameStart(userId: string, gameId: string, eventData: any) {
    // Registrar inicio de juego
    console.log(`🎮 User ${userId} started game ${gameId}`);
    return { message: 'Game started' };
  }

  private static async _handleLevelComplete(userId: string, gameId: string, eventData: any) {
    const { level, score, timeSpent } = eventData;
    
    // Calcular puntos por nivel
    const basePoints = 10 + (level * 5);
    const scoreBonus = Math.floor(score / 10);
    const timeBonus = timeSpent < 60 ? 10 : 0;
    const totalPoints = basePoints + scoreBonus + timeBonus;

    // Otorgar puntos
    await PointsService.awardPoints(
      userId,
      'earned_game_completion',
      totalPoints,
      `Nivel ${level} completado`,
      { gameId, level, score, timeSpent }
    );

    return { 
      pointsAwarded: totalPoints,
      message: `¡Nivel ${level} completado! +${totalPoints} puntos`
    };
  }

  private static async _handleGameComplete(userId: string, gameId: string, eventData: any) {
    const { finalScore, totalTime, levelsCompleted } = eventData;
    
    // Bonus por completar el juego
    const completionBonus = 50;
    const levelBonus = levelsCompleted * 15;
    const scoreBonus = Math.floor(finalScore / 5);
    const totalBonus = completionBonus + levelBonus + scoreBonus;

    // Otorgar puntos
    await PointsService.awardPoints(
      userId,
      'earned_game_completion',
      totalBonus,
      'Juego completado',
      { gameId, finalScore, totalTime, levelsCompleted }
    );

    // Completar misión de racha
    await updateStreak(userId, 'game');

    return { 
      pointsAwarded: totalBonus,
      message: `¡Juego completado! +${totalBonus} puntos`,
      gameCompleted: true
    };
  }

  private static async _handleAchievement(userId: string, gameId: string, eventData: any) {
    const { achievementId, achievementName } = eventData;
    const achievementPoints = 25;

    // Otorgar puntos por logro
    await PointsService.awardPoints(
      userId,
      'earned_game_completion',
      achievementPoints,
      `Logro: ${achievementName}`,
      { gameId, achievementId }
    );

    return { 
      pointsAwarded: achievementPoints,
      message: `¡Logro desbloqueado! +${achievementPoints} puntos`
    };
  }

  private static async _handleAwardPoints(userId: string, gameId: string, eventData: any) {
    const { points, reason } = eventData;
    const maxPoints = 50; // Límite por evento individual
    const pointsToAward = Math.min(points, maxPoints);

    await PointsService.awardPoints(
      userId,
      'earned_game_completion',
      pointsToAward,
      reason || 'Evento de juego',
      { gameId, eventType: 'custom' }
    );

    return { 
      pointsAwarded: pointsToAward,
      message: `+${pointsToAward} puntos`
    };
  }

  // Obtener leaderboard del juego
  static async getGameLeaderboard(req: AuthenticatedRequest, res: Response) {
    try {
      const { gameId } = req.params;
      const { limit = 10 } = req.query;

      const leaderboard = await GameResultModel.aggregate([
        { $match: { gameId: new mongoose.Types.ObjectId(gameId) } },
        { $sort: { score: -1, timeSpentSeconds: 1 } },
        { $limit: parseInt(limit as string) },
        {
          $lookup: {
            from: 'users',
            localField: 'userId',
            foreignField: '_id',
            as: 'user'
          }
        },
        {
          $project: {
            score: 1,
            timeSpentSeconds: 1,
            pointsEarned: 1,
            playedAt: 1,
            'user.displayName': 1,
            'user.avatarUrl': 1
          }
        }
      ]);

      return sendOk(res, leaderboard);
    } catch (error) {
      console.error('Error getting leaderboard:', error);
      return sendError(res, 'Error obteniendo leaderboard', 500);
    }
  }
}
