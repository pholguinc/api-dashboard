import fetch from 'node-fetch';

export interface MoodAnalysisRequest {
  input: string;
  method: 'voice' | 'text' | 'selection';
  context?: {
    time_of_day?: string;
    previous_moods?: string[];
    user_history?: any;
  };
}

export interface MoodAnalysisResponse {
  mood: string;
  intensity: number;
  confidence: number;
  alternative_moods: string[];
  reasoning: string;
  suggested_genre?: string;
}

export class MoodAnalysisService {
  private openaiApiKey: string;
  private availableMoods = [
    'triste', 'feliz', 'enojado', 'relajado', 
    'pensativo', 'motivado', 'nostalgico', 'energico'
  ];

  constructor() {
    this.openaiApiKey = process.env.OPENAI_API_KEY || '';
    
    if (!this.openaiApiKey) {
      console.warn('⚠️ OPENAI_API_KEY no configurada. Análisis de ánimo funcionará en modo básico.');
    }
  }

  /**
   * Analiza el estado de ánimo del usuario basado en su input
   */
  async analyzeMood(request: MoodAnalysisRequest): Promise<MoodAnalysisResponse> {
    try {
      if (!this.openaiApiKey) {
        return this.basicMoodAnalysis(request);
      }

      const prompt = this.buildAnalysisPrompt(request);
      
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.openaiApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [
            {
              role: 'system',
              content: `Eres un experto psicólogo especializado en análisis de emociones para una aplicación de música personalizada llamada RADIO.ai. 

Tu trabajo es analizar el estado emocional del usuario y determinar:
1. Estado de ánimo principal (uno de: ${this.availableMoods.join(', ')})
2. Intensidad emocional (1-10)
3. Confianza en tu análisis (0-1)
4. Estados alternativos posibles
5. Razonamiento claro
6. Género musical sugerido

Responde SIEMPRE en formato JSON válido con esta estructura exacta:
{
  "mood": "string",
  "intensity": number,
  "confidence": number,
  "alternative_moods": ["string"],
  "reasoning": "string",
  "suggested_genre": "string"
}

Considera el contexto cultural peruano/latinoamericano en tus análisis.`
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.3,
          max_tokens: 500
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const result = await response.json() as any;
      const content = result.choices[0]?.message?.content;
      
      if (!content) {
        throw new Error('No se recibió respuesta de OpenAI');
      }

      // Parsear respuesta JSON
      const analysis = JSON.parse(content);
      
      // Validar y sanitizar respuesta
      return this.validateAndSanitizeResponse(analysis, request);

    } catch (error) {
      console.error('Error en análisis de ánimo con OpenAI:', error);
      return this.basicMoodAnalysis(request);
    }
  }

  /**
   * Construye prompt optimizado para análisis de ánimo
   */
  private buildAnalysisPrompt(request: MoodAnalysisRequest): string {
    let prompt = `Analiza el siguiente input del usuario para determinar su estado emocional:\n\n`;
    
    prompt += `Input del usuario: "${request.input}"\n`;
    prompt += `Método de entrada: ${request.method}\n`;
    
    if (request.context) {
      if (request.context.time_of_day) {
        prompt += `Momento del día: ${request.context.time_of_day}\n`;
      }
      if (request.context.previous_moods?.length) {
        prompt += `Estados de ánimo previos: ${request.context.previous_moods.join(', ')}\n`;
      }
    }
    
    prompt += `\nPor favor, analiza cuidadosamente el contenido emocional y proporciona tu evaluación en el formato JSON especificado.`;
    
    return prompt;
  }

  /**
   * Análisis básico sin IA para fallback
   */
  private basicMoodAnalysis(request: MoodAnalysisRequest): MoodAnalysisResponse {
    const input = request.input.toLowerCase();
    
    // Palabras clave para cada estado de ánimo
    const moodKeywords = {
      'triste': ['triste', 'deprimido', 'melancólico', 'llorar', 'pena', 'dolor', 'mal', 'down'],
      'feliz': ['feliz', 'alegre', 'contento', 'bien', 'genial', 'excelente', 'fantástico', 'happy'],
      'enojado': ['enojado', 'furioso', 'molesto', 'irritado', 'rabioso', 'angry', 'mad'],
      'relajado': ['relajado', 'tranquilo', 'calmado', 'sereno', 'peaceful', 'zen'],
      'pensativo': ['pensativo', 'reflexivo', 'contemplativo', 'meditando', 'thinking'],
      'motivado': ['motivado', 'energético', 'inspirado', 'determinado', 'ready', 'let\'s go'],
      'nostalgico': ['nostálgico', 'recuerdos', 'pasado', 'extraño', 'nostalgia'],
      'energico': ['energético', 'activo', 'dinámico', 'vibrante', 'pump', 'energy']
    };

    let bestMatch = 'relajado';
    let maxMatches = 0;
    let intensity = 5;

    // Buscar coincidencias de palabras clave
    for (const [mood, keywords] of Object.entries(moodKeywords)) {
      const matches = keywords.filter(keyword => input.includes(keyword)).length;
      if (matches > maxMatches) {
        maxMatches = matches;
        bestMatch = mood;
      }
    }

    // Determinar intensidad basada en palabras intensificadoras
    const intensifiers = ['muy', 'super', 'extremadamente', 'bastante', 'mucho'];
    const hasIntensifier = intensifiers.some(word => input.includes(word));
    
    if (hasIntensifier) {
      intensity = Math.min(intensity + 3, 10);
    }

    // Determinar confianza basada en coincidencias
    const confidence = maxMatches > 0 ? Math.min(0.7, maxMatches * 0.3) : 0.3;

    return {
      mood: bestMatch,
      intensity,
      confidence,
      alternative_moods: this.getAlternativeMoods(bestMatch),
      reasoning: `Análisis básico basado en palabras clave. Detectadas ${maxMatches} coincidencias para "${bestMatch}".`,
      suggested_genre: this.suggestGenreByMood(bestMatch)
    };
  }

  /**
   * Valida y sanitiza la respuesta de la IA
   */
  private validateAndSanitizeResponse(analysis: any, request: MoodAnalysisRequest): MoodAnalysisResponse {
    // Validar mood
    const mood = this.availableMoods.includes(analysis.mood) ? analysis.mood : 'relajado';
    
    // Validar intensity (1-10)
    const intensity = Math.max(1, Math.min(10, Math.round(analysis.intensity || 5)));
    
    // Validar confidence (0-1)
    const confidence = Math.max(0, Math.min(1, analysis.confidence || 0.5));
    
    // Validar alternative_moods
    const alternative_moods = Array.isArray(analysis.alternative_moods) 
      ? analysis.alternative_moods.filter(m => this.availableMoods.includes(m)).slice(0, 3)
      : this.getAlternativeMoods(mood);
    
    // Validar reasoning
    const reasoning = typeof analysis.reasoning === 'string' && analysis.reasoning.length > 0
      ? analysis.reasoning
      : `Análisis automático para estado de ánimo: ${mood}`;
    
    // Validar suggested_genre
    const suggested_genre = analysis.suggested_genre || this.suggestGenreByMood(mood);

    return {
      mood,
      intensity,
      confidence,
      alternative_moods,
      reasoning,
      suggested_genre
    };
  }

  /**
   * Obtiene estados de ánimo alternativos
   */
  private getAlternativeMoods(primaryMood: string): string[] {
    const alternatives = {
      'triste': ['nostalgico', 'pensativo'],
      'feliz': ['energico', 'motivado'],
      'enojado': ['energico', 'motivado'],
      'relajado': ['pensativo', 'nostalgico'],
      'pensativo': ['relajado', 'nostalgico'],
      'motivado': ['energico', 'feliz'],
      'nostalgico': ['triste', 'pensativo'],
      'energico': ['feliz', 'motivado']
    };

    return alternatives[primaryMood] || ['relajado', 'pensativo'];
  }

  /**
   * Sugiere género musical basado en estado de ánimo
   */
  private suggestGenreByMood(mood: string): string {
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
   * Analiza patrones de ánimo del usuario para mejores recomendaciones
   */
  async analyzeUserMoodPatterns(userId: string): Promise<{
    common_moods: string[];
    peak_hours: string[];
    mood_transitions: { from: string; to: string; frequency: number }[];
  }> {
    // Esta funcionalidad se implementará cuando tengamos más datos de usuarios
    // Por ahora retornamos datos por defecto
    return {
      common_moods: ['relajado', 'feliz', 'pensativo'],
      peak_hours: ['mañana', 'tarde'],
      mood_transitions: []
    };
  }
}
