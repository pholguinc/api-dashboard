const mongoose = require('mongoose');
require('dotenv').config();

// Conectar a MongoDB
async function connectDB() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/telemetro';
    await mongoose.connect(mongoUri);
    console.log('✅ Conectado a MongoDB');
  } catch (error) {
    console.error('❌ Error conectando a MongoDB:', error);
    process.exit(1);
  }
}

// Esquema de Game
const gameSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  category: {
    type: String,
    enum: ['trivia', 'puzzle', 'arcade', 'strategy', 'memory', 'reflexes'],
    required: true
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    required: true
  },
  pointsReward: { type: Number, required: true },
  timeLimit: Number,
  instructions: { type: String, required: true },
  isAvailable: { type: Boolean, default: true },
  playCount: { type: Number, default: 0 },
  averageRating: { type: Number, default: 0 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, {
  timestamps: true
});

const GameModel = mongoose.models.Game || mongoose.model('Game', gameSchema);

// Crear juegos de demo
async function createDemoGames() {
  try {
    console.log('🎮 Creando juegos de demo...');

    // Limpiar juegos existentes
    await GameModel.deleteMany({});
    console.log('🗑️ Juegos anteriores eliminados');

    const demoGames = [
      {
        name: '🧠 Trivia Metro Underground',
        description: 'Demuestra tu conocimiento sobre la cultura underground peruana y el sistema de transporte de Lima',
        category: 'trivia',
        difficulty: 'medium',
        pointsReward: 150,
        timeLimit: 30,
        instructions: 'Responde correctamente las preguntas sobre cultura peruana, metro de Lima y movimientos underground. Tienes 30 segundos por pregunta.',
        isAvailable: true,
        playCount: 1247,
        averageRating: 4.6
      },
      {
        name: '🧩 Puzzle del Metro',
        description: 'Arma el mapa del metro de Lima conectando las estaciones correctamente',
        category: 'puzzle',
        difficulty: 'hard',
        pointsReward: 200,
        timeLimit: 120,
        instructions: 'Arrastra las piezas para formar el mapa completo del metro. Conecta las líneas 1 y 2 correctamente.',
        isAvailable: true,
        playCount: 856,
        averageRating: 4.3
      },
      {
        name: '🕹️ Esquiva en el Metro',
        description: 'Juego arcade donde esquivas obstáculos mientras viajas por las estaciones',
        category: 'arcade',
        difficulty: 'easy',
        pointsReward: 100,
        timeLimit: 60,
        instructions: 'Usa las flechas para moverte y esquiva los obstáculos. Recoge power-ups para obtener más puntos.',
        isAvailable: true,
        playCount: 2341,
        averageRating: 4.8
      },
      {
        name: '♟️ Estrategia Metro',
        description: 'Planifica la ruta más eficiente para llegar a tu destino',
        category: 'strategy',
        difficulty: 'hard',
        pointsReward: 250,
        instructions: 'Analiza el mapa, considera los transbordos y horarios para crear la ruta más rápida. No hay límite de tiempo.',
        isAvailable: true,
        playCount: 423,
        averageRating: 4.1
      },
      {
        name: '🧠 Memoria de Estaciones',
        description: 'Memoriza la secuencia de estaciones y repítela correctamente',
        category: 'memory',
        difficulty: 'medium',
        pointsReward: 120,
        timeLimit: 45,
        instructions: 'Observa la secuencia de estaciones que aparece, luego repítela en el mismo orden. Cada nivel añade más estaciones.',
        isAvailable: true,
        playCount: 1089,
        averageRating: 4.4
      },
      {
        name: '⚡ Reflejos Rápidos',
        description: 'Toca los botones que aparecen lo más rápido posible',
        category: 'reflexes',
        difficulty: 'easy',
        pointsReward: 80,
        timeLimit: 30,
        instructions: 'Toca los círculos que aparecen en pantalla lo más rápido que puedas. Evita tocar los rojos.',
        isAvailable: true,
        playCount: 3156,
        averageRating: 4.7
      },
      {
        name: '🎵 Ritmo Underground',
        description: 'Sigue el ritmo de la música underground peruana',
        category: 'arcade',
        difficulty: 'medium',
        pointsReward: 180,
        timeLimit: 90,
        instructions: 'Toca en el momento exacto siguiendo el ritmo de la música. Mantén la precisión para obtener más puntos.',
        isAvailable: true,
        playCount: 1567,
        averageRating: 4.5
      },
      {
        name: '🔤 Sopa de Letras Metro',
        description: 'Encuentra palabras relacionadas con el metro y la cultura peruana',
        category: 'puzzle',
        difficulty: 'easy',
        pointsReward: 90,
        timeLimit: 180,
        instructions: 'Busca las palabras ocultas en la sopa de letras. Pueden estar en horizontal, vertical o diagonal.',
        isAvailable: true,
        playCount: 892,
        averageRating: 4.2
      },
      {
        name: '🎯 Precisión de Rutas',
        description: 'Calcula exactamente el tiempo de viaje entre estaciones',
        category: 'strategy',
        difficulty: 'hard',
        pointsReward: 300,
        instructions: 'Basándote en los horarios reales del metro, calcula el tiempo exacto de viaje. Considera transbordos y esperas.',
        isAvailable: false, // Juego en desarrollo
        playCount: 156,
        averageRating: 3.9
      },
      {
        name: '🎨 Arte Urbano Match',
        description: 'Empareja elementos del arte urbano peruano',
        category: 'memory',
        difficulty: 'easy',
        pointsReward: 110,
        timeLimit: 60,
        instructions: 'Encuentra las parejas de elementos de arte urbano. Memoriza las posiciones y empareja correctamente.',
        isAvailable: true,
        playCount: 743,
        averageRating: 4.3
      }
    ];

    // Insertar juegos
    const createdGames = await GameModel.insertMany(demoGames);
    
    console.log(`✅ ${createdGames.length} juegos de demo creados:`);
    createdGames.forEach((game, index) => {
      const statusIcon = game.isAvailable ? '✅' : '⏸️';
      const difficultyIcon = game.difficulty === 'easy' ? '🟢' : game.difficulty === 'medium' ? '🟡' : '🔴';
      console.log(`   ${index + 1}. ${game.name} ${statusIcon} ${difficultyIcon} (${game.playCount} partidas)`);
    });

    // Mostrar estadísticas por categoría
    const categoryStats = await GameModel.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 }, totalPlays: { $sum: '$playCount' } } },
      { $sort: { count: -1 } }
    ]);

    console.log('\n📊 Estadísticas por categoría:');
    categoryStats.forEach(stat => {
      const icons = {
        trivia: '🧠',
        puzzle: '🧩',
        arcade: '🕹️',
        strategy: '♟️',
        memory: '🧠',
        reflexes: '⚡'
      };
      console.log(`   ${icons[stat._id]} ${stat._id}: ${stat.count} juegos (${stat.totalPlays} partidas)`);
    });

    // Estadísticas generales
    const stats = {
      total: createdGames.length,
      active: createdGames.filter(g => g.isAvailable).length,
      totalPlays: createdGames.reduce((sum, g) => sum + g.playCount, 0),
      averageRating: (createdGames.reduce((sum, g) => sum + g.averageRating, 0) / createdGames.length).toFixed(1)
    };

    console.log('\n🎮 Resumen de juegos:');
    console.log(`   📊 Total: ${stats.total}`);
    console.log(`   ✅ Activos: ${stats.active}`);
    console.log(`   ⏸️ Inactivos: ${stats.total - stats.active}`);
    console.log(`   🎯 Total partidas: ${stats.totalPlays}`);
    console.log(`   ⭐ Rating promedio: ${stats.averageRating}`);

    console.log('\n🎯 Juegos creados exitosamente para el panel admin!');
    console.log('   👉 Ve a http://localhost:4000/admin y haz clic en "Sala de Juegos" para gestionarlos');

  } catch (error) {
    console.error('❌ Error creando juegos de demo:', error);
  }
}

// Ejecutar script
async function main() {
  await connectDB();
  await createDemoGames();
  await mongoose.connection.close();
  console.log('\n🔌 Conexión a MongoDB cerrada');
}

main().catch(console.error);
