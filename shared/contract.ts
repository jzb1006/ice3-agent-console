export const SCENE_TOOLS = Object.freeze([
  'find_equipment',
  'select_equipment',
  'focus_equipment',
  'highlight_equipment',
  'set_camera_view',
  'clear_scene_focus',
  'play_production',
] as const);

export type SceneToolName = (typeof SCENE_TOOLS)[number];

const SCENE_TOOL_SET: ReadonlySet<string> = new Set(SCENE_TOOLS);

export function isSceneToolName(value: string): value is SceneToolName {
  return SCENE_TOOL_SET.has(value);
}

export const EVT_SCENE_ANCHOR = 'ice3/anchor';
export const EVT_POINT_CLEAR = 'ice3/point-clear';
export const EVT_AUTOPLAY_CANCELLED = 'ice3/autoplay-cancelled';
