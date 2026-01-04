import admin from 'firebase-admin';
import { NotificationModel, NotificationTemplateModel, UserNotificationSettingsModel } from '../models/notification.model';
import { UserModel } from '../models/user.model';
import mongoose from 'mongoose';

// Inicializar Firebase Admin solo si está configurado
if (!admin.apps.length && process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
    console.log('✅ Firebase inicializado exitosamente');
  } catch (error) {
    console.log('⚠️ Firebase no configurado, notificaciones deshabilitadas');
  }
} else {
  console.log('⚠️ Firebase no configurado, usando modo simulado');
}

export class NotificationService {
  
  // Enviar notificación a un usuario específico
  static async sendToUser(
    userId: string,
    notification: {
      title: string;
      body: string;
      type: string;
      data?: any;
      imageUrl?: string;
      actionUrl?: string;
      priority?: 'low' | 'normal' | 'high';
      category?: string;
      tags?: string[];
    }
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      // Verificar configuración de notificaciones del usuario
      const settings = await UserNotificationSettingsModel.findOne({ userId });
      if (settings && !settings.settings.pushNotifications) {
        return { success: false, error: 'Usuario tiene notificaciones deshabilitadas' };
      }

      if (settings && !settings.settings.types[notification.type as keyof typeof settings.settings.types]) {
        return { success: false, error: 'Usuario tiene este tipo de notificación deshabilitado' };
      }

      // Verificar horas de silencio
      if (settings?.settings.quietHours.enabled && this.isQuietHour(settings.settings.quietHours)) {
        // Programar para después de las horas de silencio
        const scheduledFor = this.getNextAllowedTime(settings.settings.quietHours);
        await this.scheduleNotification(userId, notification, scheduledFor);
        return { success: true, messageId: 'scheduled' };
      }

      // Obtener tokens FCM del usuario
      const user = await UserModel.findById(userId);
      if (!user || !user.fcmTokens || user.fcmTokens.length === 0) {
        return { success: false, error: 'Usuario no tiene tokens FCM registrados' };
      }

      // Crear registro de notificación
      const notificationDoc = new NotificationModel({
        userId,
        title: notification.title,
        body: notification.body,
        type: notification.type,
        data: notification.data || {},
        imageUrl: notification.imageUrl,
        actionUrl: notification.actionUrl,
        priority: notification.priority || 'normal',
        category: notification.category || 'general',
        tags: notification.tags || []
      });

      // Preparar mensaje FCM
      const message: admin.messaging.MulticastMessage = {
        tokens: user.fcmTokens,
        notification: {
          title: notification.title,
          body: notification.body,
          imageUrl: notification.imageUrl
        },
        data: {
          type: notification.type,
          actionUrl: notification.actionUrl || '',
          notificationId: notificationDoc._id.toString(),
          ...notification.data
        },
        android: {
          priority: notification.priority === 'high' ? 'high' : 'normal',
          notification: {
            icon: 'ic_notification',
            color: '#FF6B35',
            sound: 'default',
            clickAction: 'FLUTTER_NOTIFICATION_CLICK'
          }
        },
        apns: {
          payload: {
            aps: {
              alert: {
                title: notification.title,
                body: notification.body
              },
              sound: 'default',
              badge: await this.getUnreadCount(userId)
            }
          }
        }
      };

      // Enviar notificación
      const response = await admin.messaging().sendMulticast(message);

      // Actualizar tokens inválidos
      if (response.failureCount > 0) {
        const validTokens: string[] = [];
        response.responses.forEach((resp, idx) => {
          if (resp.success) {
            validTokens.push(user.fcmTokens![idx]);
          } else {
            console.log('Token FCM inválido:', user.fcmTokens![idx], resp.error);
          }
        });

        // Actualizar tokens válidos en la base de datos
        await UserModel.findByIdAndUpdate(userId, {
          fcmTokens: validTokens
        });
      }

      // Guardar notificación si se envió exitosamente
      if (response.successCount > 0) {
        notificationDoc.isSent = true;
        notificationDoc.sentAt = new Date();
        notificationDoc.fcmMessageId = response.responses.find(r => r.success)?.messageId;
        await notificationDoc.save();
      }

      return { 
        success: response.successCount > 0, 
        messageId: response.responses.find(r => r.success)?.messageId,
        error: response.successCount === 0 ? 'No se pudo enviar a ningún dispositivo' : undefined
      };

    } catch (error) {
      console.error('Error enviando notificación:', error);
      return { success: false, error: error.message };
    }
  }

  // Enviar notificación masiva
  static async sendToMultipleUsers(
    userIds: string[],
    notification: {
      title: string;
      body: string;
      type: string;
      data?: any;
      imageUrl?: string;
      actionUrl?: string;
      priority?: 'low' | 'normal' | 'high';
      category?: string;
      tags?: string[];
    }
  ): Promise<{ success: boolean; sentCount: number; failedCount: number }> {
    let sentCount = 0;
    let failedCount = 0;

    // Enviar en lotes de 500 usuarios (límite de FCM)
    const batchSize = 500;
    for (let i = 0; i < userIds.length; i += batchSize) {
      const batch = userIds.slice(i, i + batchSize);
      
      const promises = batch.map(userId => this.sendToUser(userId, notification));
      const results = await Promise.allSettled(promises);

      results.forEach(result => {
        if (result.status === 'fulfilled' && result.value.success) {
          sentCount++;
        } else {
          failedCount++;
        }
      });
    }

    return { success: sentCount > 0, sentCount, failedCount };
  }

  // Enviar usando template
  static async sendFromTemplate(
    userId: string,
    templateName: string,
    variables: { [key: string]: string } = {}
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const template = await NotificationTemplateModel.findOne({ 
        name: templateName, 
        isActive: true 
      });

      if (!template) {
        return { success: false, error: 'Template no encontrado' };
      }

      // Reemplazar variables en el template
      let title = template.title;
      let body = template.body;
      let actionUrl = template.actionUrl;

      Object.entries(variables).forEach(([key, value]) => {
        const placeholder = `{{${key}}}`;
        title = title.replace(new RegExp(placeholder, 'g'), value);
        body = body.replace(new RegExp(placeholder, 'g'), value);
        if (actionUrl) {
          actionUrl = actionUrl.replace(new RegExp(placeholder, 'g'), value);
        }
      });

      return await this.sendToUser(userId, {
        title,
        body,
        type: template.type,
        imageUrl: template.imageUrl,
        actionUrl,
        priority: template.priority,
        category: template.category,
        tags: template.tags
      });

    } catch (error) {
      console.error('Error enviando desde template:', error);
      return { success: false, error: error.message };
    }
  }

  // Programar notificación
  static async scheduleNotification(
    userId: string,
    notification: any,
    scheduledFor: Date
  ): Promise<void> {
    const notificationDoc = new NotificationModel({
      userId,
      ...notification,
      scheduledFor,
      category: notification.category || 'general',
      tags: notification.tags || []
    });

    await notificationDoc.save();
  }

  // Procesar notificaciones programadas
  static async processScheduledNotifications(): Promise<void> {
    try {
      const now = new Date();
      const scheduledNotifications = await NotificationModel.find({
        scheduledFor: { $lte: now },
        isSent: false,
        $or: [
          { expiresAt: { $exists: false } },
          { expiresAt: { $gt: now } }
        ]
      }).limit(100);

      for (const notification of scheduledNotifications) {
        await this.sendToUser(notification.userId.toString(), {
          title: notification.title,
          body: notification.body,
          type: notification.type,
          data: notification.data,
          imageUrl: notification.imageUrl,
          actionUrl: notification.actionUrl,
          priority: notification.priority,
          category: notification.category,
          tags: notification.tags
        });
      }

    } catch (error) {
      console.error('Error procesando notificaciones programadas:', error);
    }
  }

  // Marcar como leída
  static async markAsRead(notificationId: string, userId: string): Promise<boolean> {
    try {
      const result = await NotificationModel.findOneAndUpdate(
        { _id: notificationId, userId },
        { isRead: true, readAt: new Date() }
      );

      return !!result;
    } catch (error) {
      console.error('Error marcando notificación como leída:', error);
      return false;
    }
  }

  // Obtener notificaciones del usuario
  static async getUserNotifications(
    userId: string,
    options: {
      page?: number;
      limit?: number;
      unreadOnly?: boolean;
      type?: string;
    } = {}
  ): Promise<{
    notifications: any[];
    pagination: any;
    unreadCount: number;
  }> {
    const { page = 1, limit = 20, unreadOnly = false, type } = options;

    const filters: any = { userId };
    if (unreadOnly) filters.isRead = false;
    if (type) filters.type = type;

    const [notifications, total, unreadCount] = await Promise.all([
      NotificationModel
        .find(filters)
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip((page - 1) * limit)
        .select('-__v'),
      NotificationModel.countDocuments(filters),
      NotificationModel.countDocuments({ userId, isRead: false })
    ]);

    return {
      notifications,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      unreadCount
    };
  }

  // Obtener configuración de notificaciones del usuario
  static async getUserSettings(userId: string) {
    let settings = await UserNotificationSettingsModel.findOne({ userId });
    
    if (!settings) {
      settings = new UserNotificationSettingsModel({ userId, settings: {} });
      await settings.save();
    }

    return settings;
  }

  // Actualizar configuración de notificaciones
  static async updateUserSettings(userId: string, newSettings: any) {
    return await UserNotificationSettingsModel.findOneAndUpdate(
      { userId },
      { settings: newSettings },
      { upsert: true, new: true }
    );
  }

  // Funciones auxiliares
  private static isQuietHour(quietHours: any): boolean {
    if (!quietHours.enabled) return false;

    const now = new Date();
    const currentTime = now.getHours() * 100 + now.getMinutes();
    
    const startTime = parseInt(quietHours.startTime.replace(':', ''));
    const endTime = parseInt(quietHours.endTime.replace(':', ''));

    if (startTime < endTime) {
      return currentTime >= startTime && currentTime <= endTime;
    } else {
      return currentTime >= startTime || currentTime <= endTime;
    }
  }

  private static getNextAllowedTime(quietHours: any): Date {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const [endHour, endMinute] = quietHours.endTime.split(':').map(Number);
    
    if (now.getHours() < endHour || (now.getHours() === endHour && now.getMinutes() < endMinute)) {
      now.setHours(endHour, endMinute, 0, 0);
      return now;
    } else {
      tomorrow.setHours(endHour, endMinute, 0, 0);
      return tomorrow;
    }
  }

  private static async getUnreadCount(userId: string): Promise<number> {
    return await NotificationModel.countDocuments({
      userId,
      isRead: false
    });
  }
}

