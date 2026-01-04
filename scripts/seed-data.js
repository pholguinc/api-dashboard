const mongoose = require('mongoose');

// Product Schema
const ProductSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  category: { type: String, enum: ['digital', 'physical', 'premium'], required: true, index: true },
  pointsCost: { type: Number, required: true },
  stock: { type: Number, default: 0 },
  imageUrl: { type: String, required: true },
  provider: { type: String, required: true },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

const Product = mongoose.model('Product', ProductSchema);

const sampleProducts = [
  {
    name: 'Auriculares Bluetooth Premium',
    description: 'Auriculares inalámbricos de alta calidad con cancelación de ruido activa. Perfectos para música y llamadas.',
    category: 'physical',
    pointsCost: 2500,
    stock: 25,
    imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop',
    provider: 'TechStore',
    isActive: true
  },
  {
    name: 'Suscripción Spotify Premium - 3 meses',
    description: 'Disfruta de música sin límites, sin anuncios y con calidad superior durante 3 meses completos.',
    category: 'digital',
    pointsCost: 800,
    stock: 100,
    imageUrl: 'https://images.unsplash.com/photo-1611339555312-e607c8352fd7?w=400&h=400&fit=crop',
    provider: 'Spotify',
    isActive: true
  },
  {
    name: 'Smartphone Samsung Galaxy',
    description: 'Último modelo de Samsung Galaxy con cámara de 108MP, pantalla AMOLED y 5G. Incluye garantía de 2 años.',
    category: 'premium',
    pointsCost: 15000,
    stock: 5,
    imageUrl: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400&h=400&fit=crop',
    provider: 'Samsung Store',
    isActive: true
  },
  {
    name: 'Curso de Programación Online',
    description: 'Curso completo de desarrollo web con JavaScript, React y Node.js. Incluye certificado de finalización.',
    category: 'digital',
    pointsCost: 1200,
    stock: 50,
    imageUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400&h=400&fit=crop',
    provider: 'EduTech',
    isActive: true
  },
  {
    name: 'Camiseta Telemetro Edición Limitada',
    description: 'Camiseta oficial de Telemetro en algodón 100% orgánico. Diseño exclusivo y edición limitada.',
    category: 'physical',
    pointsCost: 600,
    stock: 30,
    imageUrl: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&h=400&fit=crop',
    provider: 'Telemetro Store',
    isActive: true
  },
  {
    name: 'Gift Card Amazon $50',
    description: 'Tarjeta de regalo de Amazon por valor de $50 USD. Válida para cualquier producto en Amazon.com.',
    category: 'digital',
    pointsCost: 3500,
    stock: 75,
    imageUrl: 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=400&h=400&fit=crop',
    provider: 'Amazon',
    isActive: true
  },
  {
    name: 'Laptop Gaming MSI',
    description: 'Laptop gaming de alto rendimiento con RTX 4060, Intel i7 y 16GB RAM. Ideal para gaming y trabajo.',
    category: 'premium',
    pointsCost: 25000,
    stock: 3,
    imageUrl: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400&h=400&fit=crop',
    provider: 'MSI Store',
    isActive: true
  },
  {
    name: 'Mochila Deportiva Impermeable',
    description: 'Mochila resistente al agua con múltiples compartimentos. Perfecta para deportes y actividades al aire libre.',
    category: 'physical',
    pointsCost: 900,
    stock: 20,
    imageUrl: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&h=400&fit=crop',
    provider: 'SportGear',
    isActive: true
  },
  {
    name: 'Suscripción Netflix Premium - 6 meses',
    description: 'Acceso completo a Netflix Premium por 6 meses. Disfruta de contenido 4K en hasta 4 dispositivos.',
    category: 'digital',
    pointsCost: 1500,
    stock: 80,
    imageUrl: 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=400&h=400&fit=crop',
    provider: 'Netflix',
    isActive: true
  },
  {
    name: 'Smartwatch Apple Watch Series 9',
    description: 'El smartwatch más avanzado de Apple con GPS, monitor de salud y resistencia al agua.',
    category: 'premium',
    pointsCost: 18000,
    stock: 8,
    imageUrl: 'https://images.unsplash.com/photo-1434494878577-86c23bcb06b9?w=400&h=400&fit=crop',
    provider: 'Apple Store',
    isActive: true
  }
];

async function seedData() {
  try {
    await mongoose.connect('mongodb://localhost:27017/telemetro');
    console.log('Connected to MongoDB');

    // Clear existing products
    await Product.deleteMany({});
    console.log('Cleared existing products');

    // Insert sample products
    await Product.insertMany(sampleProducts);
    console.log(`✅ Successfully created ${sampleProducts.length} sample products!`);

    console.log('\n📦 Products created:');
    sampleProducts.forEach((product, index) => {
      console.log(`${index + 1}. ${product.name} - ${product.pointsCost} pts (${product.category})`);
    });

  } catch (error) {
    console.error('Error seeding data:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

seedData();
