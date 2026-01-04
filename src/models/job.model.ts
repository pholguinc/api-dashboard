import mongoose from 'mongoose';

const jobSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  company: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  location: {
    type: String,
    required: true
  },
  workType: {
    type: String,
    enum: ['Presencial', 'Remoto', 'Híbrido'],
    required: true
  },
  salary: {
    type: String,
    required: false,
    default: ''
  },
  category: {
    type: String,
    enum: ['Tecnología', 'Ventas', 'Administración', 'Servicios', 'Construcción', 'Gastronomía', 'Salud', 'Educación', 'Transporte'],
    required: true
  },
  requirements: [{
    type: String,
    trim: true
  }],
  contactEmail: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  companyLogo: {
    type: String,
    required: false
  },
  isUrgent: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  applicantsCount: {
    type: Number,
    default: 0
  },
  viewsCount: {
    type: Number,
    default: 0
  },
  expiresAt: {
    type: Date,
    required: true,
    default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 días
  },
  source: {
    type: String,
    enum: ['internal', 'computrabajo', 'laborum', 'indeed', 'linkedin'],
    default: 'internal'
  },
  externalId: {
    type: String,
    required: false
  },
  coordinates: {
    latitude: Number,
    longitude: Number
  }
}, {
  timestamps: true
});

// Esquema para aplicaciones a trabajos
const jobApplicationSchema = new mongoose.Schema({
  jobId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  applicantInfo: {
    fullName: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    dni: { type: String, required: true },
    birthDate: { type: String, required: true },
    address: { type: String, required: true },
    experience: { type: String, required: true },
    education: { type: String, required: true },
    skills: [{ type: String }],
    motivation: { type: String, required: true, maxlength: 1000 }
  },
  cvFile: {
    filename: { type: String, required: true },
    originalName: { type: String, required: true },
    path: { type: String, required: true },
    size: { type: Number, required: true },
    uploadedAt: { type: Date, default: Date.now }
  },
  status: {
    type: String,
    enum: ['pending', 'reviewing', 'accepted', 'rejected', 'interview_scheduled'],
    default: 'pending'
  },
  reviewNotes: { type: String },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewedAt: { type: Date },
  interviewDate: { type: Date },
  interviewLocation: { type: String },
  interviewNotes: { type: String }
}, {
  timestamps: true
});

// Índices para optimizar búsquedas
jobApplicationSchema.index({ jobId: 1, userId: 1 }, { unique: true });
jobApplicationSchema.index({ status: 1 });
jobApplicationSchema.index({ createdAt: -1 });

export const JobApplicationModel = mongoose.model('JobApplication', jobApplicationSchema);

// Índices para optimizar búsquedas
jobSchema.index({ category: 1 });
jobSchema.index({ location: 1 });
jobSchema.index({ isActive: 1 });
jobSchema.index({ isUrgent: -1 });
jobSchema.index({ createdAt: -1 });
jobSchema.index({ expiresAt: 1 });

// Índice de texto para búsqueda
jobSchema.index({
  title: 'text',
  company: 'text',
  description: 'text',
  location: 'text'
});

// Índice geoespacial para búsquedas por proximidad
jobSchema.index({ coordinates: '2dsphere' });

// Método virtual para verificar si es nuevo (menos de 7 días)
jobSchema.virtual('isNew').get(function() {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  return this.createdAt > weekAgo;
});

// Método virtual para calcular tiempo transcurrido
jobSchema.virtual('postedAgo').get(function() {
  const now = new Date();
  const diff = now.getTime() - this.createdAt.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  
  if (days > 0) return `hace ${days} día${days > 1 ? 's' : ''}`;
  if (hours > 0) return `hace ${hours} hora${hours > 1 ? 's' : ''}`;
  return 'hace unos minutos';
});

// Middleware para incrementar vistas
jobSchema.pre('findOne', function() {
  (this as any).updateOne({}, { $inc: { viewsCount: 1 } });
});

export const JobModel = mongoose.model('Job', jobSchema);
