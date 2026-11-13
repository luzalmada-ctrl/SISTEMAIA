import { Router } from 'express';
import { supabase } from '../db.js';
import { requireAuth } from '../auth.js';
import multer from 'multer';

const router = Router();
router.use(requireAuth);

const upload = multer({ storage: multer.memoryStorage() });

const SELECT = `
  *,
  students(id, code, name, group_name),
  assignments(id, title, due_date, rubric_id),
  grades(id, total_score, max_score, feedback, published, graded_at)
`;

router.get('/', async (req, res) => {
  let query = supabase.from('submissions').select(SELECT).order('submitted_at', { ascending: false });
  if (req.query.assignment_id) query = query.eq('assignment_id', req.query.assignment_id);
  if (req.query.student_id) query = query.eq('student_id', req.query.student_id);
  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.post('/', upload.single('file'), async (req, res) => {
  const { assignment_id, student_id, file_url, file_name, notes } = req.body || {};
  const file = req.file;

  if (!assignment_id || !student_id) {
    return res.status(400).json({ error: 'assignment_id y student_id son requeridos' });
  }

  let finalFileUrl = file_url;
  let finalFileName = file_name;

  if (file) {
    try {
      const path = `${Date.now()}-${file.originalname.replace(/[^\w.\-]/g, '_')}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('submissions')
        .upload(path, file.buffer, {
          contentType: file.mimetype,
          upsert: false
        });

      if (uploadError) {
        return res.status(400).json({ error: uploadError.message });
      }

      const { data: urlData } = await supabase.storage
        .from('submissions')
        .getPublicUrl(path);

      finalFileUrl = urlData.publicUrl;
      finalFileName = file.originalname;
    } catch (err) {
      return res.status(500).json({ error: 'Error al subir archivo: ' + err.message });
    }
  } else if (!file_url) {
    return res.status(400).json({ error: 'Se requiere archivo o file_url' });
  }

  const { data, error } = await supabase
    .from('submissions')
    .upsert(
      {
        assignment_id,
        student_id,
        file_url: finalFileUrl,
        file_name: finalFileName || null,
        notes: notes || null,
        status: 'submitted',
        submitted_at: new Date().toISOString(),
      },
      { onConflict: 'assignment_id,student_id' }
    )
    .select(SELECT)
    .single();
  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json(data);
});

router.patch('/:id', async (req, res) => {
  const { status, file_url, file_name, notes } = req.body || {};
  const updates = {};
  if (status !== undefined) updates.status = status;
  if (file_url !== undefined) updates.file_url = file_url;
  if (file_name !== undefined) updates.file_name = file_name;
  if (notes !== undefined) updates.notes = notes;

  const { data, error } = await supabase
    .from('submissions')
    .update(updates)
    .eq('id', req.params.id)
    .select(SELECT)
    .single();
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

export default router;
