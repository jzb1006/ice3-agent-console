import { DEMO_ASSET } from '../../shared/demo-asset.js';
import { TourOverlay } from './tour-overlay.js';

export class StageView {
  readonly element: HTMLElement;
  readonly tour: TourOverlay;

  constructor(host: HTMLElement, label: string = DEMO_ASSET.label) {
    this.element = host.ownerDocument.createElement('main');
    this.element.id = 'stage';
    this.element.dataset.role = 'stage';
    this.element.setAttribute('aria-busy', 'true');
    this.element.innerHTML = `
      <div class="scene-backdrop" aria-hidden="true"></div>
      <div class="brand-lockup">
        <span class="brand-mark">ICE3</span>
        <span data-role="scene-label"></span>
      </div>
    `;
    this.element.querySelector<HTMLElement>('[data-role="scene-label"]')!
      .textContent = label;
    host.append(this.element);
    this.tour = new TourOverlay(this.element);
  }

  setReady(): void {
    this.element.setAttribute('aria-busy', 'false');
  }
}
