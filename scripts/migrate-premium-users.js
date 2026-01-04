const mongoose = require('mongoose');
require('dotenv').config();

// Conexión a MongoDB
async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://jaxximize:Jaxximize123@cluster0.wk8m2.mongodb.net/telemetro?retryWrites=true&w=majority');
    console.log('✅ Conectado a MongoDB');
  } catch (error) {
    console.error('❌ Error conectando a MongoDB:', error);
    process.exit(1);
  }
}

// Modelos
const UserSchema = new mongoose.Schema({}, { collection: 'users', strict: false });
const User = mongoose.model('User', UserSchema);

const PremiumSubscriptionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  plan: { type: String, enum: ['monthly', 'quarterly', 'yearly'], required: true },
  status: { type: String, enum: ['active', 'cancelled', 'expired', 'pending_payment'], required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  price: { type: Number, required: true },
  currency: { type: String, required: true },
  paymentMethod: { type: String, enum: ['yape', 'plin', 'card', 'admin'], required: true },
  paymentReference: String,
  paymentProof: String,
  benefits: {
    noAds: { type: Boolean, default: true },
    jobSearch: { type: Boolean, default: true },
    microCourses: { type: Boolean, default: true },
    irlExclusive: { type: Boolean, default: true },
    dailyPoints: { type: Number, default: 50 },
    premiumDiscounts: { type: Boolean, default: true }
  },
  autoRenewal: { type: Boolean, default: false },
  cancelledAt: Date,
  cancelReason: String,
  metadata: {
    activatedBy: { type: String, enum: ['payment', 'admin', 'promotion'], default: 'admin' },
    originalPrice: Number,
    discountApplied: Number,
    promoCode: String
  }
}, { 
  timestamps: true,
  collection: 'premium_subscriptions'
});

const PremiumSubscription = mongoose.model('PremiumSubscription', PremiumSubscriptionSchema);

async function migratePremiumUsers() {
  try {
    console.log('🔄 Iniciando migración de usuarios Premium...');

    // Buscar usuarios con hasMetroPremium: true
    const premiumUsers = await User.find({ hasMetroPremium: true });
    console.log(`📊 Encontrados ${premiumUsers.length} usuarios Premium`);

    for (const user of premiumUsers) {
      console.log(`👤 Procesando usuario: ${user.displayName} (${user._id})`);

      // Verificar si ya tiene suscripción
      const existingSubscription = await PremiumSubscription.findOne({ userId: user._id });
      
      if (existingSubscription) {
        console.log(`⚠️  Usuario ${user.displayName} ya tiene suscripción, omitiendo...`);
        continue;
      }

      // Crear suscripción por defecto
      const startDate = new Date();
      const endDate = new Date();
      endDate.setFullYear(endDate.getFullYear() + 1); // 1 año de Premium

      const subscription = new PremiumSubscription({
        userId: user._id,
        plan: 'yearly',
        status: 'active',
        startDate,
        endDate,
        price: 0, // Gratis por migración
        currency: 'PEN',
        paymentMethod: 'admin',
        benefits: {
          noAds: true,
          jobSearch: true,
          microCourses: true,
          irlExclusive: true,
          dailyPoints: 50,
          premiumDiscounts: true
        },
        autoRenewal: false,
        metadata: {
          activatedBy: 'admin',
          originalPrice: 0,
          promoCode: 'MIGRATION'
        }
      });

      await subscription.save();

      // Actualizar fecha de expiración del usuario
      await User.findByIdAndUpdate(user._id, {
        metroPremiumExpiry: endDate
      });

      console.log(`✅ Suscripción creada para ${user.displayName}`);
    }

    console.log('🎉 Migración completada exitosamente');
  } catch (error) {
    console.error('❌ Error en migración:', error);
  } finally {
    await mongoose.disconnect();
    console.log('📤 Desconectado de MongoDB');
  }
}

// Ejecutar migración
connectDB().then(() => {
  migratePremiumUsers();
});
