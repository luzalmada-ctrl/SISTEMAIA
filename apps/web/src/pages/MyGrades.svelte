<script>
  import { onMount } from 'svelte';
  import { api, getUser, fmtDate } from '../api.js';

  let submissions = [];
  let assignments = [];
  let error = '';
  let filterAssignment = '';

  async function load() {
    try {
      const user = getUser();
      const q = filterAssignment ? `?assignment_id=${filterAssignment}` : '';
      // Filtrar por el usuario actual si es un estudiante
      let allSubmissions = await api(`/submissions${q}`);
      if (user?.role === 'student') {
        allSubmissions = allSubmissions.filter(s => s.student_id === user.id);
      }
      submissions = allSubmissions;
    } catch (e) { error = e.message; }
  }

  onMount(async () => {
    try {
      assignments = await api('/assignments');
    } catch (e) { error = e.message; }
    load();
  });

  $: if (filterAssignment !== undefined) load();

  const statusLabel = { submitted: 'Pendiente', graded: 'Calificada', reviewed: 'Revisada' };

  function getScoreColor(score, max) {
    if (!score || !max) return 'var(--muted)';
    const pct = (score / max) * 100;
    if (pct >= 90) return 'var(--ok)';
    if (pct >= 70) return 'var(--warn)';
    return 'var(--bad)';
  }

  function getScoreLabel(score, max) {
    if (!score || !max) return '—';
    const pct = (score / max) * 100;
    if (pct >= 90) return 'Excelente';
    if (pct >= 70) return 'Bueno';
    if (pct >= 50) return 'Aceptable';
    return 'Necesita mejorar';
  }
</script>

<h2>Mis Calificaciones</h2>
{#if error}<div class="error-msg">{error}</div>{/if}

<div class="toolbar">
  <select bind:value={filterAssignment}>
    <option value="">Todas las tareas</option>
    {#each assignments as a}<option value={a.id}>{a.title}</option>{/each}
  </select>
</div>

{#if submissions.length === 0}
  <div class="card">
    <div class="empty">No hay calificaciones para mostrar.</div>
  </div>
{:else}
  <div class="grid cols-2" style="margin-bottom: 20px;">
    <div class="stat">
      <div class="num">{submissions.filter(s => s.grades?.id).length}</div>
      <div class="lbl">Calificadas</div>
    </div>
    <div class="stat">
      <div class="num">{submissions.filter(s => !s.grades?.id).length}</div>
      <div class="lbl">Pendientes</div>
    </div>
  </div>

  <div class="card">
    <h3>Historial de calificaciones</h3>
    <table>
      <thead>
        <tr><th>Tarea</th><th>Archivo</th><th>Fecha</th><th>Estado</th><th>Calificación</th><th>Resultado</th></tr>
      </thead>
      <tbody>
        {#each submissions as s}
          <tr>
            <td>{s.assignments?.title}</td>
            <td class="muted">{s.file_name || s.file_url || '—'}</td>
            <td>{fmtDate(s.submitted_at)}</td>
            <td>
              <span class="badge {s.grades?.id ? 'ok' : 'warn'}">
                {statusLabel[s.status] || s.status}
              </span>
            </td>
            <td style="color: {getScoreColor(s.grades?.total_score, s.grades?.max_score)}; font-weight: 600;">
              {s.grades ? `${s.grades.total_score} / ${s.grades.max_score}` : '—'}
            </td>
            <td>
              {#if s.grades}
                <span class="badge info">{getScoreLabel(s.grades.total_score, s.grades.max_score)}</span>
              {:else}
                <span class="muted">—</span>
              {/if}
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>

  {#if submissions.some(s => s.grades?.feedback)}
    <div class="card">
      <h3>Retroalimentación recibida</h3>
      {#each submissions.filter(s => s.grades?.feedback) as s}
        <div style="padding: 12px; margin-bottom: 12px; background: var(--panel-2); border-radius: 8px; border-left: 3px solid var(--accent-2);">
          <div style="font-weight: 600; margin-bottom: 4px;">{s.assignments?.title}</div>
          <div class="muted" style="font-size: 12px; margin-bottom: 8px;">{fmtDate(s.submitted_at)}</div>
          <div style="white-space: pre-wrap;">{s.grades.feedback}</div>
        </div>
      {/each}
    </div>
  {/if}
{/if}
