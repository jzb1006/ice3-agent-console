import {
  ICE3,
  ICEOrbitController,
  ICEPerspectiveCamera,
  ICETilesetLoader,
  type ICETilesetEvent,
  type ICEGeometryBounds,
  type ICETilesetHandle,
} from 'ice3';
import type {
  CameraView,
  SceneCommand,
  SceneCommandResult,
  SceneSnapshot,
} from '../../shared/scene.js';
import { TILESET_ASSET } from '../../shared/demo-asset.js';
import { resolveDemoAssetUrl } from './asset-url.js';
import { moveCamera, type CameraPose } from './camera-controller.js';
import { SceneCommandExecutor } from './controller.js';
import type {
  EquipmentRecord,
  ICEGeometryBoundsLike,
  SceneController,
  SceneStatusListener,
  SceneStatusUpdate,
} from './types.js';
import {
  frameBounds,
  frameEquipment,
  type ScreenRect,
} from './focus-framing.js';
import {
  blinkSelection,
  type SelectionBlinkHandle,
} from './selection-blink.js';
import { applyUserSelection } from './user-selection.js';

interface BrowserSceneOptions {
  readonly stage: HTMLElement;
  readonly assetBaseUri?: string;
  readonly visibleViewport?: () => ScreenRect;
  readonly onStatus?: SceneStatusListener;
  readonly onSelection?: (ids: readonly string[]) => void;
  readonly onUserCameraIntent?: () => void;
}

function tilesetReadyStatus(
  stats: ICETilesetEvent['stats'],
): SceneStatusUpdate {
  if (stats.failed > 0) {
    return {
      text: `场景已就绪，但有 ${stats.failed} 个分块加载失败`,
      kind: 'error',
    };
  }
  return {
    text: `场景已就绪 · LOD ${stats.lod.resident}/${stats.lod.target} · 驻留 ${stats.resident}/${stats.total} 个分块`,
    kind: 'ready',
  };
}

type SceneEngineFactory = (
  options: Readonly<{ renderer: 'webgl2' }>,
) => ICE3;

export async function initializeSceneEngine(
  stage: HTMLElement,
  createEngine: SceneEngineFactory = (options) => new ICE3(options),
): Promise<ICE3> {
  return createEngine({ renderer: 'webgl2' }).initAsync(stage);
}

interface EquipmentManifest {
  readonly assetId: string;
  readonly displayExposure: number;
  readonly materialSlots: readonly {
    readonly id: string;
    readonly color: string;
    readonly role: string;
  }[];
  readonly bindings: readonly {
    readonly selectionId: string;
    readonly tag: string;
    readonly name: string;
    readonly stage: string;
    readonly area: string;
    readonly connections: readonly string[];
    readonly bounds: ICEGeometryBoundsLike;
    readonly slot: string;
  }[];
}

function center(bounds: ICEGeometryBoundsLike): readonly [number, number, number] {
  return [
    (bounds.min[0] + bounds.max[0]) / 2,
    (bounds.min[1] + bounds.max[1]) / 2,
    (bounds.min[2] + bounds.max[2]) / 2,
  ];
}

function radius(bounds: ICEGeometryBoundsLike): number {
  return Math.max(
    1,
    Math.hypot(
      bounds.max[0] - bounds.min[0],
      bounds.max[1] - bounds.min[1],
      bounds.max[2] - bounds.min[2],
    ) / 2,
  );
}

