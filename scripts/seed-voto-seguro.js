const mongoose = require('mongoose');

// Esquemas para Voto Seguro
const PoliticalPartySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  shortName: { type: String, required: true },
  foundedYear: { type: Number, required: true },
  ideology: [String],
  logoUrl: { type: String, required: true },
  primaryColor: { type: String, required: true },
  secondaryColor: { type: String, required: true },
  website: String,
  socialLinks: {
    facebook: String,
    twitter: String,
    instagram: String,
    tiktok: String
  },
  description: { type: String, required: true },
  mainProposals: [String],
  leaders: [{
    name: String,
    position: String,
    photoUrl: String
  }],
  isActive: { type: Boolean, default: true },
  registrationNumber: { type: String, required: true, unique: true }
}, { timestamps: true });

const PoliticalCandidateSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  shortName: { type: String, required: true },
  politicalParty: { type: mongoose.Schema.Types.ObjectId, ref: 'PoliticalParty', required: true },
  position: { 
    type: String, 
    enum: ['president', 'vice_president', 'congress', 'mayor', 'regional_governor', 'regional_councilor', 'municipal_councilor'],
    required: true 
  },
  photoUrl: { type: String, required: true },
  biography: { type: String, required: true },
  education: [String],
  workExperience: [String],
  previousPoliticalExperience: [String],
  socialLinks: {
    facebook: String,
    twitter: String,
    instagram: String,
    tiktok: String,
    website: String
  },
  proposals: [{
    title: String,
    description: String,
    category: String,
    priority: { type: Number, default: 5 }
  }],
  personalInfo: {
    birthDate: Date,
    birthPlace: String,
    maritalStatus: { type: String, enum: ['single', 'married', 'divorced', 'widowed'] },
    children: { type: Number, default: 0 },
    profession: String
  },
  campaignInfo: {
    slogan: String,
    campaignColors: [String],
    logo: String,
    partyNumber: Number
  },
  statistics: {
    views: { type: Number, default: 0 },
    likes: { type: Number, default: 0 },
    shares: { type: Number, default: 0 },
    comments: { type: Number, default: 0 }
  },
  isActive: { type: Boolean, default: true },
  isVerified: { type: Boolean, default: false },
  electionYear: { type: Number, required: true },
  region: String,
  district: String
}, { timestamps: true });

const PoliticalParty = mongoose.models.PoliticalParty || mongoose.model('PoliticalParty', PoliticalPartySchema);
const PoliticalCandidate = mongoose.models.PoliticalCandidate || mongoose.model('PoliticalCandidate', PoliticalCandidateSchema);

