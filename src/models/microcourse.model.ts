import mongoose, { Schema, Document, Model } from 'mongoose';

export type CourseCategory =
  | 'technology'
  | 'business'
  | 'personal_development'
  | 'health_wellness'
  | 'arts_creativity'
  | 'languages'
  | 'finance'
  | 'marketing'
  | 'programming'
  | 'design'
  | 'productivity'
  | 'communication';

export type CourseDifficulty = 'beginner' | 'intermediate' | 'advanced';
export type CourseStatus = 'draft' | 'published' | 'archived';

export interface MicrocourseDocument extends Document {
  title: string;
  description: string;
  shortDescription: string;
  category: CourseCategory;
  difficulty: CourseDifficulty;
  status: CourseStatus;
  thumbnailUrl: string;
  trailerVideoUrl?: string;
  instructor: {
    name: string;
    bio: string;
    avatarUrl?: string;
    credentials: string[];
    socialLinks?: {
      linkedin?: string;
      twitter?: string;
      website?: string;
    };
  };
  duration: number; // Duración total en minutos
  lessonsCount: number;
  price: number; // En puntos (0 = gratis)
  originalPrice?: number; // Para mostrar descuentos
  isPremium?: boolean; // Si requiere suscripción premium
  isPopular: boolean;
  isFeatured: boolean;
  tags: string[];
  learningObjectives: string[];
  prerequisites: string[];
  targetAudience: string[];
  language: string;
  subtitles: string[]; // Idiomas de subtítulos disponibles
  rating: {
    average: number;
    count: number;
  };
  enrollmentCount: number;
  completionCount: number;
  lastUpdated: Date;
  publishedAt?: Date;
  createdBy: mongoose.Types.ObjectId; // Admin que creó el curso
  isActive: boolean;
  metadata: {
    source: 'internal' | 'external' | 'partnership';
    externalUrl?: string;
    partnerName?: string;
    licenseType?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const MicrocourseSchema = new Schema<MicrocourseDocument>(
  {
    title: { type: String, required: true, maxlength: 100 },
    description: { type: String, required: true, maxlength: 2000 },
    shortDescription: { type: String, required: true, maxlength: 200 },
    category: { 
      type: String, 
      enum: [
        'technology', 'business', 'personal_development', 'health_wellness',
        'arts_creativity', 'languages', 'finance', 'marketing',
        'programming', 'design', 'productivity', 'communication'
      ], 
      required: true, 
      index: true 
    },
    difficulty: { 
      type: String, 
      enum: ['beginner', 'intermediate', 'advanced'], 
      required: true, 
      index: true 
    },
    status: { 
      type: String, 
      enum: ['draft', 'published', 'archived'], 
      default: 'draft', 
      index: true 
    },
    thumbnailUrl: { type: String, required: true },
    trailerVideoUrl: { type: String },
    instructor: {
      name: { type: String, required: true, maxlength: 100 },
      bio: { type: String, required: true, maxlength: 500 },
      avatarUrl: { type: String },
      credentials: [{ type: String, maxlength: 100 }],
      socialLinks: {
        linkedin: { type: String },
        twitter: { type: String },
        website: { type: String }
      }
    },
    duration: { type: Number, required: true, min: 1 }, // En minutos
    lessonsCount: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true, min: 0, default: 0 },
    originalPrice: { type: Number, min: 0 },
    isPremium: { type: Boolean, default: false },
    isPopular: { type: Boolean, default: false, index: true },
    isFeatured: { type: Boolean, default: false, index: true },
    tags: [{ type: String, maxlength: 30 }],
    learningObjectives: [{ type: String, maxlength: 200 }],
    prerequisites: [{ type: String, maxlength: 200 }],
    targetAudience: [{ type: String, maxlength: 100 }],
    language: { type: String, default: 'es' },
    subtitles: [{ type: String }],
    rating: {
      average: { type: Number, default: 0, min: 0, max: 5 },
      count: { type: Number, default: 0, min: 0 }
    },
    enrollmentCount: { type: Number, default: 0, min: 0 },
    completionCount: { type: Number, default: 0, min: 0 },
    lastUpdated: { type: Date, default: Date.now },
    publishedAt: { type: Date },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    isActive: { type: Boolean, default: true, index: true },
    metadata: {
      source: { type: String, enum: ['internal', 'external', 'partnership'], default: 'external' },
      externalUrl: { type: String },
      partnerName: { type: String },
      licenseType: { type: String }
    }
  },
  { timestamps: true }
);

// Índices compuestos para búsquedas eficientes
MicrocourseSchema.index({ status: 1, isActive: 1, isFeatured: -1, enrollmentCount: -1 });
MicrocourseSchema.index({ category: 1, difficulty: 1, status: 1 });
MicrocourseSchema.index({ price: 1, rating: -1 });
MicrocourseSchema.index({ tags: 1, status: 1 });

export const MicrocourseModel: Model<MicrocourseDocument> =
  mongoose.models.Microcourse || mongoose.model<MicrocourseDocument>('Microcourse', MicrocourseSchema);

// Modelo para lecciones de microcursos
export interface MicrocourseLessonDocument extends Document {
  courseId: mongoose.Types.ObjectId;
  title: string;
  description: string;
  order: number;
  videoUrl: string;
  videoDuration: number; // En segundos
  videoType: 'youtube' | 'vimeo' | 'direct';
  videoId?: string; // Para YouTube/Vimeo
  thumbnailUrl?: string;
  transcript?: string;
  resources: {
    title: string;
    url: string;
    type: 'pdf' | 'link' | 'file';
  }[];
  quiz?: {
    questions: {
      question: string;
      options: string[];
      correctAnswer: number;
      explanation?: string;
    }[];
  };
  isPreview: boolean; // Si se puede ver sin matricularse
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const MicrocourseLessonSchema = new Schema<MicrocourseLessonDocument>(
  {
    courseId: { type: Schema.Types.ObjectId, ref: 'Microcourse', required: true, index: true },
    title: { type: String, required: true, maxlength: 100 },
    description: { type: String, maxlength: 500 },
    order: { type: Number, required: true, min: 1 },
    videoUrl: { type: String, required: true },
    videoDuration: { type: Number, required: true, min: 1 },
    videoType: { type: String, enum: ['youtube', 'vimeo', 'direct'], default: 'youtube' },
    videoId: { type: String },
    thumbnailUrl: { type: String },
    transcript: { type: String },
    resources: [{
      title: { type: String, required: true, maxlength: 100 },
      url: { type: String, required: true },
      type: { type: String, enum: ['pdf', 'link', 'file'], required: true }
    }],
    quiz: {
      questions: [{
        question: { type: String, required: true, maxlength: 300 },
        options: [{ type: String, required: true, maxlength: 200 }],
        correctAnswer: { type: Number, required: true, min: 0 },
        explanation: { type: String, maxlength: 500 }
      }]
    },
    isPreview: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

// Índice único compuesto para evitar duplicados de orden por curso
MicrocourseLessonSchema.index({ courseId: 1, order: 1 }, { unique: true });

export const MicrocourseLessonModel: Model<MicrocourseLessonDocument> =
  mongoose.models.MicrocourseLesson || mongoose.model<MicrocourseLessonDocument>('MicrocourseLesson', MicrocourseLessonSchema);

// Modelo para inscripciones de usuarios
export interface CourseEnrollmentDocument extends Document {
  userId: mongoose.Types.ObjectId;
  courseId: mongoose.Types.ObjectId;
  status: 'active' | 'completed' | 'cancelled';
  progress: {
    completedLessons: string[];
    currentLessonId?: mongoose.Types.ObjectId;
    completionPercentage: number;
    totalWatchTime: number; // En segundos
  };
  enrolledAt: Date;
  completedAt?: Date;
  lastAccessedAt: Date;
  certificateIssued: boolean;
  certificateUrl?: string;
  rating?: {
    stars: number; // 1-5
    comment?: string;
    ratedAt: Date;
  };
  pointsSpent: number;
}

const CourseEnrollmentSchema = new Schema<CourseEnrollmentDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    courseId: { type: Schema.Types.ObjectId, ref: 'Microcourse', required: true },
    status: { 
      type: String, 
      enum: ['active', 'completed', 'cancelled'], 
      default: 'active', 
      index: true 
    },
    progress: {
      completedLessons: [{ type: String }], // Cambiado a String para compatibilidad
      currentLessonId: { type: Schema.Types.ObjectId, ref: 'MicrocourseLesson' },
      completionPercentage: { type: Number, default: 0, min: 0, max: 100 },
      totalWatchTime: { type: Number, default: 0, min: 0 }
    },
    enrolledAt: { type: Date, default: Date.now },
    completedAt: { type: Date },
    lastAccessedAt: { type: Date, default: Date.now },
    certificateIssued: { type: Boolean, default: false },
    certificateUrl: { type: String },
    rating: {
      stars: { type: Number, min: 1, max: 5 },
      comment: { type: String, maxlength: 500 },
      ratedAt: { type: Date, default: Date.now }
    },
    pointsSpent: { type: Number, required: true, min: 0 }
  },
  { timestamps: { createdAt: 'enrolledAt', updatedAt: false } }
);

// Índice único compuesto para evitar inscripciones duplicadas
CourseEnrollmentSchema.index({ userId: 1, courseId: 1 }, { unique: true });
CourseEnrollmentSchema.index({ userId: 1, status: 1, enrolledAt: -1 });

export const CourseEnrollmentModel: Model<CourseEnrollmentDocument> =
  mongoose.models.CourseEnrollment || mongoose.model<CourseEnrollmentDocument>('CourseEnrollment', CourseEnrollmentSchema);

// Modelo para progreso de lecciones
export interface LessonProgressDocument extends Document {
  userId: mongoose.Types.ObjectId;
  courseId: mongoose.Types.ObjectId;
  lessonId: mongoose.Types.ObjectId;
  watchTime: number;
  lastPosition: number; // Tiempo visto en segundos
  isCompleted: boolean;
  completedAt?: Date;
  quizScore?: number; // Porcentaje si hay quiz
  quizAttempts: number;
  lastWatchedAt: Date;
  watchedPercentage: number; // Porcentaje del video visto
}

const LessonProgressSchema = new Schema<LessonProgressDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    courseId: { type: Schema.Types.ObjectId, ref: 'Microcourse', required: true },
    lessonId: { type: Schema.Types.ObjectId, ref: 'MicrocourseLesson', required: true },
    lastPosition: {
    type: Number,
    default: 0,
    min: 0
  },
  watchTime: { type: Number, default: 0, min: 0 },
    isCompleted: { type: Boolean, default: false },
    completedAt: { type: Date },
    quizScore: { type: Number, min: 0, max: 100 },
    quizAttempts: { type: Number, default: 0, min: 0 },
    lastWatchedAt: { type: Date, default: Date.now },
    watchedPercentage: { type: Number, default: 0, min: 0, max: 100 }
  },
  { timestamps: true }
);

