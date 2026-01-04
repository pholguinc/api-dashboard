import { Response } from "express";

import { AppError } from "../../utils/AppError";
import { sendOk, sendError } from "../../utils/response";
import { AuthenticatedRequest } from "../../middleware/auth";
import axios from "axios";
import * as fs from "fs";
import * as path from "path";
import { v4 as uuidv4 } from "uuid";
import { MubertAiService } from "../../integrations/mubert-ai/MubertAiService";
import { MusicModel } from "../../models/radio-ai/UserMoodSession";

export class RadioAiController {
  private mubertService: MubertAiService;
  private readonly PEXELS_API_KEY =
    process.env.PEXELS_API_KEY ||
    "tDHGKmhDiU3RAZSVDTeTKFHOr7Gd4XQkoLpepNFCAqrQd6Rb75zUMXxS";
  private readonly PEXELS_API_URL = "https://api.pexels.com/v1/search";

  constructor() {
    this.mubertService = new MubertAiService();
  }

  /**
   * Mapeo de emociones a palabras clave para búsqueda de imágenes
   */
  private getEmotionKeywords(emotion: string): string[] {
    const emotionMap: { [key: string]: string[] } = {
      feliz: ["happy", "joy", "smile", "celebration", "positive"],
      triste: ["sad", "melancholy", "depression", "lonely", "crying"],
      enojado: ["angry", "rage", "frustrated", "mad", "furious"],
      emocionado: [
        "excited",
        "thrilled",
        "enthusiastic",
        "energetic",
        "pumped",
      ],
      relajado: ["calm", "peaceful", "serene", "tranquil", "zen"],
      nostálgico: ["nostalgic", "memories", "vintage", "retro", "sentimental"],
      motivado: ["motivated", "determined", "focused", "ambitious", "success"],
      ansioso: ["anxious", "worried", "nervous", "stressed", "tension"],
      romántico: ["romantic", "love", "couple", "heart", "passion"],
      melancólico: [
        "melancholy",
        "blue",
        "sorrowful",
        "pensive",
        "contemplative",
      ],
    };

    return emotionMap[emotion] || ["emotion", "feeling", "mood"];
  }

  /**
   * Obtiene una imagen de Pexels basada en la emoción
   */
  private async getImageByEmotion(emotion: string): Promise<string> {
    try {
      // Verificar si la API key está configurada correctamente
      if (!this.PEXELS_API_KEY || this.PEXELS_API_KEY.length < 20) {
        console.warn("API key de Pexels no configurada o inválida, usando fallback");
        return this.getFallbackImage(emotion);
      }

      const keywords = this.getEmotionKeywords(emotion);
      const randomKeyword =
        keywords[Math.floor(Math.random() * keywords.length)];

      const response = await axios.get(this.PEXELS_API_URL, {
        headers: {
          Authorization: this.PEXELS_API_KEY,
        },
        params: {
          query: randomKeyword,
          per_page: 20,
          page: 1,
        },
        timeout: 10000, // 10 segundos de timeout
      });

      if (response.data.photos && response.data.photos.length > 0) {
        const randomPhoto =
          response.data.photos[
            Math.floor(Math.random() * response.data.photos.length)
          ];
        return randomPhoto.src.medium || randomPhoto.src.large;
      }

      // Fallback a imagen por defecto si no hay resultados
      return this.getFallbackImage(emotion);
    } catch (error) {
      console.error("Error al obtener imagen de Pexels:", error);
      // Fallback a imagen por defecto en caso de error
      return this.getFallbackImage(emotion);
    }
  }

