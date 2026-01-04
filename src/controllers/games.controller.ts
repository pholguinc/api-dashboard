import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { GameModel, GameResultModel, UserPointsModel } from '../models/game.model';
import { UserModel } from '../models/user.model';
import { sendOk, sendError } from '../utils/response';
import mongoose from 'mongoose';

export class GamesController {
  // Obtener todos los juegos disponibles
  static async getGames(req: AuthenticatedRequest, res: Response) {
    try {
      const games = await GameModel.find({ isAvailable: true })
        .sort({ playCount: -1, averageRating: -1 });
      
      return sendOk(res, games);
    } catch (error) {
      return sendError(res, 'Error obteniendo juegos', 500);
    }
  }

  // Obtener un juego específico
  static async getGame(req: AuthenticatedRequest, res: Response) {
    try {
      const { gameId } = req.params;
      const game = await GameModel.findById(gameId);
      
      if (!game) {
        return sendError(res, 'Juego no encontrado', 404);
      }
      
      return sendOk(res, game);
    } catch (error) {
      return sendError(res, 'Error obteniendo juego', 500);
    }
  }

  // Registrar resultado de juego y otorgar puntos
  static async submitGameResult(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const { gameId, score, timeSpentSeconds, gameData, requestId } = req.body;

      // Verificar que el juego existe
      const game = await GameModel.findById(gameId);
      if (!game) {
        return sendError(res, 'Juego no encontrado', 404);
      }

      // Evitar duplicados por requestId
      if (requestId) {
        const existing = await GameResultModel.findOne({ userId, requestId });
        if (existing) {
          return sendOk(res, {
            pointsEarned: existing.pointsEarned,
            newTotalPoints: (await UserModel.findById(userId))?.pointsSmart || 0,
            gameResult: existing._id,
            duplicate: true,
          });
        }
      }

      // Calcular puntos ganados
      const pointsEarned = calculatePointsEarned(game, score, timeSpentSeconds);

      // Guardar resultado del juego
      const gameResult = new GameResultModel({
        userId,
        gameId,
        score,
        pointsEarned,
        timeSpentSeconds,
        gameData,
        requestId
      });
      await gameResult.save();

      // Usar PointsService para economía centralizada
      const { PointsActions } = await import('../services/points.service');
      await PointsActions.playGame(userId!, String(gameId), Number(score));

      // Actualizar estadísticas del juego
      await GameModel.findByIdAndUpdate(gameId, {
        $inc: { playCount: 1 }
      });

      return sendOk(res, {
        pointsEarned,
        newTotalPoints: (await UserModel.findById(userId))?.pointsSmart || 0,
        gameResult: gameResult._id
      });
    } catch (error) {
      console.error('Error submitting game result:', error);
      return sendError(res, 'Error registrando resultado', 500);
    }
  }

  // Obtener historial de juegos del usuario
  static async getUserGameHistory(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const { page = 1, limit = 20 } = req.query;

      const results = await GameResultModel.find({ userId })
        .populate('gameId', 'name type difficulty')
        .sort({ createdAt: -1 })
        .limit(Number(limit))
        .skip((Number(page) - 1) * Number(limit));

      const total = await GameResultModel.countDocuments({ userId });

      return sendOk(res, {
        results,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      });
    } catch (error) {
      return sendError(res, 'Error obteniendo historial', 500);
    }
  }

  // Obtener estadísticas de juegos del usuario
  static async getUserGameStats(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;

      const [
        totalGamesPlayed,
        totalPointsFromGames,
        bestScore,
        favoriteGameType,
        currentStreak
      ] = await Promise.all([
        GameResultModel.countDocuments({ userId }),
        UserPointsModel.aggregate([
          { $match: { userId: new mongoose.Types.ObjectId(userId), action: 'game' } },
          { $group: { _id: null, total: { $sum: '$points' } } }
        ]),
        GameResultModel.findOne({ userId }).sort({ score: -1 }),
        GameResultModel.aggregate([
          { $match: { userId: new mongoose.Types.ObjectId(userId) } },
          { $lookup: { from: 'games', localField: 'gameId', foreignField: '_id', as: 'game' } },
          { $unwind: '$game' },
          { $group: { _id: '$game.type', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 1 }
        ]),
        calculateCurrentStreak(userId)
      ]);

      return sendOk(res, {
        totalGamesPlayed,
        totalPointsFromGames: totalPointsFromGames[0]?.total || 0,
        bestScore: bestScore?.score || 0,
        favoriteGameType: favoriteGameType[0]?._id || 'none',
        currentStreak,
        lastPlayedAt: (await GameResultModel.findOne({ userId }).sort({ createdAt: -1 }))?.createdAt
      });
    } catch (error) {
      return sendError(res, 'Error obteniendo estadísticas', 500);
    }
  }

  // Crear nuevo juego (Admin)
  static async createGame(req: AuthenticatedRequest, res: Response) {
    try {
      const gameData = req.body;
      const game = new GameModel(gameData);
      await game.save();

      return sendOk(res, game, 201);
    } catch (error) {
      return sendError(res, 'Error creando juego', 500);
    }
  }

  // Actualizar juego (Admin)
  static async updateGame(req: AuthenticatedRequest, res: Response) {
    try {
      const { gameId } = req.params;
      const updates = req.body;

      const game = await GameModel.findByIdAndUpdate(gameId, updates, { new: true });
      
      if (!game) {
        return sendError(res, 'Juego no encontrado', 404);
      }

      return sendOk(res, game);
    } catch (error) {
      return sendError(res, 'Error actualizando juego', 500);
    }
  }

  // Eliminar juego (Admin)
  static async deleteGame(req: AuthenticatedRequest, res: Response) {
    try {
      const { gameId } = req.params;
      
      await GameModel.findByIdAndDelete(gameId);
      return sendOk(res, { message: 'Juego eliminado exitosamente' });
    } catch (error) {
      return sendError(res, 'Error eliminando juego', 500);
    }
  }
}

// Función auxiliar para calcular puntos
function calculatePointsEarned(game: any, score: number, timeSpentSeconds: number): number {
  const timeBonus = Math.max(0, 1 - (timeSpentSeconds / (game.estimatedTimeMinutes * 60)));
  const scoreRatio = Math.min(1, score / 100);
  
  const basePoints = game.basePoints;
  const maxPoints = game.maxPoints;
  
  const earnedPoints = Math.round(
    basePoints + (maxPoints - basePoints) * scoreRatio * (1 + timeBonus * 0.5)
  );
  
  return Math.min(earnedPoints, maxPoints);
}

// Función auxiliar para calcular racha actual
async function calculateCurrentStreak(userId: string): Promise<number> {
  const results = await GameResultModel.find({ userId })
    .sort({ createdAt: -1 })
    .limit(30);

  if (results.length === 0) return 0;

  let streak = 0;
  let lastDate: Date | null = null;

  for (const result of results) {
    const resultDate = new Date(result.createdAt.toDateString());
    
    if (lastDate === null) {
      streak = 1;
      lastDate = resultDate;
    } else {
      const diffDays = (lastDate.getTime() - resultDate.getTime()) / (1000 * 60 * 60 * 24);
      
      if (diffDays === 1) {
        streak++;
        lastDate = resultDate;
      } else if (diffDays > 1) {
        break;
      }
    }
  }

  return streak;
}
