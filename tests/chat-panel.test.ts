import { expect } from '#test-expect';
import { JSDOM } from 'jsdom';
import { test } from 'node:test';
import { initialState } from '../src/protocol/reducer.js';
import { ChatPanel } from '../src/view/chat-panel.js';

test('renders streamed assistant text and user messages', () => {
  const dom = new JSDOM('<main></main>');
  const panel = new ChatPanel(
    dom.window.document.querySelector('main') as unknown as HTMLElement,
  );
  panel.appendUserMessage('定位二沉池');
  const state = {
    ...initialState('thread-1'),
    status: 'running' as const,
    items: [{
      kind: 'text' as const,
      id: 'assistant-1',
      role: 'assistant',
      text: '正在定位 **二沉池 A**。',
      done: false,
    }],
  };
  panel.render(state);
  panel.setBusy(true);

  expect(panel.element.textContent).toContain('定位二沉池');
  expect(panel.element.textContent).toContain('二沉池 A');
  expect(panel.element.querySelector('strong')?.textContent).toBe('二沉池 A');
  expect(panel.submit.disabled).toBe(true);
  expect(panel.stateLabel.textContent).toContain('思考中');
});

test('submits a typed message and clears the input', () => {
  const dom = new JSDOM('<main></main>');
  const panel = new ChatPanel(
    dom.window.document.querySelector('main') as unknown as HTMLElement,
  );
  const messages: string[] = [];
  panel.onSubmit((text) => messages.push(text));
  panel.input.value = '查看全厂';
  panel.form.dispatchEvent(new dom.window.Event('submit', {
    bubbles: true,
    cancelable: true,
  }));
  expect(messages).toEqual(['查看全厂']);
  expect(panel.input.value).toBe('');
});

test('supports scene-specific assistant copy without changing the default profile', () => {
  const dom = new JSDOM('<main></main>');
  const panel = new ChatPanel(
    dom.window.document.querySelector('main') as unknown as HTMLElement,
    {
      title: '污水处理现场助手',
      promptPlaceholder: '查看当前设备',
      introPrompt: '选择设备：',
      introExamples: '查看全厂总览 · 讲解工艺连接',
    },
  );
  expect(panel.element.getAttribute('aria-label')).toBe('污水处理现场助手');
  expect(panel.element.querySelector('h1')?.textContent)
    .toBe('污水处理现场助手');
  expect(panel.input.placeholder).toBe('查看当前设备');
  panel.render(initialState('thread-copy'));
  expect(panel.element.textContent).toContain('讲解工艺连接');
});

test('renders scene copy as text rather than HTML', () => {
  const dom = new JSDOM('<main></main>');
  const panel = new ChatPanel(
    dom.window.document.querySelector('main') as unknown as HTMLElement,
    {
      title: '<img src=x onerror=alert(1)>',
      introExamples: '<em>safe text</em>',
    },
  );
  panel.render(initialState('thread-safe-copy'));
  expect(panel.element.querySelector('img')).toBeNull();
  expect(panel.element.querySelector('em')).toBeNull();
  expect(panel.element.textContent).toContain('<img src=x onerror=alert(1)>');
  expect(panel.element.textContent).toContain('<em>safe text</em>');
});

test('collapses and restores the conversation panel', () => {
  const dom = new JSDOM('<main></main>');
  const panel = new ChatPanel(
    dom.window.document.querySelector('main') as unknown as HTMLElement,
  );
  const toggle = panel.element.querySelector<HTMLButtonElement>(
    '[data-role="conversation-toggle"]',
  )!;
  expect(toggle.getAttribute('aria-expanded')).toBe('true');
  toggle.click();
  expect(panel.element.dataset.collapsed).toBe('true');
  expect(toggle.getAttribute('aria-expanded')).toBe('false');
  toggle.click();
  expect(panel.element.dataset.collapsed).toBe('false');
});

test('links to every public ICE3 project from the conversation panel', () => {
  const dom = new JSDOM('<main></main>');
  const panel = new ChatPanel(
    dom.window.document.querySelector('main') as unknown as HTMLElement,
  );
  const navigation = panel.element.querySelector<HTMLElement>(
    '[data-role="project-links"]',
  );
  const links = [...navigation!.querySelectorAll<HTMLAnchorElement>('a')];

  expect(navigation?.getAttribute('aria-label')).toBe('ICE3 开源工程');
  expect(links.map((link) => link.textContent)).toEqual([
    'Console',
    'Engine',
    'Industrial',
    'Toolchain',
    'Docs',
    'Studio',
  ]);
  expect(links.map((link) => link.href)).toEqual([
    'https://github.com/ice-3d/ice3-agent-console',
    'https://github.com/ice-3d/ice3-engine',
    'https://github.com/ice-3d/ice3-industrial',
    'https://github.com/ice-3d/ice3-toolchain',
    'https://github.com/ice-3d/ice3-doc',
    'https://github.com/ice-3d/ice3-studio',
  ]);
  for (const link of links) {
    expect(link.target).toBe('_blank');
    expect(link.rel).toBe('noopener noreferrer');
  }
});
