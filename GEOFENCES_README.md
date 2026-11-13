# Módulo de Geocercas con Leaflet

Se ha integrado un módulo independiente para dibujar geocercas utilizando [Leaflet](https://leafletjs.com) y [Leaflet Draw](https://leaflet.github.io/Leaflet.draw/).

## Componentes

### GeofenceMap.svelte
Componente reutilizable de Svelte que proporciona un mapa interactivo con herramientas para dibujar geocercas.

**Ubicación:** `apps/web/src/components/GeofenceMap.svelte`

**Props:**
- `center` (array): Coordenadas centrales del mapa [lat, lng]. Default: [19.4326, -99.1332] (Ciudad de México)
- `zoom` (number): Nivel de zoom inicial. Default: 13
- `height` (string): Altura del contenedor. Default: '500px'
- `width` (string): Ancho del contenedor. Default: '100%'
- `editable` (boolean): Habilita/deshabilita herramientas de dibujo. Default: true
- `onGeofenceCreated` (function): Callback cuando se crea o edita una geocerca
- `onGeofenceDeleted` (function): Callback cuando se elimina una geocerca

**Métodos expuestos:**
- `addGeofence(geofenceData)`: Agrega una geocerca existente al mapa
- `clearGeofences()`: Elimina todas las geocercas del mapa
- `getGeofences()`: Retorna un array con todas las geocercas actuales
- `setCenter(lat, lng, zoomLevel)`: Centra el mapa en las coordenadas especificadas

**Formato de datos de geocerca:**

```javascript
// Círculo
{
  type: 'circle',
  center: { lat: 19.4326, lng: -99.1332 },
  radius: 1000
}

// Rectángulo o Polígono
{
  type: 'rectangle', // o 'polygon'
  coordinates: [
    { lat: 19.42, lng: -99.15 },
    { lat: 19.42, lng: -99.11 },
    { lat: 19.44, lng: -99.11 },
    { lat: 19.44, lng: -99.15 }
  ]
}
```

### Geofences.svelte
Página que integra el componente con el backend (`/api/geofences`).

**Ubicación:** `apps/web/src/pages/Geofences.svelte`

**Funcionalidades:**
- Dibujo de polígonos, rectángulos y círculos con Leaflet Draw
- Guardado automático en Supabase (POST/PUT/DELETE `/api/geofences`)
- Nombre opcional para cada geocerca y color automático
- Edición y eliminación de geocercas persistidas
- Detección de entrada/salida: usa `navigator.geolocation.watchPosition` +
  `geofenceUtils.js` (`containsPoint`) para comparar la posición del usuario
  con cada geocerca y registra transiciones en `geofence_events`
  (POST `/api/geofences/:id/events`)
- Listado de eventos de entrada/salida (`GET /api/geofences/events`)
- Indicador visual "Dentro/Fuera" por geocerca en la tabla

**Nota:** la detección de entrada/salida se ejecuta en el navegador del
usuario autenticado; cada persona que tenga la página abierta (o su
ubicación actualizada periódicamente) genera eventos asociados a su perfil.

## Uso Básico

```svelte
<script>
  import GeofenceMap from '../components/GeofenceMap.svelte';

  let geofenceMap;

  function handleGeofenceCreated(data, layer, isEdit) {
    console.log('Geocerca creada/editada:', data);
  }

  function handleGeofenceDeleted(layer) {
    console.log('Geocerca eliminada');
  }
</script>

<GeofenceMap
  bind:this={geofenceMap}
  center={[19.4326, -99.1332]}
  zoom={13}
  height="600px"
  onGeofenceCreated={handleGeofenceCreated}
  onGeofenceDeleted={handleGeofenceDeleted}
  editable={true}
/>
```

## Herramientas de Dibujo

El componente incluye las siguientes herramientas de Leaflet Draw:
- **Polígono**: Dibuja polígonos personalizados
- **Rectángulo**: Dibuja rectángulos
- **Círculo**: Dibuja círculos con radio definido
- **Editar**: Modifica geocercas existentes
- **Eliminar**: Elimina geocercas seleccionadas

## Acceso

Para acceder a la página de geocercas, navega a:
`#/geofences`

O haz clic en "Geocercas" en el menú lateral de la aplicación.

## Dependencias

- `leaflet@1.9.4`
- `leaflet-draw@1.0.4`

Las dependencias se instalaron en `apps/web/package.json`.

## Estilos

Los estilos de Leaflet se integran en:
- `apps/web/src/main.js` (CSS de Leaflet y Leaflet Draw)
- `apps/web/src/app.css` (Personalización de estilos del mapa)
- `GeofenceMap.svelte` (Estilos específicos del componente)
