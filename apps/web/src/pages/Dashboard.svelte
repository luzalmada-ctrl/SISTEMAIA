<script>
  import { onMount } from 'svelte';
  import { api, fmtDate, fmtPct, getUser } from '../api.js';

  let stats = { students: 0, assignments: 0, submissions: 0, graded: 0 };
  let recent = [];
  let error = '';

  onMount(async () => {
    try {
      const [students, assignments, submissions] = await Promise.all([
        api('/students'),
        api('/assignments'),
        api('/submissions'),
      ]);
      stats.students = students.length;
      stats.assignments = assignments.length;
      stats.submissions = submissions.length;
      stats.graded = submissions.filter((s) => s.grades?.id).length;
      recent = submissions.slice(0, 8);
    } catch (e) {
      error = e.message;
    }
  });

  const statusLabel = { submitted: 'Pendiente', graded: 'Calificada', reviewed: 'Revisada' };
</script>

<h2>Dashboard</h2>
{#if error}<div class="error-msg">{error}</div>{/if}

<div class="grid cols-3" style="margin-bottom:20px">
  <div class="stat"><div class="num">{stats.students}</div><div class="lbl">Alumnos</div></div>
  <div class="stat"><div class="num">{stats.assignments}</div><div class="lbl">Tareas</div></div>
  <div class="stat"><div class="num">{stats.submissions}</div><div class="lbl">Entregas</div></div>
  <div class="stat"><div class="num">{stats.graded}</div><div class="lbl">Calificadas</div></div>
  <div class="stat">
    <div class="num">{stats.submissions ? Math.round((stats.graded / stats.submissions) * 100) : 0}%</div>
    <div class="lbl">Avance de revisión</div>
  </div>
</div>

<div class="card">
  <h3>Entregas recientes</h3>
  {#if recent.length === 0}
    <div class="empty">No hay entregas registradas todavía.</div>
  {:else}
    <table>
      <thead>
        <tr><th>Alumno</th><th>Tarea</th><th>Archivo</th><th>Fecha</th><th>Estado</th><th>Calificación</th></tr>
      </thead>
      <tbody>
        {#each recent as s}
          <tr>
            <td>{s.students?.name}</td>
            <td>{s.assignments?.title}</td>
            <td class="muted">{s.file_name || '—'}</td>
            <td>{fmtDate(s.submitted_at)}</td>
            <td>
              <span class="badge {s.grades?.id ? 'ok' : 'warn'}">
                {statusLabel[s.status] || s.status}
              </span>
            </td>
            <td>{s.grades?.total_score ?? '—'}{s.grades?.max_score ? ` / ${s.grades.max_score}` : ''}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  {/if}
</div>
