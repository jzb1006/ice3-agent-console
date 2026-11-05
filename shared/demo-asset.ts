export const DEMO_ASSET = Object.freeze({
  id: 'ice3-virtual-auto-plant',
  label: '虚拟汽车制造工厂',
});

export const DEMO_ASSET_ID = DEMO_ASSET.id;

export function demoEquipmentSelectionId(tag: string): string {
  return `${DEMO_ASSET_ID}/equipment/${tag}`;
}