  /**
   * Obtiene una imagen de fallback basada en la emoción
   */
  private getFallbackImage(emotion: string): string {
    // Mapeo de emociones a colores para generar imágenes más apropiadas
    const emotionColors = {
      feliz: "yellow,orange,red",
      alegre: "yellow,orange",
      contento: "green,blue",
      enojado: "red,darkred",
      furioso: "red,black",
      frustrado: "gray,darkgray",
      triste: "blue,gray",
      melancólico: "blue,purple",
      deprimido: "black,gray",
      ansioso: "yellow,orange",
      estresado: "red,orange",
      nostálgico: "brown,sepia",
      relajado: "green,blue",
      calmado: "blue,white",
      zen: "white,lightblue",
      energético: "red,yellow",
      motivado: "orange,red",
      activo: "green,yellow",
      romántico: "pink,red",
      amoroso: "pink,white",
      tierno: "pink,lightblue",
      épico: "gold,yellow",
      heroico: "gold,red",
      grandioso: "purple,gold",
    };

    const colors = emotionColors[emotion.toLowerCase()] || "blue,green";
    const randomId = Math.floor(Math.random() * 1000);
    
    // Usar Unsplash como fallback más confiable
    return `https://source.unsplash.com/800x600/?${colors.replace(/,/g, ',')}&sig=${randomId}`;
  }

  /**
   * Genera música basada en sentimientos del usuario
   */
  generateMusicByEmotion = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { emotion } = req.body;
      const userId = req.user?.id;

      if (!emotion) {
        throw new AppError('El parámetro "emotion" es requerido', 400);
      }

      if (!userId) {
        throw new AppError("Usuario no autenticado", 401);
      }

      const existingMusic = await MusicModel.findOne({ userId, emotion });
      if (existingMusic) {
        return sendOk(res, {
          message: "Música generada exitosamente",
          music_id: existingMusic._id,
          status: existingMusic.status,
        });
      }

      // Generar música basada en la emoción (duración fija de 2 minutos)
      const trackData = await this.mubertService.generateMusicByEmotion(
        emotion
      );

