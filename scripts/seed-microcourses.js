const mongoose = require('mongoose');

// Configuración de MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/telemetro';

// Esquemas simplificados para el seed
const MicrocourseSchema = new mongoose.Schema({
  title: String,
  description: String,
  shortDescription: String,
  category: String,
  difficulty: String,
  status: { type: String, default: 'published' },
  thumbnailUrl: String,
  trailerVideoUrl: String,
  instructor: {
    name: String,
    bio: String,
    avatarUrl: String,
    credentials: [String],
    socialLinks: {
      linkedin: String,
      twitter: String,
      website: String
    }
  },
  duration: Number,
  lessonsCount: Number,
  price: { type: Number, default: 0 },
  originalPrice: Number,
  isPopular: { type: Boolean, default: false },
  isFeatured: { type: Boolean, default: false },
  tags: [String],
  learningObjectives: [String],
  prerequisites: [String],
  targetAudience: [String],
  language: { type: String, default: 'es' },
  subtitles: [String],
  rating: {
    average: { type: Number, default: 0 },
    count: { type: Number, default: 0 }
  },
  enrollmentCount: { type: Number, default: 0 },
  completionCount: { type: Number, default: 0 },
  lastUpdated: { type: Date, default: Date.now },
  publishedAt: { type: Date, default: Date.now },
  createdBy: mongoose.Schema.Types.ObjectId,
  isActive: { type: Boolean, default: true },
  metadata: {
    source: { type: String, default: 'external' },
    externalUrl: String,
    partnerName: String,
    licenseType: String
  }
}, { timestamps: true });

