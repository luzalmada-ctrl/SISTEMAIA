import cluster from 'node:cluster';
import os from 'node:os';
import { env } from './config.js';
import { loadBalancer } from './loadBalancer.js';

/**
 * Modo cluster: el proceso primario levanta N workers (uno por núcleo como
 * máximo, o CLUSTER_WORKERS) y distribuye las conexiones con least-connections.
 * Los workers envían heartbeats por IPC; el primario marca como no sano a un
 * worker que deja de responder y levanta uno nuevo.
 */
export function startCluster() {
  const desired = Math.min(env.clusterWorkers, os.cpus().length || 1);

  for (let i = 0; i < desired; i++) forkWorker(i);

  // Health check cada 5s + respawn de workers muertos.
  setInterval(() => {
    const stats = loadBalancer.runHealthCheck(8_000);
    for (const w of stats.workers) {
      if (!w.healthy && !cluster.workers[w.id]) {
        forkWorker(w.id);
      }
    }
  }, 5_000);

  cluster.on('exit', (worker) => {
    loadBalancer.unregister(worker.id);
    if (Object.keys(cluster.workers).length < desired) {
      forkWorker(worker.id);
    }
  });
}

function forkWorker(id) {
  const worker = cluster.fork({ WORKER_ID: id });
  loadBalancer.register(id, worker.process.pid);
  worker.on('message', (msg) => {
    if (msg?.type === 'heartbeat') loadBalancer.heartbeat(id);
  });
  worker.on('exit', () => loadBalancer.unregister(id));
}
