<script>
  import { createEventDispatcher } from 'svelte';
  import Assignments from '../pages/Assignments.svelte';

  export let user;
  export let route;

  const dispatch = createEventDispatcher();

  const nav = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'submissions', label: 'Entregas' },
    { id: 'students', label: 'Alumnos' },
    { id: 'assignments', label: 'Tareas', expandable: true },
    { id: 'rubrics', label: 'Rúbricas' },
    { id: 'geofences', label: 'Geocercas' },
    { id: 'mygrades', label: 'Mis Calificaciones' },
  ];

  let expandedItem = null;

  function go(id) {
    location.hash = `#/${id}`;
  }

  function handleNavClick(event, id) {
    event.preventDefault();
    event.stopPropagation();
    const item = nav.find(n => n.id === id);
    if (item?.expandable) {
      expandedItem = expandedItem === id ? null : id;
    } else {
      expandedItem = null;
      go(id);
    }
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
        on:click={(e) => handleNavClick(e, item.id)}
        on:keydown={(e) => e.key === 'Enter' && handleNavClick(e, item.id)}
        role="button"
        tabindex="0"
      >
        {item.label}
      </div>
      {#if item.expandable && expandedItem === item.id}
        <div class="nav-expanded">
          {#if item.id === 'assignments'}
            <div class="expanded-content">
              <Assignments />
            </div>
          {/if}
        </div>
      {/if}
    {/each}
    <div class="spacer"></div>
    <div class="user-box">
      <b>{user?.name}</b>
      {user?.role}
    </div>
    <div class="nav-item" on:click={(e) => { e.preventDefault(); e.stopPropagation(); logout(); }} on:keydown={(e) => e.key === 'Enter' && (e.preventDefault(), e.stopPropagation(), logout())} role="button" tabindex="0">
      Cerrar sesión
    </div>
  </aside>
  <main class="main">
    <slot />
  </main>
</div>
