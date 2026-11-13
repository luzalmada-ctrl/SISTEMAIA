import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { env } from './config.js';
import { loadBalancer } from './loadBalancer.js';
import authRoutes from './routes/auth.js';
import studentsRoutes from './routes/students.js';
import rubricsRoutes from './routes/rubrics.js';
import assignmentsRoutes from './routes/assignments.js';
import submissionsRoutes from './routes/submissions.js';
import gradesRoutes from './routes/grades.js';
import storageRoutes from './routes/storage.js';
import geofencesRoutes from './routes/geofences.js';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({ origin: env.corsOrigin === '*' ? true : env.corsOrigin.split(',') }));
  app.use(express.json({ limit: '1mb' }));

  // Health check para el balanceador de cargas.
  app.get('/api/health', (req, res) => {
    res.json({ ok: true, pid: process.pid, uptime: process.uptime(), time: new Date().toISOString() });
  });

  // Métricas del balanceador.
  app.get('/api/metrics', (req, res) => {
    loadBalancer.totalRequests += 1;
    res.json(loadBalancer.stats());
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/students', studentsRoutes);
  app.use('/api/rubrics', rubricsRoutes);
  app.use('/api/assignments', assignmentsRoutes);
  app.use('/api/submissions', submissionsRoutes);
  app.use('/api/grades', gradesRoutes);
  app.use('/api/storage', storageRoutes);
  app.use('/api/geofences', geofencesRoutes);

  app.use((req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  });

  return app;
}

export default createApp();
