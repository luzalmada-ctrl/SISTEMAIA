<script>
  import { onMount } from 'svelte';
  import { isLoggedIn, getUser, clearSession } from './api.js';
  import { supabase } from './supabase.js';
  import Login from './components/Login.svelte';
  import Layout from './components/Layout.svelte';
  import Dashboard from './pages/Dashboard.svelte';
  import Submissions from './pages/Submissions.svelte';
  import Students from './pages/Students.svelte';
  import Assignments from './pages/Assignments.svelte';
  import Rubrics from './pages/Rubrics.svelte';
  import MyGrades from './pages/MyGrades.svelte';
  import Geofences from './pages/Geofences.svelte';

  let route = 'dashboard';
  let user = null;

  const routes = {
    dashboard: Dashboard,
    submissions: Submissions,
    students: Students,
    assignments: Assignments,
    rubrics: Rubrics,
    mygrades: MyGrades,
    geofences: Geofences,
  };

  function parseHash() {
    const h = location.hash.replace(/^#\/?/, '');
    return routes[h] ? h : 'dashboard';
  }

  onMount(() => {
    user = getUser();
    route = parseHash();
    const onHash = () => { route = parseHash(); };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  });

  function onLogin(u) {
    user = u;
    location.hash = '#/dashboard';
  }

  function logout() {
    supabase.auth.signOut();
    clearSession();
    user = null;
    location.hash = '#/login';
  }

  $: Page = routes[route] || Dashboard;
  $: authed = isLoggedIn() && user;
</script>

{#if !authed}
  <Login on:login={onLogin} />
{:else}
  <Layout {user} bind:route on:logout={logout}>
    <Page />
  </Layout>
{/if}
