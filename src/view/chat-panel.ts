import type {
  ThreadItem,
  ThreadState,
} from '../protocol/reducer.js';
import { renderMarkdown } from './markdown.js';

interface LocalUserMessage {
  readonly id: string;
  readonly text: string;
}

const PROJECT_LINKS = [
  {
    label: 'Console',
    url: 'https://github.com/ice-3d/ice3-agent-console',
  },
  {
    label: 'Engine',
    url: 'https://github.com/ice-3d/ice3-engine',
  },
  {
    label: 'Industrial',
    url: 'https://github.com/ice-3d/ice3-industrial',
  },
  {
    label: 'Toolchain',
    url: 'https://github.com/ice-3d/ice3-toolchain',
  },
  {
    label: 'Docs',
    url: 'https://github.com/ice-3d/ice3-doc',
  },
  {
    label: 'Studio',
    url: 'https://github.com/ice-3d/ice3-studio',
  },
] as const;

export class ChatPanel {
  readonly element: HTMLElement;
  readonly form: HTMLFormElement;
  readonly input: HTMLTextAreaElement;
  readonly submit: HTMLButtonElement;
  readonly stateLabel: HTMLElement;
  readonly composerArea: HTMLElement;
  private readonly scroller: HTMLElement;
  private readonly localUsers: LocalUserMessage[] = [];
  private listener: ((text: string) => void) | null = null;

  constructor(host: HTMLElement) {
    const document = host.ownerDocument;
    this.element = document.createElement('aside');
    this.element.className = 'conversation-panel';
    this.element.setAttribute('aria-label', '汽车制造现场助手');
    this.element.innerHTML = `
      <header class="conversation-header">
        <div>
          <span class="eyebrow">ICE3 FIELD AGENT</span>
          <h1>汽车制造现场助手</h1>
        </div>
        <div class="conversation-header__actions">
          <span class="agent-state" data-role="agent-state">就绪</span>
          <button class="conversation-toggle" type="button"
            data-role="conversation-toggle" aria-expanded="true"
            aria-label="收起对话面板">›</button>
        </div>
      </header>
      <div class="conversation-context">
        <span data-role="agent-mode">剧本模式</span>
        <span data-role="agent-transport">服务端</span>
      </div>
      <section class="conversation-scroll" data-role="conversation-scroll"
        aria-live="polite"></section>
      <div class="conversation-composer" data-role="composer-area">
        <form class="composer" data-role="composer">
          <label class="sr-only" for="agent-command">向现场助手提问</label>
          <textarea id="agent-command" data-role="composer-input"
            rows="1" placeholder="例如：带我看车身焊装线"></textarea>
          <button type="submit" data-role="composer-submit">发送</button>
        </form>
        <nav class="project-links" data-role="project-links"
          aria-label="ICE3 开源工程">
          <span class="project-links__label">开源工程</span>
          ${PROJECT_LINKS.map((project) => (
            `<a href="${project.url}" target="_blank"
              rel="noopener noreferrer">${project.label}</a>`
          )).join('')}
        </nav>
      </div>
    `;
    host.append(this.element);
    this.scroller = this.element.querySelector(
      '[data-role="conversation-scroll"]',
    )!;
    this.form = this.element.querySelector('[data-role="composer"]')!;
    this.input = this.element.querySelector('[data-role="composer-input"]')!;
    this.submit = this.element.querySelector(
      '[data-role="composer-submit"]',
    )!;
    this.stateLabel = this.element.querySelector(
      '[data-role="agent-state"]',
    )!;
    this.composerArea = this.element.querySelector(
      '[data-role="composer-area"]',
    )!;
    const toggle = this.element.querySelector<HTMLButtonElement>(
      '[data-role="conversation-toggle"]',
    )!;
    toggle.addEventListener('click', () => {
      const collapsed = this.element.dataset.collapsed !== 'true';
      this.element.dataset.collapsed = String(collapsed);
      toggle.setAttribute('aria-expanded', String(!collapsed));
      toggle.setAttribute(
        'aria-label',
        collapsed ? '展开对话面板' : '收起对话面板',
      );
      toggle.textContent = collapsed ? '‹' : '›';
    });
    this.form.addEventListener('submit', (event) => {
      event.preventDefault();
      const value = this.input.value.trim();
      if (!value || this.submit.disabled) return;
      this.appendUserMessage(value);
      this.input.value = '';
      this.listener?.(value);
    });
  }

