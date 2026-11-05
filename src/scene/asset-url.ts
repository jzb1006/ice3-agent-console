import { DEMO_ASSET } from '../../shared/demo-asset.js';

export function resolveDemoAssetUrl(
  baseUri: string,
  relativePath: string,
  assetRoot: string = DEMO_ASSET.rootPath,
): string {
  return new URL(
    `${assetRoot}/${relativePath}`,
    baseUri,
  ).toString();
}
