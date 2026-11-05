export const DEMO_ASSET = Object.freeze({
  id: 'ice3-virtual-auto-plant',
  label: '虚拟汽车制造工厂',
  rootPath: 'assets/automotive-plant',
  manifestPath: 'equipment.json',
  tilesetPath: 'tiled/tileset.json',
});

export const TILESET_ASSET = Object.freeze({
  id: 'ice3-virtual-wwtp',
  label: '虚拟污水处理厂',
  rootPath: 'assets/wastewater-plant',
  manifestPath: 'equipment.json',
  tilesetPath: 'tiled/tileset.json',
});

export const DEMO_ASSET_ID = DEMO_ASSET.id;

export function demoEquipmentSelectionId(tag: string): string {
  return `${DEMO_ASSET_ID}/equipment/${tag}`;
}
