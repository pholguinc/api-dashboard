import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { sendError, sendOk } from '../utils/response';
import { 
  UserCustomizationModel, 
  UserBadgeModel, 
  BADGE_DEFINITIONS,
  BadgeDefinition 
} from '../models/user-customization.model';
import { UserModel } from '../models/user.model';
import { GameResultModel } from '../models/game.model';
import { StreamDonationModel } from '../models/metro-live.model';
import mongoose from 'mongoose';

export class ProfileCustomizationController {
  // Obtener personalización del usuario
  static async getUserCustomization(req: AuthenticatedRequest, res: Response) {
    try {
      const { userId } = req.params;
      
      // Verificar que el usuario puede acceder a esta personalización
      if (req.user?.id !== userId && req.user?.role !== 'admin') {
        return sendError(res, 'No autorizado', 403);
      }

      const customization = await UserCustomizationModel.findOne({ userId });
      
      if (!customization) {
        // Crear personalización por defecto
        const defaultCustomization = new UserCustomizationModel({
          userId,
          profileTheme: 'metro_classic',
          showAchievements: true,
          showStats: true,
          lastUpdated: new Date()
        });
        await defaultCustomization.save();
        return sendOk(res, defaultCustomization);
      }

      return sendOk(res, customization);
    } catch (error) {
      console.error('Error in getUserCustomization:', error);
      return sendError(res, 'Error obteniendo personalización', 500);
    }
  }

