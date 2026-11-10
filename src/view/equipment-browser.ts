import type { EquipmentCatalog, EquipmentCatalogEntry } from '../scene/catalog.js';

export interface EquipmentBrowserOptions {
  readonly onSelect: (entry: EquipmentCatalogEntry) => void | Promise<void>;
  readonly onError?: (error: unknown) => void;
}

export class EquipmentBrowser {
  readonly element: HTMLElement;
  private readonly query: HTMLInputElement;
  private readonly area: HTMLSelectElement;
  private readonly stage: HTMLSelectElement;
  private readonly count: HTMLElement;
  private readonly results: HTMLElement;
  private readonly catalog: EquipmentCatalog;
  private readonly onSelect: EquipmentBrowserOptions['onSelect'];
  private readonly onError: EquipmentBrowserOptions['onError'];

  constructor(
    host: HTMLElement,
    catalog: EquipmentCatalog,
    options: EquipmentBrowserOptions,
  ) {
    const document = host.ownerDocument;
    this.catalog = catalog;
    this.onSelect = options.onSelect;
    this.onError = options.onError;
    this.element = document.createElement('section');
    this.element.className = 'equipment-browser';
    this.element.dataset.role = 'equipment-browser';
    this.element.innerHTML = `
      <div class="equipment-browser__heading">
        <span class="eyebrow">设备目录</span>
        <span data-role="equipment-count"></span>
      </div>
      <label class="sr-only" for="equipment-search">搜索设备</label>
      <input class="equipment-browser__query" type="search"
        data-role="equipment-search" placeholder="搜索设备、编号或工艺段"
        autocomplete="off" />
      <div class="equipment-browser__filters">
        <label>
          <span class="sr-only">区域</span>
          <select data-role="equipment-filter-area" aria-label="按区域筛选"></select>
        </label>
        <label>
          <span class="sr-only">工艺段</span>
          <select data-role="equipment-filter-stage" aria-label="按工艺段筛选"></select>
        </label>
      </div>
      <div class="equipment-browser__results" data-role="equipment-results"
        role="list"></div>
    `;
    host.append(this.element);
    this.query = this.element.querySelector('[data-role="equipment-search"]')!;
    this.area = this.element.querySelector('[data-role="equipment-filter-area"]')!;
    this.stage = this.element.querySelector('[data-role="equipment-filter-stage"]')!;
    this.count = this.element.querySelector('[data-role="equipment-count"]')!;
    this.results = this.element.querySelector('[data-role="equipment-results"]')!;
    this.populateFilters();
    this.query.addEventListener('input', () => this.render());
    this.area.addEventListener('change', () => this.render());
    this.stage.addEventListener('change', () => this.render());
    this.render();
  }

  private populateFilters(): void {
    const entries = this.catalog.entries;
    const appendOptions = (
      select: HTMLSelectElement,
      values: readonly string[],
      placeholder: string,
    ): void => {
      select.replaceChildren();
      const defaultOption = select.ownerDocument.createElement('option');
      defaultOption.value = '';
      defaultOption.textContent = placeholder;
      select.append(defaultOption);
      for (const value of values) {
        const option = select.ownerDocument.createElement('option');
        option.value = value;
        option.textContent = value;
        select.append(option);
      }
    };
    const areas = [...new Set(entries.map((entry) => entry.area).filter(nonEmpty))]
      .sort((left, right) => left.localeCompare(right, 'zh-Hans'));
    const stages = [...new Set(entries.map((entry) => entry.stage).filter(nonEmpty))]
      .sort((left, right) => left.localeCompare(right, 'zh-Hans'));
    appendOptions(this.area, areas, '全部区域');
    appendOptions(this.stage, stages, '全部工艺段');
  }

  private render(): void {
    const filtered = this.catalog.find({
      query: this.query.value,
      area: this.area.value,
      stage: this.stage.value,
    });

    this.count.textContent = `${filtered.length}/${this.catalog.entries.length}`;
    this.results.replaceChildren();
    if (filtered.length === 0) {
      const empty = this.element.ownerDocument.createElement('p');
      empty.className = 'equipment-browser__empty';
      empty.textContent = '没有匹配设备';
      this.results.append(empty);
      return;
    }
    for (const entry of filtered) {
      const button = this.element.ownerDocument.createElement('button');
      button.type = 'button';
      button.className = 'equipment-browser__result';
      button.dataset.selectionId = entry.selectionId;
      button.setAttribute('aria-label', `定位 ${entry.name} ${entry.tag}`);
      button.innerHTML = `
        <span class="equipment-browser__result-name"></span>
        <span class="equipment-browser__result-meta"></span>
      `;
      button.querySelector('.equipment-browser__result-name')!.textContent = entry.name;
      button.querySelector('.equipment-browser__result-meta')!.textContent =
        `${entry.tag} · ${entry.area}`;
      button.addEventListener('click', () => {
        void this.select(entry);
      });
      this.results.append(button);
    }
  }

  private async select(entry: EquipmentCatalogEntry): Promise<void> {
    try {
      await this.onSelect(entry);
    } catch (error) {
      this.onError?.(error);
    }
  }
}

function nonEmpty(value: string | undefined): value is string {
  return Boolean(value);
}
