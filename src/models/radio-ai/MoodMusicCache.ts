import mongoose, { Document, Schema } from 'mongoose';

export interface IMoodMusicCache extends Document {
  mood: string;
  intensity: number;
  genre_preference?: string;
  generated_music: {
    suno_track_id: string;
    audio_url: string;
    duration: number;
    title: string;
    prompt_used: string;
    created_at: Date;
    play_count: number;
    file_size: number;
    format: string;
  }[];
  user_demographics: {
    age_range?: string;
    location?: string;
    time_of_day: string;
    day_of_week: string;
  };
  last_used: Date;
  total_plays: number;
  cache_score: number; // Para algoritmo de limpieza
  created_at: Date;
  updated_at: Date;
  calculateCacheScore(): number;
}

const GeneratedMusicSchema = new Schema({
  suno_track_id: { type: String, required: true, unique: true },
  audio_url: { type: String, required: true },
  duration: { type: Number, required: true },
  title: { type: String, required: true },
  prompt_used: { type: String, required: true },
  created_at: { type: Date, default: Date.now },
  play_count: { type: Number, default: 0 },
  file_size: { type: Number, default: 0 },
  format: { type: String, default: 'mp3' }
});

const UserDemographicsSchema = new Schema({
  age_range: { type: String },
  location: { type: String },
  time_of_day: { type: String, required: true },
  day_of_week: { type: String, required: true }
});

const MoodMusicCacheSchema = new Schema({
  mood: { 
    type: String, 
    required: true,
    enum: ['triste', 'feliz', 'enojado', 'relajado', 'pensativo', 'motivado', 'nostalgico', 'energico']
  },
  intensity: { 
    type: Number, 
    required: true, 
    min: 1, 
    max: 10 
  },
  genre_preference: { 
    type: String,
    enum: ['rock', 'pop', 'clasica', 'electronica', 'jazz', 'reggaeton', 'salsa', 'cumbia', 'indie', 'ambient']
  },
  generated_music: [GeneratedMusicSchema],
  user_demographics: UserDemographicsSchema,
  last_used: { type: Date, default: Date.now },
  total_plays: { type: Number, default: 0 },
  cache_score: { type: Number, default: 0 },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

// Índices para optimizar búsquedas
MoodMusicCacheSchema.index({ mood: 1, intensity: 1 });
MoodMusicCacheSchema.index({ cache_score: -1 });
MoodMusicCacheSchema.index({ last_used: -1 });
MoodMusicCacheSchema.index({ 'generated_music.suno_track_id': 1 });

// Middleware para actualizar updated_at
MoodMusicCacheSchema.pre('save', function(next) {
  this.updated_at = new Date();
  next();
});

// Método para calcular cache score
MoodMusicCacheSchema.methods.calculateCacheScore = function() {
  const daysSinceLastUsed = (Date.now() - this.last_used.getTime()) / (1000 * 60 * 60 * 24);
  const avgPlaysPerTrack = this.total_plays / Math.max(this.generated_music.length, 1);
  
  // Score más alto = más valioso para mantener en cache
  this.cache_score = (avgPlaysPerTrack * 10) - (daysSinceLastUsed * 0.5);
  return this.cache_score;
};

export const MoodMusicCache = mongoose.model<IMoodMusicCache>('MoodMusicCache', MoodMusicCacheSchema);