// Funciones de conveniencia para tipos específicos de notificaciones
export const NotificationHelpers = {
  
  // Enviar notificación directa a usuario
  sendToUser: NotificationService.sendToUser,
  
  // Notificación de aplicación laboral
  jobApplication: async (userId: string, status: string, jobTitle: string, company: string) => {
    const titles = {
      pending: '📋 Aplicación Enviada',
      reviewing: '👀 Revisando tu Aplicación',
      accepted: '🎉 ¡Felicitaciones!',
      rejected: '😔 Aplicación No Seleccionada',
      interview_scheduled: '📞 Entrevista Programada'
    };

    const bodies = {
      pending: `Tu aplicación para ${jobTitle} en ${company} ha sido enviada exitosamente.`,
      reviewing: `${company} está revisando tu aplicación para ${jobTitle}.`,
      accepted: `¡Has sido seleccionado para ${jobTitle} en ${company}!`,
      rejected: `Tu aplicación para ${jobTitle} en ${company} no fue seleccionada esta vez.`,
      interview_scheduled: `Se ha programado una entrevista para ${jobTitle} en ${company}.`
    };

    return await NotificationService.sendToUser(userId, {
      title: titles[status as keyof typeof titles],
      body: bodies[status as keyof typeof bodies],
      type: 'job_application',
      category: 'jobs',
      priority: status === 'accepted' || status === 'interview_scheduled' ? 'high' : 'normal',
      actionUrl: '/jobs/applications',
      data: { jobTitle, company, status }
    });
  },

  // Notificación de stream en vivo
  streamLive: async (userId: string, streamerName: string, streamTitle: string, streamId: string) => {
    return await NotificationService.sendToUser(userId, {
      title: '🔴 ¡Stream en Vivo!',
      body: `${streamerName} está transmitiendo: ${streamTitle}`,
      type: 'stream_live',
      category: 'streaming',
      priority: 'high',
      actionUrl: `/streaming/${streamId}`,
      data: { streamerName, streamTitle, streamId }
    });
  },

  // Recordatorio de stream programado
  streamReminder: async (userId: string, streamerName: string, streamTitle: string, streamId: string, scheduledFor: Date) => {
    return await NotificationService.scheduleNotification(userId, {
      title: '⏰ Recordatorio de Stream',
      body: `${streamerName} empezará: ${streamTitle}`,
      type: 'stream_reminder',
      category: 'streaming',
      priority: 'high',
      actionUrl: `/streaming/${streamId}`,
      data: { streamerName, streamTitle, streamId, scheduled: true }
    }, scheduledFor);
  },

  // Notificación de donación recibida
  donationReceived: async (userId: string, amount: number, donorName: string, message?: string) => {
    return await NotificationService.sendToUser(userId, {
      title: '💝 ¡Donación Recibida!',
      body: `${donorName} te donó ${amount} puntos${message ? `: "${message}"` : ''}`,
      type: 'donation_received',
      category: 'streaming',
      priority: 'high',
      actionUrl: '/streaming/donations',
      data: { amount, donorName, message }
    });
  },

  // Notificación de puntos ganados
  pointsEarned: async (userId: string, points: number, reason: string) => {
    return await NotificationService.sendToUser(userId, {
      title: '⭐ ¡Puntos Ganados!',
      body: `Has ganado ${points} puntos por ${reason}`,
      type: 'points_earned',
      category: 'points',
      priority: 'normal',
      actionUrl: '/profile/points',
      data: { points, reason }
    });
  },

  // Notificación de descuento de metro
  metroDiscount: async (userId: string, discountCode: string, discountPercentage: number) => {
    return await NotificationService.sendToUser(userId, {
      title: '🚇 ¡Descuento Metro Listo!',
      body: `Tu descuento del ${discountPercentage}% está listo. Código: ${discountCode}`,
      type: 'metro_discount',
      category: 'discounts',
      priority: 'high',
      actionUrl: '/smart/metro-discounts',
      data: { discountCode, discountPercentage }
    });
  }
};
