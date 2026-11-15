/**
 * Import failures are cached by URL in the browser's module map. Clearing our
 * Promise alone cannot recover that URL. Each subsequent user attempt imports
 * the same build-bound module at a fresh same-origin URL; successful modules
 * and in-flight acquisition are shared. No error message supplies an import URL.
 */
export function retryableModule<T>(
  load: () => Promise<T>,
  moduleUrl: string,
  importModule: (url: string) => Promise<T> = (url) => import(/* @vite-ignore */ url),
  diagnosticName?: string
): () => Promise<T> {
  let pending: Promise<T> | undefined;
  let attempt = 0;
  let reused = false;
  const markAttempt = (stage: string, index: number) => {
    const target = globalThis as typeof globalThis & {
      __puiContentsStagingProbe?: boolean;
      __puiS4HostedTiming?: boolean;
      __puiS4ImportJournal?: Array<{
        asset: string;
        stage: string;
        attempt: number;
        browserMs: number;
        browserTimeOrigin: number;
      }>;
    };
    if (!diagnosticName || (!target.__puiContentsStagingProbe && !target.__puiS4HostedTiming))
      return false;
    try {
      const browserMs = performance.now();
      if (target.__puiContentsStagingProbe)
        performance.mark('pui-contents:react-dependency:' + diagnosticName + ':' + stage, {
          detail: { attempt: index },
        });
      if (target.__puiS4HostedTiming) {
        const mark = {
          asset: diagnosticName,
          stage,
          attempt: index,
          browserMs,
          browserTimeOrigin: performance.timeOrigin,
        };
        const journal = (target.__puiS4ImportJournal ??= []);
        if (journal.length < 64) journal.push(mark);
        console.info('[S4 hosted import boundary]', JSON.stringify(mark));
      }
      return true;
    } catch {
      return false;
    }
  };
  return () => {
    if (pending) {
      if (!reused) reused = markAttempt('reuse', attempt - 1);
      return pending;
    }
    const currentAttempt = attempt++;
    reused = false;
    markAttempt('request', currentAttempt);
    pending = Promise.resolve()
      .then(() => {
        markAttempt('factory', currentAttempt);
        if (currentAttempt === 0) return load();
        const url = new URL(moduleUrl, globalThis.location.href);
        if (url.origin !== globalThis.location.origin || !/^https?:$/.test(url.protocol)) {
          throw new Error('[PrototypePreviewer] runtime recovery requires a same-origin module');
        }
        url.searchParams.set('pui-runtime-retry', String(currentAttempt));
        return importModule(url.href);
      })
      .catch((error) => {
        pending = undefined;
        throw error;
      });
    if (diagnosticName) {
      void pending.then(
        () => markAttempt('fulfilled', currentAttempt),
        () => markAttempt('rejected', currentAttempt)
      );
    }
    return pending;
  };
}
