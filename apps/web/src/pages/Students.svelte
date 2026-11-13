<script>
  import { onMount } from 'svelte';
  import { api } from '../api.js';

  let students = [];
  let error = '';
  let editing = null;
  let form = { code: '', name: '', email: '', group_name: '' };

  async function load() {
    try { students = await api('/students'); }
    catch (e) { error = e.message; }
  }
  onMount(load);

  function newStudent() {
    editing = null;
    form = { code: '', name: '', email: '', group_name: '' };
  }
  function editStudent(s) {
    editing = s.id;
    form = { code: s.code || '', name: s.name, email: s.email || '', group_name: s.group_name || '' };
  }

  async function save() {
    error = '';
    try {
      if (editing) await api(`/students/${editing}`, { method: 'PUT', body: form });
      else await api('/students', { method: 'POST', body: form });
      editing = null;
      form = { code: '', name: '', email: '', group_name: '' };
      await load();
    } catch (e) { error = e.message; }
  }

  async function remove(s) {
    if (!confirm(`¿Eliminar a ${s.name}?`)) return;
    try { await api(`/students/${s.id}`, { method: 'DELETE' }); await load(); }
    catch (e) { error = e.message; }
  }
</script>

<div class="row-between">
  <h2>Alumnos</h2>
  <button class="btn" on:click={newStudent}>+ Nuevo alumno</button>
</div>
{#if error}<div class="error-msg">{error}</div>{/if}

<div class="grid cols-2">
  <div class="card">
    <h3>{editing ? 'Editar alumno' : 'Nuevo alumno'}</h3>
    <label>Matrícula / código</label>
    <input bind:value={form.code} placeholder="ALU-001" />
    <label>Nombre completo *</label>
    <input bind:value={form.name} />
    <label>Correo (opcional)</label>
    <input type="email" bind:value={form.email} />
    <label>Grupo</label>
    <input bind:value={form.group_name} placeholder="Grupo A" />
    <div class="btn-row">
      <button class="btn" on:click={save} disabled={!form.name}>Guardar</button>
      {#if editing}<button class="btn secondary" on:click={newStudent}>Cancelar</button>{/if}
    </div>
  </div>

  <div class="card">
    <h3>Lista ({students.length})</h3>
    {#if students.length === 0}
      <div class="empty">Sin alumnos registrados.</div>
    {:else}
      <table>
        <thead><tr><th>Código</th><th>Nombre</th><th>Correo</th><th>Grupo</th><th></th></tr></thead>
        <tbody>
          {#each students as s}
            <tr>
              <td class="muted">{s.code || '—'}</td>
              <td>{s.name}</td>
              <td class="muted">{s.email || '—'}</td>
              <td>{s.group_name || '—'}</td>
              <td style="white-space:nowrap">
                <button class="btn small secondary" on:click={() => editStudent(s)}>Editar</button>
                <button class="btn small danger" on:click={() => remove(s)}>Eliminar</button>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    {/if}
  </div>
</div>
