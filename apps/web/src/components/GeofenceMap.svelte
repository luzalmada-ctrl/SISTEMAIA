<script>
  import { onMount, onDestroy } from 'svelte';
  import L from 'leaflet';
  import 'leaflet-draw';

  export let center = [19.4326, -99.1332]; // Ciudad de México por defecto
  export let zoom = 13;
  export let height = '500px';
  export let width = '100%';
  export let onGeofenceCreated = null;
  export let onGeofenceDeleted = null;
  export let editable = true;

  let mapContainer;
  let map;
  let drawnItems;
  let drawControl;
  let userMarker = null;
  let accuracyCircle = null;

  onMount(() => {
    // Inicializar el mapa
    map = L.map(mapContainer).setView(center, zoom);

    // Agregar capa de OpenStreetMap
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    // Agregar control de zoom
    L.control.zoom({
      position: 'topright'
    }).addTo(map);

    // Capa para los elementos dibujados
    drawnItems = new L.FeatureGroup();
    map.addLayer(drawnItems);

    // Configurar el control de dibujo
    if (editable) {
      drawControl = new L.Control.Draw({
        position: 'topleft',
        draw: {
          polygon: {
            allowIntersection: false,
            showArea: true,
            shapeOptions: {
              color: '#6c5ce7',
              weight: 3
            }
          },
          circle: {
            shapeOptions: {
              color: '#6c5ce7',
              weight: 3
            }
          },
          rectangle: {
            shapeOptions: {
              color: '#6c5ce7',
              weight: 3
            }
          },
          marker: false,
          circlemarker: false,
          polyline: false
        },
        edit: {
          featureGroup: drawnItems,
          remove: true,
          edit: true
        }
      });
      map.addControl(drawControl);
    }

    // Evento cuando se crea un nuevo elemento
    map.on(L.Draw.Event.CREATED, (event) => {
      const layer = event.layer;
      drawnItems.addLayer(layer);

      // Obtener datos de la geocerca
      const geofenceData = extractGeofenceData(layer);

      if (onGeofenceCreated) {
        onGeofenceCreated(geofenceData, layer);
      }
    });

    // Evento cuando se edita un elemento
    map.on(L.Draw.Event.EDITED, (event) => {
      const layers = event.layers;
      layers.eachLayer((layer) => {
        const geofenceData = extractGeofenceData(layer);
        if (onGeofenceCreated) {
          onGeofenceCreated(geofenceData, layer, true);
        }
      });
    });

    // Evento cuando se elimina un elemento
    map.on(L.Draw.Event.DELETED, (event) => {
      const layers = event.layers;
      layers.eachLayer((layer) => {
        if (onGeofenceDeleted) {
          onGeofenceDeleted(layer, extractGeofenceData(layer));
        }
      });
    });
  });

  onDestroy(() => {
    if (map) {
      map.remove();
    }
  });

  // Extraer datos de la geocerca según el tipo
  function extractGeofenceData(layer) {
    const type = layer instanceof L.Circle ? 'circle' :
                 layer instanceof L.Rectangle ? 'rectangle' :
                 layer instanceof L.Polygon ? 'polygon' : 'unknown';

    let data = {
      type,
      id: layer.geofenceId || L.Util.stamp(layer)
    };

    if (type === 'circle') {
      data.center = layer.getLatLng();
      data.radius = layer.getRadius();
    } else if (type === 'rectangle') {
      const bounds = layer.getBounds();
      data.bounds = {
        southWest: { lat: bounds.getSouth(), lng: bounds.getWest() },
        northEast: { lat: bounds.getNorth(), lng: bounds.getEast() }
      };
      data.coordinates = layer.getLatLngs()[0].map(latlng => ({
        lat: latlng.lat,
        lng: latlng.lng
      }));
    } else if (type === 'polygon') {
      data.coordinates = layer.getLatLngs()[0].map(latlng => ({
        lat: latlng.lat,
        lng: latlng.lng
      }));
    }

    return data;
  }

  // Función para agregar una geocerca existente
  export function addGeofence(geofenceData) {
    if (!map || !drawnItems) return;

    const color = geofenceData.color || '#6c5ce7';
    let layer;

    if (geofenceData.type === 'circle') {
      layer = L.circle(geofenceData.center, {
        radius: geofenceData.radius,
        color,
        weight: 3
      });
    } else if (geofenceData.type === 'rectangle') {
      if (geofenceData.bounds) {
        layer = L.rectangle(L.latLngBounds(
          [geofenceData.bounds.southWest.lat, geofenceData.bounds.southWest.lng],
          [geofenceData.bounds.northEast.lat, geofenceData.bounds.northEast.lng]
        ), { color, weight: 3 });
      } else if (geofenceData.coordinates) {
        const lats = geofenceData.coordinates.map(c => c.lat);
        const lngs = geofenceData.coordinates.map(c => c.lng);
        layer = L.rectangle(L.latLngBounds(
          [Math.min(...lats), Math.min(...lngs)],
          [Math.max(...lats), Math.max(...lngs)]
        ), { color, weight: 3 });
      }
    } else if (geofenceData.type === 'polygon') {
      layer = L.polygon(geofenceData.coordinates, {
        color,
        weight: 3
      });
    }

    if (layer) {
      if (geofenceData.id) layer.geofenceId = geofenceData.id;
      drawnItems.addLayer(layer);
      return layer;
    }
    return null;
  }

  // Asocia un id persistente (uuid de BD) a una capa ya dibujada.
  export function setGeofenceId(layer, id) {
    if (layer) layer.geofenceId = id;
  }

  // Función para limpiar todas las geocercas
  export function clearGeofences() {
    if (drawnItems) {
      drawnItems.clearLayers();
    }
  }

  // Función para obtener todas las geocercas
  export function getGeofences() {
    if (!drawnItems) return [];

    const geofences = [];
    drawnItems.eachLayer((layer) => {
      geofences.push(extractGeofenceData(layer));
    });

    return geofences;
  }

  // Función para centrar el mapa
  export function setCenter(lat, lng, zoomLevel) {
    if (map) {
      map.setView([lat, lng], zoomLevel || zoom);
    }
  }

  // Función para obtener la ubicación actual del usuario
  export function getCurrentLocation() {
    if (!map) return Promise.reject('Mapa no inicializado');

    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject('Geolocalización no soportada por el navegador');
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude, accuracy } = position.coords;
          showUserLocation(latitude, longitude, accuracy, true);
          map.setView([latitude, longitude], 16);
          resolve({ lat: latitude, lng: longitude });
        },
        (error) => {
          reject(geolocationErrorMessage(error));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    });
  }

  // Actualiza el marcador de ubicación del usuario sin mover el mapa
  export function setUserLocation(lat, lng, accuracy) {
    showUserLocation(lat, lng, accuracy, false);
  }

  // Muestra un marcador con la posición del usuario y su círculo de precisión
  function showUserLocation(lat, lng, accuracy, openPopup = false) {
    if (!map) return;

    if (userMarker) {
      userMarker.setLatLng([lat, lng]);
    } else {
      userMarker = L.marker([lat, lng], {
        title: 'Tu ubicación'
      })
        .addTo(map)
        .bindPopup('Tu ubicación actual');
    }
    if (openPopup) userMarker.openPopup();

    if (accuracyCircle) {
      accuracyCircle.setLatLng([lat, lng]).setRadius(accuracy || 0);
    } else {
      accuracyCircle = L.circle([lat, lng], {
        radius: accuracy || 0,
        color: '#0ea5e9',
        fillColor: '#0ea5e9',
        fillOpacity: 0.15,
        weight: 1
      }).addTo(map);
    }
  }

  function geolocationErrorMessage(error) {
    switch (error.code) {
      case error.PERMISSION_DENIED:
        return 'Permiso de ubicación denegado. Actívalo en el navegador (icono del candado junto a la URL).';
      case error.POSITION_UNAVAILABLE:
        return 'No se pudo determinar tu ubicación. Verifica que el GPS esté encendido.';
      case error.TIMEOUT:
        return 'Tardó demasiado en obtenerse la ubicación. Intenta de nuevo.';
      default:
        return error.message || 'Error al obtener la ubicación';
    }
  }

  // Función para agregar un marcador en una ubicación
  export function addMarker(lat, lng, options = {}) {
    if (!map) return;

    const marker = L.marker([lat, lng], options);
    marker.addTo(map);
    return marker;
  }
</script>

<div class="geofence-map-container" style="height: {height}; width: {width};">
  <div bind:this={mapContainer} class="map"></div>
</div>

<style>
  .geofence-map-container {
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .map {
    height: 100%;
    width: 100%;
  }

  :global(.leaflet-draw-toolbar a) {
    background-color: #6c5ce7 !important;
  }

  :global(.leaflet-draw-toolbar-top) {
    border-bottom: 2px solid #6c5ce7 !important;
  }
</style>
