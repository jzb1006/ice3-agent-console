import { expect } from '#test-expect';
import { test } from 'node:test';
import { createModelClient } from '../server/agents/model-client.js';

test('sends credentials only in the server request header', async () => {
  let captured: RequestInit | undefined;
  let capturedUrl = '';
  const client = createModelClient({
    baseUrl: 'https://model.example/v1',
    apiKey: 'secret-value',
    name: 'industrial-agent',
  }, async (url, init) => {
    capturedUrl = String(url);
    captured = init;
    return new Response(JSON.stringify({
      choices: [{
        message: {
          content: '设备已定位。',
          tool_calls: [],
        },
      }],
    }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  });

  const response = await client.complete([
    { role: 'user', content: '定位点焊机器人' },
  ]);

  expect(capturedUrl).toBe('https://model.example/v1/chat/completions');
  expect((captured?.headers as Record<string, string>).authorization)
    .toBe('Bearer secret-value');
  expect(response.text).toBe('设备已定位。');
  expect(JSON.stringify(response)).not.toContain('secret-value');
});