  // Actualizar personalización del usuario
  static async updateUserCustomization(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const {
        customUsername,
        primaryColor,
        secondaryColor,
        accentColor,
        selectedBadgeId,
        profileTheme,
        showAchievements,
        showStats,
        customBio
      } = req.body;

      // Validar username si se proporciona
      if (customUsername) {
        // Verificar que no esté en uso
        const existingUser = await UserModel.findOne({ 
          metroUsername: customUsername,
          _id: { $ne: userId }
        });
        
        const existingCustomization = await UserCustomizationModel.findOne({
          customUsername,
          userId: { $ne: userId }
        });
        
        if (existingUser || existingCustomization) {
          return sendError(res, 'Nombre de usuario ya está en uso', 400, 'USERNAME_TAKEN');
        }
      }

      // Actualizar o crear personalización
      const customization = await UserCustomizationModel.findOneAndUpdate(
        { userId },
        {
          $set: {
            ...(customUsername !== undefined && { customUsername }),
            ...(primaryColor !== undefined && { primaryColor }),
            ...(secondaryColor !== undefined && { secondaryColor }),
            ...(accentColor !== undefined && { accentColor }),
            ...(selectedBadgeId !== undefined && { selectedBadgeId }),
            ...(profileTheme !== undefined && { profileTheme }),
            ...(showAchievements !== undefined && { showAchievements }),
            ...(showStats !== undefined && { showStats }),
            ...(customBio !== undefined && { customBio }),
            lastUpdated: new Date()
          }
        },
        { 
          new: true, 
          upsert: true,
          runValidators: true 
        }
      );

      return sendOk(res, customization);
    } catch (error) {
      console.error('Error in updateUserCustomization:', error);
      if (error.code === 11000) {
        return sendError(res, 'Nombre de usuario ya está en uso', 400, 'USERNAME_TAKEN');
      }
      return sendError(res, 'Error actualizando personalización', 500);
    }
  }

  // Verificar disponibilidad de nombre de usuario
  static async checkUsernameAvailability(req: AuthenticatedRequest, res: Response) {
    try {
      const { username } = req.query;
      const userId = req.user?.id;

      if (!username || typeof username !== 'string') {
        return sendError(res, 'Username requerido', 400);
      }

      if (username.length < 3 || username.length > 30) {
        return sendOk(res, { available: false, reason: 'Longitud inválida (3-30 caracteres)' });
      }

      // Verificar formato
      if (!/^[a-zA-Z0-9_\-\.]+$/.test(username)) {
        return sendOk(res, { available: false, reason: 'Caracteres no permitidos' });
      }

      // Verificar en usuarios existentes
      const existingUser = await UserModel.findOne({ 
        metroUsername: username,
        _id: { $ne: userId }
      });

      // Verificar en personalizaciones
      const existingCustomization = await UserCustomizationModel.findOne({
        customUsername: username,
        userId: { $ne: userId }
      });

      const isAvailable = !existingUser && !existingCustomization;

      return sendOk(res, { 
        available: isAvailable,
        reason: isAvailable ? null : 'Username ya está en uso'
      });
    } catch (error) {
      console.error('Error in checkUsernameAvailability:', error);
      return sendError(res, 'Error verificando disponibilidad', 500);
    }
  }

  // Obtener insignias del usuario
  static async getUserBadges(req: AuthenticatedRequest, res: Response) {
    try {
      const { userId } = req.params;
      
      // Verificar autorización
      if (req.user?.id !== userId && req.user?.role !== 'admin') {
        return sendError(res, 'No autorizado', 403);
      }

      // Obtener insignias del usuario
      const userBadges = await UserBadgeModel.find({ userId });
      
      // Obtener estadísticas del usuario para calcular insignias disponibles
      const user = await UserModel.findById(userId);
      if (!user) {
        return sendError(res, 'Usuario no encontrado', 404);
      }

      // Calcular estadísticas para insignias
      const [gameStats, donationStats] = await Promise.all([
        GameResultModel.aggregate([
          { $match: { userId: new mongoose.Types.ObjectId(userId) } },
          {
            $group: {
              _id: null,
              totalGames: { $sum: 1 },
              bestScore: { $max: '$score' },
              totalPoints: { $sum: '$pointsEarned' }
            }
          }
        ]),
        StreamDonationModel.countDocuments({ donorId: userId })
      ]);

      const stats = {
        pointsSmart: user.pointsSmart,
        gamesPlayed: gameStats[0]?.totalGames || 0,
        bestScore: gameStats[0]?.bestScore || 0,
        donationsMade: donationStats,
        daysActive: Math.floor((Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24)),
        userRole: user.role
      };

      // Evaluar qué insignias debería tener el usuario
      const availableBadges = await _evaluateUserBadges(userId, stats, userBadges);

      return sendOk(res, availableBadges);
    } catch (error) {
      console.error('Error in getUserBadges:', error);
      return sendError(res, 'Error obteniendo insignias', 500);
    }
  }

  // Desbloquear insignia manualmente (admin)
  static async unlockBadge(req: AuthenticatedRequest, res: Response) {
    try {
      const { userId } = req.params;
      const { badgeId } = req.body;

      // Solo admins pueden desbloquear insignias manualmente
      if (req.user?.role !== 'admin') {
        return sendError(res, 'Solo administradores pueden desbloquear insignias', 403);
      }

      const badgeDefinition = BADGE_DEFINITIONS.find(b => b.id === badgeId);
      if (!badgeDefinition) {
        return sendError(res, 'Insignia no encontrada', 404);
      }

      // Crear o actualizar la insignia del usuario
      const userBadge = await UserBadgeModel.findOneAndUpdate(
        { userId, badgeId },
        {
          $set: {
            badgeName: badgeDefinition.name,
            badgeType: badgeDefinition.type,
            isUnlocked: true,
            unlockedAt: new Date(),
            rarity: badgeDefinition.rarity
          }
        },
        { upsert: true, new: true }
      );

      return sendOk(res, userBadge);
    } catch (error) {
      console.error('Error in unlockBadge:', error);
      return sendError(res, 'Error desbloqueando insignia', 500);
    }
  }

  // Obtener estadísticas del usuario
  static async getUserStats(req: AuthenticatedRequest, res: Response) {
    try {
      const { userId } = req.params;
      
      // Verificar autorización
      if (req.user?.id !== userId && req.user?.role !== 'admin') {
        return sendError(res, 'No autorizado', 403);
      }

      const user = await UserModel.findById(userId);
      if (!user) {
        return sendError(res, 'Usuario no encontrado', 404);
      }

      // Obtener estadísticas reales del usuario
      const [gameStats, donationStats, streamStats] = await Promise.all([
        // Estadísticas de juegos
        GameResultModel.aggregate([
          { $match: { userId: new mongoose.Types.ObjectId(userId) } },
          {
            $group: {
              _id: null,
              totalGames: { $sum: 1 },
              bestScore: { $max: '$score' },
              totalPointsFromGames: { $sum: '$pointsEarned' },
              averageScore: { $avg: '$score' }
            }
          }
        ]),
        
        // Estadísticas de donaciones
        StreamDonationModel.aggregate([
          { $match: { donorId: new mongoose.Types.ObjectId(userId) } },
          {
            $group: {
              _id: null,
              totalDonations: { $sum: 1 },
              totalAmountDonated: { $sum: '$amount' },
              averageDonation: { $avg: '$amount' }
            }
          }
        ]),
        
        // Estadísticas de streaming (si es streamer)
        user.role === 'metro_streamer' ? StreamDonationModel.aggregate([
          { $match: { streamerId: new mongoose.Types.ObjectId(userId) } },
          {
            $group: {
              _id: null,
              totalReceived: { $sum: 1 },
              totalAmountReceived: { $sum: '$amount' },
              averageReceived: { $avg: '$amount' }
            }
          }
        ]) : Promise.resolve([])
      ]);

      const gameStatsData = gameStats[0] || {};
      const donationStatsData = donationStats[0] || {};
      const streamStatsData = streamStats[0] || {};

      const userStatsResponse = {
        // Datos básicos del usuario
        pointsSmart: user.pointsSmart,
        gamesPlayed: user.gamesPlayed,
        totalPointsEarned: user.totalPointsEarned,
        daysActive: Math.floor((Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24)),
        
        // Estadísticas de juegos
        gamesPlayedDetailed: gameStatsData.totalGames || 0,
        bestGameScore: gameStatsData.bestScore || 0,
        averageGameScore: Math.round(gameStatsData.averageScore || 0),
        totalPointsFromGames: gameStatsData.totalPointsFromGames || 0,
        
        // Estadísticas de donaciones
        donationsMade: donationStatsData.totalDonations || 0,
        totalAmountDonated: donationStatsData.totalAmountDonated || 0,
        averageDonationAmount: Math.round(donationStatsData.averageDonation || 0),
        
        // Estadísticas de streaming (si aplica)
        ...(user.role === 'metro_streamer' && {
          donationsReceived: streamStatsData.totalReceived || 0,
          totalAmountReceived: streamStatsData.totalAmountReceived || 0,
          averageReceivedAmount: Math.round(streamStatsData.averageReceived || 0),
        }),
        
        // Metadatos
        userRole: user.role,
        accountCreated: user.createdAt,
        lastActive: user.updatedAt,
        isActive: user.isActive,
        hasMetroPremium: user.hasMetroPremium,
      };

      return sendOk(res, userStatsResponse);
    } catch (error) {
      console.error('Error in getUserStats:', error);
      return sendError(res, 'Error obteniendo estadísticas del usuario', 500);
    }
  }

  // Obtener temas disponibles para el usuario
  static async getAvailableThemes(req: AuthenticatedRequest, res: Response) {
    try {
      const { userId } = req.params;
      
      const user = await UserModel.findById(userId);
      if (!user) {
        return sendError(res, 'Usuario no encontrado', 404);
      }

      const themes = [
        { id: 'metro_classic', name: 'Metro Clásico', isPremium: false },
        { id: 'underground_neon', name: 'Underground Neón', isPremium: false },
        { id: 'street_art', name: 'Arte Urbano', isPremium: false },
        { id: 'gaming_rgb', name: 'Gaming RGB', isPremium: true },
        { id: 'premium_gold', name: 'Oro Premium', isPremium: true },
        { id: 'cyber_blue', name: 'Cyber Azul', isPremium: true },
      ];

      // Filtrar temas premium si el usuario no tiene premium
      const isPremium = user.role === 'admin' || user.role === 'metro_streamer';
      const availableThemes = isPremium ? themes : themes.filter(t => !t.isPremium);

      return sendOk(res, availableThemes);
    } catch (error) {
      console.error('Error in getAvailableThemes:', error);
      return sendError(res, 'Error obteniendo temas', 500);
    }
  }
}