  onSubmit(listener: (text: string) => void): void {
    this.listener = listener;
  }

  appendUserMessage(text: string, id = `local-${Date.now()}`): void {
    this.localUsers.push({ id, text });
    this.scroller.append(messageElement(
      this.element.ownerDocument,
      'user',
      text,
      false,
    ));
    this.scrollToEnd();
  }

  render(state: ThreadState): void {
    this.scroller.replaceChildren();
    const stateUserTexts = new Set(state.items.flatMap((item) => (
      item.kind === 'text' && item.role === 'user' ? [item.text] : []
    )));
    for (const local of this.localUsers) {
      if (!stateUserTexts.has(local.text)) {
        this.scroller.append(messageElement(
          this.element.ownerDocument,
          'user',
          local.text,
          false,
        ));
      }
    }
    for (const item of state.items) {
      this.scroller.append(this.renderItem(item));
    }
    if (state.items.length === 0 && this.localUsers.length === 0) {
      const intro = this.element.ownerDocument.createElement('article');
      intro.className = 'message message--assistant message--intro';
      intro.innerHTML = [
        '<p>选择设备，或者直接问我：</p>',
        '<p><strong>查看整厂 · 定位焊装机器人 · 讲解总装流程</strong></p>',
      ].join('');
      this.scroller.append(intro);
    }
    this.scrollToEnd();
  }

  setBusy(busy: boolean): void {
    this.submit.disabled = busy;
    this.input.disabled = busy;
    this.stateLabel.textContent = busy ? '思考中' : '就绪';
    this.stateLabel.dataset.active = String(busy);
  }

  setMode(mode: 'scripted' | 'model', transport: 'server' | 'local'): void {
    this.element.querySelector<HTMLElement>('[data-role="agent-mode"]')!
      .textContent = mode === 'scripted' ? '剧本模式' : '模型模式';
    this.element.querySelector<HTMLElement>('[data-role="agent-transport"]')!
      .textContent = transport === 'server' ? '服务端' : '纯前端';
  }

  setError(message: string | null): void {
    this.element.dataset.error = String(Boolean(message));
    let error = this.element.querySelector<HTMLElement>('.conversation-error');
    if (!message) {
      error?.remove();
      return;
    }
    if (!error) {
      error = this.element.ownerDocument.createElement('p');
      error.className = 'conversation-error';
      this.element.querySelector('[data-role="conversation-scroll"]')!
        .append(error);
    }
    error.textContent = message;
  }

  private renderItem(item: ThreadItem): HTMLElement {
    if (item.kind === 'text') {
      const element = messageElement(
        this.element.ownerDocument,
        item.role,
        item.text,
        !item.done,
      );
      if (item.role !== 'user') {
        element.innerHTML = renderMarkdown(item.text);
      }
      return element;
    }
    const element = this.element.ownerDocument.createElement('article');
    element.className = 'tool-status';
    const label = item.name.replaceAll('_', ' ');
    element.textContent = item.parseError
      ? `${label} 参数无效：${item.parseError}`
      : item.status === 'result'
        ? `${label} 已完成`
        : `${label} 执行中`;
    return element;
  }

  private scrollToEnd(): void {
    queueMicrotask(() => {
      this.scroller.scrollTop = this.scroller.scrollHeight;
    });
  }
}

function messageElement(
  document: Document,
  role: string,
  text: string,
  streaming: boolean,
): HTMLElement {
  const element = document.createElement('article');
  element.className = `message message--${role}`;
  element.dataset.role = 'message';
  element.dataset.streaming = String(streaming);
  element.textContent = text;
  return element;
}
