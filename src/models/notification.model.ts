import mongoose, { Schema, Document } from 'mongoose';

export interface NotificationDocument extends Document {
  userId: mongoose.Types.ObjectId;
  title: string;
  body: string;
  type: 'job_application' | 'stream_live' | 'stream_reminder' | 'donation_received' | 'points_earned' | 'metro_discount' | 'general' | 'promotion' | 'education' | 'political_update';
  data: {
    [key: string]: any;
  };
  imageUrl?: string;
  actionUrl?: string;
  isRead: boolean;
  isSent: boolean;
  sentAt?: Date;
  readAt?: Date;
  fcmMessageId?: string;
  priority: 'low' | 'normal' | 'high';
  scheduledFor?: Date;
  expiresAt?: Date;
  category: string;
  tags: string[];
  targetAudience?: {
    userTypes?: string[];
    regions?: string[];
    ageRange?: {
      min: number;
      max: number;
    };
    hasMetroPremium?: boolean;
    pointsRange?: {
      min: number;
      max: number;
    };
  };
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<NotificationDocument>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    title: {
      type: String,
      required: true,
      maxlength: 100,
      trim: true
    },
    body: {
      type: String,
      required: true,
      maxlength: 500,
      trim: true
    },
    type: {
      type: String,
      enum: ['job_application', 'stream_live', 'stream_reminder', 'donation_received', 'points_earned', 'metro_discount', 'general', 'promotion', 'education', 'political_update'],
      required: true,
      index: true
    },
    data: {
      type: Schema.Types.Mixed,
      default: {}
    },
    imageUrl: {
      type: String,
      validate: {
        validator: function(v: string) {
          return !v || /^https?:\/\/.+\.(jpg|jpeg|png|webp)$/i.test(v);
        },
        message: 'URL de imagen inválida'
      }
    },
    actionUrl: {
      type: String,
      maxlength: 500
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true
    },
    isSent: {
      type: Boolean,
      default: false,
      index: true
    },
    sentAt: {
      type: Date,
      index: true
    },
    readAt: Date,
    fcmMessageId: String,
    priority: {
      type: String,
      enum: ['low', 'normal', 'high'],
      default: 'normal'
    },
    scheduledFor: {
      type: Date,
      index: true
    },
    expiresAt: {
      type: Date,
      index: true
    },
    category: {
      type: String,
      required: true,
      maxlength: 50,
      index: true
    },
    tags: [{
      type: String,
      maxlength: 30
    }],
    targetAudience: {
      userTypes: [String],
      regions: [String],
      ageRange: {
        min: { type: Number, min: 13, max: 100 },
        max: { type: Number, min: 13, max: 100 }
      },
      hasMetroPremium: Boolean,
      pointsRange: {
        min: { type: Number, min: 0 },
        max: { type: Number, min: 0 }
      }
    }
  },
  {
    timestamps: true
  }
);

// Índices para optimizar consultas
NotificationSchema.index({ userId: 1, isRead: 1 });
NotificationSchema.index({ userId: 1, createdAt: -1 });
NotificationSchema.index({ type: 1, isSent: 1 });
NotificationSchema.index({ scheduledFor: 1, isSent: 1 });
NotificationSchema.index({ expiresAt: 1 });

export const NotificationModel = mongoose.model<NotificationDocument>('Notification', NotificationSchema);

// Modelo para templates de notificaciones
export interface NotificationTemplateDocument extends Document {
  name: string;
  type: string;
  title: string;
  body: string;
  imageUrl?: string;
  actionUrl?: string;
  priority: 'low' | 'normal' | 'high';
  category: string;
  tags: string[];
  variables: string[]; // Variables que se pueden reemplazar en el template
  isActive: boolean;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationTemplateSchema = new Schema<NotificationTemplateDocument>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      maxlength: 100,
      trim: true
    },
    type: {
      type: String,
      enum: ['job_application', 'stream_live', 'donation_received', 'points_earned', 'metro_discount', 'general', 'promotion', 'education', 'political_update'],
      required: true
    },
    title: {
      type: String,
      required: true,
      maxlength: 100,
      trim: true
    },
    body: {
      type: String,
      required: true,
      maxlength: 500,
      trim: true
    },
    imageUrl: String,
    actionUrl: String,
    priority: {
      type: String,
      enum: ['low', 'normal', 'high'],
      default: 'normal'
    },
    category: {
      type: String,
      required: true,
      maxlength: 50
    },
    tags: [String],
    variables: [String], // Ej: ['userName', 'jobTitle', 'streamerName']
    isActive: {
      type: Boolean,
      default: true,
      index: true
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  {
    timestamps: true
  }
);

export const NotificationTemplateModel = mongoose.model<NotificationTemplateDocument>('NotificationTemplate', NotificationTemplateSchema);

// Configuración de notificaciones por usuario
export interface UserNotificationSettingsDocument extends Document {
  userId: mongoose.Types.ObjectId;
  settings: {
    pushNotifications: boolean;
    emailNotifications: boolean;
    smsNotifications: boolean;
    types: {
      job_application: boolean;
      stream_live: boolean;
      donation_received: boolean;
      points_earned: boolean;
      metro_discount: boolean;
      general: boolean;
      promotion: boolean;
      education: boolean;
      political_update: boolean;
    };
    quietHours: {
      enabled: boolean;
      startTime: string; // HH:MM format
      endTime: string; // HH:MM format
    };
    frequency: {
      immediate: boolean;
      daily_digest: boolean;
      weekly_digest: boolean;
    };
  };
  createdAt: Date;
  updatedAt: Date;
}

const UserNotificationSettingsSchema = new Schema<UserNotificationSettingsDocument>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true
    },
    settings: {
      pushNotifications: { type: Boolean, default: true },
      emailNotifications: { type: Boolean, default: false },
      smsNotifications: { type: Boolean, default: false },
      types: {
        job_application: { type: Boolean, default: true },
        stream_live: { type: Boolean, default: true },
        donation_received: { type: Boolean, default: true },
        points_earned: { type: Boolean, default: true },
        metro_discount: { type: Boolean, default: true },
        general: { type: Boolean, default: true },
        promotion: { type: Boolean, default: false },
        education: { type: Boolean, default: true },
        political_update: { type: Boolean, default: false }
      },
      quietHours: {
        enabled: { type: Boolean, default: false },
        startTime: { type: String, default: '22:00' },
        endTime: { type: String, default: '08:00' }
      },
      frequency: {
        immediate: { type: Boolean, default: true },
        daily_digest: { type: Boolean, default: false },
        weekly_digest: { type: Boolean, default: false }
      }
    }
  },
  {
    timestamps: true
  }
);

export const UserNotificationSettingsModel = mongoose.model<UserNotificationSettingsDocument>('UserNotificationSettings', UserNotificationSettingsSchema);
