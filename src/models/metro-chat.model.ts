import mongoose, { Schema, Document, Model } from 'mongoose';

export interface MetroChatMessageDocument extends Document {
  userId: mongoose.Types.ObjectId;
  username: string; // Username personalizado del usuario
  messageType: 'text' | 'voice' | 'emoji' | 'sticker';
  content: string; // Texto del mensaje o URL del audio
  voiceDuration?: number; // Duración en segundos para mensajes de voz
  replyTo?: mongoose.Types.ObjectId; // ID del mensaje al que responde
  isEdited: boolean;
  editedAt?: Date;
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: mongoose.Types.ObjectId; // Admin que eliminó el mensaje
  metadata: {
    deviceType: string;
    appVersion: string;
    location?: {
      type: 'Point';
      coordinates: [number, number];
      stationName?: string;
    };
  };
}

const MetroChatMessageSchema = new Schema<MetroChatMessageDocument>(
  {
    userId: { 
      type: Schema.Types.ObjectId, 
      ref: 'User', 
      required: true,
      index: true 
    },
    username: { 
      type: String, 
      required: true,
      maxlength: 30,
      trim: true 
    },
    messageType: { 
      type: String, 
      enum: ['text', 'voice', 'emoji', 'sticker'], 
      default: 'text' 
    },
    content: { 
      type: String, 
      required: true,
      maxlength: 1000 // Para mensajes de texto, 1000 chars max
    },
    voiceDuration: { 
      type: Number, 
      min: 1, 
      max: 60 // Máximo 60 segundos de audio
    },
    replyTo: { 
      type: Schema.Types.ObjectId, 
      ref: 'MetroChatMessage' 
    },
    isEdited: { type: Boolean, default: false },
    editedAt: { type: Date },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
    deletedBy: { 
      type: Schema.Types.ObjectId, 
      ref: 'User' 
    },
    metadata: {
      deviceType: { type: String, default: 'mobile' },
      appVersion: { type: String, default: '1.0.0' },
      location: {
        type: {
          type: String,
          enum: ['Point'],
        },
        coordinates: {
          type: [Number],
          index: '2dsphere'
        },
        stationName: { type: String }
      }
    }
  },
  { 
    timestamps: true,
    collection: 'metro_chat_messages'
  }
);

// Índices para optimización
MetroChatMessageSchema.index({ createdAt: -1 });
MetroChatMessageSchema.index({ userId: 1, createdAt: -1 });
MetroChatMessageSchema.index({ messageType: 1 });
MetroChatMessageSchema.index({ isDeleted: 1, createdAt: -1 });

export const MetroChatMessageModel: Model<MetroChatMessageDocument> =
  mongoose.models.MetroChatMessage || 
  mongoose.model<MetroChatMessageDocument>('MetroChatMessage', MetroChatMessageSchema);

// Modelo para usuarios baneados del chat
export interface MetroChatBanDocument extends Document {
  userId: mongoose.Types.ObjectId;
  bannedBy: mongoose.Types.ObjectId;
  reason: string;
  banType: 'temporary' | 'permanent';
  expiresAt?: Date;
  isActive: boolean;
}

const MetroChatBanSchema = new Schema<MetroChatBanDocument>(
  {
    userId: { 
      type: Schema.Types.ObjectId, 
      ref: 'User', 
      required: true,
      index: true 
    },
    bannedBy: { 
      type: Schema.Types.ObjectId, 
      ref: 'User', 
      required: true 
    },
    reason: { 
      type: String, 
      required: true,
      maxlength: 500 
    },
    banType: { 
      type: String, 
      enum: ['temporary', 'permanent'], 
      default: 'temporary' 
    },
    expiresAt: { type: Date },
    isActive: { type: Boolean, default: true }
  },
  { 
    timestamps: true,
    collection: 'metro_chat_bans'
  }
);

MetroChatBanSchema.index({ userId: 1, isActive: 1 });
MetroChatBanSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const MetroChatBanModel: Model<MetroChatBanDocument> =
  mongoose.models.MetroChatBan || 
  mongoose.model<MetroChatBanDocument>('MetroChatBan', MetroChatBanSchema);

// Configuración del chat
export interface MetroChatConfigDocument extends Document {
  isActive: boolean;
  maxMessagesPerMinute: number;
  maxVoiceDuration: number;
  allowedFileTypes: string[];
  moderationEnabled: boolean;
  profanityFilterEnabled: boolean;
  lastUpdated: Date;
  updatedBy: mongoose.Types.ObjectId;
}

const MetroChatConfigSchema = new Schema<MetroChatConfigDocument>(
  {
    isActive: { type: Boolean, default: true },
    maxMessagesPerMinute: { type: Number, default: 10 },
    maxVoiceDuration: { type: Number, default: 60 },
    allowedFileTypes: { 
      type: [String], 
      default: ['mp3', 'wav', 'aac', 'm4a'] 
    },
    moderationEnabled: { type: Boolean, default: true },
    profanityFilterEnabled: { type: Boolean, default: true },
    lastUpdated: { type: Date, default: Date.now },
    updatedBy: { 
      type: Schema.Types.ObjectId, 
      ref: 'User', 
      required: true 
    }
  },
  { 
    timestamps: true,
    collection: 'metro_chat_config'
  }
);

export const MetroChatConfigModel: Model<MetroChatConfigDocument> =
  mongoose.models.MetroChatConfig || 
  mongoose.model<MetroChatConfigDocument>('MetroChatConfig', MetroChatConfigSchema);

// Configuración por defecto
export const DEFAULT_CHAT_CONFIG = {
  isActive: true,
  maxMessagesPerMinute: 10,
  maxVoiceDuration: 60,
  allowedFileTypes: ['mp3', 'wav', 'aac', 'm4a'],
  moderationEnabled: true,
  profanityFilterEnabled: true
};
