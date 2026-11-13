import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from './config.js';
import { supabase } from './db.js';

const ROUNDS = 12;

export async function hashPassword(plain) {
  return bcrypt.hash(plain, ROUNDS);
}

export async function verifyPassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

export function signToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn }
  );
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, env.jwtSecret);
  } catch {
    return null;
  }
}

// Busca el perfil por email o lo crea (usuarios de Supabase Auth / Google).
async function findOrCreateProfile(sbUser) {
  const email = sbUser.email.toLowerCase();
  const { data: existing } = await supabase
    .from('profiles')
    .select('id, name, email, role')
    .eq('email', email)
    .single();
  if (existing) return existing;

  const { data: created, error } = await supabase
    .from('profiles')
    .insert({
      name: sbUser.user_metadata?.name || email.split('@')[0],
      email,
      password_hash: await hashPassword(randomUUID()),
      role: 'teacher',
    })
    .select('id, name, email, role')
    .single();

  if (error) {
    console.error('No se pudo crear el perfil:', error.message);
    return null;
  }
  return created;
}

export async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'No autenticado' });

  let user = null;
  const payload = verifyToken(token);
  if (payload) {
    const { data } = await supabase
      .from('profiles')
      .select('id, name, email, role')
      .eq('id', payload.sub)
      .single();
    user = data || null;
  } else {
    // Token de Supabase Auth (Google OAuth / email+password)
    const { data: { user: sbUser }, error } = await supabase.auth.getUser(token);
    if (!error && sbUser?.email) user = await findOrCreateProfile(sbUser);
  }
  if (!user) return res.status(401).json({ error: 'No autenticado' });

  req.user = user;
  next();
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Sin permisos' });
    }
    next();
  };
}
