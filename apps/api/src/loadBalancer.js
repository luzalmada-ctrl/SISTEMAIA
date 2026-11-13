/**
 * Balanceador de cargas least-connections con health checks.
 *
 * En modo cluster (CLUSTER_WORKERS > 1) cada worker se registra aquí y el
 * balanceador reparte las peticiones según conexiones activas. En Vercel cada
 * función serverless escala de forma independiente; este módulo sigue
 * siendo útil para métricas y para despliegues en un solo proceso con
 * múltiples réplicas detrás de un proxy.
 */
export class LoadBalancer {
  constructor() {
    /** @type {Map<number, {id:number, pid:number, connections:number, healthy:boolean, lastSeen:number}>} */
    this.workers = new Map();
    this.totalRequests = 0;
  }

  register(id, pid = process.pid) {
    this.workers.set(id, {
      id,
      pid,
      connections: 0,
      healthy: true,
      lastSeen: Date.now(),
    });
  }

  unregister(id) {
    this.workers.delete(id);
  }

  heartbeat(id) {
    const w = this.workers.get(id);
    if (w) {
      w.lastSeen = Date.now();
      w.healthy = true;
    }
  }

  /** Selecciona el worker sano con menos conexiones activas (least-connections). */
  acquire() {
    let best = null;
    for (const w of this.workers.values()) {
      if (!w.healthy) continue;
      if (!best || w.connections < best.connections) best = w;
    }
    if (best) best.connections += 1;
    return best;
  }

  release(id) {
    const w = this.workers.get(id);
    if (w && w.connections > 0) w.connections -= 1;
  }

  markUnhealthy(id) {
    const w = this.workers.get(id);
    if (w) w.healthy = false;
  }

  /** Health check: un worker es sano si su último heartbeat es reciente. */
  runHealthCheck(maxSilenceMs = 10_000) {
    const now = Date.now();
    for (const w of this.workers.values()) {
      if (now - w.lastSeen > maxSilenceMs) w.healthy = false;
    }
    return this.stats();
  }

  stats() {
    const workers = [...this.workers.values()].map((w) => ({
      id: w.id,
      pid: w.pid,
      connections: w.connections,
      healthy: w.healthy,
      lastSeen: new Date(w.lastSeen).toISOString(),
    }));
    return {
      workers,
      total: this.workers.size,
      healthy: workers.filter((w) => w.healthy).length,
      totalRequests: this.totalRequests,
      algorithm: 'least-connections',
    };
  }
}

/** Singleton compartido por proceso. */
export const loadBalancer = new LoadBalancer();
