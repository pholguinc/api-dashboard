import mongoose from 'mongoose';

const metroSessionSchema = new mongoose.Schema({
  artist: {
    name: { type: String, required: true, trim: true },
    bio: { type: String, required: false },
    imageUrl: { type: String, required: false },
    socialLinks: {
      instagram: { type: String, required: false },
      youtube: { type: String, required: false },
      spotify: { type: String, required: false },
      tiktok: { type: String, required: false }
    },
    isVerified: { type: Boolean, default: false }
  },
  media: {
    imageUrl: { type: String, required: false },
    audioUrl: { type: String, required: false },
    thumbnailUrl: { type: String, required: false }
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  genre: {
    type: String,
    enum: ['Rock Peruano', 'Cumbia', 'Electrónica', 'Indie', 'Fusión', 'Reggaeton', 'Salsa', 'Hip Hop', 'Folk'],
    required: true
  },
  scheduledDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: false
  },
  duration: {
    type: Number, // en minutos
    required: true,
    min: 15,
    max: 120
  },
  location: {
    stationName: { type: String, required: true },
    line: { type: String, required: true },
    platform: { type: String, required: false },
    coordinates: {
      latitude: { type: Number, required: false },
      longitude: { type: Number, required: false }
    }
  },
  status: {
    type: String,
    enum: ['scheduled', 'live', 'completed', 'cancelled'],
    default: 'scheduled'
  },
  setlist: [{
    songTitle: { type: String, required: true },
    duration: { type: Number, required: false }, // en segundos
    isOriginal: { type: Boolean, default: false }
  }],
  audience: {
    expectedAttendees: { type: Number, default: 0 },
    actualAttendees: { type: Number, default: 0 },
    onlineViewers: { type: Number, default: 0 },
    maxViewers: { type: Number, default: 0 }
  },
  engagement: {
    likes: { type: Number, default: 0 },
    shares: { type: Number, default: 0 },
    comments: { type: Number, default: 0 },
    donations: { type: Number, default: 0 },
    donationAmount: { type: Number, default: 0 }
  },
  streamingInfo: {
    streamUrl: { type: String, required: false },
    streamKey: { type: String, required: false },
    isLiveStreamed: { type: Boolean, default: true },
    recordingUrl: { type: String, required: false }
  },
  ticketing: {
    isFree: { type: Boolean, default: true },
    ticketPrice: { type: Number, default: 0 },
    maxCapacity: { type: Number, default: 100 },
    soldTickets: { type: Number, default: 0 }
  },
  tags: [{ type: String, trim: true }],
  ageRestriction: {
    type: Number,
    default: 0 // 0 = sin restricción
  },
  language: {
    type: String,
    default: 'es'
  },
  isPublic: {
    type: Boolean,
    default: true
  },
  isFeatured: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Esquema para asistencia a sesiones
const sessionAttendanceSchema = new mongoose.Schema({
  sessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MetroSession',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  attendanceType: {
    type: String,
    enum: ['in_person', 'online'],
    required: true
  },
  joinedAt: {
    type: Date,
    default: Date.now
  },
  leftAt: {
    type: Date,
    required: false
  },
  rating: {
    type: Number,
    min: 1,
    max: 5,
    required: false
  },
  review: {
    type: String,
    required: false,
    maxlength: 500
  }
}, {
  timestamps: true
});

// Índices
metroSessionSchema.index({ 'artist.name': 1 });
metroSessionSchema.index({ genre: 1 });
metroSessionSchema.index({ scheduledDate: 1 });
metroSessionSchema.index({ status: 1 });
metroSessionSchema.index({ 'location.stationName': 1 });
metroSessionSchema.index({ isPublic: 1 });

sessionAttendanceSchema.index({ sessionId: 1 });
sessionAttendanceSchema.index({ userId: 1 });
sessionAttendanceSchema.index({ attendanceType: 1 });

// Métodos virtuales
metroSessionSchema.virtual('isLive').get(function() {
  return this.status === 'live';
});

metroSessionSchema.virtual('isUpcoming').get(function() {
  return this.status === 'scheduled' && this.scheduledDate > new Date();
});

metroSessionSchema.virtual('totalEngagement').get(function() {
  return this.engagement.likes + this.engagement.shares + this.engagement.comments;
});

// Middleware para actualizar estadísticas
metroSessionSchema.post('save', async function(doc) {
  if (doc.status === 'completed') {
    // Aquí se pueden actualizar estadísticas del artista
    console.log(`Session ${doc.title} completed with ${doc.audience.actualAttendees} attendees`);
  }
});

export const MetroSessionModel = mongoose.models.MetroSession || mongoose.model('MetroSession', metroSessionSchema);
export const SessionAttendanceModel = mongoose.models.SessionAttendance || mongoose.model('SessionAttendance', sessionAttendanceSchema);
