const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Importar el modelo de usuario
const { UserModel } = require('./dist/models/user.model');

async function setupUserPins() {
  try {
    console.log('🚀 Configurando PINs para usuarios sin PIN...');
    
    // Conectar a MongoDB Atlas
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Conectado a MongoDB Atlas');

    // Buscar usuarios sin PIN
    const usersWithoutPin = await UserModel.find({
      $or: [
        { pinHash: { $exists: false } },
        { pinHash: null },
        { pinHash: '' }
      ]
    });

    console.log(`📋 Encontrados ${usersWithoutPin.length} usuarios sin PIN:`);
    usersWithoutPin.forEach(user => {
      console.log(`   - ${user.phone} (${user.displayName}) - Rol: ${user.role}`);
    });

    if (usersWithoutPin.length === 0) {
      console.log('✅ Todos los usuarios ya tienen PIN configurado');
      return;
    }

    // Configurar PIN para cada usuario
    const defaultPin = '1234';
    const pinHash = await bcrypt.hash(defaultPin, 12);

    for (const user of usersWithoutPin) {
      user.pinHash = pinHash;
      await user.save();
      console.log(`✅ PIN configurado para ${user.phone} (${user.displayName})`);
    }

    console.log(`\n🎉 Se configuraron PINs para ${usersWithoutPin.length} usuarios`);
    console.log(`📱 PIN por defecto: ${defaultPin}`);

  } catch (error) {
    console.error('❌ Error configurando PINs:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Conexión cerrada');
  }
}

setupUserPins();
