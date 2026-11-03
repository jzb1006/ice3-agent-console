import { expect } from '#test-expect';
import http from 'node:http';
import { test } from 'node:test';
import {
  createAgentServer,
  type RunningAgentServer,
} from '../server/index.js';
import { encodeSse } from '../server/transport/sse.js';

const createTestServer = async (): Promise<RunningAgentServer> => (
  createAgentServer({
    port: 0,
    mode: 'scripted',
    paceMs: 0,
    health: { ok: true, agent: 'scripted', transport: 'server' },
  })
);

test('encodes multiline events as valid SSE data frames', () => {
  expect(encodeSse({ type: 'TEXT', delta: 'line 1\nline 2' })).toBe(
    'data: {"type":"TEXT","delta":"line 1\\nline 2"}\n\n',
  );
});

test('rejects malformed run input before opening SSE', async () => {
  const running = await createTestServer();
  try {
  const response = await fetch(`${running.url}/agui`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', connection: 'close' },
    body: '{"invalid":true}',
  });
  expect(response.status).toBe(422);
  } finally {
    await running.close();
  }
});

test('streams a complete scripted run', async () => {
  const running = await createTestServer();
  try {
  const response = await fetch(`${running.url}/agui`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', connection: 'close' },
    body: JSON.stringify({
      threadId: 'thread-1',
      runId: 'run-1',
      state: {},
      messages: [{
        id: 'user-1',
        role: 'user',
        content: '带我看一下整个汽车制造工厂',
      }],
      context: [],
      tools: [],
      forwardedProps: {},
    }),
  });
  expect(response.status).toBe(200);
  expect(response.headers.get('content-type')).toContain('text/event-stream');
  const body = await response.text();
  expect(body).toContain('RUN_STARTED');
  expect(body).toContain('set_camera_view');
  expect(body).toContain('RUN_FINISHED');
  } finally {
    await running.close();
  }
});

test('reports the active mode without secrets', async () => {
  const running = await createTestServer();
  try {
  const result = await new Promise<{ status: number; body: string }>((resolve, reject) => {
    http.get(`${running.url}/health`, { agent: false }, (response) => {
      const chunks: Buffer[] = [];
      response.on('data', (chunk: Buffer) => chunks.push(chunk));
      response.on('end', () => resolve({
        status: response.statusCode ?? 0,
        body: Buffer.concat(chunks).toString('utf8'),
      }));
    }).on('error', reject);
  });
  expect(result.status).toBe(200);
  expect(JSON.parse(result.body)).toEqual({
    ok: true,
    agent: 'scripted',
    transport: 'server',
  });
  } finally {
    await running.close();
  }
});
