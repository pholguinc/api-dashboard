/**
 * Archivo de importación central para todos los modelos
 * CRÍTICO: Este archivo debe importarse en el servidor principal
 * para registrar todos los esquemas de Mongoose
 */

// Modelos principales
export * from './user.model';
export * from './subscription.model';
export * from './points.model';

// Modelos de marketplace y productos
export * from './marketplace.model';
export * from './offer.model';
export * from './offer_redemption.model';
export * from './cart.model';

// Modelos de empleos
export * from './job.model';

// Modelos de streaming
export * from './stream.model';
export { 
  MetroLiveStreamModel,
  StreamFollowModel 
} from './metro-live.model';

// Modelos de educación
export * from './microcourse.model';

// Modelos de seguros
export * from './microseguro.model';

// Modelos de contenido
export * from './clip.model';
export * from './banner.model';
export * from './ad.model';
export * from './game.model';

// Modelos de sesiones
export * from './metro-session.model';

// Modelos de notificaciones
export * from './notification.model';

// Modelos de descuentos metro
export * from './metro-discount.model';
export * from './metro-config.model';
export * from './premium-subscription.model';
export * from './payment-config.model';
export * from './daily-usage.model';
export * from './daily-points.model';
export * from './streak.model';
export * from './points-tracking.model';

// Modelos políticos
export * from './political-candidate.model';

// Modelos de donaciones
export * from './donation.model';

console.log('📦 Todos los modelos de Mongoose registrados exitosamente');
