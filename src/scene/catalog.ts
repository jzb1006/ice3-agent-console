import type { EquipmentSummary } from '../../shared/scene.js';
import type { EquipmentRecord } from './types.js';

export interface EquipmentQuery {
  readonly query?: string;
  readonly tag?: string;
  readonly stage?: string;
  readonly area?: string;
}

export interface EquipmentCatalogEntry extends EquipmentSummary {
  readonly searchText: string;
}

export interface EquipmentCatalog {
  readonly entries: readonly EquipmentCatalogEntry[];
  find(query: EquipmentQuery): readonly EquipmentCatalogEntry[];
}

function text(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

export function createEquipmentCatalog(
  records: readonly Pick<EquipmentRecord, 'selectionId' | 'name' | 'metadata'>[],
): EquipmentCatalog {
  const entries: readonly EquipmentCatalogEntry[] = Object.freeze(
    records.map((record) => {
      const tag = text(record.metadata?.equipmentTag);
      const stage = text(record.metadata?.processStage);
      const area = text(record.metadata?.area);
      return Object.freeze({
        selectionId: record.selectionId,
        name: record.name,
        tag,
        stage,
        area,
        connectionCount: Array.isArray(record.metadata?.connections)
          ? record.metadata.connections.length
          : 0,
        searchText: [tag, record.name, stage, area]
          .join(' ')
          .toLocaleLowerCase(),
      });
    }),
  );

  return {
    entries,
    find(query: EquipmentQuery): readonly EquipmentCatalogEntry[] {
      const textQuery = query.query?.trim().toLocaleLowerCase();
      return entries
        .filter((entry) => (
          (!query.tag || entry.tag === query.tag)
          && (!query.stage || entry.stage === query.stage)
          && (!query.area || entry.area === query.area)
          && (!textQuery || entry.searchText.includes(textQuery))
        ))
        .sort((left, right) => {
          const leftExact = left.tag?.toLocaleLowerCase() === textQuery ? 0 : 1;
          const rightExact = right.tag?.toLocaleLowerCase() === textQuery ? 0 : 1;
          return leftExact - rightExact
            || left.selectionId.localeCompare(right.selectionId, 'en');
        });
    },
  };
}