export async function createSceneController(
  options: BrowserSceneOptions,
): Promise<SceneController> {
  const assetBaseUri = options.assetBaseUri ?? document.baseURI;
  const manifestResponse = await fetch(resolveDemoAssetUrl(
    assetBaseUri,
    TILESET_ASSET.manifestPath,
    TILESET_ASSET.rootPath,
  ));
  if (!manifestResponse.ok) {
    throw new Error(
      `ICE3_EQUIPMENT_MANIFEST_INVALID: HTTP ${manifestResponse.status}`,
    );
  }
  const manifest = await manifestResponse.json() as EquipmentManifest;
  const catalogRecords = Object.freeze(
    manifest.bindings.map((record) => Object.freeze({
      selectionId: record.selectionId,
      name: record.name,
      bounds: record.bounds,
      metadata: Object.freeze({
        equipmentTag: record.tag,
        processStage: record.stage,
        area: record.area,
        connections: record.connections,
        materialSlot: record.slot,
      }),
    })),
  );
  const selectableIds = new Set(
    catalogRecords.map(({ selectionId }) => selectionId),
  );

  const engine = await initializeSceneEngine(options.stage);
  engine.setBackgroundColor('#000000');
  const camera = new ICEPerspectiveCamera({
    id: 'agent-console-camera',
    fov: 45,
    near: 0.1,
    far: 1000,
    position: [1, 1, 1],
    target: [0, 0, 0],
  });
  const loader = new ICETilesetLoader(engine, { camera });
  options.onStatus?.({ text: '正在加载工业场景资源', kind: 'loading' });
  const handle: ICETilesetHandle = await loader.open(
    resolveDemoAssetUrl(
      assetBaseUri,
      TILESET_ASSET.tilesetPath,
      TILESET_ASSET.rootPath,
    ),
  );
  const updateTilesetStatus = (event: { readonly param?: ICETilesetEvent }): void => {
    const stats = event.param?.stats;
    if (!stats) return;
    const progress = stats.total > 0
      ? `，已驻留 ${stats.resident}/${stats.total} 个分块`
      : '';
    options.onStatus?.({
      text: `正在准备工业场景${progress}`,
      kind: 'loading',
    });
  };
  handle.on<ICETilesetEvent>('TILESET_TILE_LOADING', updateTilesetStatus);
  handle.on<ICETilesetEvent>('TILESET_TILE_LOADED', updateTilesetStatus);
  handle.on<ICETilesetEvent>('TILESET_LOD_CHANGED', (event) => {
    const stats = event.param?.stats;
    if (!stats) return;
    options.onStatus?.({
      text: `正在调整场景细节 · LOD ${stats.lod.resident}/${stats.lod.target}`,
      kind: stats.failed ? 'error' : 'loading',
    });
  });
  handle.on<ICETilesetEvent>('TILESET_TILE_FAILED', (event) => {
    const stats = event.param?.stats;
    options.onStatus?.({
      text: `场景分块加载失败${stats ? `，失败 ${stats.failed} 个` : ''}`,
      kind: 'error',
    });
  });
  handle.on<ICETilesetEvent>('TILESET_IDLE', (event) => {
    const stats = event.param?.stats;
    if (stats) options.onStatus?.(tilesetReadyStatus(stats));
    else options.onStatus?.({ text: '场景已就绪', kind: 'ready' });
  });
  let orbit = new ICEOrbitController(engine, camera).start();
  engine.setScene(handle.scene).setCamera(camera).start();

  const overviewCenter = center(handle.bounds);
  const overviewRadius = radius(handle.bounds);
  const overviewViewport = {
    width: Math.max(1, options.stage.clientWidth),
    height: Math.max(1, options.stage.clientHeight),
  };
  const overview: CameraPose = frameBounds(handle.bounds, {
    viewport: overviewViewport,
    visible: options.visibleViewport?.() ?? {
      x: 0,
      y: 0,
      ...overviewViewport,
    },
    fovDegrees: camera.fov,
    fillRatio: 0.78,
  });
  camera.setClipPlanes(camera.near, Math.max(camera.far, overviewRadius * 8));
  camera.setPosition(overview.position).setTarget(overview.target);

  let motion: AbortController | null = null;
  let selectionBlink: SelectionBlinkHandle | null = null;
  let logicalSelection: readonly string[] = [];
  let programmaticSelectionDepth = 0;
  let view: CameraView = 'overview';
  const selectionListeners = new Set<(ids: readonly string[]) => void>();
  const intentListeners = new Set<() => void>();
  let disposed = false;

  const animate = async (destination: CameraPose): Promise<void> => {
    motion?.abort();
    const controller = new AbortController();
    motion = controller;
    await moveCamera(
      camera,
      destination,
      420,
      controller.signal,
      () => engine.requestRender('agent-camera-motion'),
    );
    if (controller.signal.aborted) return;
    orbit.dispose();
    orbit = new ICEOrbitController(engine, camera).start();
  };

  const boundsForArea = (area: string): ICEGeometryBounds | undefined => {
    const items = catalogRecords.filter((item) => item.metadata?.area === area);
    if (items.length === 0) return undefined;
    return {
      min: [0, 1, 2].map((axis) => (
        Math.min(...items.map((item) => item.bounds.min[axis]!))
      )) as [number, number, number],
      max: [0, 1, 2].map((axis) => (
        Math.max(...items.map((item) => item.bounds.max[axis]!))
      )) as [number, number, number],
    };
  };

  const setView = async (next: CameraView): Promise<void> => {
    view = next;
    if (next === 'overview') {
      await animate(overview);
      return;
    }
    if (next === 'top') {
      await animate({
        target: overviewCenter,
        position: [
          overviewCenter[0],
          overviewCenter[1] + overviewRadius * 1.8,
          overviewCenter[2] + 0.01,
        ],
      });
    }
  };

  const applyProgrammaticSelection = (ids: readonly string[]): void => {
    programmaticSelectionDepth += 1;
    try {
      engine.setSelection(ids);
    } finally {
      programmaticSelectionDepth -= 1;
    }
  };
  const startSelectionBlink = (ids: readonly string[]): void => {
    selectionBlink?.cancel(false);
    logicalSelection = [...new Set(ids)];
    selectionBlink = logicalSelection.length === 0
      ? null
      : blinkSelection(logicalSelection, {
          apply: applyProgrammaticSelection,
          reducedMotion: window.matchMedia?.(
            '(prefers-reduced-motion: reduce)',
          ).matches ?? false,
        });
  };
  const stopSelectionBlink = (restore = true): void => {
    selectionBlink?.cancel(restore);
    selectionBlink = null;
  };

  const port = {
    records: () => catalogRecords,
    setSelection(ids: readonly string[]): void {
      stopSelectionBlink(false);
      logicalSelection = [...new Set(ids)];
      applyProgrammaticSelection(logicalSelection);
      startSelectionBlink(logicalSelection);
    },
    async focus(bounds: ICEGeometryBoundsLike): Promise<void> {
      view = 'equipment';
      engine.requestRender('agent-focus');
      const viewport = {
        width: Math.max(1, options.stage.clientWidth),
        height: Math.max(1, options.stage.clientHeight),
      };
      await animate(frameEquipment(bounds, {
        viewport,
        visible: options.visibleViewport?.() ?? {
          x: 0,
          y: 0,
          ...viewport,
        },
        fovDegrees: camera.fov,
      }));
    },
    async setView(next: CameraView): Promise<void> {
      await setView(next);
    },
    snapshot(): SceneSnapshot {
      return {
        selectedIds: logicalSelection,
        view,
        cameraPosition: camera.getPosition().toArray(),
        cameraTarget: camera.getTarget().toArray(),
      };
    },
  };
  const executor = new SceneCommandExecutor(port);
  const cancelAgentMotion = (): void => {
    stopSelectionBlink();
    motion?.abort();
    motion = null;
    for (const listener of intentListeners) listener();
    options.onUserCameraIntent?.();
  };
  const onSelection = (event: {
    readonly param?: { readonly selection?: readonly string[] };
  }): void => {
    if (programmaticSelectionDepth > 0) return;
    const ids = applyUserSelection(
      event.param?.selection ?? [],
      selectableIds,
      applyProgrammaticSelection,
    );
    logicalSelection = ids;
    for (const listener of selectionListeners) listener(ids);
    options.onSelection?.(ids);
  };
  engine.on<{
    readonly selection: readonly string[];
  }>('SELECTION_CHANGE', onSelection);
  engine.on('POINTER_DOWN', cancelAgentMotion);
  engine.on<{ readonly event?: { readonly code?: string } }>(
    'KEY_DOWN',
    (event) => {
      if (/^(Key[WASD]|Arrow(Up|Down|Left|Right))$/.test(
        event.param?.event?.code ?? '',
      )) {
        cancelAgentMotion();
      }
    },
  );

  return {
    records: port.records,
    setSelection: port.setSelection,
    focus: port.focus,
    setView: port.setView,
    snapshot: port.snapshot,
    execute(command: SceneCommand): Promise<SceneCommandResult> {
      return executor.execute(command);
    },
    onSelection(listener) {
      selectionListeners.add(listener);
      return () => selectionListeners.delete(listener);
    },
    onUserCameraIntent(listener) {
      intentListeners.add(listener);
      return () => intentListeners.delete(listener);
    },
    async whenReady(): Promise<void> {
      await handle.whenReady();
      options.onStatus?.(tilesetReadyStatus(handle.stats));
    },
    dispose(): void {
      if (disposed) return;
      disposed = true;
      stopSelectionBlink(false);
      motion?.abort();
      orbit.dispose();
      handle.dispose();
    },
  };
}
