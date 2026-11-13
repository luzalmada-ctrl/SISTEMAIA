import { Router } from 'express';
import { supabase } from '../db.js';
import { requireAuth } from '../auth.js';

const router = Router();
router.use(requireAuth);

const TYPES = new Set(['circle', 'rectangle', 'polygon']);
const EVENT_TYPES = new Set(['enter', 'exit']);

function toPoint(p) {
  const lat = Number(p?.lat);
  const lng = Number(p?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

// Normaliza la geometría recibida del frontend (Leaflet).
function normalizeGeometry(input, type) {
  const geometry = { type };

  if (type === 'circle') {
    const center = toPoint(input?.center);
    const radius = Number(input?.radius);
    if (!center || !Number.isFinite(radius) || radius <= 0) return null;
    geometry.center = center;
    geometry.radius = radius;
    return geometry;
  }

  if (type === 'rectangle' && input?.bounds) {
    const sw = toPoint(input.bounds.southWest);
    const ne = toPoint(input.bounds.northEast);
    if (!sw || !ne) return null;
    geometry.bounds = { southWest: sw, northEast: ne };
    return geometry;
  }

  const coords = Array.isArray(input?.coordinates)
    ? input.coordinates.map(toPoint).filter(Boolean)
    : [];
  if (coords.length < 3) return null;
  geometry.coordinates = coords;
  return geometry;
}

router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('geofences')
    .select('*')
    .order('created_at');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.post('/', async (req, res) => {
  const { name, type, geometry: raw, color } = req.body || {};
  if (!TYPES.has(type)) return res.status(400).json({ error: 'type inválido' });
  const geometry = normalizeGeometry(raw || req.body, type);
  if (!geometry) return res.status(400).json({ error: 'geometry inválida' });

  const { data, error } = await supabase
    .from('geofences')
    .insert({
      name: name || 'Geocerca',
      type,
      geometry,
      color: typeof color === 'string' && /^#[0-9a-fA-F]{6}$/.test(color) ? color : '#6c5ce7',
      created_by: req.user.id,
    })
    .select()
    .single();
  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json(data);
});

router.put('/:id', async (req, res) => {
  const { data: existing, error: findError } = await supabase
    .from('geofences')
    .select('*')
    .eq('id', req.params.id)
    .single();
  if (findError || !existing) return res.status(404).json({ error: 'Geocerca no encontrada' });

  const update = {};
  if (req.body?.name !== undefined) update.name = req.body.name || existing.name;
  if (req.body?.color !== undefined && /^#[0-9a-fA-F]{6}$/.test(req.body.color)) {
    update.color = req.body.color;
  }
  if (req.body?.geometry !== undefined || req.body?.type !== undefined) {
    const type = req.body.type || existing.type;
    const geometry = normalizeGeometry(req.body.geometry || req.body, type);
    if (!geometry) return res.status(400).json({ error: 'geometry inválida' });
    update.type = geometry.type;
    update.geometry = geometry;
  }

  const { data, error } = await supabase
    .from('geofences')
    .update(update)
    .eq('id', req.params.id)
    .select()
    .single();
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

router.delete('/:id', async (req, res) => {
  const { error } = await supabase.from('geofences').delete().eq('id', req.params.id);
  if (error) return res.status(400).json({ error: error.message });
  res.status(204).end();
});

router.get('/events', async (req, res) => {
  let query = supabase
    .from('geofence_events')
    .select('id, geofence_id, profile_id, event_type, lat, lng, created_at, geofences(name), profiles(name)')
    .order('created_at', { ascending: false })
    .limit(200);
  if (req.query.geofence_id) query = query.eq('geofence_id', req.query.geofence_id);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });

  res.json(
    data.map((e) => ({
      ...e,
      geofence_name: e.geofences?.name ?? null,
      profile_name: e.profiles?.name ?? null,
    }))
  );
});

router.post('/:id/events', async (req, res) => {
  const { event_type, lat, lng } = req.body || {};
  if (!EVENT_TYPES.has(event_type)) {
    return res.status(400).json({ error: 'event_type debe ser enter o exit' });
  }
  const point = toPoint({ lat, lng });
  if (!point) return res.status(400).json({ error: 'lat/lng inválidos' });

  const { data: geofence } = await supabase
    .from('geofences')
    .select('id')
    .eq('id', req.params.id)
    .single();
  if (!geofence) return res.status(404).json({ error: 'Geocerca no encontrada' });

  const { data, error } = await supabase
    .from('geofence_events')
    .insert({
      geofence_id: req.params.id,
      profile_id: req.user.id,
      event_type,
      lat: point.lat,
      lng: point.lng,
    })
    .select()
    .single();
  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json(data);
});

export default router;
