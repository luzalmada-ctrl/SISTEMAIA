import { Router } from 'express';
import { supabase } from '../db.js';
import { requireAuth, requireRole } from '../auth.js';
import multer from 'multer';

const router = Router();
router.use(requireAuth);

const upload = multer({ storage: multer.memoryStorage() });
const BUCKET = 'assignments';

router.get('/', async (req, res) => {
  let query = supabase
    .from('assignments')
    .select('*, rubrics(title, rubric_criteria(*))')
    .order('due_date', { ascending: true });
  if (req.query.rubric_id) query = query.eq('rubric_id', req.query.rubric_id);
  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.post('/', requireRole('admin', 'teacher'), upload.single('file'), async (req, res) => {
  const { title, description, due_date, rubric_id, status } = req.body || {};
  if (!title || !rubric_id) {
    return res.status(400).json({ error: 'title y rubric_id son requeridos' });
  }

  let attachment_url = null;
  let attachment_name = null;

  if (req.file) {
    const fileName = `${Date.now()}-${req.file.originalname.replace(/[^\w.\-]/g, '_')}`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(fileName, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: false
      });

    if (uploadError) {
      return res.status(400).json({ error: uploadError.message });
    }

    const { data: { publicUrl } } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(fileName);

    attachment_url = publicUrl;
    attachment_name = req.file.originalname;
  }

  const { data, error } = await supabase
    .from('assignments')
    .insert({
      title,
      description,
      due_date: due_date || null,
      rubric_id,
      status: status || 'open',
      created_by: req.user.id,
      attachment_url,
      attachment_name,
    })
    .select('*, rubrics(title, rubric_criteria(*))')
    .single();
  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json(data);
});

router.put('/:id', requireRole('admin', 'teacher'), upload.single('file'), async (req, res) => {
  const { title, description, due_date, rubric_id, status } = req.body || {};
  const updates = {};
  if (title !== undefined) updates.title = title;
  if (description !== undefined) updates.description = description;
  if (due_date !== undefined) updates.due_date = due_date || null;
  if (rubric_id !== undefined) updates.rubric_id = rubric_id;
  if (status !== undefined) updates.status = status;

  if (req.file) {
    const fileName = `${Date.now()}-${req.file.originalname.replace(/[^\w.\-]/g, '_')}`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(fileName, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: false
      });

    if (uploadError) {
      return res.status(400).json({ error: uploadError.message });
    }

    const { data: { publicUrl } } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(fileName);

    updates.attachment_url = publicUrl;
    updates.attachment_name = req.file.originalname;
  }

  const { data, error } = await supabase
    .from('assignments')
    .update(updates)
    .eq('id', req.params.id)
    .select('*, rubrics(title, rubric_criteria(*))')
    .single();
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

router.delete('/:id', requireRole('admin'), async (req, res) => {
  const { error } = await supabase.from('assignments').delete().eq('id', req.params.id);
  if (error) return res.status(400).json({ error: error.message });
  res.status(204).end();
});

export default router;