// Índice único compuesto para evitar duplicados
LessonProgressSchema.index({ userId: 1, lessonId: 1 }, { unique: true });
LessonProgressSchema.index({ userId: 1, courseId: 1, isCompleted: 1 });

export const LessonProgressModel: Model<LessonProgressDocument> =
  mongoose.models.LessonProgress || mongoose.model<LessonProgressDocument>('LessonProgress', LessonProgressSchema);

// Modelo para comentarios en lecciones
export interface LessonCommentDocument extends Document {
  lessonId: mongoose.Types.ObjectId;
  courseId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  content: string;
  timestamp: number; // Timestamp del video donde se hizo el comentario (en segundos)
  parentCommentId?: mongoose.Types.ObjectId; // Para respuestas
  likes: number;
  isEdited: boolean;
  editedAt?: Date;
  isPinned: boolean;
  isReported: boolean;
  reportCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const LessonCommentSchema = new Schema<LessonCommentDocument>(
  {
    lessonId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MicrocourseLesson',
      required: true,
      index: true
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Microcourse',
      required: true,
      index: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    content: {
      type: String,
      required: true,
      maxlength: 1000,
      trim: true
    },
    timestamp: {
      type: Number,
      required: true,
      min: 0
    },
    parentCommentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LessonComment',
      index: true
    },
    likes: {
      type: Number,
      default: 0,
      min: 0
    },
    isEdited: {
      type: Boolean,
      default: false
    },
    editedAt: Date,
    isPinned: {
      type: Boolean,
      default: false,
      index: true
    },
    isReported: {
      type: Boolean,
      default: false,
      index: true
    },
    reportCount: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  {
    timestamps: true
  }
);

// Índices para optimizar consultas
LessonCommentSchema.index({ lessonId: 1, timestamp: 1 });
LessonCommentSchema.index({ courseId: 1, createdAt: -1 });
LessonCommentSchema.index({ userId: 1, createdAt: -1 });
LessonCommentSchema.index({ parentCommentId: 1, createdAt: 1 });

export const LessonCommentModel = mongoose.model<LessonCommentDocument>('LessonComment', LessonCommentSchema);
