import { Router } from 'express';
import { supabase } from '../db.js';
import { requireAuth, requireRole } from '../auth.js';
import { generateFeedback } from '../feedback.js';

const router = Router();
router.use(requireAuth);

async function getSubmission(submissionId) {
  const { data, error } = await supabase
    .from('submissions')
    .select('*, students(name), assignments(title, rubrics(rubric_criteria(*)))')
    .eq('id', submissionId)
    .single();
  if (error) return { error };
  return { data };
}

// Borrador de retroalimentación sin guardar (permite previsualizar/editar).
router.post('/generate-feedback', async (req, res) => {
  const { submission_id, details = [] } = req.body || {};
  if (!submission_id) return res.status(400).json({ error: 'submission_id requerido' });

  const { data: sub, error } = await getSubmission(submission_id);
  if (error) return res.status(404).json({ error: 'Entrega no encontrada' });

  const criteria = sub.assignments?.rubrics?.rubric_criteria || [];
  const enriched = details.map((d) => {
    const c = criteria.find((x) => x.id === d.criterion_id);
    return {
      criterion_name: c?.name || 'Criterio',
      score: Number(d.score) || 0,
      max_points: Number(d.max_points ?? c?.max_points ?? 0),
    };
  });
  const totalScore = enriched.reduce((s, d) => s + d.score, 0);
  const maxScore = enriched.reduce((s, d) => s + d.max_points, 0);

  const feedback = generateFeedback({
    studentName: sub.students?.name || 'alumno/a',
    assignmentTitle: sub.assignments?.title || 'la tarea',
    details: enriched,
    totalScore,
    maxScore,
  });

  res.json({ feedback, totalScore, maxScore });
});

// Guarda (o actualiza) la calificación completa de una entrega.
router.post('/', requireRole('admin', 'teacher'), async (req, res) => {
  const { submission_id, details = [], feedback } = req.body || {};
  if (!submission_id || !Array.isArray(details)) {
    return res.status(400).json({ error: 'submission_id y details son requeridos' });
  }

  const { data: sub, error: subErr } = await getSubmission(submission_id);
  if (subErr) return res.status(404).json({ error: 'Entrega no encontrada' });

  const criteria = sub.assignments?.rubrics?.rubric_criteria || [];
  const totalScore = details.reduce((s, d) => s + (Number(d.score) || 0), 0);
  const maxScore = criteria.reduce((s, c) => s + Number(c.max_points || 0), 0);

  // Upsert de la calificación principal.
  const { data: grade, error: gradeErr } = await supabase
    .from('grades')
    .upsert(
      {
        submission_id,
        total_score: totalScore,
        max_score: maxScore,
        feedback: feedback || null,
        graded_by: req.user.id,
        graded_at: new Date().toISOString(),
        published: false,
      },
      { onConflict: 'submission_id' }
    )
    .select()
    .single();
  if (gradeErr) return res.status(400).json({ error: gradeErr.message });

  // Reemplazo de detalles por criterio.
  await supabase.from('grade_details').delete().eq('grade_id', grade.id);
  if (details.length) {
    const rows = details.map((d) => ({
      grade_id: grade.id,
      criterion_id: d.criterion_id,
      score: Number(d.score) || 0,
      max_points: Number(d.max_points) || 0,
      comment: d.comment || null,
    }));
    const { error: detErr } = await supabase.from('grade_details').insert(rows);
    if (detErr) return res.status(400).json({ error: detErr.message });
  }

  const { data: full } = await supabase
    .from('grades')
    .select('*, grade_details(*)')
    .eq('id', grade.id)
    .single();

  // Marca la entrega como calificada.
  await supabase.from('submissions').update({ status: 'graded' }).eq('id', submission_id);

  res.status(201).json(full);
});

router.get('/:id', async (req, res) => {
  const { data, error } = await supabase
    .from('grades')
    .select('*, grade_details(*)')
    .eq('id', req.params.id)
    .single();
  if (error) return res.status(404).json({ error: 'Calificación no encontrada' });
  res.json(data);
});

router.patch('/:id/publish', requireRole('admin', 'teacher'), async (req, res) => {
  const published = req.body?.published !== false;
  const { data, error } = await supabase
    .from('grades')
    .update({ published })
    .eq('id', req.params.id)
    .select()
    .single();
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

export default router;
