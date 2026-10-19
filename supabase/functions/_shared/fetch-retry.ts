// Retry only transport failures. Provider errors and rate limits are returned intact.
export async function fetchWithRetry(url: string, init: RequestInit, fetcher: typeof fetch = fetch): Promise<Response> {
  for (let attempt = 0; ; attempt++) {
    try { return await fetcher(url, init); }
    catch (error) {
      if (attempt >= 2 || init.signal?.aborted) throw error;
      await new Promise(resolve => setTimeout(resolve, 250 * (attempt + 1)));
      init.signal?.throwIfAborted();
    }
  }
}