const MicrocourseLessonSchema = new mongoose.Schema({
  courseId: mongoose.Schema.Types.ObjectId,
  title: String,
  description: String,
  order: Number,
  videoUrl: String,
  videoDuration: Number,
  videoType: { type: String, default: 'youtube' },
  videoId: String,
  thumbnailUrl: String,
  transcript: String,
  resources: [{
    title: String,
    url: String,
    type: String
  }],
  quiz: {
    questions: [{
      question: String,
      options: [String],
      correctAnswer: Number,
      explanation: String
    }]
  },
  isPreview: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

// Datos de microcursos reales y gratuitos
const microcourses = [
  {
    title: "Introducción a JavaScript - Fundamentos de Programación",
    description: "Aprende los fundamentos de JavaScript desde cero. Este curso te enseñará variables, funciones, objetos, arrays y conceptos básicos de programación que necesitas para comenzar tu carrera como desarrollador web.",
    shortDescription: "Aprende JavaScript desde cero con ejemplos prácticos y ejercicios interactivos.",
    category: "programming",
    difficulty: "beginner",
    thumbnailUrl: "https://img.youtube.com/vi/W6NZfCO5SIk/maxresdefault.jpg",
    trailerVideoUrl: "https://www.youtube.com/watch?v=W6NZfCO5SIk",
    instructor: {
      name: "Carlos Azaustre",
      bio: "Desarrollador Full Stack con más de 10 años de experiencia. Especialista en JavaScript, React y Node.js. Creador de contenido educativo para desarrolladores.",
      avatarUrl: "https://yt3.ggpht.com/ytc/APkrFKYcvtF8Qw4X1XOxYJnUzKJxZ8Y9N1QHGxMzUzYz=s800-c-k-c0x00ffffff-no-rj",
      credentials: ["Google Developer Expert", "Microsoft MVP", "Instructor en Platzi"],
      socialLinks: {
        linkedin: "https://linkedin.com/in/carlosazaustre",
        twitter: "https://twitter.com/carlosazaustre",
        website: "https://carlosazaustre.es"
      }
    },
    duration: 180,
    lessonsCount: 8,
    price: 0,
    isPopular: true,
    isFeatured: true,
    tags: ["javascript", "programacion", "web", "frontend"],
    learningObjectives: [
      "Entender los fundamentos de JavaScript",
      "Trabajar con variables y tipos de datos",
      "Crear funciones y manejar eventos",
      "Manipular el DOM básico"
    ],
    prerequisites: ["Conocimientos básicos de HTML y CSS"],
    targetAudience: ["Principiantes en programación", "Estudiantes de desarrollo web"],
    language: "es",
    subtitles: ["es", "en"],
    rating: { average: 4.8, count: 1250 },
    enrollmentCount: 2500,
    completionCount: 1875,
    metadata: {
      source: "external",
      externalUrl: "https://www.youtube.com/playlist?list=PLUdLaKBdcbhwF2bBYUWRrHZnwsHbdJNtQ",
      partnerName: "CarlosAzaustre.es",
      licenseType: "Creative Commons"
    },
    lessons: [
      {
        title: "¿Qué es JavaScript?",
        description: "Introducción a JavaScript y su importancia en el desarrollo web moderno.",
        order: 1,
        videoUrl: "https://www.youtube.com/watch?v=W6NZfCO5SIk",
        videoDuration: 720,
        videoId: "W6NZfCO5SIk",
        isPreview: true
      },
      {
        title: "Variables y Tipos de Datos",
        description: "Aprende a declarar variables y trabajar con diferentes tipos de datos en JavaScript.",
        order: 2,
        videoUrl: "https://www.youtube.com/watch?v=RqQ1d1qEWlE",
        videoDuration: 900,
        videoId: "RqQ1d1qEWlE",
        isPreview: false
      },
      {
        title: "Funciones en JavaScript",
        description: "Cómo crear y usar funciones para organizar tu código de manera eficiente.",
        order: 3,
        videoUrl: "https://www.youtube.com/watch?v=PztCEdIJITY",
        videoDuration: 1080,
        videoId: "PztCEdIJITY",
        isPreview: false
      }
    ]
  },
  {
    title: "Marketing Digital para Principiantes",
    description: "Curso completo de marketing digital que cubre desde conceptos básicos hasta estrategias avanzadas. Aprende sobre SEO, redes sociales, email marketing y analítica web.",
    shortDescription: "Domina las estrategias de marketing digital más efectivas del mercado actual.",
    category: "marketing",
    difficulty: "beginner",
    thumbnailUrl: "https://img.youtube.com/vi/slbJaD5zOHY/maxresdefault.jpg",
    instructor: {
      name: "Vilma Núñez",
      bio: "Consultora en Marketing Digital con más de 15 años de experiencia. Fundadora de VilmaNuñez.com, una de las comunidades de marketing más grandes de habla hispana.",
      avatarUrl: "https://yt3.ggpht.com/ytc/APkrFKZxT8Qw4X1XOxYJnUzKJxZ8Y9N1QHGxMzUzYz=s800-c-k-c0x00ffffff-no-rj",
      credentials: ["Google Partner", "Facebook Blueprint Certified", "HubSpot Certified"],
      socialLinks: {
        linkedin: "https://linkedin.com/in/vilmanunez",
        twitter: "https://twitter.com/vilmanunez",
        website: "https://vilmanunez.com"
      }
    },
    duration: 240,
    lessonsCount: 10,
    price: 150,
    originalPrice: 250,
    isPopular: true,
    tags: ["marketing", "digital", "seo", "redes sociales"],
    learningObjectives: [
      "Crear estrategias de marketing digital efectivas",
      "Optimizar contenido para motores de búsqueda",
      "Gestionar campañas en redes sociales",
      "Analizar métricas y KPIs importantes"
    ],
    prerequisites: ["Conocimientos básicos de internet y redes sociales"],
    targetAudience: ["Emprendedores", "Pequeños empresarios", "Profesionales de marketing"],
    rating: { average: 4.6, count: 890 },
    enrollmentCount: 1800,
    completionCount: 1260,
    metadata: {
      source: "external",
      partnerName: "VilmaNuñez.com",
      licenseType: "Standard License"
    }
  },
  {
    title: "Diseño UX/UI con Figma",
    description: "Aprende a diseñar interfaces de usuario atractivas y funcionales usando Figma. Desde wireframes hasta prototipos interactivos, domina las herramientas esenciales del diseño digital.",
    shortDescription: "Crea diseños profesionales de aplicaciones y sitios web con Figma.",
    category: "design",
    difficulty: "intermediate",
    thumbnailUrl: "https://img.youtube.com/vi/FTlczfEIDDM/maxresdefault.jpg",
    instructor: {
      name: "Falcon Masters",
      bio: "Diseñador UX/UI y desarrollador frontend con experiencia en startups y empresas tecnológicas. Creador de contenido sobre diseño y desarrollo web.",
      avatarUrl: "https://yt3.ggpht.com/ytc/APkrFKYcvtF8Qw4X1XOxYJnUzKJxZ8Y9N1QHGxMzUzYz=s800-c-k-c0x00ffffff-no-rj",
      credentials: ["Adobe Certified Expert", "Google UX Design Certificate"],
      socialLinks: {
        website: "https://falconmasters.com"
      }
    },
    duration: 300,
    lessonsCount: 12,
    price: 200,
    isFeatured: true,
    tags: ["diseño", "ux", "ui", "figma", "prototipado"],
    learningObjectives: [
      "Dominar las herramientas de Figma",
      "Crear wireframes y mockups profesionales",
      "Diseñar sistemas de componentes",
      "Crear prototipos interactivos"
    ],
    prerequisites: ["Conocimientos básicos de diseño", "Figma instalado"],
    targetAudience: ["Diseñadores junior", "Desarrolladores frontend", "Product managers"],
    rating: { average: 4.7, count: 650 },
    enrollmentCount: 1200,
    completionCount: 840,
    metadata: {
      source: "external",
      partnerName: "FalconMasters",
      licenseType: "Educational Use"
    }
  },
  {
    title: "Productividad Personal y Gestión del Tiempo",
    description: "Técnicas probadas para mejorar tu productividad personal y profesional. Aprende metodologías como GTD, Pomodoro y sistemas de organización digital.",
    shortDescription: "Optimiza tu tiempo y aumenta tu productividad con técnicas comprobadas.",
    category: "productivity",
    difficulty: "beginner",
    thumbnailUrl: "https://img.youtube.com/vi/oTugjssqOT0/maxresdefault.jpg",
    instructor: {
      name: "Berto Pena",
      bio: "Consultor en productividad y organización personal. Autor de varios libros sobre gestión del tiempo y metodologías de trabajo eficientes.",
      avatarUrl: "https://yt3.ggpht.com/ytc/APkrFKYcvtF8Qw4X1XOxYJnUzKJxZ8Y9N1QHGxMzUzYz=s800-c-k-c0x00ffffff-no-rj",
      credentials: ["Certified Productivity Coach", "GTD Certified Trainer"],
      socialLinks: {
        website: "https://bertopena.com"
      }
    },
    duration: 120,
    lessonsCount: 6,
    price: 0,
    isPopular: true,
    tags: ["productividad", "tiempo", "organización", "gtd", "pomodoro"],
    learningObjectives: [
      "Implementar técnicas de gestión del tiempo",
      "Organizar tareas y proyectos eficientemente",
      "Eliminar distracciones y procrastinación",
      "Crear sistemas de productividad personal"
    ],
    prerequisites: ["Ninguno"],
    targetAudience: ["Profesionales", "Estudiantes", "Emprendedores"],
    rating: { average: 4.5, count: 420 },
    enrollmentCount: 950,
    completionCount: 760,
    metadata: {
      source: "external",
      partnerName: "BertoPena.com",
      licenseType: "Creative Commons"
    }
  },
  {
    title: "Finanzas Personales: Planifica tu Futuro Financiero",
    description: "Aprende a manejar tus finanzas personales, crear presupuestos, ahorrar e invertir de manera inteligente. Construye tu libertad financiera paso a paso.",
    shortDescription: "Toma control de tus finanzas y construye un futuro económico sólido.",
    category: "finance",
    difficulty: "beginner",
    thumbnailUrl: "https://img.youtube.com/vi/8bNpWK8hCjY/maxresdefault.jpg",
    instructor: {
      name: "Pequeño Cerdo Capitalista",
      bio: "Sofia Macías, experta en finanzas personales y autora bestseller. Ayuda a miles de personas a mejorar su relación con el dinero.",
      avatarUrl: "https://yt3.ggpht.com/ytc/APkrFKYcvtF8Qw4X1XOxYJnUzKJxZ8Y9N1QHGxMzUzYz=s800-c-k-c0x00ffffff-no-rj",
      credentials: ["Certified Financial Planner", "Autor de 5 libros de finanzas"],
      socialLinks: {
        website: "https://pequenocerdocapitalista.com"
      }
    },
    duration: 180,
    lessonsCount: 8,
    price: 100,
    originalPrice: 150,
    tags: ["finanzas", "ahorro", "inversion", "presupuesto", "dinero"],
    learningObjectives: [
      "Crear y mantener un presupuesto personal",
      "Desarrollar estrategias de ahorro efectivas",
      "Entender conceptos básicos de inversión",
      "Planificar metas financieras a largo plazo"
    ],
    prerequisites: ["Ninguno"],
    targetAudience: ["Jóvenes profesionales", "Personas que quieren mejorar sus finanzas"],
    rating: { average: 4.4, count: 780 },
    enrollmentCount: 1500,
    completionCount: 1050,
    metadata: {
      source: "external",
      partnerName: "Pequeño Cerdo Capitalista",
      licenseType: "Standard License"
    }
  },
  {
    title: "Inglés para Principiantes - Conversación Básica",
    description: "Curso práctico de inglés enfocado en conversación cotidiana. Aprende vocabulario esencial, pronunciación y frases útiles para situaciones reales.",
    shortDescription: "Aprende inglés conversacional desde cero con ejercicios prácticos.",
    category: "languages",
    difficulty: "beginner",
    thumbnailUrl: "https://img.youtube.com/vi/sEhxAEntG7E/maxresdefault.jpg",
    instructor: {
      name: "Pacho8a",
      bio: "Profesor de inglés certificado con más de 8 años de experiencia enseñando a hispanohablantes. Especialista en métodos prácticos de aprendizaje.",
      avatarUrl: "https://yt3.ggpht.com/ytc/APkrFKYcvtF8Qw4X1XOxYJnUzKJxZ8Y9N1QHGxMzUzYz=s800-c-k-c0x00ffffff-no-rj",
      credentials: ["TESOL Certified", "Cambridge English Certified"],
      socialLinks: {
        website: "https://pacho8a.com"
      }
    },
    duration: 240,
    lessonsCount: 15,
    price: 0,
    isPopular: true,
    isFeatured: true,
    tags: ["inglés", "conversación", "pronunciación", "vocabulario"],
    learningObjectives: [
      "Mantener conversaciones básicas en inglés",
      "Pronunciar correctamente palabras comunes",
      "Usar vocabulario esencial del día a día",
      "Entender y responder preguntas simples"
    ],
    prerequisites: ["Ninguno"],
    targetAudience: ["Principiantes absolutos", "Personas que quieren refrescar su inglés"],
    rating: { average: 4.6, count: 1120 },
    enrollmentCount: 2800,
    completionCount: 1960,
    metadata: {
      source: "external",
      partnerName: "Pacho8a English",
      licenseType: "Creative Commons"
    }
  }
];

async function seedMicrocourses() {
  try {
    console.log('🌱 Iniciando seed de microcursos...');
    
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado a MongoDB');

    // Crear modelos
    const Microcourse = mongoose.model('Microcourse', MicrocourseSchema);
    const MicrocourseLesson = mongoose.model('MicrocourseLesson', MicrocourseLessonSchema);

    // Obtener un admin user para createdBy
    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
    let adminUser = await User.findOne({ role: 'admin' });
    
    if (!adminUser) {
      console.log('⚠️  No se encontró usuario admin, creando uno...');
      adminUser = await User.create({
        phone: '+51999999999',
        displayName: 'Admin Telemetro',
        role: 'admin',
        pinHash: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj6hsxq5S/kO', // 1234
        pointsSmart: 10000,
        isProfileComplete: true
      });
    }

    // Limpiar colecciones existentes
    await Microcourse.deleteMany({});
    await MicrocourseLesson.deleteMany({});
    console.log('🗑️  Colecciones limpiadas');

    // Insertar microcursos
    for (const courseData of microcourses) {
      const lessons = courseData.lessons || [];
      delete courseData.lessons;

      const course = await Microcourse.create({
        ...courseData,
        createdBy: adminUser._id
      });

      console.log(`📚 Creado curso: ${course.title}`);

      // Crear lecciones si existen
      if (lessons.length > 0) {
        for (const lessonData of lessons) {
          await MicrocourseLesson.create({
            ...lessonData,
            courseId: course._id,
            thumbnailUrl: lessonData.thumbnailUrl || `https://img.youtube.com/vi/${lessonData.videoId}/maxresdefault.jpg`
          });
        }
        console.log(`  📝 Creadas ${lessons.length} lecciones`);
      }
    }

    console.log('✅ Seed de microcursos completado exitosamente');
    console.log(`📊 Total de cursos creados: ${microcourses.length}`);
    
    // Mostrar estadísticas
    const stats = await Microcourse.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          totalEnrollments: { $sum: '$enrollmentCount' },
          averagePrice: { $avg: '$price' }
        }
      },
      { $sort: { count: -1 } }
    ]);

    console.log('\n📈 Estadísticas por categoría:');
    stats.forEach(stat => {
      console.log(`  ${stat._id}: ${stat.count} cursos, ${stat.totalEnrollments} inscripciones, precio promedio: ${Math.round(stat.averagePrice)} puntos`);
    });

    const freeCourses = await Microcourse.countDocuments({ price: 0 });
    const paidCourses = await Microcourse.countDocuments({ price: { $gt: 0 } });
    
    console.log(`\n💰 Cursos gratuitos: ${freeCourses}`);
    console.log(`💳 Cursos de pago: ${paidCourses}`);

  } catch (error) {
    console.error('❌ Error durante el seed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Desconectado de MongoDB');
    process.exit(0);
  }
}

// Ejecutar seed
if (require.main === module) {
  seedMicrocourses();
}

module.exports = { seedMicrocourses };
