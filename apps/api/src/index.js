import cluster from 'node:cluster';
import { env } from './config.js';
import { createApp } from './app.js';
import { loadBalancer } from './loadBalancer.js';
import { startCluster } from './cluster.js';

const isVercel = !!process.env.VERCEL;

if (isVercel) {
  // En Vercel la función serverless exporta la app directamente (api/index.js).
  // Este archivo no se usa como entrypoint ahí.
} else if (cluster.isPrimary && env.clusterWorkers > 1) {
  startCluster();
} else {
  const workerId = Number(process.env.WORKER_ID || cluster.worker?.id || 0);
  loadBalancer.register(workerId, process.pid);

  // Heartbeat hacia el primario (si existe).
  if (cluster.isWorker) {
    setInterval(() => {
      try {
        process.send?.({ type: 'heartbeat' });
      } catch {
        /* canal cerrado */
      }
    }, 3000);
  }

  const app = createApp();
  const server = app.listen(env.port, () => {
    console.log(`[pid ${process.pid}] API escuchando en http://localhost:${env.port}`);
  });

  // Libera la conexión del balanceador al cerrar peticiones.
  server.on('request', (req, res) => {
    const w = loadBalancer.acquire();
    let released = false;
    const done = () => {
      if (!released && w) {
        released = true;
        loadBalancer.release(w.id);
      }
    };
    res.on('finish', done);
    res.on('close', done);
  });
}
