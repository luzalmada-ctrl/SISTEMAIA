<script>
  import { onMount } from 'svelte';
  import { api, getUser } from '../api.js';
  import FileUploadButton from '../components/FileUploadButton.svelte';

  let rubrics = [];
  let error = '';
  let editing = null;
  let form = { title: '', description: '', attachment_url: '', attachment_name: '' };
  let criteria = []; // {name, description, max_points, weight}
  let selectedFile = null;
  let uploading = false;
  let parsing = false;

  const canEdit = ['admin', 'teacher'].includes(getUser()?.role);
  const canDelete = getUser()?.role === 'admin';

  async function load() {
    try { rubrics = await api('/rubrics'); }
    catch (e) { error = e.message; }
  }
  onMount(load);

  function newRubric() {
    editing = null;
    form = { title: '', description: '', attachment_url: '', attachment_name: '' };
    criteria = [{ name: '', description: '', max_points: 10, weight: 1 }];
    selectedFile = null;
  }
  function editRubric(r) {
    editing = r.id;
    form = { title: r.title, description: r.description || '', attachment_url: r.attachment_url || '', attachment_name: r.attachment_name || '' };
    criteria = (r.rubric_criteria || [])
      .slice()
      .sort((a, b) => (a.position || 0) - (b.position || 0))
      .map((c) => ({ name: c.name, description: c.description || '', max_points: c.max_points, weight: c.weight }));
    if (!criteria.length) criteria = [{ name: '', description: '', max_points: 10, weight: 1 }];
    selectedFile = null;
  }

  function handleFileSelected(file) {
    selectedFile = file;
    form.attachment_name = file.name;
  }

  async function parseFile(file) {
    parsing = true;
    error = '';
    try {
      const formData = new FormData();
      formData.append('file', file);
      const data = await api('/rubrics/parse-file', { method: 'POST', formData });
      
      form.title = data.title || form.title;
      form.description = data.description || form.description;
      criteria = data.criteria && data.criteria.length > 0 
        ? data.criteria.map(c => ({
            name: c.name,
            description: c.description || '',
            max_points: c.max_points || 10,
            weight: c.weight || 1
          }))
        : criteria;
    } catch (e) {
      error = `Error al procesar archivo: ${e.message}`;
    } finally {
      parsing = false;
    }
  }

  function addCriterion() {
    criteria = [...criteria, { name: '', description: '', max_points: 10, weight: 1 }];
  }
  function removeCriterion(i) {
    criteria = criteria.filter((_, idx) => idx !== i);
  }

  async function save() {
    error = '';
    uploading = true;
    const cleanCriteria = criteria.filter((c) => c.name.trim());
    try {
      if (selectedFile) {
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('title', form.title);
        formData.append('description', form.description);
        formData.append('criteria', JSON.stringify(cleanCriteria));
        if (editing) await api(`/rubrics/${editing}`, { method: 'PUT', formData });
        else await api('/rubrics', { method: 'POST', formData });
      } else {
        const body = { ...form, criteria: cleanCriteria };
        if (editing) await api(`/rubrics/${editing}`, { method: 'PUT', body });
        else await api('/rubrics', { method: 'POST', body });
      }
      editing = null;
      form = { title: '', description: '', attachment_url: '', attachment_name: '' };
      criteria = [];
      selectedFile = null;
      await load();
    } catch (e) { error = e.message; }
    finally { uploading = false; }
  }

  async function remove(r) {
    if (!confirm(`¿Eliminar la rúbrica "${r.title}"?`)) return;
    try { await api(`/rubrics/${r.id}`, { method: 'DELETE' }); await load(); }
    catch (e) { error = e.message; }
  }

  $: editingOpen = editing !== null || criteria.length > 0 || form.title;
</script>

