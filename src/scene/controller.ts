import type { SceneCommand, SceneCommandResult } from '../../shared/scene.js';
import { createEquipmentCatalog } from './catalog.js';
import type { EquipmentRecord, ScenePort } from './types.js';

export class SceneCommandExecutor {
  constructor(private readonly scene: ScenePort) {}

  async execute(
    command: SceneCommand,
    signal?: AbortSignal,
  ): Promise<SceneCommandResult> {
    const catalog = createEquipmentCatalog(this.scene.records());
    const ids = [...new Set(command.selectionIds ?? [])];
    const selected = this.resolveSelection(ids);

    switch (command.type) {
      case 'find': {
        const matches = catalog.find({ query: command.query, area: command.area });
        return {
          ok: true,
          selectionIds: matches.map(({ selectionId }) => selectionId),
          message: matches.length > 0
            ? `找到 ${matches.length} 台相关设备`
            : '没有找到匹配设备',
          matches: matches.map(({ selectionId, name, tag }) => ({
            selectionId,
            name,
            ...(tag ? { tag } : {}),
          })),
        };
      }
      case 'select':
      case 'highlight': {
        if (selected.length !== ids.length) return this.invalidSelection(ids, selected);
        this.scene.setSelection(ids);
        return {
          ok: true,
          selectionIds: ids,
          message: command.type === 'highlight'
            ? `已高亮 ${ids.length} 台设备`
            : `已选择 ${ids.length} 台设备`,
        };
      }
      case 'focus': {
        if (selected.length === 0) return this.invalidSelection(ids, selected);
        this.scene.setSelection(selected.map(({ selectionId }) => selectionId));
        await this.scene.focus(selected[0]!.bounds);
        return {
          ok: true,
          selectionIds: selected.map(({ selectionId }) => selectionId),
          message: `已定位 ${selected[0]!.name}`,
        };
      }
      case 'camera':
        await this.scene.setView(command.view ?? 'overview');
        return {
          ok: true,
          selectionIds: this.scene.snapshot().selectedIds,
          message: `已切换至 ${command.view ?? 'overview'} 视角`,
        };
      case 'clear':
        this.scene.setSelection([]);
        await this.scene.setView('overview');
        return {
          ok: true,
          selectionIds: [],
          message: '已清除设备聚焦并返回全厂视角',
        };
      case 'production':
        if (!this.scene.playProduction) {
          return {
            ok: false,
            selectionIds: [],
            message: '当前场景不支持整车生产流动画',
          };
        }
        await this.scene.playProduction(signal);
        return {
          ok: true,
          selectionIds: this.scene.snapshot().selectedIds,
          message: '整车生产流已完成，车辆已驶出成品物流月台',
        };
    }
  }

  private resolveSelection(ids: readonly string[]): readonly EquipmentRecord[] {
    const records = new Map(
      this.scene.records().map((record) => [record.selectionId, record]),
    );
    return ids.flatMap((id) => records.get(id) ?? []);
  }

  private invalidSelection(
    requested: readonly string[],
    found: readonly EquipmentRecord[],
  ): SceneCommandResult {
    const foundIds = new Set(found.map(({ selectionId }) => selectionId));
    return {
      ok: false,
      selectionIds: [],
      message: `未找到设备：${requested.filter((id) => !foundIds.has(id)).join(', ')}`,
    };
  }
}
