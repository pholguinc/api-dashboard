import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { MoodMusicCache } from '../../models/radio-ai/MoodMusicCache';

export interface SunoGenerationRequest {
  mood: string;
  intensity: number;
  genre_preference?: string;
  duration?: number;
  language?: string;
}

export interface SunoGenerationResponse {
  id: string;
  title: string;
  audio_url: string;
  duration: number;
  status: 'generating' | 'completed' | 'failed';
  prompt_used: string;
  metadata: {
    genre: string;
    tempo: number;
    key: string;
  };
}

export class SunoAiService {
  private apiKey: string;
  private baseUrl: string;
  private uploadDir: string;

  constructor() {
    this.apiKey = process.env.SUNO_AI_API_KEY || '';
    this.baseUrl = process.env.SUNO_AI_BASE_URL || 'https://api.suno.ai/v1';
    this.uploadDir = process.env.RADIO_AI_AUDIO_DIR || 'uploads/radio-ai/audio';
    
    if (!this.apiKey) {
      console.warn('⚠️ SUNO_AI_API_KEY no configurada. RADIO.ai funcionará en modo demo.');
    }

    // Crear directorio si no existe
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  /**
   * Genera música basada en estado de ánimo
   */
  async generateMusicByMood(request: SunoGenerationRequest): Promise<SunoGenerationResponse> {
    try {
      if (!this.apiKey) {
        return this.generateDemoResponse(request);
      }

      const prompt = this.buildPromptByMood(request);
      
      const response = await fetch(`${this.baseUrl}/generate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prompt,
          duration: request.duration || 180,
          genre: this.getGenreByMood(request.mood, request.genre_preference),
          mood_intensity: request.intensity,
          language: request.language || 'spanish',
          instrumental: true // Para evitar letras inapropiadas
        })
      });

      if (!response.ok) {
        throw new Error(`Suno AI API error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json() as any;
      
      // Descargar y guardar el archivo de audio
      const localAudioPath = await this.downloadAndSaveAudio(result.audio_url, result.id);
      
      const sunoResponse: SunoGenerationResponse = {
        id: result.id,
        title: result.title || this.generateTitleByMood(request.mood, request.intensity),
        audio_url: localAudioPath,
        duration: result.duration || 180,
        status: result.status || 'completed',
        prompt_used: prompt,
        metadata: {
          genre: result.metadata?.genre || this.getGenreByMood(request.mood, request.genre_preference),
          tempo: result.metadata?.tempo || this.getTempoByMood(request.mood, request.intensity),
          key: result.metadata?.key || 'C'
        }
      };

      // Guardar en cache inmediatamente
      await this.saveToCacheDatabase(request, sunoResponse);
      
      return sunoResponse;

    } catch (error) {
      console.error('Error generando música con Suno AI:', error);
      
      // Fallback a respuesta demo en caso de error
      return this.generateDemoResponse(request);
    }
  }

  /**
   * Busca música en cache antes de generar nueva
   */
  async findOrGenerateMusic(request: SunoGenerationRequest): Promise<SunoGenerationResponse> {
    try {
      // Buscar en cache primero
      const cached = await MoodMusicCache.findOne({
        mood: request.mood,
        intensity: { $gte: request.intensity - 1, $lte: request.intensity + 1 },
        'generated_music.0': { $exists: true } // Que tenga al menos una canción
      }).sort({ cache_score: -1, last_used: -1 });

      if (cached && cached.generated_music.length > 0) {
        // Actualizar estadísticas de uso
        cached.last_used = new Date();
        cached.total_plays += 1;
        cached.generated_music[0].play_count += 1;
        cached.calculateCacheScore();
        await cached.save();

        console.log(`🎵 Música encontrada en cache para mood: ${request.mood}, intensity: ${request.intensity}`);
        
        return {
          id: cached.generated_music[0].suno_track_id,
          title: cached.generated_music[0].title,
          audio_url: cached.generated_music[0].audio_url,
          duration: cached.generated_music[0].duration,
          status: 'completed',
          prompt_used: cached.generated_music[0].prompt_used,
          metadata: {
            genre: cached.genre_preference || this.getGenreByMood(request.mood),
            tempo: this.getTempoByMood(request.mood, request.intensity),
            key: 'C'
          }
        };
      }

      // No encontrado en cache, generar nuevo
      console.log(`🎼 Generando nueva música para mood: ${request.mood}, intensity: ${request.intensity}`);
      return await this.generateMusicByMood(request);

    } catch (error) {
      console.error('Error en findOrGenerateMusic:', error);
      return this.generateDemoResponse(request);
    }
  }

  /**
   * Construye prompt optimizado según estado de ánimo
   */
  private buildPromptByMood(request: SunoGenerationRequest): string {
    const { mood, intensity, genre_preference } = request;
    
    const basePrompts = {
      'triste': `Música melancólica y emotiva, que transmita tristeza profunda`,
      'feliz': `Música alegre y energética, que inspire felicidad y positividad`,
      'enojado': `Música intensa y poderosa, que canalice la ira y frustración`,
      'relajado': `Música tranquila y serena, perfecta para relajación y meditación`,
      'pensativo': `Música contemplativa e introspectiva, ideal para reflexionar`,
      'motivado': `Música inspiradora y energizante, que impulse a la acción`,
      'nostalgico': `Música evocativa que despierte recuerdos y nostalgia`,
      'energico': `Música vibrante y dinámica, llena de energía y vitalidad`
    };

    const intensityDescriptors = {
      1: 'muy sutil y suave',
      2: 'suave',
      3: 'moderadamente suave',
      4: 'moderada',
      5: 'equilibrada',
      6: 'moderadamente intensa',
      7: 'intensa',
      8: 'muy intensa',
      9: 'extremadamente intensa',
      10: 'máxima intensidad emocional'
    };

    let prompt = basePrompts[mood] || basePrompts['relajado'];
    prompt += `, con intensidad ${intensityDescriptors[intensity] || 'moderada'}`;
    
    if (genre_preference) {
      prompt += `, en estilo ${genre_preference}`;
    }
    
    prompt += `, instrumental, duración 3 minutos, alta calidad de audio`;
    
    return prompt;
  }

  /**
   * Determina género musical según estado de ánimo
   */
  private getGenreByMood(mood: string, preference?: string): string {
    if (preference) return preference;
    
    const moodToGenre = {
      'triste': 'ambient',
      'feliz': 'pop',
      'enojado': 'rock',
      'relajado': 'ambient',
      'pensativo': 'indie',
      'motivado': 'electronica',
      'nostalgico': 'clasica',
      'energico': 'electronica'
    };
    
    return moodToGenre[mood] || 'ambient';
  }

  /**
   * Determina tempo según estado de ánimo e intensidad
   */
  private getTempoByMood(mood: string, intensity: number): number {
    const baseTempo = {
      'triste': 60,
      'feliz': 120,
      'enojado': 140,
      'relajado': 70,
      'pensativo': 80,
      'motivado': 130,
      'nostalgico': 90,
      'energico': 150
    };
    
    const base = baseTempo[mood] || 100;
    const intensityMultiplier = 1 + ((intensity - 5) * 0.1);
    
    return Math.round(base * intensityMultiplier);
  }

  /**
   * Genera título descriptivo para la música
   */
  private generateTitleByMood(mood: string, intensity: number): string {
    const titles = {
      'triste': ['Lágrimas Silenciosas', 'Melancolía Profunda', 'Corazón Quebrado', 'Lluvia Interior'],
      'feliz': ['Rayos de Sol', 'Alegría Pura', 'Sonrisa Eterna', 'Felicidad Desbordante'],
      'enojado': ['Fuego Interior', 'Tormenta Furiosa', 'Ira Desatada', 'Poder Destructivo'],
      'relajado': ['Paz Interior', 'Serenidad Total', 'Calma Profunda', 'Tranquilidad Absoluta'],
      'pensativo': ['Reflexiones', 'Pensamientos Profundos', 'Contemplación', 'Introspección'],
      'motivado': ['Fuerza Imparable', 'Energía Pura', 'Determinación', 'Poder Interior'],
      'nostalgico': ['Recuerdos Lejanos', 'Tiempos Pasados', 'Nostalgia Dulce', 'Memorias'],
      'energico': ['Energía Explosiva', 'Vitalidad Pura', 'Dinamismo', 'Poder Vital']
    };
    
    const moodTitles = titles[mood] || titles['relajado'];
    const randomTitle = moodTitles[Math.floor(Math.random() * moodTitles.length)];
    
    return `${randomTitle} (Intensidad ${intensity})`;
  }

  /**
   * Descarga y guarda archivo de audio localmente
   */
  private async downloadAndSaveAudio(audioUrl: string, trackId: string): Promise<string> {
    try {
      const response = await fetch(audioUrl);
      if (!response.ok) {
        throw new Error(`Error descargando audio: ${response.status}`);
      }

      const fileName = `${trackId}.mp3`;
      const filePath = path.join(this.uploadDir, fileName);
      const buffer = await response.buffer();
      
      fs.writeFileSync(filePath, buffer);
      
      // Retornar path relativo para la API
      return `/uploads/radio-ai/audio/${fileName}`;
      
    } catch (error) {
      console.error('Error descargando audio:', error);
      // Retornar URL original si falla la descarga
      return audioUrl;
    }
  }

  /**
   * Guarda resultado en base de datos cache
   */
  private async saveToCacheDatabase(request: SunoGenerationRequest, response: SunoGenerationResponse): Promise<void> {
    try {
      const now = new Date();
      const timeOfDay = this.getTimeOfDay(now);
      const dayOfWeek = this.getDayOfWeek(now);

      let cacheEntry = await MoodMusicCache.findOne({
        mood: request.mood,
        intensity: request.intensity,
        genre_preference: request.genre_preference
      });

      if (cacheEntry) {
        // Agregar nueva música al cache existente
        cacheEntry.generated_music.push({
          suno_track_id: response.id,
          audio_url: response.audio_url,
          duration: response.duration,
          title: response.title,
          prompt_used: response.prompt_used,
          created_at: now,
          play_count: 1,
          file_size: 0, // Se calculará después
          format: 'mp3'
        });
        cacheEntry.last_used = now;
        cacheEntry.total_plays += 1;
      } else {
        // Crear nueva entrada de cache
        cacheEntry = new MoodMusicCache({
          mood: request.mood,
          intensity: request.intensity,
          genre_preference: request.genre_preference,
          generated_music: [{
            suno_track_id: response.id,
            audio_url: response.audio_url,
            duration: response.duration,
            title: response.title,
            prompt_used: response.prompt_used,
            created_at: now,
            play_count: 1,
            file_size: 0,
            format: 'mp3'
          }],
          user_demographics: {
            time_of_day: timeOfDay,
            day_of_week: dayOfWeek
          },
          last_used: now,
          total_plays: 1,
          cache_score: 10 // Score inicial alto para música nueva
        });
      }

      cacheEntry.calculateCacheScore();
      await cacheEntry.save();
      
      console.log(`💾 Música guardada en cache: ${response.title}`);
      
    } catch (error) {
      console.error('Error guardando en cache:', error);
    }
  }

  /**
   * Genera respuesta demo para desarrollo/testing
   */
  private generateDemoResponse(request: SunoGenerationRequest): SunoGenerationResponse {
    const demoTracks = {
      'triste': {
        id: 'demo-sad-001',
        title: 'Melancolía Demo',
        audio_url: '/uploads/radio-ai/demo/sad-demo.mp3'
      },
      'feliz': {
        id: 'demo-happy-001',
        title: 'Alegría Demo',
        audio_url: '/uploads/radio-ai/demo/happy-demo.mp3'
      },
      'enojado': {
        id: 'demo-angry-001',
        title: 'Furia Demo',
        audio_url: '/uploads/radio-ai/demo/angry-demo.mp3'
      },
      'relajado': {
        id: 'demo-relaxed-001',
        title: 'Calma Demo',
        audio_url: '/uploads/radio-ai/demo/relaxed-demo.mp3'
      }
    };

    const track = demoTracks[request.mood] || demoTracks['relajado'];
    
    return {
      id: track.id,
      title: track.title,
      audio_url: track.audio_url,
      duration: 180,
      status: 'completed',
      prompt_used: this.buildPromptByMood(request),
      metadata: {
        genre: this.getGenreByMood(request.mood, request.genre_preference),
        tempo: this.getTempoByMood(request.mood, request.intensity),
        key: 'C'
      }
    };
  }

  private getTimeOfDay(date: Date): string {
    const hour = date.getHours();
    if (hour < 6) return 'madrugada';
    if (hour < 12) return 'mañana';
    if (hour < 18) return 'tarde';
    return 'noche';
  }

  private getDayOfWeek(date: Date): string {
    const days = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
    return days[date.getDay()];
  }
}
