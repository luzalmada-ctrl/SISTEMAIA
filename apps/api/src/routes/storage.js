import { Router } from 'express';
import { supabase } from '../db.js';
import { requireAuth } from '../auth.js';

const router = Router();
router.use(requireAuth);

const BUCKET = 'submissions';

// Genera una URL firmada para subir un archivo a Supabase Storage.
router.post('/signed-upload-url', async (req, res) => {
  const { fileName, contentType } = req.body || {};
  if (!fileName) return res.status(400).json({ error: 'fileName requerido' });
  const path = `${Date.now()}-${fileName.replace(/[^\w.\-]/g, '_')}`;

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUploadUrl(path);
  if (error) return res.status(400).json({ error: error.message });

  res.json({ path, token: data.token, signedUrl: data.signedUrl });
});

// Genera una URL firmada de lectura para ver/descargar el archivo.
router.post('/signed-download-url', async (req, res) => {
  const { path } = req.body || {};
  if (!path) return res.status(400).json({ error: 'path requerido' });
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, 60 * 60);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ url: data.signedUrl });
});

export default router;
