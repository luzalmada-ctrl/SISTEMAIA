// Seed de datos de ejemplo. Uso: node supabase/seed.js
// Requiere SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en .env
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  // Admin opcional vía variables de entorno
  if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
    const hash = await bcrypt.hash(process.env.ADMIN_PASSWORD, 12);
    const { error } = await supabase.from('profiles').upsert(
      { name: 'Admin', email: process.env.ADMIN_EMAIL.toLowerCase(), password_hash: hash, role: 'admin' },
      { onConflict: 'email' }
    );
    if (error) console.error('admin:', error.message);
    else console.log('admin ok:', process.env.ADMIN_EMAIL);
  }

  // Rúbrica de ejemplo
  const { data: rubric, error: rErr } = await supabase
    .from('rubrics')
    .insert({ title: 'Rúbrica SolidWorks — Pieza 3D', description: 'Evaluación de entregas de modelado' })
    .select()
    .single();
  if (rErr) { console.error('rubric:', rErr.message); return; }

  await supabase.from('rubric_criteria').insert([
    { rubric_id: rubric.id, name: 'Geometría correcta', description: 'Las medidas coinciden con la consigna', max_points: 30, position: 1 },
    { rubric_id: rubric.id, name: 'Restricciones y relaciones', description: 'Uso adecuado de relaciones y croquis', max_points: 25, position: 2 },
    { rubric_id: rubric.id, name: 'Materiales y apariencia', description: 'Material asignado correctamente', max_points: 15, position: 3 },
    { rubric_id: rubric.id, name: 'Plano con cotas', description: 'Vistas y cotas completas', max_points: 20, position: 4 },
    { rubric_id: rubric.id, name: 'Entrega completa', description: 'Archivos .SLDPRT y PDF incluidos', max_points: 10, position: 5 },
  ]);

  // Alumnos de ejemplo
  const students = ['Ana García', 'Luis Pérez', 'María López', 'Carlos Ruiz'].map((name, i) => ({
    code: `ALU-${String(i + 1).padStart(3, '0')}`,
    name,
    group_name: 'Grupo A',
  }));
  await supabase.from('students').upsert(students, { onConflict: 'code' }).select();

  // Tarea de ejemplo
  await supabase.from('assignments').insert({
    title: 'Tarea 1 — Bracket de soporte',
    description: 'Modela el bracket según el plano adjunto. Entrega .SLDPRT y plano PDF.',
    rubric_id: rubric.id,
    due_date: new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10),
  });

  console.log('Seed completado.');
}

main().catch((e) => { console.error(e); process.exit(1); });
