<script>
  import GeofenceMap from '../components/GeofenceMap.svelte';
  import { onMount, onDestroy } from 'svelte';
  import { api, getUser } from '../api.js';
  import { containsPoint } from '../geofenceUtils.js';

  let geofenceMap;
  let geofences = [];
  let events = [];
  let newName = '';
  let loading = true;
  let error = null;

  // Estado de presencia por geocerca: { [id]: 'inside' | 'outside' }
  let presence = {};
  let watchId = null;
  let pollTimer = null;
  let user = null;
  let locating = false;

  async function locateMe() {
    if (locating || !geofenceMap) return;
    locating = true;
    error = null;
    try {
      await geofenceMap.getCurrentLocation();
    } catch (e) {
      error = `No se pudo obtener tu ubicación: ${typeof e === 'string' ? e : e.message}`;
    } finally {
      locating = false;
    }
  }

  const COLORS = ['#6c5ce7', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#ec4899'];

  // ---------- Geocercas ----------

  async function loadGeofences() {
    loading = true;
    try {
      const data = await api('/geofences');
      geofenceMap?.clearGeofences();
      geofences = data.map((g, i) => {
        const geo = { ...g.geometry, id: g.id, color: g.color || COLORS[i % COLORS.length] };
        const layer = geofenceMap?.addGeofence(geo);
        return { ...g, geometry: g.geometry, layer };
      });
    } catch (e) {
      error = e.message;
    } finally {
      loading = false;
    }
  }

  async function loadEvents() {
    try {
      events = await api('/geofences/events');
    } catch {
      // silencioso: la lista de eventos es informativa
    }
  }

  function geometryPayload(data) {
    const payload = { type: data.type };
    if (data.type === 'circle') {
      payload.center = { lat: data.center.lat, lng: data.center.lng };
      payload.radius = data.radius;
    } else if (data.type === 'rectangle' && data.bounds) {
      payload.bounds = data.bounds;
    } else {
      payload.coordinates = data.coordinates;
    }
    return payload;
  }

  async function handleGeofenceCreated(data, layer, isEdit = false) {
    error = null;
    const geometry = geometryPayload(data);
    const name = newName.trim() || 'Geocerca';
    try {
      if (isEdit && layer.geofenceId) {
        const saved = await api(`/geofences/${layer.geofenceId}`, {
          method: 'PUT',
          body: { geometry },
        });
        geofences = geofences.map((g) => (g.id === saved.id ? { ...g, ...saved } : g));
      } else {
        const saved = await api('/geofences', {
          method: 'POST',
          body: { name, type: data.type, geometry, color: COLORS[geofences.length % COLORS.length] },
        });
        geofenceMap.setGeofenceId(layer, saved.id);
        geofences = [...geofences, { ...saved, layer }];
        newName = '';
      }
      await loadEvents();
    } catch (e) {
      error = `No se pudo guardar la geocerca: ${e.message}`;
    }
  }

  async function handleGeofenceDeleted(layer) {
    error = null;
    const id = layer.geofenceId;
    try {
      if (id) await api(`/geofences/${id}`, { method: 'DELETE' });
    } catch (e) {
      error = `No se pudo eliminar la geocerca: ${e.message}`;
    }
    geofences = geofences.filter((g) => g.id !== id);
    delete presence[id];
    presence = presence;
    await loadEvents();
  }

  async function deleteAllGeofences() {
    if (!confirm('¿Eliminar todas las geocercas guardadas?')) return;
    error = null;
    try {
      for (const g of geofences) {
        if (g.id) await api(`/geofences/${g.id}`, { method: 'DELETE' });
      }
    } catch (e) {
      error = `Error al eliminar: ${e.message}`;
    }
    geofenceMap.clearGeofences();
    geofences = [];
    presence = {};
    await loadEvents();
  }

  // ---------- Detección de entrada/salida ----------

  function reportTransition(id, eventType, lat, lng) {
    api(`/geofences/${id}/events`, {
      method: 'POST',
      body: { event_type: eventType, lat, lng },
    }).then(loadEvents).catch(() => {});
  }

  function checkLocation(position) {
    const lat = position.coords.latitude;
    const lng = position.coords.longitude;
    geofenceMap?.setUserLocation(lat, lng, position.coords.accuracy);
    for (const g of geofences) {
      if (!g.id || !g.geometry) continue;
      const inside = containsPoint(g.geometry, lat, lng);
      const state = inside ? 'inside' : 'outside';
      const prev = presence[g.id];
      if (prev === undefined) {
        // Primera lectura: registrar estado sin disparar evento
        presence = { ...presence, [g.id]: state };
      } else if (prev !== state) {
        presence = { ...presence, [g.id]: state };
        reportTransition(g.id, inside ? 'enter' : 'exit', lat, lng);
      }
    }
  }

  function startWatching() {
    if (!navigator.geolocation) {
      error = 'Tu navegador no soporta geolocalización';
      return;
    }
    watchId = navigator.geolocation.watchPosition(
      checkLocation,
      () => {},
      { enableHighAccuracy: true, maximumAge: 15000 }
    );
    pollTimer = setInterval(() => {
      navigator.geolocation.getCurrentPosition(checkLocation, () => {}, {
        enableHighAccuracy: true,
        timeout: 15000,
      });
    }, 30000);
  }

  function stopWatching() {
    if (watchId !== null) navigator.geolocation.clearWatch(watchId);
    if (pollTimer) clearInterval(pollTimer);
    watchId = null;
    pollTimer = null;
  }

  function fmtTime(d) {
    return d ? new Date(d).toLocaleString('es-MX') : '—';
  }

  onMount(() => {
    user = getUser();
    loadGeofences().then(() => {
      loadEvents();
      startWatching();
      locateMe();
    });
  });

  onDestroy(stopWatching);
</script>

<div class="page">
  <h2>Geocercas</h2>
  <p class="muted">
    Dibuja geocercas en el mapa, asígnales un nombre y guárdalas.
    {#if user}Se registrarán automáticamente las entradas y salidas de {user.name}.{/if}
  </p>

  <div class="toolbar">
    <input
      class="name-input"
      type="text"
      placeholder="Nombre de la nueva geocerca (opcional)"
      bind:value={newName}
      disabled={loading}
    />
    <button class="btn secondary" on:click={deleteAllGeofences} disabled={geofences.length === 0}>
      Eliminar Todas
    </button>
    <button class="btn secondary" on:click={locateMe} disabled={locating}>
      {locating ? 'Obteniendo ubicación…' : 'Mi ubicación'}
    </button>
    <button class="btn secondary" on:click={loadEvents}>Actualizar Eventos</button>
  </div>

  {#if error}
    <div class="alert error">{error}</div>
  {/if}

  <div class="card">
    {#if loading}
      <p class="muted">Cargando geocercas…</p>
    {/if}
    <GeofenceMap
      bind:this={geofenceMap}
      center={[19.4326, -99.1332]}
      zoom={13}
      height="600px"
      onGeofenceCreated={handleGeofenceCreated}
      onGeofenceDeleted={handleGeofenceDeleted}
      editable={true}
    />
    <p class="muted" style="margin-top: 8px;">
      Usa las herramientas de la esquina superior izquierda para dibujar (polígono, rectángulo, círculo),
      editar o eliminar geocercas. Los cambios se guardan automáticamente.
    </p>
  </div>

  {#if geofences.length > 0}
    <div class="card">
      <h3>Geocercas guardadas ({geofences.length})</h3>
      <table>
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Tipo</th>
            <th>Estado</th>
            <th>Detalles</th>
          </tr>
        </thead>
        <tbody>
          {#each geofences as geofence}
            <tr>
              <td>{geofence.name || 'Geocerca'}</td>
              <td><span class="badge info">{geofence.type}</span></td>
              <td>
                {#if presence[geofence.id] === 'inside'}
                  <span class="badge ok">Dentro</span>
                {:else if presence[geofence.id] === 'outside'}
                  <span class="badge warn">Fuera</span>
                {:else}
                  <span class="badge">—</span>
                {/if}
              </td>
              <td>
                {#if geofence.geometry?.type === 'circle'}
                  Centro: {geofence.geometry.center.lat.toFixed(4)}, {geofence.geometry.center.lng.toFixed(4)} | Radio: {Math.round(geofence.geometry.radius)}m
                {:else if geofence.geometry?.coordinates}
                  {geofence.geometry.coordinates.length} puntos
                {:else}
                  Rectángulo
                {/if}
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}

  <div class="card">
    <h3>Eventos de entrada/salida</h3>
    {#if events.length === 0}
      <p class="muted">Aún no hay eventos registrados.</p>
    {:else}
      <table>
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Geocerca</th>
            <th>Persona</th>
            <th>Evento</th>
            <th>Ubicación</th>
          </tr>
        </thead>
        <tbody>
          {#each events as ev}
            <tr>
              <td>{fmtTime(ev.created_at)}</td>
              <td>{ev.geofence_name || '—'}</td>
              <td>{ev.profile_name || '—'}</td>
              <td>
                <span class="badge {ev.event_type === 'enter' ? 'ok' : 'warn'}">
                  {ev.event_type === 'enter' ? 'Entró' : 'Salió'}
                </span>
              </td>
              <td>{Number(ev.lat).toFixed(5)}, {Number(ev.lng).toFixed(5)}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    {/if}
  </div>
</div>

<style>
  .name-input {
    padding: 8px 12px;
    border-radius: 6px;
    border: 1px solid var(--border, #334155);
    background: var(--bg-input, #1e293b);
    color: inherit;
    min-width: 260px;
  }
  .toolbar {
    display: flex;
    gap: 10px;
    align-items: center;
    flex-wrap: wrap;
    margin-bottom: 12px;
  }
</style>
