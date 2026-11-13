<script>
  import { onMount, createEventDispatcher } from 'svelte';
  import { api, fmtDate } from '../api.js';

  const dispatch = createEventDispatcher();
  export let submission;

  let criteria = [];
  let details = []; // {criterion_id, name, max_points, score, comment}
  let feedback = '';
  let error = '';
  let saving = false;
  let generating = false;
  let published = false;

  criteria = submission.assignments?.rubrics?.rubric_criteria || [];
  details = criteria
    .slice()
    .sort((a, b) => (a.position || 0) - (b.position || 0))
    .map((c) => ({
      criterion_id: c.id,
      name: c.name,
      max_points: Number(c.max_points) || 0,
      score: 0,
      comment: '',
    }));

  onMount(async () => {
    // Si ya existe calificación, precargar scores y feedback.
    if (submission.grades?.id) {
      try {
        const grade = await api(`/grades/${submission.grades.id}`);
        published = !!grade.published;
        feedback = grade.feedback || '';
        const byCrit = {};
        for (const d of grade.grade_details || []) byCrit[d.criterion_id] = d;
        details = details.map((d) => ({
          ...d,
          score: byCrit[d.criterion_id]?.score ?? 0,
          comment: byCrit[d.criterion_id]?.comment || '',
        }));
      } catch (e) { error = e.message; }
    }
  });

  $: total = details.reduce((s, d) => s + (Number(d.score) || 0), 0);
  $: maxTotal = details.reduce((s, d) => s + d.max_points, 0);

  async function generateDraft() {
    generating = true;
    error = '';
    try {
      const res = await api('/grades/generate-feedback', {
        method: 'POST',
        body: { submission_id: submission.id, details },
      });
      feedback = res.feedback;
    } catch (e) { error = e.message; }
    finally { generating = false; }
  }

  async function save() {
    saving = true;
    error = '';
    try {
      await api('/grades', {
        method: 'POST',
        body: { submission_id: submission.id, details, feedback },
      });
      dispatch('saved');
    } catch (e) { error = e.message; }
    finally { saving = false; }
  }

  async function togglePublish() {
    if (!submission.grades?.id) return;
    try {
      await api(`/grades/${submission.grades.id}/publish`, {
        method: 'PATCH',
        body: { published: !published },
      });
      published = !published;
    } catch (e) { error = e.message; }
  }
</script>

<svelte:options accessors />

<div class="modal-backdrop" on:click|self={() => dispatch('close')}>
  <div class="modal">
    <div class="row-between">
      <h3>Calificar entrega</h3>
      <button class="btn small secondary" on:click={() => dispatch('close')}>✕</button>
    </div>

    <p class="muted">
      {submission.students?.name} · {submission.assignments?.title} ·
      Entregada el {fmtDate(submission.submitted_at)}
    </p>
    {#if submission.file_url}
      <p><a href={submission.file_url} target="_blank" rel="noreferrer">Ver archivo entregado</a></p>
    {/if}

    {#if criteria.length === 0}
      <div class="error-msg">Esta tarea no tiene rúbrica con criterios.</div>
    {:else}
      <div class="criteria-row" style="font-size:12px;color:var(--muted)">
        <span>Criterio</span><span>Puntaje</span><span>Máx.</span><span>Comentario</span>
      </div>
      {#each details as d}
        <div class="criteria-row">
          <div>{d.name}</div>
          <input class="score-input" type="number" min="0" max={d.max_points} step="0.5" bind:value={d.score} />
          <div class="muted">{d.max_points}</div>
          <input bind:value={d.comment} placeholder="Opcional" />
        </div>
      {/each}

      <div class="row-between" style="margin-top:10px">
        <strong>Total: {total.toFixed(1)} / {maxTotal}</strong>
        <span class="badge {total >= maxTotal * 0.8 ? 'ok' : total >= maxTotal * 0.6 ? 'warn' : 'bad'}">
          {maxTotal ? Math.round((total / maxTotal) * 100) : 0}%
        </span>
      </div>

      <label>Retroalimentación para el alumno</label>
      <textarea bind:value={feedback} style="min-height:180px"></textarea>
      <div class="btn-row">
        <button class="btn secondary" on:click={generateDraft} disabled={generating}>
          {generating ? 'Generando…' : 'Generar borrador con IA local'}
        </button>
        {#if submission.grades?.id}
          <button class="btn secondary" on:click={togglePublish}>
            {published ? 'Despublicar' : 'Publicar al alumno'}
          </button>
        {/if}
      </div>
      {#if published}<div class="badge ok" style="margin-top:8px">Retroalimentación publicada</div>{/if}
    {/if}

    {#if error}<div class="error-msg">{error}</div>{/if}

    <div class="btn-row">
      <button class="btn" on:click={save} disabled={saving || criteria.length === 0}>
        {saving ? 'Guardando…' : 'Guardar calificación'}
      </button>
      <button class="btn secondary" on:click={() => dispatch('close')}>Cancelar</button>
    </div>
  </div>
</div>
