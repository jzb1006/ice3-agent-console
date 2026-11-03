import {
  ICE3,
  ICEBasicMaterial,
  ICEBoxGeometry,
  ICEOrbitController,
  ICEPerspectiveCamera,
  ICEMesh,
  ICEScene,
} from 'ice3';
import type {
  CameraView,
  SceneCommand,
  SceneCommandResult,
  SceneSnapshot,
} from '../../shared/scene.js';
import {
  FACTORY_EQUIPMENT,
  type FactoryEquipment,
} from '../../shared/factory.js';
import { SceneCommandExecutor } from './controller.js';
import type {
  EquipmentRecord,
  ICEGeometryBoundsLike,
  SceneController,
} from './types.js';
import {
  frameEquipment,
  type ScreenRect,
} from './focus-framing.js';
import {
  blinkSelection,
  type SelectionBlinkHandle,
} from './selection-blink.js';
import { moveCamera, type CameraPose } from './camera-controller.js';
import { applyUserSelection } from './user-selection.js';

interface BrowserSceneOptions {
  readonly stage: HTMLElement;
  readonly visibleViewport?: () => ScreenRect;
  readonly onSelection?: (ids: readonly string[]) => void;
  readonly onUserCameraIntent?: () => void;
}

function boundsForEquipment(item: FactoryEquipment): ICEGeometryBoundsLike {
  const [x, y, z] = item.position;
  const [width, height, depth] = item.size;
  return {
    min: [x - width / 2, y - height / 2, z - depth / 2],
    max: [x + width / 2, y + height / 2, z + depth / 2],
  };
}

function mesh(
  id: string,
  size: readonly [number, number, number],
  position: readonly [number, number, number],
  color: string,
  options: Readonly<{
    displayName?: string;
    selectionId?: string;
    metadata?: Readonly<Record<string, unknown>>;
    edgeColor?: string;
  }> = {},
): ICEMesh {
  return new ICEMesh({
    id,
    displayName: options.displayName ?? id,
    ...(options.selectionId ? { selectionId: options.selectionId } : {}),
    ...(options.metadata ? { metadata: options.metadata } : {}),
    position,
    geometry: new ICEBoxGeometry({
      width: size[0],
      height: size[1],
      depth: size[2],
    }),
    material: new ICEBasicMaterial({
      color,
      edgeColor: options.edgeColor ?? '#b7d8d1',
      shading: 'directional',
    }),
  });
}

function addFactoryDecor(scene: ICEScene): void {
  scene.addChild(mesh('factory-floor', [66, 0.2, 24], [8, -0.7, 0], '#17272b', { edgeColor: '#3b6667' }));
  scene.addChild(mesh('main-conveyor-bed', [58, 0.25, 3.4], [8, -0.25, 0], '#2a3c42', { edgeColor: '#6f9695' }));
  scene.addChild(mesh('conveyor-left-rail', [58, 0.45, 0.18], [8, 0.05, -1.65], '#879b98', { edgeColor: '#d6eee1' }));
  scene.addChild(mesh('conveyor-right-rail', [58, 0.45, 0.18], [8, 0.05, 1.65], '#879b98', { edgeColor: '#d6eee1' }));
  for (const x of [-16, -10, -4, 2, 8, 14, 20, 26, 32]) {
    scene.addChild(mesh(`conveyor-support-${x}`, [0.25, 1.25, 3.2], [x, -0.1, 0], '#314b51', { edgeColor: '#5f8585' }));
  }
  for (const x of [-19, -7, 5, 17, 29, 35]) {
    scene.addChild(mesh(`roof-column-left-${x}`, [0.35, 8, 0.35], [x, 3.3, -9], '#253e43', { edgeColor: '#557776' }));
    scene.addChild(mesh(`roof-column-right-${x}`, [0.35, 8, 0.35], [x, 3.3, 9], '#253e43', { edgeColor: '#557776' }));
    scene.addChild(mesh(`roof-beam-${x}`, [0.35, 0.35, 18], [x, 7.2, 0], '#345459', { edgeColor: '#77a5a0' }));
  }
  for (const x of [-14, 0, 14, 28]) {
    scene.addChild(mesh(`vehicle-body-${x}`, [3.4, 0.8, 1.8], [x, 0.45, 0], '#a9c0bd', { edgeColor: '#effff5' }));
    scene.addChild(mesh(`vehicle-cabin-${x}`, [1.45, 0.65, 1.55], [x - 0.25, 1.15, 0], '#436c73', { edgeColor: '#9fd5c8' }));
  }
  scene.addChild(mesh('safety-lane-left', [62, 0.04, 0.18], [8, -0.56, -5.2], '#d7b84c', { edgeColor: '#ffe994' }));
  scene.addChild(mesh('safety-lane-right', [62, 0.04, 0.18], [8, -0.56, 5.2], '#d7b84c', { edgeColor: '#ffe994' }));
}

