<script>
  import { createEventDispatcher } from 'svelte';

  export let user;
  export let route;

  const dispatch = createEventDispatcher();

  const nav = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'submissions', label: 'Entregas' },
    { id: 'students', label: 'Alumnos' },
    { id: 'assignments', label: 'Tareas' },
    { id: 'rubrics', label: 'Rúbricas' },
    { id: 'geofences', label: 'Geocercas' },
    { id: 'mygrades', label: 'Mis Calificaciones' },
  ];

  function go(id) {
    location.hash = `#/${id}`;
  }

  function logout() {
    dispatch('logout');
  }
</script>

<div class="layout">
  <aside class="sidebar">
    <img src="/assets/logo.png" alt="TIMS Gestión de Calificaciones" class="logo" />
    <div class="brand-sub">Revisión SolidWorks</div>
    {#each nav as item}
      <div
        class="nav-item"
        class:active={route === item.id}
        on:click={() => go(item.id)}
        on:keydown={(e) => e.key === 'Enter' && go(item.id)}
        role="button"
        tabindex="0"
      >
        {item.label}
      </div>
    {/each}
    <div class="spacer"></div>
    <div class="user-box">
      <b>{user?.name}</b>
      {user?.role}
    </div>
    <div class="nav-item" on:click={logout} on:keydown={(e) => e.key === 'Enter' && logout()} role="button" tabindex="0">
      Cerrar sesión
    </div>
  </aside>
  <main class="main">
    <slot />
  </main>
</div>