      if (trackData !== null) {
        // Generar título, subtítulo e imagen basados en la emoción
        const { title, subtitle, image_url } = await this.generateMusicMetadata(
          emotion
        );

        const music = await MusicModel.create({
          userId,
          title,
          subtitle,
          emotion,
          duration: trackData.data.duration,
          trackId: trackData.data.id,
          status: trackData.data.generations[0]?.status || "processing",
          image_url,
        });

        return sendOk(res, {
          message: "Música generada exitosamente",
          music_id: music._id,
          status: music.status,
        });
      }
    } catch (error) {
      console.error("Error en generateMusicByEmotion:", error);

      if (error instanceof AppError) {
        return sendError(res, error.message, error.statusCode);
      }

      return sendError(
        res,
        "Error interno del servidor al generar música",
        500
      );
    }
  };

  getMusicById = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      
      if (!id) {
        return sendError(res, "El parámetro 'id' es requerido", 400);
      }

      const music = await MusicModel.findById(id)
        .select('_id title subtitle trackUrl image_url')
        .lean();

      if (!music) {
        return sendError(res, "Música no encontrada", 404);
      }

      // Retornar en el formato específico solicitado
      const response = {
        id: music._id,
        titulo: music.title,
        subtitulo: music.subtitle,
        music: music.trackUrl,
        imagen: music.image_url
      };

      return sendOk(res, response);
    } catch (error) {
      console.error("Error al obtener música por ID:", error);
      return sendError(res, "Error interno del servidor al obtener música", 500);
    }
  };

  getMusicByUser = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      const { page = 1, limit = 20 } = req.query; // Paginación para mejorar rendimiento
      const skip = (Number(page) - 1) * Number(limit);

      const music = await MusicModel.find({ userId })
        .select(
          "userId title subtitle emotion duration trackUrl status image_url"
        )
        .lean() // Optimización: retorna objetos planos en lugar de documentos Mongoose
        .sort({ createdAt: -1 }) // Ordenar por fecha de creación (más recientes primero)
        .skip(skip)
        .limit(Number(limit)); // Limitar resultados

      // Obtener el total para la paginación
      const total = await MusicModel.countDocuments({ userId });

      return sendOk(res, {
        music,
        pagination: {
          currentPage: Number(page),
          totalPages: Math.ceil(total / Number(limit)),
          totalItems: total,
          itemsPerPage: Number(limit),
        },
      });
    } catch (error) {
      return sendError(
        res,
        "Error interno del servidor al obtener música",
        500
      );
    }
  };

  getAllMusic = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { page = 1, limit = 20 } = req.query; // Paginación para mejorar rendimiento
      const skip = (Number(page) - 1) * Number(limit);

      const music = await MusicModel.find()
        .select(
          "userId title subtitle emotion duration trackUrl status image_url"
        )
        .populate("userId", "displayName fullName metroUsername")
        .lean() // Optimización: retorna objetos planos
        .sort({ createdAt: -1 }) // Ordenar por fecha de creación
        .skip(skip)
        .limit(Number(limit)); // Limitar resultados

      // Obtener el total para la paginación
      const total = await MusicModel.countDocuments();

      return sendOk(res, {
        music,
        pagination: {
          currentPage: Number(page),
          totalPages: Math.ceil(total / Number(limit)),
          totalItems: total,
          itemsPerPage: Number(limit),
        },
      });
    } catch (error) {
      return sendError(
        res,
        "Error interno del servidor al obtener todas las músicas",
        500
      );
    }
  };

  /**
   * Obtiene todas las músicas filtradas por emoción específica
   */
  getMusicByEmotion = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { emotion } = req.params;
      const { page = 1, limit = 20 } = req.query;
      const skip = (Number(page) - 1) * Number(limit);

      if (!emotion) {
        return sendError(res, "El parámetro 'emotion' es requerido", 400);
      }

      // Validar que la emoción sea válida
      const validEmotions = [
        "feliz",
        "alegre",
        "contento",
        "enojado",
        "furioso",
        "frustrado",
        "triste",
        "melancólico",
        "deprimido",
        "ansioso",
        "estresado",
        "nostálgico",
        "relajado",
        "calmado",
        "zen",
        "energético",
        "motivado",
        "activo",
        "romántico",
        "amoroso",
        "tierno",
        "épico",
        "heroico",
        "grandioso",
      ];

      if (!validEmotions.includes(emotion.toLowerCase())) {
        return sendError(
          res,
          `Emoción '${emotion}' no válida. Emociones válidas: ${validEmotions.join(
            ", "
          )}`,
          400
        );
      }

      // Buscar músicas por emoción
      const music = await MusicModel.find({
        emotion: emotion.toLowerCase(),
      })
        .select(
          "userId title subtitle emotion duration trackUrl status image_url createdAt"
        )
        .populate("userId", "displayName fullName metroUsername")
        .lean()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit));

      // Obtener el total para la paginación
      const total = await MusicModel.countDocuments({
        emotion: emotion.toLowerCase(),
      });

      return sendOk(res, {
        music,
        emotion: emotion.toLowerCase(),
        pagination: {
          currentPage: Number(page),
          totalPages: Math.ceil(total / Number(limit)),
          totalItems: total,
          itemsPerPage: Number(limit),
        },
      });
    } catch (error) {
      console.error("Error al obtener música por emoción:", error);
      return sendError(
        res,
        "Error interno del servidor al obtener música por emoción",
        500
      );
    }
  };

  /**
   * Genera metadatos (título, subtítulo, imagen) basados en la emoción
   */
  private async generateMusicMetadata(
    emotion: string
  ): Promise<{ title: string; subtitle: string; image_url: string }> {
    const emotionMetadata = {
      // Sentimientos positivos
      feliz: {
        titles: [
          "Alegría Vibrante",
          "Sonrisa Musical",
          "Día Soleado",
          "Momentos de Felicidad",
          "Brisa de Gozo",
        ],
        subtitles: [
          "Una melodía que eleva el espíritu",
          "Música para celebrar la vida",
          "Ritmos que contagian alegría",
          "Armonías de felicidad pura",
        ],
        imageKeywords: "happy music joy celebration bright colors",
      },
      alegre: {
        titles: [
          "Energía Positiva",
          "Ritmo Alegre",
          "Vibraciones Felices",
          "Melodía Optimista",
          "Sonrisa Musical",
        ],
        subtitles: [
          "Música que despierta la alegría",
          "Ritmos que llenan de energía",
          "Armonías de buen humor",
          "Melodías que contagian felicidad",
        ],
        imageKeywords: "cheerful music upbeat positive energy bright",
      },
      contento: {
        titles: [
          "Satisfacción Musical",
          "Paz Interior",
          "Momentos de Plenitud",
          "Armonía del Corazón",
          "Serenidad Sonora",
        ],
        subtitles: [
          "Música que calma el alma",
          "Melodías de bienestar",
          "Ritmos de tranquilidad",
          "Armonías de satisfacción",
        ],
        imageKeywords: "peaceful music contentment calm serene",
      },

      // Sentimientos negativos
      enojado: {
        titles: [
          "Furia Musical",
          "Ira Sonora",
          "Coraje Enfurecido",
          "Rage Melódico",
          "Frustración Explosiva",
        ],
        subtitles: [
          "Música que libera la ira",
          "Melodías de furia",
          "Ritmos de enojo",
          "Armonías de frustración",
        ],
        imageKeywords: "angry music rage fury frustrated",
      },
      furioso: {
        titles: [
          "Furia Explosiva",
          "Ira Desatada",
          "Coraje Feroz",
          "Rage Musical",
          "Furia Sonora",
        ],
        subtitles: [
          "Música que desata la furia",
          "Melodías de ira",
          "Ritmos de rabia",
          "Armonías de enojo",
        ],
        imageKeywords: "furious music rage anger intense",
      },
      frustrado: {
        titles: [
          "Frustración Musical",
          "Desesperación Sonora",
          "Agonía Melódica",
          "Tensión Musical",
          "Estrés Sonoro",
        ],
        subtitles: [
          "Música que refleja la frustración",
          "Melodías de tensión",
          "Ritmos de estrés",
          "Armonías de desesperación",
        ],
        imageKeywords: "frustrated music tension stress agony",
      },

      // Sentimientos tristes
      triste: {
        titles: [
          "Lágrimas Musicales",
          "Melancolía Profunda",
          "Corazón Herido",
          "Nostalgia Sonora",
          "Penumbra Melódica",
        ],
        subtitles: [
          "Música que acompaña el dolor",
          "Melodías de despedida",
          "Ritmos de soledad",
          "Armonías de tristeza",
        ],
        imageKeywords: "sad music melancholy blue tears emotional",
      },
      melancólico: {
        titles: [
          "Nostalgia Eterna",
          "Recuerdos Perdidos",
          "Melancolía Azul",
          "Sueños Rotos",
          "Penumbra del Alma",
        ],
        subtitles: [
          "Música que evoca el pasado",
          "Melodías de nostalgia",
          "Ritmos de añoranza",
          "Armonías melancólicas",
        ],
        imageKeywords: "melancholic music nostalgic blue memories",
      },
      deprimido: {
        titles: [
          "Oscuridad Musical",
          "Abismo Sonoro",
          "Penumbra del Alma",
          "Melancolía Profunda",
          "Tristeza Eterna",
        ],
        subtitles: [
          "Música que acompaña la oscuridad",
          "Melodías de desesperación",
          "Ritmos de tristeza",
          "Armonías de dolor",
        ],
        imageKeywords: "depressed music dark melancholy sorrow",
      },
      ansioso: {
        titles: [
          "Ansiedad Musical",
          "Nervios Sonoros",
          "Tensión Melódica",
          "Inquietud Musical",
          "Estrés Sonoro",
        ],
        subtitles: [
          "Música que refleja la ansiedad",
          "Melodías de tensión",
          "Ritmos nerviosos",
          "Armonías de inquietud",
        ],
        imageKeywords: "anxious music nervous tension stress",
      },
      estresado: {
        titles: [
          "Estrés Musical",
          "Tensión Sonora",
          "Presión Melódica",
          "Agobio Musical",
          "Carga Sonora",
        ],
        subtitles: [
          "Música que libera el estrés",
          "Melodías de tensión",
          "Ritmos de presión",
          "Armonías de alivio",
        ],
        imageKeywords: "stressed music tension pressure relief",
      },
      nostálgico: {
        titles: [
          "Tiempo Perdido",
          "Memorias Doradas",
          "Ayer Musical",
          "Recuerdos de Ayer",
          "Nostalgia Sonora",
        ],
        subtitles: [
          "Música que revive el pasado",
          "Melodías de añoranza",
          "Ritmos de nostalgia",
          "Armonías de recuerdos",
        ],
        imageKeywords: "nostalgic music memories vintage retro",
      },

      // Sentimientos relajados
      relajado: {
        titles: [
          "Paz Interior",
          "Serenidad Musical",
          "Momentos de Calma",
          "Armonía Zen",
          "Tranquilidad Sonora",
        ],
        subtitles: [
          "Música para relajar el alma",
          "Melodías de paz interior",
          "Ritmos de tranquilidad",
          "Armonías de calma",
        ],
        imageKeywords: "relaxing music peaceful calm zen meditation",
      },
      calmado: {
        titles: [
          "Calma Profunda",
          "Serenidad Eterna",
          "Paz Musical",
          "Tranquilidad Absoluta",
          "Armonía del Silencio",
        ],
        subtitles: [
          "Música que calma los nervios",
          "Melodías de serenidad",
          "Ritmos de tranquilidad",
          "Armonías de calma",
        ],
        imageKeywords: "calm music peaceful serene tranquil",
      },
      zen: {
        titles: [
          "Meditación Musical",
          "Zen Sonoro",
          "Iluminación Melódica",
          "Armonía Zen",
          "Paz Interior",
        ],
        subtitles: [
          "Música para meditar",
          "Melodías zen",
          "Ritmos de iluminación",
          "Armonías de paz",
        ],
        imageKeywords: "zen music meditation spiritual peaceful",
      },

      // Sentimientos energéticos
      energético: {
        titles: [
          "Energía Pura",
          "Fuerza Musical",
          "Poder Sonoro",
          "Vibraciones Intensas",
          "Ritmo Explosivo",
        ],
        subtitles: [
          "Música que despierta la energía",
          "Ritmos de poder",
          "Melodías intensas",
          "Armonías de fuerza",
        ],
        imageKeywords: "energetic music power energy intense dynamic",
      },
      motivado: {
        titles: [
          "Motivación Musical",
          "Fuerza de Voluntad",
          "Determinación Sonora",
          "Coraje Melódico",
          "Espíritu de Lucha",
        ],
        subtitles: [
          "Música que motiva",
          "Ritmos de determinación",
          "Melodías de coraje",
          "Armonías de fuerza",
        ],
        imageKeywords: "motivational music determination courage strength",
      },
      activo: {
        titles: [
          "Actividad Musical",
          "Movimiento Sonoro",
          "Dinamismo Melódico",
          "Ritmo Activo",
          "Energía en Movimiento",
        ],
        subtitles: [
          "Música para mantenerse activo",
          "Ritmos dinámicos",
          "Melodías de movimiento",
          "Armonías de actividad",
        ],
        imageKeywords: "active music dynamic movement energetic",
      },

      // Sentimientos románticos
      romántico: {
        titles: [
          "Amor Eterno",
          "Corazones Unidos",
          "Pasión Musical",
          "Romance Sonoro",
          "Amor Verdadero",
        ],
        subtitles: [
          "Música para enamorados",
          "Melodías de amor",
          "Ritmos románticos",
          "Armonías de pasión",
        ],
        imageKeywords: "romantic music love hearts passion couple",
      },
      amoroso: {
        titles: [
          "Amor Puro",
          "Corazón Abierto",
          "Pasión Musical",
          "Romance Eterno",
          "Amor Verdadero",
        ],
        subtitles: [
          "Música que habla de amor",
          "Melodías de cariño",
          "Ritmos de ternura",
          "Armonías de amor",
        ],
        imageKeywords: "loving music affection tender romance",
      },
      tierno: {
        titles: [
          "Ternura Musical",
          "Corazón Tierno",
          "Amor Dulce",
          "Cariño Sonoro",
          "Dulzura Melódica",
        ],
        subtitles: [
          "Música llena de ternura",
          "Melodías de cariño",
          "Ritmos dulces",
          "Armonías de amor",
        ],
        imageKeywords: "tender music sweet affection gentle",
      },

      // Sentimientos épicos
      épico: {
        titles: [
          "Épica Musical",
          "Leyenda Sonora",
          "Grandeza Melódica",
          "Hazaña Musical",
          "Épica Eterna",
        ],
        subtitles: [
          "Música de grandes hazañas",
          "Melodías épicas",
          "Ritmos de grandeza",
          "Armonías legendarias",
        ],
        imageKeywords: "epic music heroic grand orchestral cinematic",
      },
      heroico: {
        titles: [
          "Héroe Musical",
          "Coraje Sonoro",
          "Valor Melódico",
          "Espíritu Heroico",
          "Leyenda Viva",
        ],
        subtitles: [
          "Música de héroes",
          "Melodías de coraje",
          "Ritmos de valor",
          "Armonías heroicas",
        ],
        imageKeywords: "heroic music courage bravery strength",
      },
      grandioso: {
        titles: [
          "Grandeza Musical",
          "Majestad Sonora",
          "Nobleza Melódica",
          "Sublime Musical",
          "Grandeza Eterna",
        ],
        subtitles: [
          "Música de grandeza",
          "Melodías majestuosas",
          "Ritmos nobles",
          "Armonías sublimes",
        ],
        imageKeywords: "grand music majestic noble sublime",
      },

      // Sentimientos misteriosos
      misterioso: {
        titles: [
          "Misterio Musical",
          "Enigma Sonoro",
          "Secreto Melódico",
          "Misterio Eterno",
          "Intriga Musical",
        ],
        subtitles: [
          "Música llena de misterio",
          "Melodías enigmáticas",
          "Ritmos secretos",
          "Armonías misteriosas",
        ],
        imageKeywords: "mysterious music enigma secret dark",
      },
      enigmático: {
        titles: [
          "Enigma Musical",
          "Misterio Sonoro",
          "Puzzle Melódico",
          "Enigma Eterno",
          "Intriga Sonora",
        ],
        subtitles: [
          "Música enigmática",
          "Melodías de misterio",
          "Ritmos intrigantes",
          "Armonías secretas",
        ],
        imageKeywords: "enigmatic music puzzle mystery intrigue",
      },
      intrigante: {
        titles: [
          "Intriga Musical",
          "Suspenso Sonoro",
          "Misterio Melódico",
          "Intriga Eterna",
          "Suspense Musical",
        ],
        subtitles: [
          "Música intrigante",
          "Melodías de suspenso",
          "Ritmos misteriosos",
          "Armonías de intriga",
        ],
        imageKeywords: "intriguing music suspense mystery thriller",
      },

      // Sentimientos divertidos
      divertido: {
        titles: [
          "Diversión Musical",
          "Risa Sonora",
          "Juego Melódico",
          "Diversión Eterna",
          "Ritmo Divertido",
        ],
        subtitles: [
          "Música para divertirse",
          "Melodías de risa",
          "Ritmos juguetones",
          "Armonías divertidas",
        ],
        imageKeywords: "fun music playful joy laughter entertainment",
      },
      juguetón: {
        titles: [
          "Juego Musical",
          "Diversión Sonora",
          "Ritmo Juguetón",
          "Juego Eterno",
          "Diversión Melódica",
        ],
        subtitles: [
          "Música juguetona",
          "Melodías de juego",
          "Ritmos divertidos",
          "Armonías de diversión",
        ],
        imageKeywords: "playful music fun game joy entertainment",
      },

      // Sentimientos serios
      serio: {
        titles: [
          "Seriedad Musical",
          "Formalidad Sonora",
          "Solemnidad Melódica",
          "Serio y Formal",
          "Ritmo Serio",
        ],
        subtitles: [
          "Música seria y formal",
          "Melodías solemnes",
          "Ritmos formales",
          "Armonías serias",
        ],
        imageKeywords: "serious music formal solemn professional",
      },
      profesional: {
        titles: [
          "Profesional Musical",
          "Formalidad Sonora",
          "Seriedad Melódica",
          "Profesionalismo",
          "Ritmo Formal",
        ],
        subtitles: [
          "Música profesional",
          "Melodías formales",
          "Ritmos serios",
          "Armonías profesionales",
        ],
        imageKeywords: "professional music business formal corporate",
      },
      formal: {
        titles: [
          "Formalidad Musical",
          "Seriedad Sonora",
          "Ritmo Formal",
          "Formalidad Eterna",
          "Solemnidad Musical",
        ],
        subtitles: [
          "Música formal",
          "Melodías serias",
          "Ritmos solemnes",
          "Armonías formales",
        ],
        imageKeywords: "formal music serious solemn official",
      },
    };

    const metadata =
      emotionMetadata[emotion.toLowerCase()] || emotionMetadata["feliz"];

    // Seleccionar aleatoriamente título y subtítulo
    const title =
      metadata.titles[Math.floor(Math.random() * metadata.titles.length)];
    const subtitle =
      metadata.subtitles[Math.floor(Math.random() * metadata.subtitles.length)];

    // Generar URL de imagen basada en la emoción usando Pexels API
    const image_url = await this.getImageByEmotion(emotion);

    return { title, subtitle, image_url };
  }

  /**
   * Endpoint para recibir notificaciones del webhook de Mubert
   */
  handleWebhook = async (req: any, res: Response) => {
    try {
      const webhookData = req.body;

      console.log(
        "Webhook recibido de Mubert:",
        JSON.stringify(webhookData, null, 2)
      );

      // El webhook puede recibir un array de objetos o un objeto único
      const webhookArray = Array.isArray(webhookData)
        ? webhookData
        : [webhookData];

      // Procesar cada elemento del webhook
      for (const webhookItem of webhookArray) {
        // Verificar que tenemos los datos necesarios
        if (!webhookItem.id || !webhookItem.generations) {
          console.log("Datos del webhook inválidos para item:", webhookItem);
          continue;
        }

        const trackId = webhookItem.id;
        const generations = webhookItem.generations;

        // Buscar la música en la base de datos
        const music = await MusicModel.findOne({ trackId });

        if (!music) {
          console.log(`No se encontró música con trackId: ${trackId}`);
          continue;
        }

        // Actualizar el estado y URL si está disponible
        const completedGeneration = generations.find(
          (gen: any) => gen.status === "done"
        );

        if (completedGeneration && completedGeneration.url) {
          const url = await this.downloadMusic(completedGeneration.url);
          await MusicModel.updateOne(
            { trackId },
            {
              status: "completed",
              trackUrl: url,
              generatedAt: completedGeneration.generated_at,
              expiredAt: completedGeneration.expired_at,
            }

          );

          console.log(
            `Música ${trackId} completada. URL: ${completedGeneration.url}`
          );
        } else {
          // Actualizar solo el estado si no está completada
          const currentStatus = generations[0]?.status || "processing";
          await MusicModel.updateOne({ trackId }, { status: currentStatus });
          console.log(
            `Música ${trackId} actualizada con estado: ${currentStatus}`
          );
        }
      }

      return sendOk(res, { message: "Webhook procesado exitosamente" });
    } catch (error) {
      console.error("Error procesando webhook:", error);
      return sendError(res, "Error interno del servidor", 500);
    }
  };

  downloadMusic = async (url: string): Promise<string> => {
    try {
      const response = await axios.get(url, { responseType: 'stream' });
      
      // Crear directorio uploads/radio-ai si no existe
      const uploadsDir = path.join(process.cwd(), 'uploads', 'radio-ai');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      
      // Generar nombre único para el archivo
      const uniqueId = uuidv4();
      const fileName = `audio_${uniqueId}.mp3`;
      const filePath = path.join(uploadsDir, fileName);
      
      // Crear stream de escritura
      const writer = fs.createWriteStream(filePath);
      
      // Pipe del stream de respuesta al archivo
      response.data.pipe(writer);
      
      // Retornar una promesa que se resuelve cuando se completa la escritura
      return new Promise((resolve, reject) => {
        writer.on('finish', () => {
          // Construir la URL del archivo guardado
          const fileUrl = `/uploads/radio-ai/${fileName}`;
          console.log(`Audio guardado exitosamente en: ${fileUrl}`);
          resolve(fileUrl);
        });
        
        writer.on('error', (error) => {
          console.error("Error al escribir el archivo:", error);
          reject(new AppError("Error al guardar el archivo de audio", 500));
        });
        
        response.data.on('error', (error) => {
          console.error("Error en el stream de descarga:", error);
          reject(new AppError("Error al descargar el audio", 500));
        });
      });
    } catch (error) {
      console.error("Error al descargar música:", error);
      throw new AppError("Error al descargar música", 500);
    }
  }

  /**
   * Configura el webhook para recibir notificaciones
   */
  setupWebhook = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { webhookUrl } = req.body;

      if (!webhookUrl) {
        throw new AppError("La URL del webhook es requerida", 400);
      }

      const result = await this.mubertService.setupWebhook(webhookUrl);

      return sendOk(res, {
        message: "Webhook configurado exitosamente",
        webhook: result,
      });
    } catch (error) {
      console.error("Error configurando webhook:", error);

      if (error instanceof AppError) {
        return sendError(res, error.message, error.statusCode);
      }

      return sendError(res, "Error interno del servidor", 500);
    }
  };


  // ========== MÉTODOS ADMIN ==========

