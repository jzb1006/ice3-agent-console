import type { SceneDiagnostics } from '../scene/types.js';

function formatNumber(value: number, digits = 0): string {
  return Number.isFinite(value) ? value.toFixed(digits) : '-';
}

function formatBytes(value: number): string {
  if (!Number.isFinite(value) || value < 0) return '-';
  if (value < 1024) return `${Math.round(value)} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

export class DiagnosticsPanel {
  readonly element: HTMLElement;
  private readonly toggle: HTMLButtonElement;
  private readonly body: HTMLElement;
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(host: HTMLElement) {
    const document = host.ownerDocument;
    this.element = document.createElement('section');
    this.element.className = 'diagnostics-panel';
    this.element.dataset.role = 'diagnostics-panel';
    this.element.hidden = true;
    this.toggle = document.createElement('button');
    this.toggle.type = 'button';
    this.toggle.className = 'diagnostics-toggle';
    this.toggle.dataset.role = 'diagnostics-toggle';
    this.toggle.title = '显示渲染诊断';
    this.toggle.setAttribute('aria-label', '显示渲染诊断');
    this.toggle.textContent = '诊断';
    this.body = document.createElement('div');
    this.body.className = 'diagnostics-body';
    this.body.dataset.role = 'diagnostics-body';
    this.body.innerHTML = `
      <div class="diagnostics-heading">
        <span class="eyebrow">ICE3 RENDER DIAGNOSTICS</span>
        <span data-role="diagnostics-backend">--</span>
      </div>
      <dl>
        <div><dt>帧率</dt><dd data-role="diagnostics-fps">--</dd></div>
        <div><dt>CPU 帧耗时</dt><dd data-role="diagnostics-cpu">--</dd></div>
        <div><dt>绘制调用</dt><dd data-role="diagnostics-draw-calls">--</dd></div>
        <div><dt>渲染网格</dt><dd data-role="diagnostics-meshes">--</dd></div>
        <div><dt>渲染批次</dt><dd data-role="diagnostics-batches">--</dd></div>
        <div><dt>GPU 缓存</dt><dd data-role="diagnostics-gpu-bytes">--</dd></div>
        <div><dt>当前选择</dt><dd data-role="diagnostics-selection">--</dd></div>
        <div><dt>上下文丢失</dt><dd data-role="diagnostics-context-loss">--</dd></div>
      </dl>
      <p class="diagnostics-last" data-role="diagnostics-last">等待引擎数据</p>
    `;
    this.element.append(this.toggle, this.body);
    host.append(this.element);
    this.toggle.addEventListener('click', () => {
      this.element.hidden = !this.element.hidden;
      this.toggle.setAttribute('aria-expanded', String(!this.element.hidden));
    });
  }

  connect(read: () => SceneDiagnostics | undefined): void {
    const update = (): void => {
      const diagnostics = read();
      if (diagnostics) this.render(diagnostics);
    };
    update();
    this.timer = setInterval(update, 1000);
  }

  render(diagnostics: SceneDiagnostics): void {
    const text = (role: string): HTMLElement => (
      this.body.querySelector<HTMLElement>(`[data-role="${role}"]`)!
    );
    text('diagnostics-backend').textContent = diagnostics.backend.toUpperCase();
    text('diagnostics-fps').textContent = `${formatNumber(diagnostics.fps, 1)} FPS`;
    text('diagnostics-cpu').textContent = `${formatNumber(diagnostics.cpuFrameTimeMs, 2)} ms`;
    text('diagnostics-draw-calls').textContent = formatNumber(diagnostics.drawCalls);
    text('diagnostics-meshes').textContent = formatNumber(diagnostics.renderedMeshes);
    text('diagnostics-batches').textContent = formatNumber(diagnostics.renderedBatches);
    text('diagnostics-gpu-bytes').textContent = formatBytes(diagnostics.gpuBytes);
    text('diagnostics-selection').textContent = formatNumber(diagnostics.selectionCount);
    text('diagnostics-context-loss').textContent = formatNumber(diagnostics.contextLossCount);
    text('diagnostics-last').textContent = diagnostics.lastDiagnostic
      ? `${diagnostics.lastDiagnostic.severity}: ${diagnostics.lastDiagnostic.message}`
      : `最近拾取 ${formatNumber(diagnostics.lastPickTimeMs, 2)} ms`;
  }

  dispose(): void {
    if (this.timer !== null) clearInterval(this.timer);
    this.timer = null;
  }
}
