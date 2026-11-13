import { Router } from 'express';
import { supabase } from '../db.js';
import { requireAuth } from '../auth.js';

const router = Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('students')
    .select('*')
    .order('name');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.post('/', async (req, res) => {
  const { code, name, email, group_name } = req.body || {};
  if (!name) return res.status(400).json({ error: 'name es requerido' });
  const { data, error } = await supabase
    .from('students')
    .insert({ code, name, email, group_name })
    .select()
    .single();
  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json(data);
});

router.put('/:id', async (req, res) => {
  const { code, name, email, group_name } = req.body || {};
  const { data, error } = await supabase
    .from('students')
    .update({ code, name, email, group_name })
    .eq('id', req.params.id)
    .select()
    .single();
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

router.delete('/:id', async (req, res) => {
  const { error } = await supabase.from('students').delete().eq('id', req.params.id);
  if (error) return res.status(400).json({ error: error.message });
  res.status(204).end();
});

export default router;
