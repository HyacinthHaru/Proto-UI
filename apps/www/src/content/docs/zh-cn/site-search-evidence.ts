import path from 'node:path';

export function searchEvidenceDirectory(runtimeRoot: string | undefined, runnerTemp: string) {
  return path.join(runtimeRoot ?? path.join(runnerTemp, 'homepage-evidence'), 'search-commands');
}

export type PendingSearchRequest = { url: string; type: string };

// Log enough to distinguish pending scripts, fonts and other requests without
// flooding the job log. The JSON artifact retains the complete pending list.
export function summarizePendingRequests(requests: Iterable<PendingSearchRequest>) {
  let pendingCount = 0;
  const byType: Record<string, number> = {};
  const samples: PendingSearchRequest[] = [];
  for (const request of requests) {
    pendingCount++;
    byType[request.type] = (byType[request.type] ?? 0) + 1;
    if (samples.length < 4) {
      let url = request.url;
      try {
        const parsed = new URL(url);
        url = `${parsed.origin}${parsed.pathname}`;
      } catch {
        url = url.split(/[?#]/, 1)[0];
      }
      samples.push({ type: request.type, url: url.slice(0, 180) });
    }
  }
  return { pendingCount, byType, samples };
}
