import admin from 'firebase-admin';
import { env } from './env';

let firebaseApp: admin.app.App | null = null;

export function initializeFirebase(): admin.app.App {
  if (firebaseApp) return firebaseApp;

  if (!env.firebase.enabled) {
    throw new Error('Firebase no está habilitado');
  }

  try {
    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert({
        projectId: env.firebase.projectId,
        clientEmail: env.firebase.clientEmail,
        privateKey: env.firebase.privateKey,
      }),
    });

    console.log('✅ Firebase inicializado');
    return firebaseApp;
  } catch (error) {
    console.error('❌ Error inicializando Firebase:', error);
    throw error;
  }
}

export function getFirebaseApp(): admin.app.App {
  if (!firebaseApp) {
    throw new Error('Firebase no ha sido inicializado');
  }
  return firebaseApp;
}
