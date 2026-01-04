const mongoose = require('mongoose');

async function createDemoStreamers() {
  try {
    await mongoose.connect('mongodb://localhost:27017/telemetro');
    console.log('Connected to MongoDB');

    const userSchema = new mongoose.Schema({
      displayName: String,
      phone: String,
      role: String,
      pointsSmart: Number,
      avatarUrl: String,
      streamerProfile: {
        bio: String,
        categories: [String],
        isVerified: Boolean,
        followers: Number,
        totalStreams: Number,
        streamingHours: Number,
        socialLinks: {
          instagram: String,
          tiktok: String,
          youtube: String
        }
      }
    }, { timestamps: true });

    const User = mongoose.model('User', userSchema);

    // Crear streamers demo underground peruanos
    const streamers = [
      {
        displayName: 'MetroKingLima',
        phone: '+51987654321',
        role: 'metro_streamer',
        pointsSmart: 2500,
        avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
        streamerProfile: {
          bio: 'IRL streamer del metro limeño. Mostrando la cultura underground desde 2023 🚇',
          categories: ['IRL', 'Gaming'],
          isVerified: true,
          followers: 12500,
          totalStreams: 89,
          streamingHours: 156,
          socialLinks: {
            instagram: '@metrokinglima',
            tiktok: '@metroking_pe',
            youtube: 'MetroKingLima'
          }
        }
      },
      {
        displayName: 'LimaGamerUnderground',
        phone: '+51976543210',
        role: 'metro_streamer',
        pointsSmart: 1800,
        avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop&crop=face',
        streamerProfile: {
          bio: 'Gaming en el metro peruano. Mobile Legends, PUBG y más desde las estaciones 🎮',
          categories: ['Gaming', 'Tech'],
          isVerified: true,
          followers: 8900,
          totalStreams: 134,
          streamingHours: 203,
          socialLinks: {
            instagram: '@limagamer_pe',
            tiktok: '@lima_underground',
            youtube: 'LimaGamerUnderground'
          }
        }
      },
      {
        displayName: 'StreetDancerLima',
        phone: '+51965432109',
        role: 'metro_streamer',
        pointsSmart: 3200,
        avatarUrl: 'https://images.unsplash.com/photo-1494790108755-2616c9c76d9c?w=150&h=150&fit=crop&crop=face',
        streamerProfile: {
          bio: 'Breakdance y hip hop en las estaciones del metro. Arte urbano en movimiento 💃',
          categories: ['Dance', 'Art'],
          isVerified: true,
          followers: 15600,
          totalStreams: 67,
          streamingHours: 98,
          socialLinks: {
            instagram: '@streetdancer_lima',
            tiktok: '@dance_metro',
            youtube: 'StreetDancerLima'
          }
        }
      },
      {
        displayName: 'MetroChefPeru',
        phone: '+51954321098',
        role: 'metro_streamer',
        pointsSmart: 2100,
        avatarUrl: 'https://images.unsplash.com/photo-1566492031773-4f4e44671d66?w=150&h=150&fit=crop&crop=face',
        streamerProfile: {
          bio: 'Explorando la gastronomía peruana cerca del metro. De la chifa al ceviche 🍜',
          categories: ['Food', 'IRL'],
          isVerified: true,
          followers: 11200,
          totalStreams: 45,
          streamingHours: 78,
          socialLinks: {
            instagram: '@metrochef_peru',
            tiktok: '@chef_underground',
            youtube: 'MetroChefPeru'
          }
        }
      },
      {
        displayName: 'LimaRapperUnderground',
        phone: '+51943210987',
        role: 'metro_streamer',
        pointsSmart: 2800,
        avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
        streamerProfile: {
          bio: 'Freestyle y rap underground desde las estaciones. La cultura hip hop peruana 🎤',
          categories: ['Music', 'Freestyle'],
          isVerified: true,
          followers: 18900,
          totalStreams: 78,
          streamingHours: 124,
          socialLinks: {
            instagram: '@lima_rapper',
            tiktok: '@freestyle_metro',
            youtube: 'LimaRapperUnderground'
          }
        }
      }
    ];

    await User.insertMany(streamers);
    console.log(`✅ ${streamers.length} Metro Streamers demo creados!`);
    
    streamers.forEach(streamer => {
      console.log(`🎬 ${streamer.displayName} - ${streamer.streamerProfile.followers.toLocaleString()} seguidores`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

createDemoStreamers();
