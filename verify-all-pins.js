const mongoose = require('mongoose');
require('dotenv').config();

// Importar el modelo de usuario
const { UserModel } = require('./dist/models/user.model');

async function verifyAllPins() {
  try {
    console.log('🔍 Verificando PINs de todos los usuarios...');
    
    // Conectar a MongoDB Atlas
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Conectado a MongoDB Atlas');

    // Buscar todos los usuarios
    const allUsers = await UserModel.find({}).sort({ role: 1, displayName: 1 });

    console.log(`\n📋 LISTA COMPLETA DE USUARIOS CON PINs:`);
    console.log(`==========================================`);

    let usersWithPin = 0;
    let usersWithoutPin = 0;

    // Agrupar por rol
    const usersByRole = {
      admin: [],
      staff: [],
      moderator: [],
      metro_streamer: [],
      user: []
    };

    allUsers.forEach(user => {
      const hasPin = user.pinHash && user.pinHash.length > 0;
      if (hasPin) usersWithPin++;
      else usersWithoutPin++;

      usersByRole[user.role].push({
        phone: user.phone,
        name: user.displayName,
        email: user.email,
        hasPin: hasPin,
        points: user.pointsSmart,
        createdAt: user.createdAt
      });
    });

    // Mostrar por rol
    Object.keys(usersByRole).forEach(role => {
      const users = usersByRole[role];
      if (users.length > 0) {
        console.log(`\n👥 ${role.toUpperCase()} (${users.length} usuarios):`);
        console.log('─'.repeat(50));
        
        users.forEach(user => {
          const pinStatus = user.hasPin ? '✅' : '❌';
          const pinText = user.hasPin ? 'PIN: 1234' : 'SIN PIN';
          console.log(`   ${pinStatus} ${user.phone} - ${user.name}`);
          console.log(`      📧 ${user.email || 'Sin email'} | ${pinText} | Puntos: ${user.points}`);
          console.log(`      📅 Creado: ${user.createdAt.toLocaleDateString()}`);
          console.log('');
        });
      }
    });

    console.log(`\n📊 RESUMEN:`);
    console.log(`============`);
    console.log(`✅ Usuarios CON PIN: ${usersWithPin}`);
    console.log(`❌ Usuarios SIN PIN: ${usersWithoutPin}`);
    console.log(`📱 Total de usuarios: ${allUsers.length}`);

    if (usersWithoutPin === 0) {
      console.log(`\n🎉 ¡TODOS LOS USUARIOS TIENEN PIN CONFIGURADO!`);
      console.log(`🔑 Todos pueden hacer login directo sin OTP`);
    }

  } catch (error) {
    console.error('❌ Error verificando PINs:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Conexión cerrada');
  }
}

verifyAllPins();
