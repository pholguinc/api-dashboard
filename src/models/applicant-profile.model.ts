import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ApplicantProfileDocument extends Document {
  userId: mongoose.Types.ObjectId;
  // Datos personales
  fullName: string;
  email: string;
  phone: string;
  dni: string;
  birthDate: string; // Formato dd-mm-yyyy
  address: string;
  
  // Perfil profesional
  experience: string;
  education: string;
  skills: string[];
  motivation: string;
  
  // CV guardado
  cvFile?: {
    filename: string;
    originalName: string;
    path: string;
    size: number;
    uploadedAt: Date;
  };
  
  // Metadatos
  isComplete: boolean;
  lastUpdated: Date;
  createdAt: Date;
  updatedAt: Date;
}

const applicantProfileSchema = new Schema<ApplicantProfileDocument>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true
    },
    
    // Datos personales
    fullName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      maxlength: 100
    },
    phone: {
      type: String,
      required: true,
      trim: true,
      maxlength: 20
    },
    dni: {
      type: String,
      required: true,
      trim: true,
      maxlength: 20
    },
    birthDate: {
      type: String,
      required: true,
      trim: true,
      maxlength: 8
    },
    address: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200
    },
    
    // Perfil profesional
    experience: {
      type: String,
      required: true,
      maxlength: 2000
    },
    education: {
      type: String,
      required: true,
      maxlength: 500
    },
    skills: [{
      type: String,
      trim: true,
      maxlength: 100
    }],
    motivation: {
      type: String,
      required: true,
      maxlength: 1000
    },
    
    // CV guardado
    cvFile: {
      filename: { type: String },
      originalName: { type: String },
      path: { type: String },
      size: { type: Number },
      uploadedAt: { type: Date, default: Date.now }
    },
    
    // Metadatos
    isComplete: { type: Boolean, default: false },
    lastUpdated: { type: Date, default: Date.now }
  },
  {
    timestamps: true
  }
);

// Índices para optimizar búsquedas
applicantProfileSchema.index({ userId: 1 });

// Middleware para actualizar lastUpdated
applicantProfileSchema.pre('save', function(next) {
  this.lastUpdated = new Date();
  next();
});

// Método para verificar si el perfil está completo
applicantProfileSchema.methods.checkCompletion = function() {
  const requiredFields = [
    'fullName', 'email', 'phone', 'dni', 'birthDate', 'address',
    'experience', 'education', 'skills', 'motivation'
  ];
  
  const isComplete = requiredFields.every(field => {
    const value = this[field as keyof ApplicantProfileDocument];
    return value && (Array.isArray(value) ? value.length > 0 : value);
  });
  
  this.isComplete = isComplete;
  return isComplete;
};

export const ApplicantProfileModel: Model<ApplicantProfileDocument> =
  mongoose.models.ApplicantProfile || mongoose.model<ApplicantProfileDocument>('ApplicantProfile', applicantProfileSchema);
