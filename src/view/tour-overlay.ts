export interface TourOverlayUpdate {
  readonly eyebrow?: string;
  readonly title: string;
  readonly stageIndex: number;
  readonly stageCount: number;
  readonly equipmentName?: string;
  readonly processStage?: string;
  readonly controls?: readonly TourControlHint[];
  readonly detail: string;
  readonly completed?: boolean;
}

export interface TourControlHint {
  readonly label: string;
  readonly value: string;
}

function clampStageIndex(index: number, count: number): number {
  if (count <= 0) return 0;
  return Math.min(count, Math.max(0, Math.floor(index)));
}

function formatStep(index: number, count: number): string {
  return `${String(index).padStart(2, '0')} / ${String(count).padStart(2, '0')}`;
}

export class TourOverlay {
  readonly element: HTMLElement;

  private readonly title: HTMLElement;
  private readonly eyebrow: HTMLElement;
  private readonly step: HTMLElement;
  private readonly equipment: HTMLElement;
  private readonly process: HTMLElement;
  private readonly controls: HTMLElement;
  private readonly detail: HTMLElement;
  private readonly markers: HTMLElement;

  constructor(host: HTMLElement) {
    const document = host.ownerDocument;
    this.element = document.createElement('section');
    this.element.className = 'tour-hud';
    this.element.dataset.role = 'tour-hud';
    this.element.hidden = true;
    this.element.setAttribute('aria-label', '工艺导览');
    this.element.setAttribute('aria-live', 'polite');
    this.element.innerHTML = `
      <div class="tour-hud__eyebrow">工艺导览</div>
      <div class="tour-hud__header">
        <h2 data-role="tour-title"></h2>
        <span data-role="tour-step"></span>
      </div>
      <div class="tour-hud__markers" data-role="tour-markers"></div>
      <div class="tour-hud__equipment" data-role="tour-equipment"></div>
      <div class="tour-hud__process" data-role="tour-process"></div>
      <div class="tour-hud__controls" data-role="tour-controls" aria-label="参观操作引导"></div>
      <p class="tour-hud__detail" data-role="tour-detail"></p>
    `;
    host.append(this.element);
    this.eyebrow = this.element.querySelector('.tour-hud__eyebrow')!;
    this.title = this.element.querySelector('[data-role="tour-title"]')!;
    this.step = this.element.querySelector('[data-role="tour-step"]')!;
    this.equipment = this.element.querySelector('[data-role="tour-equipment"]')!;
    this.process = this.element.querySelector('[data-role="tour-process"]')!;
    this.controls = this.element.querySelector('[data-role="tour-controls"]')!;
    this.detail = this.element.querySelector('[data-role="tour-detail"]')!;
    this.markers = this.element.querySelector('[data-role="tour-markers"]')!;
  }

  update(update: TourOverlayUpdate): void {
    const count = Math.max(0, Math.floor(update.stageCount));
    const index = clampStageIndex(update.stageIndex, count);
    const state = update.completed
      ? 'complete'
      : index === 0
        ? 'preparing'
        : 'active';

    this.element.hidden = false;
    this.element.dataset.state = state;
    this.element.parentElement?.setAttribute('data-tour-active', 'true');
    this.eyebrow.textContent = update.eyebrow ?? '工艺导览';
    this.title.textContent = update.title;
    this.step.textContent = formatStep(index, count);
    this.equipment.textContent = update.completed
      ? '导览完成'
      : update.equipmentName ?? '准备开始';
    this.process.textContent = update.completed
      ? '车辆进入成品物流月台'
      : update.processStage ?? '生产流程';
    this.controls.replaceChildren();
    this.controls.hidden = !update.controls || update.controls.length === 0;
    for (const control of update.controls ?? []) {
      const item = this.element.ownerDocument.createElement('span');
      item.className = 'tour-hud__control';
      const label = this.element.ownerDocument.createElement('b');
      label.textContent = control.label;
      const value = this.element.ownerDocument.createElement('kbd');
      value.textContent = control.value;
      item.append(label, value);
      this.controls.append(item);
    }
    this.detail.textContent = update.detail;
    this.markers.replaceChildren();

    for (let markerIndex = 1; markerIndex <= count; markerIndex += 1) {
      const marker = this.element.ownerDocument.createElement('i');
      marker.dataset.role = 'tour-marker';
      marker.dataset.state = update.completed || markerIndex < index
        ? 'complete'
        : markerIndex === index
          ? 'active'
          : 'pending';
      marker.setAttribute('aria-hidden', 'true');
      this.markers.append(marker);
    }
  }

  hide(): void {
    this.element.hidden = true;
    this.element.parentElement?.setAttribute('data-tour-active', 'false');
  }
}
