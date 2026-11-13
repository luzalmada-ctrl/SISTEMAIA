import App from './App.svelte';
import './app.css';

// Importar estilos de Leaflet
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';

const app = new App({ target: document.getElementById('app') });
export default app;