function addFactoryEquipment(scene: ICEScene): readonly EquipmentRecord[] {
  const records: EquipmentRecord[] = [];
  for (const item of FACTORY_EQUIPMENT) {
    const record: EquipmentRecord = Object.freeze({
      selectionId: item.selectionId,
      name: item.name,
      bounds: boundsForEquipment(item),
      metadata: Object.freeze({
        equipmentTag: item.tag,
        processStage: item.stage,
        area: item.area,
        connections: item.connections,
      }),
    });
    records.push(record);
    scene.addChild(mesh(
      `equipment-${item.tag}`,
      item.size,
      item.position,
      item.color,
      {
        displayName: item.name,
        selectionId: item.selectionId,
        metadata: record.metadata,
        edgeColor: '#d0f2e4',
      },
    ));
  }
  return Object.freeze(records);
}

function center(bounds: ICEGeometryBoundsLike): readonly [number, number, number] {
  return [
    (bounds.min[0] + bounds.max[0]) / 2,
    (bounds.min[1] + bounds.max[1]) / 2,
    (bounds.min[2] + bounds.max[2]) / 2,
  ];
}

function radius(bounds: ICEGeometryBoundsLike): number {
  return Math.max(1, Math.hypot(
    bounds.max[0] - bounds.min[0],
    bounds.max[1] - bounds.min[1],
    bounds.max[2] - bounds.min[2],
  ) / 2);
}

export async function createFactorySceneController(
  options: BrowserSceneOptions,
): Promise<SceneController> {
  const engine = await new ICE3({ renderer: 'webgl2' }).initAsync(options.stage);
  engine.setBackgroundColor('#071317');
  const scene = new ICEScene({ id: 'automotive-factory-scene' });
  addFactoryDecor(scene);
  const records = addFactoryEquipment(scene);
  const selectableIds = new Set(records.map(({ selectionId }) => selectionId));
  const camera = new ICEPerspectiveCamera({
    id: 'agent-console-camera',
    fov: 45,
    near: 0.1,
    far: 1000,
    position: [38, 27, 40],
    target: [8, 0, 0],
  });
  const overviewBounds: ICEGeometryBoundsLike = {
    min: [-24, -1, -11],
    max: [40, 8, 11],
  };
  const overviewCenter = center(overviewBounds);
  const overviewRadius = radius(overviewBounds);
  const overview: CameraPose = {
    target: overviewCenter,
    position: [
      overviewCenter[0] + overviewRadius * 0.82,
      overviewCenter[1] + overviewRadius * 0.62,
      overviewCenter[2] + overviewRadius * 0.95,
    ],
  };
  camera.setPosition(overview.position).setTarget(overview.target);
  let orbit = new ICEOrbitController(engine, camera).start();
  engine.setScene(scene).setCamera(camera).start();

  let motion: AbortController | null = null;
  let selectionBlink: SelectionBlinkHandle | null = null;
  let logicalSelection: readonly string[] = [];
  let programmaticSelectionDepth = 0;
  let view: CameraView = 'overview';
  let disposed = false;
  const selectionListeners = new Set<(ids: readonly string[]) => void>();
  const intentListeners = new Set<() => void>();

  const animate = async (destination: CameraPose): Promise<void> => {
    motion?.abort();
    const controller = new AbortController();
    motion = controller;
    await moveCamera(camera, destination, 420, controller.signal);
    if (controller.signal.aborted || disposed) return;
    orbit.dispose();
    orbit = new ICEOrbitController(engine, camera).start();
  };

  const boundsForArea = (area: string): ICEGeometryBoundsLike | undefined => {
    const items = records.filter((item) => item.metadata?.area === area);
    if (items.length === 0) return undefined;
    return {
      min: [0, 1, 2].map((axis) => Math.min(...items.map((item) => item.bounds.min[axis]!))) as [number, number, number],
      max: [0, 1, 2].map((axis) => Math.max(...items.map((item) => item.bounds.max[axis]!))) as [number, number, number],
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
        position: [overviewCenter[0], overviewCenter[1] + overviewRadius * 1.7, 0.01],
      });
      return;
    }
    if (next === 'area') {
      const areaBounds = boundsForArea('总装车间') ?? overviewBounds;
      const areaCenter = center(areaBounds);
      const areaRadius = radius(areaBounds);
      await animate({
        target: areaCenter,
        position: [areaCenter[0] + areaRadius * 0.95, areaCenter[1] + areaRadius * 0.8, areaCenter[2] + areaRadius * 1.1],
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
          reducedMotion: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false,
        });
  };
  const stopSelectionBlink = (restore = true): void => {
    selectionBlink?.cancel(restore);
    selectionBlink = null;
  };

  const port = {
    records: () => records,
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
        visible: options.visibleViewport?.() ?? { x: 0, y: 0, ...viewport },
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
  const onSelection = (event: { readonly param?: { readonly selection?: readonly string[] } }): void => {
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
  engine.on<{ readonly selection: readonly string[] }>('SELECTION_CHANGE', onSelection);
  engine.on('POINTER_DOWN', cancelAgentMotion);
  engine.on<{ readonly event?: { readonly code?: string } }>('KEY_DOWN', (event) => {
    if (/^(Key[WASD]|Arrow(Up|Down|Left|Right))$/.test(event.param?.event?.code ?? '')) cancelAgentMotion();
  });

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
    whenReady(): Promise<void> {
      return Promise.resolve();
    },
    dispose(): void {
      if (disposed) return;
      disposed = true;
      stopSelectionBlink(false);
      motion?.abort();
      orbit.dispose();
      engine.destroy();
    },
  };
}
