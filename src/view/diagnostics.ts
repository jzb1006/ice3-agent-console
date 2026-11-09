import type { SceneCapture, SceneDiagnostics } from '../scene/types.js';

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
  private readonly captureButton: HTMLButtonElement;
  private readonly alert: HTMLElement;
  private capture: (() => Promise<SceneCapture | undefined>) | undefined;
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
      <div class="diagnostics-actions">
        <button type="button" data-role="diagnostics-capture">导出现场证据</button>
        <span data-role="diagnostics-alert" data-state="ok">运行正常</span>
      </div>
      <p class="diagnostics-last" data-role="diagnostics-last">等待引擎数据</p>
    `;
    this.element.append(this.toggle, this.body);
    host.append(this.element);
    this.captureButton = this.body.querySelector<HTMLButtonElement>(
      '[data-role="diagnostics-capture"]',
    )!;
    this.alert = this.body.querySelector<HTMLElement>('[data-role="diagnostics-alert"]')!;
    this.captureButton.addEventListener('click', () => {
      void this.exportCapture();
    });
    this.toggle.addEventListener('click', () => {
      this.element.hidden = !this.element.hidden;
      this.toggle.setAttribute('aria-expanded', String(!this.element.hidden));
    });
  }

  connect(
    read: () => SceneDiagnostics | undefined,
    capture?: () => Promise<SceneCapture | undefined>,
  ): void {
    this.capture = capture;
    this.captureButton.disabled = !capture;
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
    const alerts: string[] = [];
    let alertState: 'ok' | 'warning' | 'error' = 'ok';
    if (diagnostics.contextLossCount > 0) {
      alerts.push(`上下文丢失 ${diagnostics.contextLossCount} 次`);
      alertState = 'error';
    }
    if (diagnostics.lastDiagnostic) {
      alerts.push(diagnostics.lastDiagnostic.message);
      if (diagnostics.lastDiagnostic.severity === 'error') alertState = 'error';
      else if (alertState !== 'error') alertState = 'warning';
    }
    if (diagnostics.fps > 0 && diagnostics.fps < 30) {
      alerts.push('帧率偏低');
      if (alertState === 'ok') alertState = 'warning';
    }
    if (diagnostics.cpuFrameTimeMs > 33.3) {
      alerts.push('CPU 帧耗时偏高');
      if (alertState === 'ok') alertState = 'warning';
    }
    if (diagnostics.drawCalls > 1_500) {
      alerts.push('绘制调用偏高');
      if (alertState === 'ok') alertState = 'warning';
    }
    if (diagnostics.gpuBytes > 128 * 1024 * 1024) {
      alerts.push('GPU 缓存偏高');
      if (alertState === 'ok') alertState = 'warning';
    }
    this.alert.dataset.state = alertState;
    this.alert.textContent = alerts.length > 0 ? alerts.join('；') : '运行正常';
    text('diagnostics-last').textContent = diagnostics.lastDiagnostic
      ? `${diagnostics.lastDiagnostic.severity}: ${diagnostics.lastDiagnostic.message}`
      : `最近拾取 ${formatNumber(diagnostics.lastPickTimeMs, 2)} ms`;
  }

  private async exportCapture(): Promise<void> {
    if (!this.capture) return;
    const status = this.alert;
    try {
      const capture = await this.capture();
      if (!capture) return;
      const document = this.element.ownerDocument;
      const window = document.defaultView;
      if (!window?.URL?.createObjectURL) throw new Error('当前浏览器不支持文件导出');
      const stamp = new Date().toISOString().replace(/[.:]/g, '-');
      const download = (blob: Blob, suffix: string): void => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `ice3-scene-${stamp}.${suffix}`;
        document.body?.append(link);
        link.click();
        link.remove();
        window.setTimeout(() => window.URL.revokeObjectURL(url), 0);
      };
      download(capture.blob, 'png');
      download(new Blob([
        JSON.stringify({
          capturedAt: new Date().toISOString(),
          snapshot: capture.snapshot,
          diagnostics: capture.diagnostics,
          selectedEquipment: capture.selectedEquipment,
        }, null, 2),
      ], { type: 'application/json' }), 'json');
      status.dataset.state = 'ok';
      status.textContent = '已导出 PNG + JSON';
    } catch (error) {
      status.dataset.state = 'error';
      status.textContent = error instanceof Error ? error.message : '导出失败';
    }
  }

  dispose(): void {
    if (this.timer !== null) clearInterval(this.timer);
    this.timer = null;
  }
}
