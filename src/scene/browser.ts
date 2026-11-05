import { ICE3 } from 'ice3';

type SceneEngineFactory = (
  options: Readonly<{ renderer: 'webgl2' }>,
) => ICE3;

export async function initializeSceneEngine(
  stage: HTMLElement,
  createEngine: SceneEngineFactory = (options) => new ICE3(options),
): Promise<ICE3> {
  return createEngine({ renderer: 'webgl2' }).initAsync(stage);
}
