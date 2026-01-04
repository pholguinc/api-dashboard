import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { NotificationService, NotificationHelpers } from '../services/notification.service';
import { NotificationModel, NotificationTemplateModel, UserNotificationSettingsModel } from '../models/notification.model';
import { UserModel } from '../models/user.model';
import { sendOk, sendError, sendCreated } from '../utils/response';

export class NotificationsController {
  
  // Obtener notificaciones del usuario
  static async getUserNotifications(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const { 
        page = 1, 
        limit = 20, 
        unreadOnly = 'false',
        type 
      } = req.query;

      const result = await NotificationService.getUserNotifications(userId, {
        page: Number(page),
        limit: Number(limit),
        unreadOnly: unreadOnly === 'true',
        type: type as string
      });

      return sendOk(res, result);

    } catch (error) {
      console.error('Error getting user notifications:', error);
      return sendError(res, 'Error obteniendo notificaciones', 500);
    }
  }

  // Marcar notificación como leída
  static async markAsRead(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const { notificationId } = req.params;

      const success = await NotificationService.markAsRead(notificationId, userId);

      if (success) {
        return sendOk(res, { message: 'Notificación marcada como leída' });
      } else {
        return sendError(res, 'Notificación no encontrada', 404);
      }

    } catch (error) {
      console.error('Error marking notification as read:', error);
      return sendError(res, 'Error marcando notificación como leída', 500);
    }
  }

  // Marcar todas las notificaciones como leídas
  static async markAllAsRead(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;

      await NotificationModel.updateMany(
        { userId, isRead: false },
        { isRead: true, readAt: new Date() }
      );

      return sendOk(res, { message: 'Todas las notificaciones marcadas como leídas' });

    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      return sendError(res, 'Error marcando todas las notificaciones como leídas', 500);
    }
  }

  // Eliminar notificación
  static async deleteNotification(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const { notificationId } = req.params;

      const result = await NotificationModel.findOneAndDelete({
        _id: notificationId,
        userId
      });

      if (result) {
        return sendOk(res, { message: 'Notificación eliminada' });
      } else {
        return sendError(res, 'Notificación no encontrada', 404);
      }

    } catch (error) {
      console.error('Error deleting notification:', error);
      return sendError(res, 'Error eliminando notificación', 500);
    }
  }

  // Obtener configuración de notificaciones
  static async getUserSettings(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const settings = await NotificationService.getUserSettings(userId);

      return sendOk(res, { settings: settings.settings });

    } catch (error) {
      console.error('Error getting notification settings:', error);
      return sendError(res, 'Error obteniendo configuración', 500);
    }
  }

  // Actualizar configuración de notificaciones
  static async updateUserSettings(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const newSettings = req.body;

      const updatedSettings = await NotificationService.updateUserSettings(userId, newSettings);

      return sendOk(res, { 
        message: 'Configuración actualizada',
        settings: updatedSettings.settings 
      });

    } catch (error) {
      console.error('Error updating notification settings:', error);
      return sendError(res, 'Error actualizando configuración', 500);
    }
  }

  // Registrar token FCM
  static async registerFCMToken(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const { token, deviceId, platform } = req.body;

      if (!token) {
        return sendError(res, 'Token FCM es requerido', 400);
      }

      // Obtener usuario y actualizar tokens
      const user = await UserModel.findById(userId);
      if (!user) {
        return sendError(res, 'Usuario no encontrado', 404);
      }

      // Inicializar array si no existe
      if (!user.fcmTokens) {
        user.fcmTokens = [];
      }

      // Evitar duplicados
      if (!user.fcmTokens.includes(token)) {
        user.fcmTokens.push(token);
        
        // Mantener solo los últimos 5 tokens por usuario
        if (user.fcmTokens.length > 5) {
          user.fcmTokens = user.fcmTokens.slice(-5);
        }
        
        await user.save();
      }

      return sendOk(res, { 
        message: 'Token FCM registrado exitosamente',
        tokenCount: user.fcmTokens.length
      });

    } catch (error) {
      console.error('Error registering FCM token:', error);
      return sendError(res, 'Error registrando token FCM', 500);
    }
  }

  // Eliminar token FCM
  static async removeFCMToken(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const { token } = req.body;

      if (!token) {
        return sendError(res, 'Token FCM es requerido', 400);
      }

      const user = await UserModel.findById(userId);
      if (!user || !user.fcmTokens) {
        return sendError(res, 'Usuario o tokens no encontrados', 404);
      }

      user.fcmTokens = user.fcmTokens.filter(t => t !== token);
      await user.save();

      return sendOk(res, { 
        message: 'Token FCM eliminado exitosamente',
        tokenCount: user.fcmTokens.length
      });

    } catch (error) {
      console.error('Error removing FCM token:', error);
      return sendError(res, 'Error eliminando token FCM', 500);
    }
  }

  // Enviar notificación de prueba
  static async sendTestNotification(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;

      const result = await NotificationService.sendToUser(userId, {
        title: '🧪 Notificación de Prueba',
        body: 'Esta es una notificación de prueba para verificar que todo funciona correctamente.',
        type: 'general',
        category: 'test',
        priority: 'normal',
        actionUrl: '/profile',
        data: { test: true }
      });

      if (result.success) {
        return sendOk(res, { 
          message: 'Notificación de prueba enviada',
          messageId: result.messageId
        });
      } else {
        return sendError(res, result.error || 'Error enviando notificación de prueba', 400);
      }

    } catch (error) {
      console.error('Error sending test notification:', error);
      return sendError(res, 'Error enviando notificación de prueba', 500);
    }
  }

  // ========== MÉTODOS DE ADMINISTRACIÓN ==========

  // Enviar notificación masiva (Admin)
  static async sendBroadcastNotification(req: AuthenticatedRequest, res: Response) {
    try {
      const {
        title,
        body,
        type = 'general',
        imageUrl,
        actionUrl,
        priority = 'normal',
        category = 'general',
        tags = [],
        targetAudience
      } = req.body;

      // Construir filtros de audiencia
      const userFilters: any = {};
      
      if (targetAudience?.hasMetroPremium !== undefined) {
        userFilters.hasMetroPremium = targetAudience.hasMetroPremium;
      }

      if (targetAudience?.pointsRange) {
        userFilters.pointsSmart = {
          $gte: targetAudience.pointsRange.min || 0,
          $lte: targetAudience.pointsRange.max || 999999
        };
      }

      if (targetAudience?.regions && targetAudience.regions.length > 0) {
        // Asumiendo que tienes un campo de región en el usuario
        userFilters.region = { $in: targetAudience.regions };
      }

      // Obtener usuarios objetivo
      const targetUsers = await UserModel.find(userFilters).select('_id');
      const userIds = targetUsers.map(u => u._id.toString());

      if (userIds.length === 0) {
        return sendError(res, 'No se encontraron usuarios objetivo', 400);
      }

      // Enviar notificación masiva
      const result = await NotificationService.sendToMultipleUsers(userIds, {
        title,
        body,
        type,
        imageUrl,
        actionUrl,
        priority,
        category,
        tags
      });

      return sendOk(res, {
        message: 'Notificación masiva enviada',
        targetUsers: userIds.length,
        sentCount: result.sentCount,
        failedCount: result.failedCount
      });

    } catch (error) {
      console.error('Error sending broadcast notification:', error);
      return sendError(res, 'Error enviando notificación masiva', 500);
    }
  }

  // Crear template de notificación (Admin)
  static async createTemplate(req: AuthenticatedRequest, res: Response) {
    try {
      const createdBy = req.user?.id;
      const templateData = { ...req.body, createdBy };

      const template = new NotificationTemplateModel(templateData);
      await template.save();

      return sendCreated(res, {
        message: 'Template creado exitosamente',
        template: {
          id: template._id,
          name: template.name,
          type: template.type
        }
      });

    } catch (error) {
      console.error('Error creating notification template:', error);
      return sendError(res, 'Error creando template', 500);
    }
  }

  // Obtener templates (Admin)
  static async getTemplates(req: Request, res: Response) {
    try {
      const { page = 1, limit = 20, type, active = 'true' } = req.query;

      const filters: any = {};
      if (type) filters.type = type;
      if (active === 'true') filters.isActive = true;

      const templates = await NotificationTemplateModel
        .find(filters)
        .populate('createdBy', 'displayName')
        .sort({ createdAt: -1 })
        .limit(Number(limit))
        .skip((Number(page) - 1) * Number(limit));

      const total = await NotificationTemplateModel.countDocuments(filters);

      return sendOk(res, {
        templates,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      });

    } catch (error) {
      console.error('Error getting templates:', error);
      return sendError(res, 'Error obteniendo templates', 500);
    }
  }

  // Obtener estadísticas de notificaciones (Admin)
  static async getNotificationStats(req: Request, res: Response) {
    try {
      const [
        totalNotifications,
        sentNotifications,
        readNotifications,
        notificationsByType,
        recentActivity
      ] = await Promise.all([
        NotificationModel.countDocuments(),
        NotificationModel.countDocuments({ isSent: true }),
        NotificationModel.countDocuments({ isRead: true }),
        NotificationModel.aggregate([
          { $group: { _id: '$type', count: { $sum: 1 } } },
          { $sort: { count: -1 } }
        ]),
        NotificationModel.aggregate([
          { 
            $match: { 
              createdAt: { 
                $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) 
              } 
            } 
          },
          { 
            $group: { 
              _id: { 
                $dateToString: { 
                  format: '%Y-%m-%d', 
                  date: '$createdAt' 
                } 
              },
              sent: { $sum: { $cond: ['$isSent', 1, 0] } },
              read: { $sum: { $cond: ['$isRead', 1, 0] } }
            }
          },
          { $sort: { _id: 1 } }
        ])
      ]);

      const readRate = sentNotifications > 0 ? (readNotifications / sentNotifications * 100).toFixed(2) : 0;
      const sendRate = totalNotifications > 0 ? (sentNotifications / totalNotifications * 100).toFixed(2) : 0;

      return sendOk(res, {
        totalNotifications,
        sentNotifications,
        readNotifications,
        readRate: Number(readRate),
        sendRate: Number(sendRate),
        notificationsByType,
        recentActivity
      });

    } catch (error) {
      console.error('Error getting notification stats:', error);
      return sendError(res, 'Error obteniendo estadísticas', 500);
    }
  }
}
