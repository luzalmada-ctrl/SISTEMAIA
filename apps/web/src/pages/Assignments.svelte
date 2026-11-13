<script>
  import { onMount } from 'svelte';
  import { api, fmtDate } from '../api.js';
  import FileUploadButton from '../components/FileUploadButton.svelte';

  let rubrics = [];
  let assignments = [];
  let error = '';
  let editing = null;
  let form = { title: '', description: '', due_date: '', rubric_id: '', status: 'open', attachment_url: '', attachment_name: '' };
  let selectedFile = null;
  let uploading = false;

  async function load() {
    try {
      [rubrics, assignments] = await Promise.all([api('/rubrics'), api('/assignments')]);
    } catch (e) { error = e.message; }
  }
  onMount(load);

  function newAssignment() {
    editing = null;
    form = { title: '', description: '', due_date: '', rubric_id: rubrics[0]?.id || '', status: 'open', attachment_url: '', attachment_name: '' };
    selectedFile = null;
  }
  async function editAssignment(a) {
    await load();
    const updated = assignments.find(item => item.id === a.id);
    if (!updated) return;
    editing = updated.id;
    form = {
      title: updated.title,
      description: updated.description || '',
      due_date: updated.due_date || '',
      rubric_id: updated.rubric_id,
      status: updated.status,
      attachment_url: updated.attachment_url || '',
      attachment_name: updated.attachment_name || '',
    };
    selectedFile = null;
  }

  function handleFileSelected(file) {
    selectedFile = file;
    form.attachment_name = file.name;
  }

  async function save() {
    error = '';
    uploading = true;
    try {
      let body = { ...form, due_date: form.due_date || null };

      if (selectedFile) {
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('title', form.title);
        formData.append('description', form.description);
        formData.append('due_date', form.due_date || '');
        formData.append('rubric_id', form.rubric_id);
        formData.append('status', form.status);
        if (editing) await api(`/assignments/${editing}`, { method: 'PUT', formData });
        else await api('/assignments', { method: 'POST', formData });
      } else {
        if (editing) await api(`/assignments/${editing}`, { method: 'PUT', body });
        else await api('/assignments', { method: 'POST', body });
      }

      editing = null;
      form = { title: '', description: '', due_date: '', rubric_id: '', status: 'open', attachment_url: '', attachment_name: '' };
      selectedFile = null;
      await load();
    } catch (e) { error = e.message; }
    finally { uploading = false; }
  }

  async function remove(a) {
    if (!confirm(`¿Eliminar la tarea "${a.title}"? Se borrarán sus entregas.`)) return;
    try { await api(`/assignments/${a.id}`, { method: 'DELETE' }); await load(); }
    catch (e) { error = e.message; }
  }
</script>

<div class="row-between">
  <h2>Tareas</h2>
  <button class="btn" on:click={newAssignment} disabled={rubrics.length === 0}>+ Nueva tarea</button>
</div>
{#if rubrics.length === 0}
  <div class="card"><div class="empty">Primero crea una rúbrica en la sección Rúbricas.</div></div>
{/if}
{#if error}<div class="error-msg">{error}</div>{/if}

<div class="grid cols-2">
  <div class="card">
    <h3>{editing ? 'Editar tarea' : 'Nueva tarea'}</h3>
    <label>Título *</label>
    <input bind:value={form.title} placeholder="Tarea 1 — Bracket" />
    <label>Descripción / consigna</label>
    <textarea bind:value={form.description}></textarea>
    <label>Fecha de entrega</label>
    <input type="date" bind:value={form.due_date} />
    <label>Rúbrica *</label>
    <select bind:value={form.rubric_id}>
      {#each rubrics as r}<option value={r.id}>{r.title} ({r.rubric_criteria?.length || 0} criterios)</option>{/each}
    </select>
    <label>Estado</label>
    <select bind:value={form.status}>
      <option value="open">Abierta</option>
      <option value="closed">Cerrada</option>
    </select>
    <label>Archivo adjunto (opcional)</label>
    <FileUploadButton
      label="Subir archivo de la tarea"
      accept=".PDF,.DOC,.DOCX,.PPT,.PPTX,.SLDPRT,.SLDASM,.STL,.STEP,.ZIP"
      icon="📎"
      onFileSelected={handleFileSelected}
      selectedFile={selectedFile}
      disabled={uploading}
      uploading={uploading}
    />
    {#if form.attachment_url && !selectedFile}
      <div class="muted" style="font-size: 12px; margin-top: 4px;">
        Archivo actual: <a href={form.attachment_url} target="_blank">{form.attachment_name || 'Ver archivo'}</a>
      </div>
    {/if}
    <div class="btn-row">
      <button class="btn" on:click={save} disabled={!form.title || !form.rubric_id || uploading}>Guardar</button>
      {#if editing}<button class="btn secondary" on:click={newAssignment}>Cancelar</button>{/if}
    </div>
  </div>

  <div class="card">
    <h3>Tareas ({assignments.length})</h3>
    {#if assignments.length === 0}
      <div class="empty">Sin tareas registradas.</div>
    {:else}
      <table>
        <thead><tr><th>Título</th><th>Rúbrica</th><th>Entrega</th><th>Adjunto</th><th>Estado</th><th></th></tr></thead>
        <tbody>
          {#each assignments as a}
            <tr>
              <td>{a.title}</td>
              <td class="muted">{a.rubrics?.title || '—'}</td>
              <td>{fmtDate(a.due_date)}</td>
              <td>
                {#if a.attachment_url}
                  <a href={a.attachment_url} target="_blank" class="btn small secondary">📎 Ver</a>
                {:else}
                  <span class="muted">—</span>
                {/if}
              </td>
              <td><span class="badge {a.status === 'open' ? 'ok' : 'bad'}">{a.status === 'open' ? 'Abierta' : 'Cerrada'}</span></td>
              <td style="white-space:nowrap">
                <button class="btn small secondary" on:click={() => editAssignment(a)}>Editar</button>
                <button class="btn small danger" on:click={() => remove(a)}>Eliminar</button>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    {/if}
  </div>
</div>
