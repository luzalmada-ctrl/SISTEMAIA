#!/usr/bin/env node
/**
 * Crea el primer usuario administrador.
 * Uso: node apps/api/scripts/create-admin.js admin@correo.com "Password123"
 */
import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
for (const file of [path.resolve(__dirname, '../../../.env'), path.resolve(__dirname, '../../.env')]) {
  try {
    process.loadEnvFile?.(file);
  } catch {
    /* ignore */
  }
}
// Fallback con dotenv si loadEnvFile no existe (Node < 20.12)
if (!process.env.SUPABASE_URL) {
  const dotenv = await import('dotenv');
  dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
  dotenv.config({ path: path.resolve(__dirname, '../../.env') });
}

const [email, password, name = 'Administrador'] = process.argv.slice(2);
if (!email || !password) {
  console.error('Uso: node create-admin.js <email> <password> [nombre]');
  process.exit(1);
}
if (password.length < 8) {
  console.error('La contraseña debe tener al menos 8 caracteres');
  process.exit(1);
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const password_hash = await bcrypt.hash(password, 12);

const { data, error } = await supabase
  .from('profiles')
  .insert({ name, email: email.toLowerCase(), password_hash, role: 'admin' })
  .select('id, name, email, role')
  .single();

if (error) {
  console.error('Error:', error.message);
  process.exit(1);
}
console.log('Admin creado:', data);
