import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { supabase } from '../db.js';
import { hashPassword, verifyPassword, signToken, requireAuth } from '../auth.js';

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados intentos, intenta más tarde' },
});

router.post('/login', loginLimiter, async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Email y contraseña requeridos' });

  const { data: user, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', email.toLowerCase().trim())
    .single();

  if (error || !user) return res.status(401).json({ error: 'Credenciales inválidas' });

  const ok = await verifyPassword(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: 'Credenciales inválidas' });

  const token = signToken(user);
  res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  });
});

router.post('/register', async (req, res) => {
  // Registro público para nuevos usuarios (por defecto rol 'teacher')
  const { name, email, password, role = 'teacher' } = req.body || {};
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'name, email y password son requeridos' });
  }
  if (String(password).length < 8) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });
  }

  const password_hash = await hashPassword(password);
  const { data, error } = await supabase
    .from('profiles')
    .insert({ name, email: email.toLowerCase().trim(), password_hash, role })
    .select('id, name, email, role')
    .single();

  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json(data);
});

router.get('/me', requireAuth, (req, res) => res.json({ user: req.user }));

export default router;
