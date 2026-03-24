import assert from 'node:assert/strict';
import test from 'node:test';
import { createHttpClient } from '../core/http';

test('http client injects request and correlation headers', async () => {
  let capturedHeaders: Headers | undefined;

  const client = createHttpClient({
    baseUrl: 'http://localhost:3001',
    retries: 0,
    fetchImpl: async (_url, init) => {
      capturedHeaders = new Headers(init?.headers);
      return new Response(JSON.stringify({ success: true, data: { ok: true } }), {
        status: 200,
        headers: {
          'content-type': 'application/json',
        },
      });
    },
  });

  await client.get('/health');

  assert.ok(capturedHeaders?.get('x-request-id'));
  assert.ok(capturedHeaders?.get('x-correlation-id'));
});

test('http client retries transient failures', async () => {
  let attempts = 0;

  const client = createHttpClient({
    baseUrl: 'http://localhost:3001',
    retries: 1,
    fetchImpl: async () => {
      attempts += 1;
      if (attempts === 1) {
        return new Response(JSON.stringify({ error: { message: 'temporary' } }), {
          status: 503,
          headers: {
            'content-type': 'application/json',
          },
        });
      }

      return new Response(JSON.stringify({ success: true, data: { ok: true } }), {
        status: 200,
        headers: {
          'content-type': 'application/json',
        },
      });
    },
  });

  const payload = await client.get<{ success: boolean; data: { ok: boolean } }>('/health');
  assert.equal(payload.success, true);
  assert.equal(attempts, 2);
});