// Función auxiliar para evaluar insignias del usuario
async function _evaluateUserBadges(
  userId: string, 
  stats: any, 
  existingBadges: any[]
): Promise<any[]> {
  const evaluatedBadges: any[] = [];

  for (const badgeDefinition of BADGE_DEFINITIONS) {
    const existingBadge = existingBadges.find(b => b.badgeId === badgeDefinition.id);
    
    // Verificar si cumple los requisitos
    const meetsRequirements = _checkBadgeRequirements(badgeDefinition, stats);
    
    if (existingBadge) {
      // Actualizar estado si es necesario
      if (!existingBadge.isUnlocked && meetsRequirements) {
        await UserBadgeModel.findByIdAndUpdate(existingBadge._id, {
          isUnlocked: true,
          unlockedAt: new Date()
        });
        existingBadge.isUnlocked = true;
        existingBadge.unlockedAt = new Date();
      }
      evaluatedBadges.push({
        ...badgeDefinition,
        isUnlocked: existingBadge.isUnlocked,
        unlockedAt: existingBadge.unlockedAt
      });
    } else {
      // Crear nueva insignia
      const newBadge = new UserBadgeModel({
        userId,
        badgeId: badgeDefinition.id,
        badgeName: badgeDefinition.name,
        badgeType: badgeDefinition.type,
        isUnlocked: meetsRequirements,
        unlockedAt: meetsRequirements ? new Date() : undefined,
        rarity: badgeDefinition.rarity
      });
      await newBadge.save();
      
      evaluatedBadges.push({
        ...badgeDefinition,
        isUnlocked: meetsRequirements,
        unlockedAt: meetsRequirements ? new Date() : undefined
      });
    }
  }

  return evaluatedBadges;
}

// Función auxiliar para verificar requisitos de insignias
function _checkBadgeRequirements(badge: BadgeDefinition, stats: any): boolean {
  const req = badge.requirements;
  
  // Verificar rol de usuario
  if (req.userRole && stats.userRole !== req.userRole) {
    return false;
  }
  
  // Verificar puntos mínimos
  if (req.minPoints && stats.pointsSmart < req.minPoints) {
    return false;
  }
  
  // Verificar juegos jugados
  if (req.minGamesPlayed && stats.gamesPlayed < req.minGamesPlayed) {
    return false;
  }
  
  // Verificar streams vistos
  if (req.minStreamsWatched && stats.streamsWatched < req.minStreamsWatched) {
    return false;
  }
  
  // Verificar donaciones hechas
  if (req.minDonationsMade && stats.donationsMade < req.minDonationsMade) {
    return false;
  }
  
  // Verificar días activo
  if (req.minDaysActive && stats.daysActive < req.minDaysActive) {
    return false;
  }
  
  // Verificar condiciones especiales
  if (req.specialCondition) {
    switch (req.specialCondition) {
      case 'founder':
        return stats.userRole === 'admin' || stats.daysActive > 365;
      case 'high_game_score':
        return stats.bestScore >= 1000;
      default:
        return false;
    }
  }
  
  return true;
}
