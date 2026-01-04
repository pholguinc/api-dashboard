import mongoose from 'mongoose';

function parseMongoUri(uri: string): { isSrv: boolean; hosts: string; dbName?: string; redactedUri: string } {
  const isSrv = uri.startsWith('mongodb+srv://');
  const redactedUri = uri.replace(/\/\/([^\/@]+)@/, '//***@');
  const withoutProtocol = uri.split('://')[1] ?? uri;
  const atIdx = withoutProtocol.indexOf('@');
  const afterAt = atIdx >= 0 ? withoutProtocol.slice(atIdx + 1) : withoutProtocol;
  const slashIdx = afterAt.indexOf('/');
  const hostPart = slashIdx >= 0 ? afterAt.slice(0, slashIdx) : afterAt;
  const dbName = slashIdx >= 0 ? afterAt.slice(slashIdx + 1).split('?')[0] : undefined;
  return { isSrv, hosts: hostPart, dbName, redactedUri };
}

export async function connectToMongoDB(uri: string, opts?: { retries?: number; initialDelayMs?: number }): Promise<void> {
  const maxRetries = opts?.retries ?? 5;
  const initialDelayMs = opts?.initialDelayMs ?? 1000;
  let attempt = 0;
  let lastError: any;

  const info = parseMongoUri(uri);
  const conn = mongoose.connection;
  conn.on('connected', () => console.log(`✅ Mongoose connected | hosts=${info.hosts} db=${info.dbName ?? '(default)'} srv=${info.isSrv}`));
  conn.on('reconnected', () => console.log('🔁 Mongoose reconnected'));
  conn.on('disconnected', () => console.warn('⚠️  Mongoose disconnected'));
  conn.on('error', (err) => console.error('❌ Mongoose connection error:', err?.message || err));

  while (attempt <= maxRetries) {
    try {
      console.log(`🔌 MongoDB: intentando conexión ${attempt + 1}/${maxRetries} | hosts=${info.hosts} db=${info.dbName ?? '(default)'} srv=${info.isSrv}`);
      await mongoose.connect(uri);
      console.log('✅ Conectado a MongoDB exitosamente');
      return;
    } catch (error) {
      lastError = error;
      attempt += 1;
      const backoff = initialDelayMs * Math.pow(2, attempt - 1);
      console.error(`❌ Error conectando a MongoDB (intento ${attempt}/${maxRetries}): ${(error as any)?.message || error}. Reintentando en ${backoff}ms...`);
      if (attempt > maxRetries) break;
      await new Promise((res) => setTimeout(res, backoff));
    }
  }
  console.error('❌ No se pudo conectar a MongoDB tras múltiples intentos:', lastError);
  throw lastError;
}

export async function disconnectFromMongoDB(): Promise<void> {
  try {
    await mongoose.disconnect();
    console.log('✅ Desconectado de MongoDB');
  } catch (error) {
    console.error('❌ Error desconectando de MongoDB:', error);
    throw error;
  }
}