<div class="row-between">
  <h2>Rúbricas</h2>
  {#if canEdit}<button class="btn" on:click={newRubric}>+ Nueva rúbrica</button>{/if}
</div>
{#if error}<div class="error-msg">{error}</div>{/if}

{#if editingOpen}
  <div class="card">
    <h3>{editing ? 'Editar rúbrica' : 'Nueva rúbrica'}</h3>
    <div class="grid cols-2">
      <div>
        <label>Título *</label>
        <input bind:value={form.title} placeholder="Rúbrica SolidWorks — Pieza 3D" />
        <label>Descripción</label>
        <textarea bind:value={form.description}></textarea>
        <label>Archivo adjunto (opcional)</label>
        <FileUploadButton
          label="Subir rúbrica (CSV, PDF, Excel)"
          accept=".csv,.CSV,.pdf,.PDF,.doc,.DOC,.docx,.DOCX,.xls,.XLS,.xlsx,.XLSX"
          icon="📋"
          variant="rubric"
          onFileSelected={handleFileSelected}
          selectedFile={selectedFile}
          disabled={uploading || parsing}
          uploading={uploading}
        />
        {#if selectedFile && (selectedFile.name.endsWith('.csv') || selectedFile.name.endsWith('.doc') || selectedFile.name.endsWith('.docx'))}
          <button 
            class="btn small secondary" 
            on:click={() => parseFile(selectedFile)}
            disabled={parsing}
            style="margin-top: 8px;"
          >
            {parsing ? 'Procesando...' : '📄 Extraer datos del archivo'}
          </button>
        {/if}
        {#if form.attachment_url && !selectedFile}
          <div class="muted" style="font-size: 12px; margin-top: 4px;">
            Archivo actual: <a href={form.attachment_url} target="_blank">{form.attachment_name || 'Ver archivo'}</a>
          </div>
        {/if}
      </div>
      <div>
        <label>Criterios de evaluación</label>
        {#each criteria as c, i}
          <div class="criteria-row">
            <div>
              <div class="lbl">Nombre</div>
              <input bind:value={c.name} placeholder="Geometría correcta" />
            </div>
            <div>
              <div class="lbl">Máx.</div>
              <input type="number" min="0" step="0.5" bind:value={c.max_points} />
            </div>
            <div>
              <div class="lbl">Peso</div>
              <input type="number" min="0" step="0.1" bind:value={c.weight} />
            </div>
            <div>
              <div class="lbl">Descripción</div>
              <input bind:value={c.description} placeholder="Opcional" />
            </div>
          </div>
          {#if criteria.length > 1}
            <button class="btn small danger" on:click={() => removeCriterion(i)} style="margin-bottom:8px">Quitar criterio</button>
          {/if}
        {/each}
        <button class="btn small secondary" on:click={addCriterion}>+ Agregar criterio</button>
      </div>
    </div>
    <div class="btn-row">
      <button class="btn" on:click={save} disabled={!form.title || !criteria.some((c) => c.name.trim())}>Guardar</button>
      <button class="btn secondary" on:click={() => { editing = null; form = { title: '', description: '' }; criteria = []; }}>Cancelar</button>
    </div>
  </div>
{/if}

{#each rubrics as r}
  <div class="card">
    <div class="row-between">
      <h3 style="margin:0">{r.title}</h3>
      <div>
        {#if canEdit}<button class="btn small secondary" on:click={() => editRubric(r)}>Editar</button>{/if}
        {#if canDelete}<button class="btn small danger" on:click={() => remove(r)}>Eliminar</button>{/if}
      </div>
    </div>
    {#if r.description}<p class="muted">{r.description}</p>{/if}
    <table>
      <thead><tr><th>Criterio</th><th>Descripción</th><th>Puntaje máx.</th><th>Peso</th></tr></thead>
      <tbody>
        {#each (r.rubric_criteria || []).slice().sort((a, b) => (a.position || 0) - (b.position || 0)) as c}
          <tr>
            <td>{c.name}</td>
            <td class="muted">{c.description || '—'}</td>
            <td>{c.max_points}</td>
            <td>{c.weight}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
{/each}
{#if rubrics.length === 0 && !editingOpen}
  <div class="card"><div class="empty">No hay rúbricas registradas.</div></div>
{/if}
