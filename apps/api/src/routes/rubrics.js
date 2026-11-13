import { Router } from 'express';
import { supabase } from '../db.js';
import { requireAuth, requireRole } from '../auth.js';
import multer from 'multer';
import { parseRubricFile } from '../fileParser.js';

const router = Router();
router.use(requireAuth);

const upload = multer({ storage: multer.memoryStorage() });
const BUCKET = 'rubrics';

// Endpoint para parsear archivos de rúbrica (CSV, DOC, DOCX)
router.post('/parse-file', requireRole('admin', 'teacher'), upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No se proporcionó ningún archivo' });
  }

  try {
    const parsedData = await parseRubricFile(req.file.buffer, req.file.mimetype, req.file.originalname);
    res.json(parsedData);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Rúbricas con sus criterios anidados.
router.get('/', async (req, res) => {
  const { data: rubrics, error } = await supabase
    .from('rubrics')
    .select('*, rubric_criteria(*)')
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(rubrics);
});

router.post('/', requireRole('admin', 'teacher'), upload.single('file'), async (req, res) => {
  const { title, description, criteria = [] } = req.body || {};
  if (!title) return res.status(400).json({ error: 'title es requerido' });

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

  const { data: rubric, error } = await supabase
    .from('rubrics')
    .insert({ title, description, created_by: req.user.id, attachment_url, attachment_name })
    .select()
    .single();
  if (error) return res.status(400).json({ error: error.message });

  if (criteria.length) {
    const rows = criteria.map((c) => ({
      rubric_id: rubric.id,
      name: c.name,
      description: c.description || null,
      max_points: Number(c.max_points) || 0,
      weight: Number(c.weight) || 1,
    }));
    const { error: critErr } = await supabase.from('rubric_criteria').insert(rows);
    if (critErr) return res.status(400).json({ error: critErr.message });
  }

  const { data: full } = await supabase
    .from('rubrics')
    .select('*, rubric_criteria(*)')
    .eq('id', rubric.id)
    .single();
  res.status(201).json(full);
});

router.put('/:id', requireRole('admin', 'teacher'), upload.single('file'), async (req, res) => {
  const { title, description, criteria } = req.body || {};
  const updates = {};
  if (title !== undefined) updates.title = title;
  if (description !== undefined) updates.description = description;

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

  const { data: rubric, error } = await supabase
    .from('rubrics')
    .update(updates)
    .eq('id', req.params.id)
    .select()
    .single();
  if (error) return res.status(400).json({ error: error.message });

  // Reemplazo simple de criterios cuando se envían.
  if (Array.isArray(criteria)) {
    await supabase.from('rubric_criteria').delete().eq('rubric_id', rubric.id);
    if (criteria.length) {
      const rows = criteria.map((c) => ({
        rubric_id: rubric.id,
        name: c.name,
        description: c.description || null,
        max_points: Number(c.max_points) || 0,
        weight: Number(c.weight) || 1,
      }));
      await supabase.from('rubric_criteria').insert(rows);
    }
  }

  const { data: full } = await supabase
    .from('rubrics')
    .select('*, rubric_criteria(*)')
    .eq('id', rubric.id)
    .single();
  res.json(full);
});

router.delete('/:id', requireRole('admin'), async (req, res) => {
  const { error } = await supabase.from('rubrics').delete().eq('id', req.params.id);
  if (error) return res.status(400).json({ error: error.message });
  res.status(204).end();
});

export default router;
