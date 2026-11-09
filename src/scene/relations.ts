import type { EquipmentRecord } from './types.js';

export function selectionIdsWithRelated(
  selectionIds: readonly string[],
  records: readonly EquipmentRecord[],
): readonly string[] {
  const recordsById = new Map(
    records.map((record) => [record.selectionId, record]),
  );
  const idsByTag = new Map(
    records.flatMap((record) => {
      const tag = record.metadata?.equipmentTag;
      return typeof tag === 'string' ? [[tag, record.selectionId] as const] : [];
    }),
  );
  const result = new Set(selectionIds);
  for (const selectionId of selectionIds) {
    const record = recordsById.get(selectionId);
    const connections = record?.metadata?.connections;
    if (!Array.isArray(connections)) continue;
    for (const connection of connections) {
      if (typeof connection !== 'string') continue;
      const relatedId = idsByTag.get(connection) ?? (
        recordsById.has(connection) ? connection : undefined
      );
      if (relatedId) result.add(relatedId);
    }
  }
  return [...result];
}
