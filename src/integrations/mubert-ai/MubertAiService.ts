import axios from 'axios';

interface MubertResponse {
  data: {
    id: string;
    session_id: string;
    playlist_index?: string;
    prompt?: string;
    duration: number;
    intensity: string;
    mode: string;
    bpm?: number;
    key?: string;
    generations: Array<{
      session_id: string;
      format: string;
      bitrate: number;
      status: string;
      generated_at?: string;
      expired_at?: string;
      created_at: string;
      url?: string;
    }>;
  };
}


export class MubertAiService {
  private licenseToken: string;
  private companyId: string;
  private customerId: string;
  private accessToken: string;
  private baseUrl: string = 'https://music-api.mubert.com/api/v3';
  private license_id: string;

  constructor() {
    this.licenseToken = process.env.MUBERT_API_KEY || '';
    this.companyId = process.env.MUBERT_COMPANY_ID || '';
    this.customerId = process.env.MUBERT_CUSTOMER_ID || '';
    this.accessToken = process.env.MUBERT_CUSTOMER_TOKEN || '';
    this.license_id = '9ff7dac2-b9bd-4a73-b460-04402acf0d12';
    if (!this.licenseToken) {
      throw new Error('MUBERT_API_KEY (License Token) no está configurado en las variables de entorno');
    }
    
    if (!this.companyId) {
      throw new Error('MUBERT_COMPANY_ID no está configurado en las variables de entorno');
    }

    if (!this.customerId) {
      throw new Error('MUBERT_CUSTOMER_ID no está configurado en las variables de entorno');
    }

    if (!this.accessToken) {
      throw new Error('MUBERT_CUSTOMER_TOKEN no está configurado en las variables de entorno');
    }

    if (!this.license_id) {
      throw new Error('MUBERT_LICENSE_ID no está configurado en las variables de entorno');
    }
  }


  /**
   * Mapea sentimientos a parámetros musicales
   */
  private mapEmotionToMusicParams(emotion: string): { mood: string; genre: string } {
    const emotionMap: Record<string, { mood: string; genre: string }> = {
      // Sentimientos positivos
      'feliz': { mood: 'happy', genre: 'pop' },
      'alegre': { mood: 'happy', genre: 'electronic' },
      'contento': { mood: 'happy', genre: 'pop' },
      
      // Sentimientos tristes
      'triste': { mood: 'sad', genre: 'ambient' },
      'melancólico': { mood: 'melancholic', genre: 'ambient' },
      'nostálgico': { mood: 'nostalgic', genre: 'ambient' },
      
      // Sentimientos relajados
      'relajado': { mood: 'relaxed', genre: 'ambient' },
      'calmado': { mood: 'calm', genre: 'ambient' },
      'zen': { mood: 'zen', genre: 'ambient' },
      
      // Sentimientos energéticos
      'energético': { mood: 'energetic', genre: 'electronic' },
      'motivado': { mood: 'motivated', genre: 'electronic' },
      'activo': { mood: 'active', genre: 'electronic' },
      
      // Sentimientos románticos
      'romántico': { mood: 'romantic', genre: 'pop' },
      'amoroso': { mood: 'loving', genre: 'pop' },
      'tierno': { mood: 'tender', genre: 'pop' },
      
      // Sentimientos épicos
      'épico': { mood: 'epic', genre: 'orchestral' },
      'heroico': { mood: 'heroic', genre: 'orchestral' },
      'grandioso': { mood: 'grand', genre: 'orchestral' },
      
      // Sentimientos misteriosos
      'misterioso': { mood: 'mysterious', genre: 'ambient' },
      'enigmático': { mood: 'enigmatic', genre: 'ambient' },
      'intrigante': { mood: 'intriguing', genre: 'ambient' },
      
      // Sentimientos divertidos
      'divertido': { mood: 'fun', genre: 'pop' },
      'juguetón': { mood: 'playful', genre: 'pop' },
      
      // Sentimientos serios
      'serio': { mood: 'serious', genre: 'ambient' },
      'profesional': { mood: 'professional', genre: 'ambient' },
      'formal': { mood: 'formal', genre: 'ambient' }
    };

    return emotionMap[emotion.toLowerCase()] || { mood: 'neutral', genre: 'ambient' };
  }

  /**
   * Genera música basada en sentimientos
   */
  async generateMusicByEmotion(emotion: string): Promise<MubertResponse> {
    try {
      const params = this.mapEmotionToMusicParams(emotion);

      // Crear un prompt más simple y directo para Mubert
      const prompt = `Create ${params.genre} music that feels ${params.mood}`;

      // Estructura para Mubert API 3.0 con Text-to-Music
      const requestBody = {
        prompt: prompt,
        duration: 120, // 2 minutos fijos
        format: 'mp3',
        mode: 'track',
        intensity: 'high',
        bitrate: 128
      };

      const response = await axios.post<MubertResponse>(
        `${this.baseUrl}/public/tracks`,
        requestBody,
        {
          headers: {
            'customer-id': this.customerId,
            'access-token': this.accessToken,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data;
    } catch (error) {
      throw new Error("Error al generar música: " + (error as Error).message);
    }
  }

  /**
   * Obtiene el estado y URL de un track generado
   */
  async getTrackStatus(trackId: string, userId: string): Promise<MubertResponse> {
    try {
      const response = await axios.get<MubertResponse>(
        `${this.baseUrl}/public/tracks/${trackId}`,
        {
          headers: {
            'customer-id': this.customerId,
            'access-token': this.accessToken,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error('Error obteniendo estado del track:', error);
      if (axios.isAxiosError(error)) {
        console.error('Error details:', error.response?.data);
        console.error('Status:', error.response?.status);
      }
      throw new Error('Error al obtener estado del track: ' + (error as Error).message);
    }
  }

  /**
   * Lista todos los tracks generados por el usuario
   */
  async getAllTracks(userId: string, limit: number = 10, offset: number = 0): Promise<any> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/public/tracks?limit=${limit}&offset=${offset}`,
        {
          headers: {
            'customer-id': this.customerId,
            'access-token': this.accessToken,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error('Error obteniendo lista de tracks:', error);
      if (axios.isAxiosError(error)) {
        console.error('Error details:', error.response?.data);
        console.error('Status:', error.response?.status);
      }
      throw new Error('Error al obtener lista de tracks: ' + (error as Error).message);
    }
  }

  /**
   * Configura el webhook para recibir notificaciones de estado
   */
  async setupWebhook(webhookUrl: string): Promise<any> {
    try {
      const response = await axios.put(
        `${this.baseUrl}/service/licenses/${this.license_id}`,
        {
          webhook_url: webhookUrl,
          webhook_enabled: true
        },
        {
          headers: {
            'company-id': this.companyId,
            'license-token': this.licenseToken,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error('Error configurando webhook:', error);
      throw new Error('Error al configurar webhook: ' + (error as Error).message);
    }
  }

  /**
   * Obtiene la URL de una pista generada
   */
  async waitUntilTrackIsReady(trackId: string): Promise<MubertResponse> {
    try {
      const response = await axios.get<MubertResponse>(
        `${this.baseUrl}/public/tracks/${trackId}`,
        {
          headers: {
            'customer-id': this.customerId,
            'access-token': this.accessToken,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error('Error obteniendo estado del track:', error);
      throw new Error('Error al obtener estado del track: ' + (error as Error).message);
    }
  }
}