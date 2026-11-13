<script>
  import { createEventDispatcher } from 'svelte';
  import { api, setSession } from '../api.js';

  const dispatch = createEventDispatcher();

  let mode = 'login'; // 'login' | 'register'
  let name = '';
  let email = '';
  let password = '';
  let error = '';
  let notice = '';
  let loading = false;

  async function submit() {
    error = '';
    notice = '';
    loading = true;
    try {
      if (mode === 'register') {
        const data = await api('/auth/register', {
          method: 'POST',
          body: { name, email, password }
        });
        notice = 'Cuenta creada. Ahora puedes iniciar sesión.';
        mode = 'login';
      } else {
        const data = await api('/auth/login', {
          method: 'POST',
          body: { email, password }
        });
        setSession(data.token, data.user);
        dispatch('login', data.user);
      }
    } catch (e) {
      error = e.message;
    } finally {
      loading = false;
    }
  }
</script>

<svelte:options accessors />

<div class="login-wrap">
  <div class="card login-card">
    <h1>SISTEMAIA</h1>
    <div class="sub">Revisión de entregas SolidWorks · Rúbricas y retroalimentación</div>

    <div class="tabs">
      <button
        type="button"
        class:active={mode === 'login'}
        on:click={() => { mode = 'login'; error = ''; notice = ''; }}
      >Iniciar sesión</button>
      <button
        type="button"
        class:active={mode === 'register'}
        on:click={() => { mode = 'register'; error = ''; notice = ''; }}
      >Crear cuenta</button>
    </div>

    <form on:submit|preventDefault={submit}>
      {#if mode === 'register'}
        <label for="name">Nombre (opcional)</label>
        <input id="name" type="text" bind:value={name} autocomplete="name" />
      {/if}
      <label for="email">Correo electrónico</label>
      <input id="email" type="email" bind:value={email} required autocomplete="username" />
      <label for="pass">Contraseña</label>
      <input id="pass" type="password" bind:value={password} required minlength="6" autocomplete={mode === 'register' ? 'new-password' : 'current-password'} />
      {#if error}<div class="error-msg">{error}</div>{/if}
      {#if notice}<div class="notice-msg">{notice}</div>{/if}
      <div class="btn-row">
        <button class="btn" type="submit" disabled={loading}>
          {loading ? 'Procesando…' : mode === 'register' ? 'Registrarse' : 'Iniciar sesión'}
        </button>
      </div>
    </form>
  </div>
</div>

<style>
  .tabs { display: flex; gap: 6px; margin-bottom: 14px; }
  .tabs button {
    flex: 1;
    padding: 8px;
    border: none;
    border-radius: 8px;
    background: transparent;
    color: var(--muted);
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
  }
  .tabs button.active { background: var(--panel-2); color: var(--accent); }
  .notice-msg { color: var(--ok); font-size: 13px; margin-top: 10px; }
</style>