/**
 * Obtiene todas las músicas con filtros para admin
 */
getAdminMusic = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { search, emotion, status, userId, page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const filter: any = {};

    // Filtro de búsqueda
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { subtitle: { $regex: search, $options: 'i' } },
        { emotion: { $regex: search, $options: 'i' } },
      ];
    }

    // Filtros específicos
    if (emotion && emotion !== 'all') filter.emotion = emotion;
    if (status && status !== 'all') filter.status = status;
    if (userId) filter.userId = userId;

    const music = await MusicModel.find(filter)
      .populate('userId', 'displayName fullName metroUsername email')
      .lean()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await MusicModel.countDocuments(filter);

    return sendOk(res, {
      music,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(total / Number(limit)),
        totalItems: total,
        itemsPerPage: Number(limit),
      },
    });
  } catch (error) {
    console.error('Error obteniendo música admin:', error);
    return sendError(res, 'Error interno del servidor', 500);
  }
};

/**
 * Obtiene estadísticas para el panel admin
 */
getAdminStats = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const totalMusic = await MusicModel.countDocuments();
    const totalUsers = await MusicModel.distinct('userId').then((ids) => ids.length);

    // Estadísticas por estado
    const statusStats = await MusicModel.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    // Estadísticas por emoción
    const emotionStats = await MusicModel.aggregate([
      {
        $group: {
          _id: '$emotion',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);

    // Música reciente (últimos 7 días)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentMusic = await MusicModel.countDocuments({
      createdAt: { $gte: sevenDaysAgo },
    });

    return sendOk(res, {
      totalMusic,
      totalUsers,
      recentMusic,
      statusDistribution: statusStats,
      emotionDistribution: emotionStats,
    });
  } catch (error) {
    console.error('Error obteniendo estadísticas admin:', error);
    return sendError(res, 'Error interno del servidor', 500);
  }
};