async function seedVotoSeguro() {
  try {
    console.log('🗳️ Seeding Voto Seguro - Datos Políticos...');
    
    // Limpiar datos existentes
    await PoliticalParty.deleteMany({});
    await PoliticalCandidate.deleteMany({});
    
    // Crear partidos políticos
    const parties = [
      {
        name: 'Partido Popular Cristiano',
        shortName: 'PPC',
        foundedYear: 1966,
        ideology: ['center-right', 'conservative'],
        logoUrl: 'https://via.placeholder.com/200x200/1E40AF/FFFFFF?text=PPC',
        primaryColor: '#1E40AF',
        secondaryColor: '#FFFFFF',
        website: 'https://ppc.pe',
        socialLinks: {
          facebook: 'https://facebook.com/ppc.oficial',
          twitter: 'https://twitter.com/ppc_oficial'
        },
        description: 'Partido político peruano de orientación democrático cristiana, fundado en 1966. Defiende los valores cristianos y la democracia representativa.',
        mainProposals: [
          'Fortalecimiento de la democracia y las instituciones',
          'Desarrollo económico sostenible con inclusión social',
          'Educación de calidad para todos los peruanos',
          'Lucha frontal contra la corrupción'
        ],
        leaders: [
          {
            name: 'Lourdes Flores Nano',
            position: 'Presidenta del Partido',
            photoUrl: 'https://via.placeholder.com/150x150/1E40AF/FFFFFF?text=LF'
          }
        ],
        registrationNumber: 'PPC001'
      },
      {
        name: 'Alianza para el Progreso',
        shortName: 'APP',
        foundedYear: 2001,
        ideology: ['center', 'progressive'],
        logoUrl: 'https://via.placeholder.com/200x200/DC2626/FFFFFF?text=APP',
        primaryColor: '#DC2626',
        secondaryColor: '#FFFFFF',
        website: 'https://app.pe',
        socialLinks: {
          facebook: 'https://facebook.com/app.peru',
          twitter: 'https://twitter.com/app_peru'
        },
        description: 'Partido político peruano de centro progresista, fundado en 2001. Promueve la modernización del Estado y el desarrollo regional.',
        mainProposals: [
          'Modernización integral del Estado peruano',
          'Inversión masiva en infraestructura regional',
          'Inclusión social y reducción de la pobreza',
          'Descentralización efectiva del poder'
        ],
        leaders: [
          {
            name: 'César Acuña Peralta',
            position: 'Fundador y Líder',
            photoUrl: 'https://via.placeholder.com/150x150/DC2626/FFFFFF?text=CA'
          }
        ],
        registrationNumber: 'APP001'
      },
      {
        name: 'Fuerza Popular',
        shortName: 'FP',
        foundedYear: 2010,
        ideology: ['right', 'populist'],
        logoUrl: 'https://via.placeholder.com/200x200/FF6600/FFFFFF?text=FP',
        primaryColor: '#FF6600',
        secondaryColor: '#000000',
        socialLinks: {
          facebook: 'https://facebook.com/fuerzapopular',
          twitter: 'https://twitter.com/fuerzapopular_'
        },
        description: 'Partido político peruano de derecha populista, fundado en 2010. Heredero del fujimorismo y defensor del orden y la autoridad.',
        mainProposals: [
          'Mano dura contra la delincuencia',
          'Reactivación económica con inversión privada',
          'Defensa de la familia tradicional',
          'Lucha contra el terrorismo y el narcotráfico'
        ],
        leaders: [
          {
            name: 'Keiko Fujimori',
            position: 'Lideresa del Partido',
            photoUrl: 'https://via.placeholder.com/150x150/FF6600/FFFFFF?text=KF'
          }
        ],
        registrationNumber: 'FP001'
      },
      {
        name: 'Perú Libre',
        shortName: 'PL',
        foundedYear: 2016,
        ideology: ['left', 'socialist'],
        logoUrl: 'https://via.placeholder.com/200x200/DC143C/FFFFFF?text=PL',
        primaryColor: '#DC143C',
        secondaryColor: '#FFFFFF',
        socialLinks: {
          facebook: 'https://facebook.com/perulibre',
          twitter: 'https://twitter.com/perulibre_'
        },
        description: 'Partido político peruano de izquierda socialista, fundado en 2016. Defiende los derechos de los trabajadores y la justicia social.',
        mainProposals: [
          'Nueva Constitución Política del Perú',
          'Nacionalización de recursos naturales',
          'Educación y salud gratuitas para todos',
          'Reforma agraria integral'
        ],
        leaders: [
          {
            name: 'Vladimir Cerrón',
            position: 'Secretario General',
            photoUrl: 'https://via.placeholder.com/150x150/DC143C/FFFFFF?text=VC'
          }
        ],
        registrationNumber: 'PL001'
      },
      {
        name: 'Avanza País',
        shortName: 'AP',
        foundedYear: 2020,
        ideology: ['center-right', 'liberal'],
        logoUrl: 'https://via.placeholder.com/200x200/4F46E5/FFFFFF?text=AP',
        primaryColor: '#4F46E5',
        secondaryColor: '#FFFFFF',
        website: 'https://avanzapais.pe',
        socialLinks: {
          facebook: 'https://facebook.com/avanzapais',
          twitter: 'https://twitter.com/avanzapais'
        },
        description: 'Partido político peruano de centro-derecha liberal, fundado en 2020. Promueve la economía de mercado y las libertades individuales.',
        mainProposals: [
          'Economía de mercado con responsabilidad social',
          'Modernización de la educación pública',
          'Fortalecimiento del sistema de salud',
          'Transparencia y eficiencia en el Estado'
        ],
        leaders: [
          {
            name: 'Hernando de Soto',
            position: 'Fundador',
            photoUrl: 'https://via.placeholder.com/150x150/4F46E5/FFFFFF?text=HS'
          }
        ],
        registrationNumber: 'AP001'
      }
    ];

    const createdParties = await PoliticalParty.insertMany(parties);
    console.log(`✅ ${createdParties.length} partidos políticos creados`);

    // Crear candidatos presidenciales para elecciones 2026
    const presidentialCandidates = [
      {
        fullName: 'María Elena Gonzales Vega',
        shortName: 'M. Gonzales',
        politicalParty: createdParties[0]._id, // PPC
        position: 'president',
        photoUrl: 'https://via.placeholder.com/300x300/1E40AF/FFFFFF?text=MG',
        biography: 'Economista con maestría en Harvard, ex ministra de Economía (2018-2020) y congresista (2016-2021). Especialista en políticas públicas y desarrollo económico sostenible.',
        education: [
          'Economista - Universidad Nacional Mayor de San Marcos (1995)',
          'Maestría en Políticas Públicas - Harvard Kennedy School (2000)',
          'Diplomado en Gestión Pública - ESAN (2010)'
        ],
        workExperience: [
          'Ministra de Economía y Finanzas (2018-2020)',
          'Asesora del Banco Mundial (2015-2018)',
          'Directora de Políticas Fiscales - MEF (2010-2015)',
          'Consultora en Desarrollo Económico (2005-2010)'
        ],
        previousPoliticalExperience: [
          'Congresista de la República (2016-2021)',
          'Regidora de San Isidro (2011-2014)'
        ],
        socialLinks: {
          facebook: 'https://facebook.com/mariagonzales2026',
          twitter: 'https://twitter.com/mgonzales2026',
          instagram: 'https://instagram.com/mariagonzales_oficial'
        },
        proposals: [
          {
            title: 'Reactivación Económica Post-Pandemia',
            description: 'Plan integral de reactivación económica con enfoque en la creación de empleos formales, apoyo a las MYPE y fortalecimiento del mercado interno.',
            category: 'economy',
            priority: 10
          },
          {
            title: 'Educación Digital para Todos',
            description: 'Modernización del sistema educativo con tecnología, conectividad en todas las escuelas y capacitación docente en herramientas digitales.',
            category: 'education',
            priority: 9
          },
          {
            title: 'Sistema de Salud Universal',
            description: 'Implementación de un sistema de salud universal que garantice atención de calidad para todos los peruanos, sin distinción.',
            category: 'health',
            priority: 9
          },
          {
            title: 'Seguridad Ciudadana Integral',
            description: 'Fortalecimiento de la Policía Nacional, modernización del sistema de justicia y programas de prevención de la violencia.',
            category: 'security',
            priority: 8
          }
        ],
        personalInfo: {
          birthDate: new Date('1975-05-15'),
          birthPlace: 'Lima, Perú',
          maritalStatus: 'married',
          children: 2,
          profession: 'Economista'
        },
        campaignInfo: {
          slogan: 'Juntos construimos el Perú que merecemos',
          campaignColors: ['#1E40AF', '#FFFFFF'],
          partyNumber: 1
        },
        statistics: {
          views: 15420,
          likes: 2340,
          shares: 456,
          comments: 123
        },
        isVerified: true,
        electionYear: 2026
      },
      {
        fullName: 'Carlos Alberto Mendoza Ríos',
        shortName: 'C. Mendoza',
        politicalParty: createdParties[1]._id, // APP
        position: 'president',
        photoUrl: 'https://via.placeholder.com/300x300/DC2626/FFFFFF?text=CM',
        biography: 'Empresario y político peruano, ex gobernador regional de La Libertad (2015-2022). Impulsor del desarrollo regional y la descentralización efectiva.',
        education: [
          'Ingeniero Industrial - Universidad Nacional de Trujillo (1990)',
          'MBA - Universidad del Pacífico (1995)',
          'Programa de Alta Dirección - ESAN (2005)'
        ],
        workExperience: [
          'Gobernador Regional de La Libertad (2015-2022)',
          'Gerente General - Grupo Mendoza (2000-2015)',
          'Director de Operaciones - Empresa Agroindustrial (1995-2000)'
        ],
        previousPoliticalExperience: [
          'Gobernador Regional de La Libertad (2015-2022)',
          'Alcalde Provincial de Trujillo (2011-2014)'
        ],
        socialLinks: {
          facebook: 'https://facebook.com/carlosmendoza2026',
          twitter: 'https://twitter.com/cmendoza2026',
          website: 'https://carlosmendoza.pe'
        },
        proposals: [
          {
            title: 'Descentralización Real del Perú',
            description: 'Transferencia efectiva de competencias y recursos a los gobiernos regionales y locales para un desarrollo equilibrado del país.',
            category: 'infrastructure',
            priority: 10
          },
          {
            title: 'Revolución Agraria del Siglo XXI',
            description: 'Modernización del agro peruano con tecnología, créditos accesibles y cadenas de valor integradas para pequeños productores.',
            category: 'economy',
            priority: 9
          },
          {
            title: 'Conectividad Digital Nacional',
            description: 'Fibra óptica y internet de alta velocidad en todo el territorio nacional, priorizando zonas rurales y amazónicas.',
            category: 'technology',
            priority: 8
          }
        ],
        personalInfo: {
          birthDate: new Date('1968-08-22'),
          birthPlace: 'Trujillo, La Libertad',
          maritalStatus: 'married',
          children: 3,
          profession: 'Ingeniero Industrial'
        },
        campaignInfo: {
          slogan: 'El Perú que progresa desde las regiones',
          campaignColors: ['#DC2626', '#FFFFFF'],
          partyNumber: 2
        },
        statistics: {
          views: 12750,
          likes: 1890,
          shares: 345,
          comments: 89
        },
        isVerified: true,
        electionYear: 2026,
        region: 'La Libertad'
      },
      {
        fullName: 'Ana Sofía Vargas Llosa',
        shortName: 'A. Vargas Llosa',
        politicalParty: createdParties[4]._id, // Avanza País
        position: 'president',
        photoUrl: 'https://via.placeholder.com/300x300/4F46E5/FFFFFF?text=AV',
        biography: 'Abogada constitucionalista y académica, ex ministra de Justicia (2020-2021). Reconocida por su trabajo en derechos humanos y reforma del sistema judicial.',
        education: [
          'Abogada - Pontificia Universidad Católica del Perú (1998)',
          'Maestría en Derecho Constitucional - Universidad de Salamanca (2002)',
          'Doctorado en Derechos Humanos - Universidad Carlos III de Madrid (2008)'
        ],
        workExperience: [
          'Ministra de Justicia y Derechos Humanos (2020-2021)',
          'Profesora Principal - PUCP Facultad de Derecho (2010-2020)',
          'Consultora en Derechos Humanos - ONU (2015-2018)',
          'Coordinadora del Instituto de Derechos Humanos - PUCP (2008-2015)'
        ],
        previousPoliticalExperience: [
          'Ministra de Justicia y Derechos Humanos (2020-2021)'
        ],
        socialLinks: {
          facebook: 'https://facebook.com/anavargasllosa',
          twitter: 'https://twitter.com/anavargasllosa',
          instagram: 'https://instagram.com/ana_vargas_llosa'
        },
        proposals: [
          {
            title: 'Reforma Integral del Sistema de Justicia',
            description: 'Modernización del Poder Judicial con tecnología, transparencia total y lucha frontal contra la corrupción en el sistema.',
            category: 'security',
            priority: 10
          },
          {
            title: 'Estado Digital y Transparente',
            description: 'Digitalización completa de trámites públicos, gobierno abierto con datos públicos y participación ciudadana en línea.',
            category: 'technology',
            priority: 9
          },
          {
            title: 'Igualdad de Género Real',
            description: 'Políticas integrales para cerrar brechas de género en el trabajo, educación y participación política.',
            category: 'social',
            priority: 8
          }
        ],
        personalInfo: {
          birthDate: new Date('1978-03-10'),
          birthPlace: 'Lima, Perú',
          maritalStatus: 'single',
          children: 0,
          profession: 'Abogada Constitucionalista'
        },
        campaignInfo: {
          slogan: 'Justicia, transparencia y progreso para todos',
          campaignColors: ['#4F46E5', '#FFFFFF'],
          partyNumber: 5
        },
        statistics: {
          views: 18900,
          likes: 3200,
          shares: 678,
          comments: 234
        },
        isVerified: true,
        electionYear: 2026
      }
    ];

    const createdCandidates = await PoliticalCandidate.insertMany(presidentialCandidates);
    console.log(`✅ ${createdCandidates.length} candidatos presidenciales creados`);

    // Crear algunos candidatos al congreso
    const congressCandidates = [
      {
        fullName: 'Roberto Sánchez Torres',
        shortName: 'R. Sánchez',
        politicalParty: createdParties[0]._id,
        position: 'congress',
        photoUrl: 'https://via.placeholder.com/300x300/1E40AF/FFFFFF?text=RS',
        biography: 'Abogado especialista en derecho laboral, defensor de los derechos de los trabajadores.',
        education: ['Abogado - Universidad de Lima'],
        workExperience: ['Estudio jurídico especializado en derecho laboral'],
        previousPoliticalExperience: [],
        socialLinks: {
          facebook: 'https://facebook.com/robertosanchez'
        },
        proposals: [
          {
            title: 'Ley de Protección Laboral',
            description: 'Fortalecimiento de los derechos laborales y protección contra el despido arbitrario.',
            category: 'social',
            priority: 8
          }
        ],
        personalInfo: {
          birthDate: new Date('1972-11-05'),
          birthPlace: 'Lima, Perú',
          maritalStatus: 'married',
          children: 2,
          profession: 'Abogado'
        },
        campaignInfo: {
          slogan: 'Por los derechos de los trabajadores',
          campaignColors: ['#1E40AF', '#FFFFFF'],
          partyNumber: 1
        },
        statistics: {
          views: 5420,
          likes: 340,
          shares: 56,
          comments: 23
        },
        isVerified: true,
        electionYear: 2026
      },
      {
        fullName: 'Patricia Morales Vega',
        shortName: 'P. Morales',
        politicalParty: createdParties[1]._id,
        position: 'congress',
        photoUrl: 'https://via.placeholder.com/300x300/DC2626/FFFFFF?text=PM',
        biography: 'Educadora y activista social, especialista en políticas educativas.',
        education: ['Educación - Universidad Nacional de Educación'],
        workExperience: ['Directora de colegio público', 'Consultora en educación'],
        previousPoliticalExperience: [],
        socialLinks: {
          twitter: 'https://twitter.com/pmorales'
        },
        proposals: [
          {
            title: 'Educación de Calidad para Todos',
            description: 'Mejora integral de la educación pública con infraestructura, tecnología y mejor remuneración docente.',
            category: 'education',
            priority: 9
          }
        ],
        personalInfo: {
          birthDate: new Date('1980-02-14'),
          birthPlace: 'Cusco, Perú',
          maritalStatus: 'single',
          children: 1,
          profession: 'Educadora'
        },
        campaignInfo: {
          slogan: 'Educación que transforma vidas',
          campaignColors: ['#DC2626', '#FFFFFF'],
          partyNumber: 2
        },
        statistics: {
          views: 3890,
          likes: 567,
          shares: 89,
          comments: 45
        },
        isVerified: true,
        electionYear: 2026
      }
    ];

    await PoliticalCandidate.insertMany(congressCandidates);
    console.log(`✅ ${congressCandidates.length} candidatos al congreso creados`);

    console.log('');
    console.log('🗳️ VOTO SEGURO SEEDING COMPLETADO');
    console.log('================================');
    console.log('');
    console.log('📊 RESUMEN:');
    console.log(`🏛️ Partidos políticos: ${createdParties.length}`);
    console.log(`👨‍💼 Candidatos presidenciales: ${presidentialCandidates.length}`);
    console.log(`👩‍💼 Candidatos al congreso: ${congressCandidates.length}`);
    console.log('');
    console.log('🎯 FUNCIONALIDADES DISPONIBLES:');
    console.log('• Visualización de candidatos por posición');
    console.log('• Información detallada de propuestas');
    console.log('• Biografías completas');
    console.log('• Experiencia laboral y política');
    console.log('• Redes sociales y contacto');
    console.log('• Sistema de likes y compartidos');
    console.log('• Búsqueda avanzada');
    console.log('• Estadísticas de engagement');
    console.log('');

  } catch (error) {
    console.error('❌ Error en seeding de Voto Seguro:', error);
    throw error;
  }
}

// Función para ejecutar el seeding
async function runSeed() {
  try {
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/telemetro';
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado a MongoDB');
    
    await seedVotoSeguro();
    
    console.log('🎉 Seeding completado exitosamente');
    process.exit(0);
  } catch (error) {
    console.error('💥 Error en seeding:', error);
    process.exit(1);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  runSeed();
}

module.exports = { seedVotoSeguro };
