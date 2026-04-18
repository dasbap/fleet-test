/**
 * Compléments TypeScript pour SharedWorker (scope global du worker).
 */
interface SharedWorkerGlobalScope extends WorkerGlobalScope {
  onconnect: ((this: SharedWorkerGlobalScope, ev: MessageEvent) => void) | null;
}
