import { fetchWithRetry } from '../functions/_shared/fetch-retry.ts';
function assert(value: unknown) { if (!value) throw new Error('Assertion failed'); }
Deno.test('transient transport errors recover within three attempts', async () => {
  let calls = 0;
  const fetcher = (() => { calls++; if (calls < 3) return Promise.reject(new TypeError('Network unreachable')); return Promise.resolve(new Response('ok')); }) as typeof fetch;
  const response = await fetchWithRetry('https://example.invalid', {}, fetcher);
  assert(await response.text() === 'ok'); assert(calls === 3);
});
Deno.test('rate limits and provider errors are not retried', async () => {
  for (const status of [400, 429, 500]) {
    let calls = 0;
    const fetcher = (() => { calls++; return Promise.resolve(new Response(null, { status })); }) as typeof fetch;
    assert((await fetchWithRetry('https://example.invalid', {}, fetcher)).status === status); assert(calls === 1);
  }
});
Deno.test('permanent transport failure stops after three attempts', async () => {
  let calls = 0;
  const fetcher = (() => { calls++; return Promise.reject(new TypeError('Network unreachable')); }) as typeof fetch;
  try { await fetchWithRetry('https://example.invalid', {}, fetcher); throw new Error('Failure expected'); }
  catch (error) { assert(error instanceof TypeError); assert(calls === 3); }
});
Deno.test('aborted request is not retried', async () => {
  const controller = new AbortController(); controller.abort(); let calls = 0;
  const fetcher = (() => { calls++; return Promise.reject(controller.signal.reason); }) as typeof fetch;
  try { await fetchWithRetry('https://example.invalid', { signal: controller.signal }, fetcher); throw new Error('Failure expected'); }
  catch (error) { assert(error === controller.signal.reason); assert(calls === 1); }
});
