export type SceneMode = 'procedural' | 'tileset';

export function resolveDemoMode(
  search: string,
  demoDefault: boolean,
): boolean {
  const value = new URLSearchParams(search).get('demo');
  if (value === '1' || value === 'true') return true;
  if (value === '0' || value === 'false') return false;
  return demoDefault;
}

export function resolveSceneMode(
  search: string,
  sceneDefault: SceneMode,
): SceneMode {
  const value = new URLSearchParams(search).get('scene');
  if (value === 'procedural' || value === 'tileset') return value;
  return sceneDefault;
}

export function resolveAutoplay(
  search: string,
  autoplayDefault: boolean,
): boolean {
  const value = new URLSearchParams(search).get('autoplay');
  if (value === '1' || value === 'true') return true;
  if (value === '0' || value === 'false') return false;
  return autoplayDefault;
}
