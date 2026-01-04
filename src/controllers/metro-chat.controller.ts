import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { sendError, sendOk, sendCreated } from '../utils/response';
import { 
  MetroChatMessageModel, 
  MetroChatBanModel, 
  MetroChatConfigModel,
  DEFAULT_CHAT_CONFIG 
} from '../models/metro-chat.model';
import { UserModel } from '../models/user.model';
import { UserCustomizationModel } from '../models/user-customization.model';
import mongoose from 'mongoose';

export class MetroChatController {
  
  // Verificar acceso al chat (Premium + +18)
  static async checkChatAccess(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const user = await UserModel.findById(userId);
      
      if (!user) {
        return sendError(res, 'Usuario no encontrado', 404);
      }

      // Verificar que sea premium
      if (!user.hasMetroPremium) {
        return sendError(res, 'MetroChat es exclusivo para usuarios Premium', 403, 'PREMIUM_REQUIRED');
      }

      // Verificar edad +18 (calculada desde fecha de nacimiento o registro)
      const accountAge = Math.floor((Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24));
      const isAdult = accountAge > 30 || user.role === 'admin'; // Admins siempre pueden acceder
      
      if (!isAdult) {
        return sendError(res, 'MetroChat es solo para mayores de 18 años', 403, 'AGE_RESTRICTED');
      }

      // Verificar que no esté baneado
      const activeBan = await MetroChatBanModel.findOne({
        userId: new mongoose.Types.ObjectId(userId),
        isActive: true,
        $or: [
          { banType: 'permanent' },
          { banType: 'temporary', expiresAt: { $gt: new Date() } }
        ]
      });

      if (activeBan) {
        return sendError(res, 'Estás baneado del MetroChat', 403, 'USER_BANNED');
      }

      // Obtener configuración del chat
      const config = await MetroChatConfigModel.findOne() || DEFAULT_CHAT_CONFIG;
      
      if (!config.isActive) {
        return sendError(res, 'MetroChat está temporalmente deshabilitado', 503, 'CHAT_DISABLED');
      }

      // Obtener username personalizado
      const customization = await UserCustomizationModel.findOne({ userId });
      const displayUsername = customization?.customUsername || user.displayName;

      return sendOk(res, {
        hasAccess: true,
        username: displayUsername,
        userRole: user.role,
        chatConfig: {
          maxMessagesPerMinute: config.maxMessagesPerMinute,
          maxVoiceDuration: config.maxVoiceDuration,
          allowedFileTypes: config.allowedFileTypes
        }
      });

    } catch (error) {
      console.error('Error in checkChatAccess:', error);
      return sendError(res, 'Error verificando acceso al chat', 500);
    }
  }

  // Obtener mensajes del chat
  static async getMessages(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const { page = 1, limit = 50 } = req.query;
      
      // Verificar acceso premium
      const accessCheck = await MetroChatController.checkChatAccess(req, res);
      if (!accessCheck) return; // Ya envió error response

      const skip = (Number(page) - 1) * Number(limit);

      const messages = await MetroChatMessageModel.find({
        isDeleted: false
      })
        .populate('userId', 'displayName role avatarUrl')
        .populate('replyTo', 'content username messageType')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit));

      const formattedMessages = messages.reverse().map(message => ({
        id: message._id,
        username: message.username,
        messageType: message.messageType,
        content: message.content,
        voiceDuration: message.voiceDuration,
        createdAt: (message as any).createdAt,
        isEdited: message.isEdited,
        editedAt: message.editedAt,
        user: {
          id: (message.userId as any)._id,
          displayName: (message.userId as any).displayName,
          role: (message.userId as any).role,
          avatar: (message.userId as any).avatarUrl
        },
        replyTo: message.replyTo ? {
          id: (message.replyTo as any)._id,
          content: (message.replyTo as any).content,
          username: (message.replyTo as any).username,
          messageType: (message.replyTo as any).messageType
        } : null,
        isOwn: (message.userId as any)._id.toString() === userId
      }));

      return sendOk(res, {
        messages: formattedMessages,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          hasMore: messages.length === Number(limit)
        }
      });

    } catch (error) {
      console.error('Error in getMessages:', error);
      return sendError(res, 'Error obteniendo mensajes', 500);
    }
  }

  // Enviar mensaje
  static async sendMessage(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const { messageType, content, voiceDuration, replyTo } = req.body;

      // Verificar acceso premium
      const user = await UserModel.findById(userId);
      if (!user?.hasMetroPremium) {
        return sendError(res, 'MetroChat es exclusivo para usuarios Premium', 403);
      }

      // Verificar rate limiting
      const recentMessages = await MetroChatMessageModel.countDocuments({
        userId: new mongoose.Types.ObjectId(userId),
        createdAt: { $gte: new Date(Date.now() - 60000) } // Último minuto
      });

      const config = await MetroChatConfigModel.findOne() || DEFAULT_CHAT_CONFIG;
      
      if (recentMessages >= config.maxMessagesPerMinute) {
        return sendError(res, 'Demasiados mensajes. Espera un momento.', 429, 'RATE_LIMITED');
      }

      // Obtener username personalizado
      const customization = await UserCustomizationModel.findOne({ userId });
      const displayUsername = customization?.customUsername || user.displayName;

      // Validar contenido según tipo
      if (messageType === 'text' && (!content || content.trim().length === 0)) {
        return sendError(res, 'El mensaje no puede estar vacío', 400);
      }

      if (messageType === 'voice' && (!voiceDuration || voiceDuration > config.maxVoiceDuration)) {
        return sendError(res, `La nota de voz no puede durar más de ${config.maxVoiceDuration} segundos`, 400);
      }

      // Crear mensaje
      const message = new MetroChatMessageModel({
        userId: new mongoose.Types.ObjectId(userId),
        username: displayUsername,
        messageType,
        content: content.trim(),
        voiceDuration: messageType === 'voice' ? voiceDuration : undefined,
        replyTo: replyTo ? new mongoose.Types.ObjectId(replyTo) : undefined,
        metadata: {
          deviceType: req.headers['user-agent']?.includes('Mobile') ? 'mobile' : 'web',
          appVersion: req.headers['app-version'] || '1.0.0'
        }
      });

      await message.save();

      // Poblar datos para respuesta
      await message.populate('userId', 'displayName role avatarUrl');
      if (replyTo) {
        await message.populate('replyTo', 'content username messageType');
      }

      const responseMessage = {
        id: message._id,
        username: message.username,
        messageType: message.messageType,
        content: message.content,
        voiceDuration: message.voiceDuration,
        createdAt: (message as any).createdAt,
        user: {
          id: (message.userId as any)._id,
          displayName: (message.userId as any).displayName,
          role: (message.userId as any).role,
          avatar: (message.userId as any).avatarUrl
        },
        replyTo: message.replyTo ? {
          id: (message.replyTo as any)._id,
          content: (message.replyTo as any).content,
          username: (message.replyTo as any).username,
          messageType: (message.replyTo as any).messageType
        } : null
      };

      return sendCreated(res, responseMessage);

    } catch (error) {
      console.error('Error in sendMessage:', error);
      return sendError(res, 'Error enviando mensaje', 500);
    }
  }

  // Eliminar mensaje (propio o admin)
  static async deleteMessage(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const { messageId } = req.params;

      const message = await MetroChatMessageModel.findById(messageId);
      if (!message) {
        return sendError(res, 'Mensaje no encontrado', 404);
      }

      // Solo el autor o un admin pueden eliminar
      const isOwner = message.userId.toString() === userId;
      const isAdmin = req.user?.role === 'admin';

      if (!isOwner && !isAdmin) {
        return sendError(res, 'No tienes permisos para eliminar este mensaje', 403);
      }

      await MetroChatMessageModel.findByIdAndUpdate(messageId, {
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: new mongoose.Types.ObjectId(userId)
      });

      return sendOk(res, { message: 'Mensaje eliminado exitosamente' });

    } catch (error) {
      console.error('Error in deleteMessage:', error);
      return sendError(res, 'Error eliminando mensaje', 500);
    }
  }

  // Banear usuario (admin)
  static async banUser(req: AuthenticatedRequest, res: Response) {
    try {
      const adminId = req.user?.id;
      const { targetUserId, reason, banType, duration } = req.body;

      // Solo admins pueden banear
      if (req.user?.role !== 'admin') {
        return sendError(res, 'Solo administradores pueden banear usuarios', 403);
      }

      const targetUser = await UserModel.findById(targetUserId);
      if (!targetUser) {
        return sendError(res, 'Usuario no encontrado', 404);
      }

      // No se puede banear a otros admins
      if (targetUser.role === 'admin') {
        return sendError(res, 'No puedes banear a otros administradores', 403);
      }

      // Calcular fecha de expiración para bans temporales
      let expiresAt: Date | undefined;
      if (banType === 'temporary' && duration) {
        expiresAt = new Date(Date.now() + duration * 60 * 1000); // duration en minutos
      }

      // Desactivar bans anteriores
      await MetroChatBanModel.updateMany(
        { userId: new mongoose.Types.ObjectId(targetUserId) },
        { isActive: false }
      );

      // Crear nuevo ban
      const ban = new MetroChatBanModel({
        userId: new mongoose.Types.ObjectId(targetUserId),
        bannedBy: new mongoose.Types.ObjectId(adminId),
        reason,
        banType,
        expiresAt,
        isActive: true
      });

      await ban.save();

      return sendOk(res, {
        message: `Usuario ${targetUser.displayName} baneado exitosamente`,
        ban: {
          id: ban._id,
          banType,
          reason,
          expiresAt
        }
      });

    } catch (error) {
      console.error('Error in banUser:', error);
      return sendError(res, 'Error baneando usuario', 500);
    }
  }

  // Obtener estadísticas del chat (admin)
  static async getChatStats(req: AuthenticatedRequest, res: Response) {
    try {
      // Solo admins pueden ver estadísticas
      if (req.user?.role !== 'admin') {
        return sendError(res, 'Solo administradores pueden ver estadísticas', 403);
      }

      const { period = '24h' } = req.query;
      
      let startDate: Date;
      const now = new Date();
      
      switch (period) {
        case '1h':
          startDate = new Date(now.getTime() - 60 * 60 * 1000);
          break;
        case '24h':
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case '7d':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      }

      const [
        totalMessages,
        textMessages,
        voiceMessages,
        activeUsers,
        activeBans,
        topUsers
      ] = await Promise.all([
        MetroChatMessageModel.countDocuments({
          createdAt: { $gte: startDate },
          isDeleted: false
        }),
        
        MetroChatMessageModel.countDocuments({
          messageType: 'text',
          createdAt: { $gte: startDate },
          isDeleted: false
        }),
        
        MetroChatMessageModel.countDocuments({
          messageType: 'voice',
          createdAt: { $gte: startDate },
          isDeleted: false
        }),
        
        MetroChatMessageModel.distinct('userId', {
          createdAt: { $gte: startDate },
          isDeleted: false
        }),
        
        MetroChatBanModel.countDocuments({ isActive: true }),
        
        MetroChatMessageModel.aggregate([
          { 
            $match: { 
              createdAt: { $gte: startDate },
              isDeleted: false 
            } 
          },
          { 
            $group: { 
              _id: '$userId', 
              messageCount: { $sum: 1 },
              username: { $first: '$username' }
            } 
          },
          { $sort: { messageCount: -1 } },
          { $limit: 10 },
          {
            $lookup: {
              from: 'users',
              localField: '_id',
              foreignField: '_id',
              as: 'user'
            }
          },
          { $unwind: '$user' }
        ])
      ]);

      return sendOk(res, {
        overview: {
          totalMessages,
          textMessages,
          voiceMessages,
          activeUsers: activeUsers.length,
          activeBans,
          period
        },
        topUsers: topUsers.map(user => ({
          userId: user._id,
          username: user.username,
          displayName: user.user.displayName,
          messageCount: user.messageCount,
          role: user.user.role
        }))
      });

    } catch (error) {
      console.error('Error in getChatStats:', error);
      return sendError(res, 'Error obteniendo estadísticas del chat', 500);
    }
  }

  // Actualizar configuración del chat (admin)
  static async updateChatConfig(req: AuthenticatedRequest, res: Response) {
    try {
      const adminId = req.user?.id;
      const { 
        isActive, 
        maxMessagesPerMinute, 
        maxVoiceDuration, 
        moderationEnabled, 
        profanityFilterEnabled 
      } = req.body;

      // Solo admins pueden actualizar configuración
      if (req.user?.role !== 'admin') {
        return sendError(res, 'Solo administradores pueden actualizar configuración', 403);
      }

      const config = await MetroChatConfigModel.findOneAndUpdate(
        {},
        {
          $set: {
            ...(isActive !== undefined && { isActive }),
            ...(maxMessagesPerMinute !== undefined && { maxMessagesPerMinute }),
            ...(maxVoiceDuration !== undefined && { maxVoiceDuration }),
            ...(moderationEnabled !== undefined && { moderationEnabled }),
            ...(profanityFilterEnabled !== undefined && { profanityFilterEnabled }),
            lastUpdated: new Date(),
            updatedBy: new mongoose.Types.ObjectId(adminId)
          }
        },
        { 
          new: true, 
          upsert: true 
        }
      );

      return sendOk(res, {
        message: 'Configuración actualizada exitosamente',
        config: {
          isActive: config.isActive,
          maxMessagesPerMinute: config.maxMessagesPerMinute,
          maxVoiceDuration: config.maxVoiceDuration,
          moderationEnabled: config.moderationEnabled,
          profanityFilterEnabled: config.profanityFilterEnabled,
          lastUpdated: config.lastUpdated
        }
      });

    } catch (error) {
      console.error('Error in updateChatConfig:', error);
      return sendError(res, 'Error actualizando configuración', 500);
    }
  }

  // Obtener usuarios baneados (admin)
  static async getBannedUsers(req: AuthenticatedRequest, res: Response) {
    try {
      // Solo admins pueden ver usuarios baneados
      if (req.user?.role !== 'admin') {
        return sendError(res, 'Solo administradores pueden ver usuarios baneados', 403);
      }

      const bans = await MetroChatBanModel.find({ isActive: true })
        .populate('userId', 'displayName phone role')
        .populate('bannedBy', 'displayName')
        .sort({ createdAt: -1 });

      return sendOk(res, {
        bans: bans.map(ban => ({
          id: ban._id,
          user: {
            id: (ban.userId as any)._id,
            displayName: (ban.userId as any).displayName,
            phone: (ban.userId as any).phone,
            role: (ban.userId as any).role
          },
          bannedBy: {
            id: (ban.bannedBy as any)._id,
            displayName: (ban.bannedBy as any).displayName
          },
          reason: ban.reason,
          banType: ban.banType,
          expiresAt: ban.expiresAt,
          createdAt: (ban as any).createdAt
        }))
      });

    } catch (error) {
      console.error('Error in getBannedUsers:', error);
      return sendError(res, 'Error obteniendo usuarios baneados', 500);
    }
  }
}
