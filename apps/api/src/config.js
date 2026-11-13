import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Carga .env de la raíz del monorepo y del propio paquete si existen.
for (const file of [
  path.resolve(__dirname, '../../../.env'),
  path.resolve(__dirname, '../.env'),
]) {
  dotenv.config({ path: file });
}

export const env = {
  port: Number(process.env.PORT || 3001),
  nodeEnv: process.env.NODE_ENV || 'development',
  clusterWorkers: Math.max(1, Number(process.env.CLUSTER_WORKERS || 1)),
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-cambiar-en-produccion',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
  corsOrigin: process.env.CORS_ORIGIN || '*',
};

const required = ['supabaseUrl', 'supabaseServiceKey'];
const missing = required.filter((k) => !env[k]);
if (missing.length && env.nodeEnv === 'production') {
  console.error(`Faltan variables de entorno: ${missing.join(', ')}`);
}
