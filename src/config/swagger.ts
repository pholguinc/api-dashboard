import swaggerJsdoc from 'swagger-jsdoc';
import { env } from './env';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'TeleMetro PE API',
      version: '1.0.0',
      description: 'API completa para la plataforma TeleMetro PE - Sistema de streaming, clips, puntos, marketplace y más',
      contact: {
        name: 'TeleMetro PE Team',
        email: 'support@telemetro.pe'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: env.nodeEnv === 'production'
          ? 'https://api-dashboard.telemetro.pe'
          : `http://localhost:${env.port}`,
        description: env.nodeEnv === 'production' ? 'Servidor de Producción' : 'Servidor de Desarrollo'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Token JWT obtenido del endpoint de autenticación'
        },
        adminAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Token JWT de administrador'
        }
      },
      schemas: {
        // Respuestas estándar
        SuccessResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true
            },
            data: {
              type: 'object',
              description: 'Datos de respuesta'
            },
            error: {
              type: 'null',
              example: null
            },
            meta: {
              type: 'object',
              properties: {
                timestamp: {
                  type: 'string',
                  format: 'date-time',
                  example: '2024-01-15T10:30:00.000Z'
                }
              }
            }
          }
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            data: {
              type: 'null',
              example: null
            },
            error: {
              type: 'object',
              properties: {
                message: {
                  type: 'string',
                  example: 'Mensaje de error'
                },
                code: {
                  type: 'string',
                  example: 'ERROR_CODE'
                }
              }
            },
            meta: {
              type: 'object',
              properties: {
                timestamp: {
                  type: 'string',
                  format: 'date-time',
                  example: '2024-01-15T10:30:00.000Z'
                }
              }
            }
          }
        },
        // Modelos de datos
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'objectId',
              example: '507f1f77bcf86cd799439011'
            },
            displayName: {
              type: 'string',
              example: 'Juan Pérez'
            },
            metroUsername: {
              type: 'string',
              example: 'juan_perez'
            },
            fullName: {
              type: 'string',
              example: 'Juan Carlos Pérez García'
            },
            email: {
              type: 'string',
              format: 'email',
              example: 'juan@example.com'
            },
            phone: {
              type: 'string',
              example: '+51987654321'
            },
            role: {
              type: 'string',
              enum: ['user', 'moderator', 'admin', 'metro_streamer'],
              example: 'user'
            },
            pointsSmart: {
              type: 'number',
              example: 1500
            },
            avatarUrl: {
              type: 'string',
              format: 'uri',
              example: 'https://example.com/avatar.jpg'
            },
            isProfileComplete: {
              type: 'boolean',
              example: true
            },
            isPremium: {
              type: 'boolean',
              example: false
            },
            referralCode: {
              type: 'string',
              example: 'REF123456'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-15T10:30:00.000Z'
            }
          }
        },
        Stream: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'objectId',
              example: '507f1f77bcf86cd799439011'
            },
            title: {
              type: 'string',
              example: 'Stream de gaming'
            },
            description: {
              type: 'string',
              example: 'Jugando el nuevo juego'
            },
            category: {
              type: 'string',
              enum: ['IRL', 'Gaming', 'Music', 'Art', 'Food', 'Tech', 'Dance', 'Freestyle'],
              example: 'Gaming'
            },
            status: {
              type: 'string',
              enum: ['offline', 'starting', 'live', 'ending'],
              example: 'live'
            },
            streamerId: {
              type: 'string',
              format: 'objectId',
              example: '507f1f77bcf86cd799439012'
            },
            viewerCount: {
              type: 'integer',
              example: 150
            },
            maxViewers: {
              type: 'integer',
              example: 200
            },
            totalDonations: {
              type: 'number',
              example: 500.50
            },
            streamKey: {
              type: 'string',
              example: 'abc123def456...'
            },
            hlsUrl: {
              type: 'string',
              format: 'uri',
              example: 'https://streaming.telemetro.pe/live/abc123def456/index.m3u8'
            },
            quality: {
              type: 'object',
              properties: {
                resolution: {
                  type: 'string',
                  example: '720p'
                },
                bitrate: {
                  type: 'integer',
                  example: 2500
                },
                fps: {
                  type: 'integer',
                  example: 30
                }
              }
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-15T10:30:00.000Z'
            },
            startedAt: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-15T10:30:00.000Z'
            }
          }
        },
        MarketplaceProduct: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'objectId',
              example: '507f1f77bcf86cd799439011'
            },
            name: {
              type: 'string',
              example: 'Descuento 20% en restaurante'
            },
            description: {
              type: 'string',
              example: 'Descuento del 20% en cualquier plato del restaurante'
            },
            category: {
              type: 'string',
              enum: ['digital', 'physical', 'premium', 'food_drink', 'entertainment', 'transport', 'services', 'shopping', 'health', 'education', 'other'],
              example: 'entertainment'
            },
            price: {
              type: 'integer',
              example: 500
            },
            originalPrice: {
              type: 'integer',
              example: 1000
            },
            discount: {
              type: 'number',
              example: 0.2
            },
            imageUrl: {
              type: 'string',
              format: 'uri',
              example: 'https://example.com/image.jpg'
            },
            isActive: {
              type: 'boolean',
              example: true
            },
            stock: {
              type: 'integer',
              example: 100
            },
            redeemed: {
              type: 'integer',
              example: 25
            },
            merchant: {
              type: 'object',
              properties: {
                name: {
                  type: 'string',
                  example: 'Restaurante El Buen Sabor'
                },
                address: {
                  type: 'string',
                  example: 'Av. Principal 123, Lima'
                },
                phone: {
                  type: 'string',
                  example: '+51987654321'
                }
              }
            },
            validUntil: {
              type: 'string',
              format: 'date-time',
              example: '2024-12-31T23:59:59.000Z'
            }
          }
        },
        Subscription: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'objectId',
              example: '507f1f77bcf86cd799439011'
            },
            userId: {
              type: 'string',
              format: 'objectId',
              example: '507f1f77bcf86cd799439012'
            },
            plan: {
              type: 'string',
              enum: ['monthly', 'quarterly', 'yearly'],
              example: 'monthly'
            },
            status: {
              type: 'string',
              enum: ['active', 'pending', 'cancelled', 'expired'],
              example: 'active'
            },
            price: {
              type: 'number',
              example: 15.90
            },
            currency: {
              type: 'string',
              example: 'PEN'
            },
            startDate: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-15T10:30:00.000Z'
            },
            endDate: {
              type: 'string',
              format: 'date-time',
              example: '2024-02-15T10:30:00.000Z'
            },
            paymentMethod: {
              type: 'string',
              enum: ['card', 'yape', 'plin', 'bank_transfer'],
              example: 'card'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-15T10:30:00.000Z'
            }
          }
        },
        Clip: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'objectId',
              example: '507f1f77bcf86cd799439011'
            },
            title: {
              type: 'string',
              maxLength: 100,
              example: 'clip prueba',
              description: 'Título del clip'
            },
            description: {
              type: 'string',
              maxLength: 500,
              example: 'clip prueba',
              description: 'Descripción del clip'
            },
            category: {
              type: 'string',
              enum: ['comedy', 'music', 'dance', 'food', 'travel', 'news', 'sports', 'education'],
              example: 'comedy',
              description: 'Categoría del clip'
            },
            youtubeId: {
              type: 'string',
              example: 'clip_1767932451048_tem69zvns',
              description: 'ID único del video'
            },
            youtubeUrl: {
              type: 'string',
              format: 'uri',
              example: 'https://api-dashboard.telemetro.pe/uploads/ads/ad-video-1767932452212-42695974.mp4',
              description: 'URL del video'
            },
            thumbnailUrl: {
              type: 'string',
              format: 'uri',
              example: 'https://via.placeholder.com/640x360.png?text=No+Thumbnail',
              description: 'URL de la imagen de portada'
            },
            duration: {
              type: 'integer',
              minimum: 1,
              maximum: 180,
              example: 30,
              description: 'Duración del clip en segundos'
            },
            creator: {
              type: 'object',
              properties: {
                name: {
                  type: 'string',
                  maxLength: 100,
                  example: 'clip prueba',
                  description: 'Nombre del creador'
                },
                channel: {
                  type: 'string',
                  maxLength: 100,
                  example: 'clip prueba',
                  description: 'Canal del creador'
                },
                avatarUrl: {
                  type: 'string',
                  format: 'uri',
                  example: 'https://example.com/avatar.jpg',
                  description: 'URL del avatar del creador'
                }
              },
              required: ['name', 'channel'],
              description: 'Información del creador del clip'
            },
            status: {
              type: 'string',
              enum: ['draft', 'active', 'paused', 'reported', 'removed'],
              default: 'draft',
              example: 'draft',
              description: 'Estado del clip'
            },
            isVertical: {
              type: 'boolean',
              default: true,
              example: true,
              description: 'Si el video es vertical (formato shorts)'
            },
            quality: {
              type: 'string',
              enum: ['low', 'medium', 'high', 'hd'],
              default: 'medium',
              example: 'medium',
              description: 'Calidad del video'
            },
            hashtags: {
              type: 'array',
              items: {
                type: 'string',
                maxLength: 30
              },
              example: ['clip prueba'],
              description: 'Lista de hashtags del clip'
            },
            priority: {
              type: 'integer',
              minimum: 1,
              maximum: 10,
              default: 1,
              example: 1,
              description: 'Prioridad del clip (1-10)'
            },
            isFeatured: {
              type: 'boolean',
              default: false,
              example: true,
              description: 'Si el clip está destacado'
            },
            isApproved: {
              type: 'boolean',
              example: true,
              description: 'Si el clip está aprobado'
            },
            views: {
              type: 'number',
              example: 1250,
              description: 'Número de vistas'
            },
            likes: {
              type: 'number',
              example: 89,
              description: 'Número de likes'
            },
            shares: {
              type: 'number',
              example: 12,
              description: 'Número de compartidos'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-15T10:30:00.000Z'
            }
          },
          required: ['title', 'description', 'category', 'youtubeId', 'youtubeUrl', 'thumbnailUrl', 'duration', 'creator']
        },
        // Parámetros comunes
        PaginationQuery: {
          type: 'object',
          properties: {
            page: {
              type: 'integer',
              minimum: 1,
              default: 1,
              example: 1
            },
            limit: {
              type: 'integer',
              minimum: 1,
              maximum: 100,
              default: 10,
              example: 10
            }
          }
        },
        ObjectIdParam: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'objectId',
              example: '507f1f77bcf86cd799439011'
            }
          },
          required: ['id']
        },
        // Esquemas de respuesta específicos
        MarketplaceListResponse: {
          allOf: [
            { $ref: '#/components/schemas/SuccessResponse' },
            {
              type: 'object',
              properties: {
                data: {
                  type: 'object',
                  properties: {
                    products: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/MarketplaceProduct' }
                    },
                    pagination: {
                      $ref: '#/components/schemas/PaginationInfo'
                    }
                  }
                }
              }
            }
          ]
        },
        UsersListResponse: {
          allOf: [
            { $ref: '#/components/schemas/SuccessResponse' },
            {
              type: 'object',
              properties: {
                data: {
                  type: 'object',
                  properties: {
                    users: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/User' }
                    },
                    pagination: {
                      $ref: '#/components/schemas/PaginationInfo'
                    }
                  }
                }
              }
            }
          ]
        },
        StreamsListResponse: {
          allOf: [
            { $ref: '#/components/schemas/SuccessResponse' },
            {
              type: 'object',
              properties: {
                data: {
                  type: 'object',
                  properties: {
                    streams: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Stream' }
                    },
                    pagination: {
                      $ref: '#/components/schemas/PaginationInfo'
                    }
                  }
                }
              }
            }
          ]
        },
        SubscriptionsListResponse: {
          allOf: [
            { $ref: '#/components/schemas/SuccessResponse' },
            {
              type: 'object',
              properties: {
                data: {
                  type: 'object',
                  properties: {
                    subscriptions: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Subscription' }
                    },
                    pagination: {
                      $ref: '#/components/schemas/PaginationInfo'
                    }
                  }
                }
              }
            }
          ]
        },
        PaginationInfo: {
          type: 'object',
          properties: {
            page: {
              type: 'integer',
              example: 1
            },
            limit: {
              type: 'integer',
              example: 10
            },
            total: {
              type: 'integer',
              example: 100
            },
            totalPages: {
              type: 'integer',
              example: 10
            }
          }
        },
        // Radio AI Schemas
        MoodAnalysisRequest: {
          type: 'object',
          required: ['input', 'method'],
          properties: {
            input: {
              type: 'string',
              description: 'Texto o descripción del estado de ánimo',
              example: 'Me siento muy feliz hoy, acabo de recibir buenas noticias'
            },
            method: {
              type: 'string',
              enum: ['voice', 'text', 'selection'],
              description: 'Método de entrada del usuario',
              example: 'text'
            },
            user_id: {
              type: 'string',
              format: 'objectId',
              description: 'ID del usuario (opcional)',
              example: '507f1f77bcf86cd799439011'
            }
          }
        },
        MoodAnalysisResponse: {
          type: 'object',
          properties: {
            session_id: {
              type: 'string',
              description: 'ID de la sesión de análisis',
              example: 'session_123456789'
            },
            mood: {
              type: 'string',
              enum: ['triste', 'feliz', 'enojado', 'relajado', 'pensativo', 'motivado', 'nostalgico', 'energico'],
              description: 'Estado de ánimo detectado',
              example: 'feliz'
            },
            intensity: {
              type: 'number',
              minimum: 1,
              maximum: 10,
              description: 'Intensidad del estado de ánimo (1-10)',
              example: 8
            },
            confidence: {
              type: 'number',
              minimum: 0,
              maximum: 1,
              description: 'Nivel de confianza del análisis (0-1)',
              example: 0.92
            },
            emotions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  emotion: {
                    type: 'string',
                    example: 'joy'
                  },
                  score: {
                    type: 'number',
                    example: 0.85
                  }
                }
              }
            },
            analysis_details: {
              type: 'object',
              properties: {
                keywords: {
                  type: 'array',
                  items: { type: 'string' },
                  example: ['feliz', 'buenas noticias', 'alegría']
                },
                sentiment_score: {
                  type: 'number',
                  example: 0.8
                },
                language: {
                  type: 'string',
                  example: 'es'
                }
              }
            }
          }
        },
        MusicGenerationRequest: {
          type: 'object',
          required: ['session_id', 'mood', 'intensity'],
          properties: {
            session_id: {
              type: 'string',
              description: 'ID de la sesión de análisis',
              example: 'session_123456789'
            },
            mood: {
              type: 'string',
              enum: ['triste', 'feliz', 'enojado', 'relajado', 'pensativo', 'motivado', 'nostalgico', 'energico'],
              description: 'Estado de ánimo para generar música',
              example: 'feliz'
            },
            intensity: {
              type: 'number',
              minimum: 1,
              maximum: 10,
              description: 'Intensidad del estado de ánimo',
              example: 8
            },
            genre_preference: {
              type: 'string',
              enum: ['rock', 'pop', 'clasica', 'electronica', 'jazz', 'reggaeton', 'salsa', 'cumbia', 'indie', 'ambient'],
              description: 'Preferencia de género musical (opcional)',
              example: 'pop'
            },
            duration: {
              type: 'number',
              description: 'Duración deseada en segundos (opcional)',
              example: 180
            }
          }
        },
        MusicGenerationResponse: {
          type: 'object',
          properties: {
            session_id: {
              type: 'string',
              description: 'ID de la sesión',
              example: 'session_123456789'
            },
            tracks: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: {
                    type: 'string',
                    description: 'ID único del track',
                    example: 'track_abc123'
                  },
                  title: {
                    type: 'string',
                    description: 'Título de la canción',
                    example: 'Alegría Vibrante'
                  },
                  audio_url: {
                    type: 'string',
                    format: 'uri',
                    description: 'URL del archivo de audio',
                    example: 'https://api.telemetro.pe/uploads/radio-ai/audio/track_abc123.mp3'
                  },
                  duration: {
                    type: 'number',
                    description: 'Duración en segundos',
                    example: 180
                  },
                  genre: {
                    type: 'string',
                    description: 'Género musical',
                    example: 'pop'
                  },
                  tempo: {
                    type: 'number',
                    description: 'BPM del track',
                    example: 120
                  },
                  key: {
                    type: 'string',
                    description: 'Tonalidad musical',
                    example: 'C Major'
                  },
                  mood_match: {
                    type: 'number',
                    minimum: 0,
                    maximum: 1,
                    description: 'Coincidencia con el estado de ánimo (0-1)',
                    example: 0.95
                  },
                  created_at: {
                    type: 'string',
                    format: 'date-time',
                    description: 'Fecha de creación',
                    example: '2024-01-15T10:30:00.000Z'
                  }
                }
              }
            },
            generation_info: {
              type: 'object',
              properties: {
                provider: {
                  type: 'string',
                  description: 'Proveedor de IA utilizado',
                  example: 'mubert'
                },
                generation_time: {
                  type: 'number',
                  description: 'Tiempo de generación en segundos',
                  example: 15.5
                },
                cache_hit: {
                  type: 'boolean',
                  description: 'Si se utilizó cache',
                  example: false
                }
              }
            }
          }
        },
        RadioAiFeedbackRequest: {
          type: 'object',
          required: ['session_id', 'liked'],
          properties: {
            session_id: {
              type: 'string',
              description: 'ID de la sesión',
              example: 'session_123456789'
            },
            liked: {
              type: 'boolean',
              description: 'Si al usuario le gustó la música',
              example: true
            },
            rating: {
              type: 'number',
              minimum: 1,
              maximum: 5,
              description: 'Calificación del 1 al 5 (opcional)',
              example: 4
            },
            comment: {
              type: 'string',
              description: 'Comentario del usuario (opcional)',
              example: 'Me encantó esta canción, muy relajante'
            },
            listening_duration: {
              type: 'number',
              description: 'Tiempo de escucha en segundos (opcional)',
              example: 120
            }
          }
        },
        RadioAiStatsResponse: {
          type: 'object',
          properties: {
            total_sessions: {
              type: 'number',
              description: 'Total de sesiones de análisis',
              example: 1250
            },
            total_tracks_generated: {
              type: 'number',
              description: 'Total de tracks generados',
              example: 3420
            },
            average_generation_time: {
              type: 'number',
              description: 'Tiempo promedio de generación en segundos',
              example: 12.5
            },
            cache_hit_rate: {
              type: 'number',
              description: 'Tasa de acierto del cache (0-1)',
              example: 0.65
            },
            mood_distribution: {
              type: 'object',
              description: 'Distribución de estados de ánimo',
              properties: {
                feliz: { type: 'number', example: 450 },
                triste: { type: 'number', example: 200 },
                relajado: { type: 'number', example: 300 },
                energico: { type: 'number', example: 300 }
              }
            },
            user_satisfaction: {
              type: 'object',
              properties: {
                average_rating: {
                  type: 'number',
                  description: 'Calificación promedio',
                  example: 4.2
                },
                total_feedback: {
                  type: 'number',
                  description: 'Total de feedback recibido',
                  example: 890
                },
                positive_feedback_rate: {
                  type: 'number',
                  description: 'Tasa de feedback positivo (0-1)',
                  example: 0.78
                }
              }
            }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ],
    tags: [
      {
        name: 'Autenticación',
        description: 'Endpoints para autenticación y gestión de usuarios'
      },
      {
        name: 'Clips',
        description: 'Gestión de clips de video'
      },
      {
        name: 'Streaming',
        description: 'Funcionalidades de streaming en vivo'
      },
      {
        name: 'Puntos',
        description: 'Sistema de puntos y recompensas'
      },
      {
        name: 'Marketplace',
        description: 'Tienda y productos'
      },
      {
        name: 'Premium',
        description: 'Funcionalidades premium'
      },
      {
        name: 'Admin',
        description: 'Endpoints de administración'
      },
      {
        name: 'Juegos',
        description: 'Juegos Unity integrados'
      },
      {
        name: 'Notificaciones',
        description: 'Sistema de notificaciones'
      },
      {
        name: 'Perfil',
        description: 'Gestión de perfil de usuario'
      },
      {
        name: 'Anuncios',
        description: 'Gestión de anuncios publicitarios'
      },
      {
        name: 'Banners',
        description: 'Gestión de banners promocionales'
      },
      {
        name: 'Pagos',
        description: 'Sistema de pagos y transacciones'
      },
      {
        name: 'Empleos',
        description: 'Sistema de búsqueda y gestión de empleos'
      },
      {
        name: 'Sistema',
        description: 'Endpoints del sistema y monitoreo'
      },
      {
        name: 'Educación',
        description: 'Microcursos y contenido educativo'
      },
      {
        name: 'Radio AI',
        description: 'Sistema de inteligencia artificial para análisis de estado de ánimo y generación de música personalizada'
      },
      {
        name: 'Perfil de Aplicante',
        description: 'Gestión de perfil de aplicante para facilitar aplicaciones laborales'
      }
    ]
  },
  apis: [
    './dist/routes/*.js',
    './dist/routes/admin/*.js',
    './dist/routes/radio-ai/*.js',
    './dist/controllers/*.js',
    './dist/controllers/admin/*.js',
    './dist/controllers/radio-ai/*.js'
  ]
};

export const swaggerSpec = swaggerJsdoc(options);
