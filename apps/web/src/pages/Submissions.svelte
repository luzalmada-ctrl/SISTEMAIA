<script>
  import { onMount } from 'svelte';
  import { api, getUser, fmtDate } from '../api.js';
  import GradeModal from '../components/GradeModal.svelte';
  import FileUploadButton from '../components/FileUploadButton.svelte';

  let submissions = [];
  let assignments = [];
  let students = [];
  let filterAssignment = '';
  let error = '';
  let grading = null; // submission seleccionada

  let showNew = false;
  let form = { assignment_id: '', student_id: '', file_url: '', file_name: '', notes: '' };
  let saving = false;
  let selectedFile = null;
  let uploading = false;

  async function load() {
    try {
      const q = filterAssignment ? `?assignment_id=${filterAssignment}` : '';
      submissions = await api(`/submissions${q}`);
    } catch (e) { error = e.message; }
  }

  onMount(async () => {
    try {
      [assignments, students] = await Promise.all([api('/assignments'), api('/students')]);
    } catch (e) { error = e.message; }
    load();
  });

  $: if (filterAssignment !== undefined) load();

  async function submitNew() {
    saving = true;
    error = '';
    try {
      if (selectedFile) {
        uploading = true;
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('assignment_id', form.assignment_id);
        formData.append('student_id', form.student_id);
        formData.append('notes', form.notes);
        await api('/submissions', { method: 'POST', formData });
      } else {
        await api('/submissions', { method: 'POST', body: form });
      }
      showNew = false;
      form = { assignment_id: '', student_id: '', file_url: '', file_name: '', notes: '' };
      selectedFile = null;
      await load();
    } catch (e) { error = e.message; }
    finally { saving = false; uploading = false; }
  }

  function handleFileSelected(file) {
    selectedFile = file;
    form.file_name = file.name;
  }

  async function setStatus(s, status) {
    try {
      await api(`/submissions/${s.id}`, { method: 'PATCH', body: { status } });
      await load();
    } catch (e) { error = e.message; }
  }

  const statusLabel = { submitted: 'Pendiente', graded: 'Calificada', reviewed: 'Revisada' };
  const canGrade = ['admin', 'teacher'].includes(getUser()?.role);
</script>

<div class="row-between">
  <h2>Entregas</h2>
  <button class="btn" on:click={() => (showNew = true)}>+ Registrar entrega</button>
</div>
{#if error}<div class="error-msg">{error}</div>{/if}

<div class="toolbar">
  <select bind:value={filterAssignment}>
    <option value="">Todas las tareas</option>
    {#each assignments as a}<option value={a.id}>{a.title}</option>{/each}
  </select>
</div>

<div class="card">
  {#if submissions.length === 0}
    <div class="empty">No hay entregas para mostrar.</div>
  {:else}
    <table>
      <thead>
        <tr><th>Alumno</th><th>Tarea</th><th>Archivo</th><th>Entrega</th><th>Estado</th><th>Calificación</th><th></th></tr>
      </thead>
      <tbody>
        {#each submissions as s}
          <tr>
            <td>{s.students?.name}</td>
            <td>{s.assignments?.title}</td>
            <td class="muted">{s.file_name || s.file_url}</td>
            <td>{fmtDate(s.submitted_at)}</td>
            <td><span class="badge {s.grades?.id ? 'ok' : 'warn'}">{statusLabel[s.status] || s.status}</span></td>
            <td>{s.grades ? `${s.grades.total_score} / ${s.grades.max_score}` : '—'}</td>
            <td>
              {#if canGrade}
                <button class="btn small" on:click={() => (grading = s)}>
                  {s.grades?.id ? 'Editar' : 'Calificar'}
                </button>
              {/if}
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  {/if}
</div>

{#if showNew}
  <div class="modal-backdrop" on:click|self={() => (showNew = false)}>
    <div class="modal">
      <h3>Registrar entrega</h3>
      <label>Tarea</label>
      <select bind:value={form.assignment_id}>
        <option value="">Selecciona…</option>
        {#each assignments as a}<option value={a.id}>{a.title}</option>{/each}
      </select>
      <label>Alumno</label>
      <select bind:value={form.student_id}>
        <option value="">Selecciona…</option>
        {#each students as st}<option value={st.id}>{st.name} {st.group_name ? `(${st.group_name})` : ''}</option>{/each}
      </select>
      <label>Subir archivo</label>
      <FileUploadButton
        label="Subir archivo de entrega"
        accept=".SLDPRT,.SLDASM,.PDF,.STL,.STEP,.ZIP"
        icon="📤"
        onFileSelected={handleFileSelected}
        selectedFile={selectedFile}
        disabled={uploading}
        uploading={uploading}
      />
      <label>URL del archivo (opcional - si no subes archivo)</label>
      <input bind:value={form.file_url} placeholder="https://…/archivo.SLDPRT" />
      <label>Nombre del archivo</label>
      <input bind:value={form.file_name} placeholder="pieza.SLDPRT" />
      <label>Notas (opcional)</label>
      <textarea bind:value={form.notes}></textarea>
      <div class="btn-row">
        <button class="btn" on:click={submitNew} disabled={saving || uploading || !form.assignment_id || !form.student_id || (!selectedFile && !form.file_url)}>
          {uploading ? 'Subiendo archivo…' : (saving ? 'Guardando…' : 'Guardar')}
        </button>
        <button class="btn secondary" on:click={() => (showNew = false)}>Cancelar</button>
      </div>
    </div>
  </div>
{/if}

{#if grading}
  <GradeModal
    submission={grading}
    on:close={() => { grading = null; load(); }}
    on:saved={() => { grading = null; load(); }}
  />
{/if}