/**
 * Actualiza metadata de una música
 */
updateMusic = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { title, subtitle, image_url, emotion } = req.body;

    const updateData: any = {};
    if (title) updateData.title = title;
    if (subtitle) updateData.subtitle = subtitle;
    if (image_url) updateData.image_url = image_url;
    if (emotion) updateData.emotion = emotion;

    const music = await MusicModel.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).populate('userId', 'displayName fullName metroUsername email');

    if (!music) {
      return sendError(res, 'Música no encontrada', 404);
    }

    return sendOk(res, music);
  } catch (error) {
    console.error('Error actualizando música:', error);
    return sendError(res, 'Error interno del servidor', 500);
  }
};

/**
 * Cambia el estado de una música (processing/completed/failed)
 */
toggleMusicStatus = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const music = await MusicModel.findById(id);
    if (!music) {
      return sendError(res, 'Música no encontrada', 404);
    }

    // Ciclo de estados: processing -> completed -> failed -> processing
    const statusCycle = {
      processing: 'completed',
      completed: 'failed',
      failed: 'processing',
    };

    music.status = statusCycle[music.status] || 'processing';
    await music.save();

    const updatedMusic = await MusicModel.findById(id).populate(
      'userId',
      'displayName fullName metroUsername email'
    );

    return sendOk(res, updatedMusic);
  } catch (error) {
    console.error('Error cambiando estado:', error);
    return sendError(res, 'Error interno del servidor', 500);
  }
};

/**
 * Elimina una música
 */
deleteMusic = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const music = await MusicModel.findById(id);
    if (!music) {
      return sendError(res, 'Música no encontrada', 404);
    }

    // Aquí podrías agregar validaciones adicionales
    // Por ejemplo: no eliminar si tiene feedback positivo, etc.

    await MusicModel.findByIdAndDelete(id);

    return sendOk(res, { id });
  } catch (error) {
    console.error('Error eliminando música:', error);
    return sendError(res, 'Error interno del servidor', 500);
  }
};
}
