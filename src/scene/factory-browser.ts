import {
  ICE3,
  ICEBasicMaterial,
  ICEBoxGeometry,
  ICEOrbitController,
  ICEPerspectiveCamera,
  ICENode,
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
  SceneStatusListener,
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
  readonly onStatus?: SceneStatusListener;
  readonly onSelection?: (ids: readonly string[]) => void;
  readonly onProductionStage?: (selectionId: string | null) => void;
  readonly onUserCameraIntent?: () => void;
}

export function boundsForEquipment(item: FactoryEquipment): ICEGeometryBoundsLike {
  const [x, y, z] = item.position;
  if (item.tag === 'CONV-101') {
    return {
      min: [x - 2.8, y - 1.55, z - 2.35],
      max: [x + 2.8, y + 1.25, z + 2.35],
    };
  }
  if (item.tag === 'WELD-201') {
    return {
      min: [x - 2.6, y - 1.55, z - 2.9],
      max: [x + 2.6, y + 2.8, z + 2.9],
    };
  }
  if (item.tag === 'PAINT-301') {
    return {
      min: [x - 2.7, y - 1.8, z - 3.2],
      max: [x + 2.7, y + 3.3, z + 3.2],
    };
  }
  if (item.tag === 'OVEN-302') {
    return {
      min: [x - 2.9, y - 1.8, z - 3.05],
      max: [x + 2.9, y + 4.65, z + 3.05],
    };
  }
  if (item.tag === 'TRIM-401') {
    return {
      min: [x - 3.05, y - 1.75, z - 4.9],
      max: [x + 3.05, y + 3.95, z + 3.5],
    };
  }
  if (item.tag === 'QA-501') {
    return {
      min: [x - 2, y - 2.1, z - 3.4],
      max: [x + 2, y + 2.4, z + 3.4],
    };
  }
  if (item.tag === 'EOL-601') {
    return {
      min: [x - 2.6, y - 1.5, z - 2.9],
      max: [x + 2.6, y + 3.2, z + 2.9],
    };
  }
  if (item.tag === 'LOGI-701') {
    return {
      min: [x - 3.4, y - 1.55, z - 3.2],
      max: [x + 3.7, y + 3.6, z + 3.2],
    };
  }
  if (item.tag === 'POWER-402') {
    return {
      min: [x - 2.3, y - 1.7, z - 2.8],
      max: [x + 2.3, y + 3.5, z + 2.1],
    };
  }
  if (item.tag === 'GLASS-403') {
    return {
      min: [x - 2.4, y - 1.55, z - 2.8],
      max: [x + 2.5, y + 3.5, z + 2.8],
    };
  }
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

export function addBodyLoadingStation(
  scene: ICEScene,
  item: FactoryEquipment,
): FactoryStationVisual {
  const [x, y, z] = item.position;
  const parts = new Map<string, ICEMesh>();
  const part = (
    suffix: string,
    size: readonly [number, number, number],
    offset: readonly [number, number, number],
    color: string,
    edgeColor = '#cfe7df',
  ): void => {
    const visualPart = mesh(
      `equipment-${item.tag}-${suffix}`,
      size,
      [x + offset[0], y + offset[1], z + offset[2]],
      color,
      {
        selectionId: item.selectionId,
        edgeColor,
      },
    );
    parts.set(suffix, visualPart);
    scene.addChild(visualPart);
  };

  // The loading station is modeled as a compact assembly so its selection
  // remains one business node while the visual parts explain the process.
  part('pallet', [3.7, 0.18, 4.35], [0, -0.96, 0], '#253b43', '#739391');
  part('pallet-rail-near', [3.45, 0.16, 0.18], [0, -0.77, -1.78], '#d1a83d', '#ffe68b');
  part('pallet-rail-far', [3.45, 0.16, 0.18], [0, -0.77, 1.78], '#d1a83d', '#ffe68b');

  part('body-front', [0.58, 0.68, 2.35], [-1.28, -0.55, 0], '#9fb8b8', '#effff7');
  part('body-rear', [0.58, 0.68, 2.35], [1.28, -0.55, 0], '#91aaa9', '#effff7');
  part('cabin', [1.5, 0.62, 1.65], [-0.18, -0.12, 0], '#456f78', '#a9e2d3');
  part('windshield', [0.16, 0.38, 1.42], [-0.96, -0.08, 0], '#79b5b8', '#d4fff3');
  part('rear-glass', [0.16, 0.32, 1.36], [0.62, -0.06, 0], '#6da3a9', '#c5f5eb');

  const locatorOffsets: readonly (readonly [number, number])[] = [
    [-1.45, -1.3],
    [-1.45, 1.3],
    [1.45, -1.3],
    [1.45, 1.3],
  ];
  locatorOffsets.forEach(([offsetX, offsetZ], index) => {
    part(`locator-${index}`, [0.18, 0.82, 0.18], [offsetX, -0.25, offsetZ], '#c8783e', '#ffd3a6');
    part(`locator-pad-${index}`, [0.34, 0.12, 0.34], [offsetX, 0.18, offsetZ], '#e0ad45', '#ffe9a3');
  });

  part('gantry-left', [0.2, 1.75, 0.2], [-1.82, 0.02, -1.95], '#566f73', '#c5ded5');
  part('gantry-right', [0.2, 1.75, 0.2], [1.82, 0.02, -1.95], '#566f73', '#c5ded5');
  part('gantry-beam', [3.8, 0.2, 0.2], [0, 0.88, -1.95], '#667e80', '#d7eee3');
  part('safety-post-near', [0.22, 0.92, 0.22], [-1.9, -0.38, -2.25], '#d1a83d', '#ffe68b');
  part('safety-post-far', [0.22, 0.92, 0.22], [1.9, -0.38, 2.25], '#d1a83d', '#ffe68b');

  part('status-pole', [0.1, 0.78, 0.1], [1.65, 0.18, -2.02], '#a9c2bb', '#dffff3');
  part('status-red', [0.24, 0.18, 0.24], [1.65, 0.67, -2.02], '#b94d4d', '#ffaaa0');
  part('status-yellow', [0.24, 0.18, 0.24], [1.65, 0.43, -2.02], '#d6aa3f', '#ffe793');
  part('status-green', [0.24, 0.18, 0.24], [1.65, 0.19, -2.02], '#54b58b', '#b1f5d1');
  return { parts };
}

export function addMainConveyorStation(
  scene: ICEScene,
  item: FactoryEquipment,
): FactoryStationVisual {
  const [x, y, z] = item.position;
  const parts = new Map<string, ICEMesh>();
  const part = (
    suffix: string,
    size: readonly [number, number, number],
    offset: readonly [number, number, number],
    color: string,
    edgeColor = '#cfe7df',
  ): void => {
    const visualPart = mesh(
      `equipment-${item.tag}-${suffix}`,
      size,
      [x + offset[0], y + offset[1], z + offset[2]],
      color,
      {
        selectionId: item.selectionId,
        edgeColor,
      },
    );
    parts.set(suffix, visualPart);
    scene.addChild(visualPart);
  };

  // The line segment is a selectable assembly: every visible part keeps the
  // same business identity while the rollers and guarding explain its role.
  part('bed-frame', [5.25, 0.24, 3.55], [0, -0.16, 0], '#314b54', '#789b98');
  part('bed-top', [5.05, 0.12, 3.2], [0, 0.06, 0], '#9eb7b2', '#e2fff4');
  [-2, -1, 0, 1, 2].forEach((offsetX, index) => {
    part(`roller-${index}`, [0.34, 0.18, 3.05], [offsetX, 0.22, 0], '#c4d4cf', '#f1fff8');
  });
  part('guard-near', [5.1, 0.42, 0.18], [0, 0.42, -1.66], '#be9d42', '#ffe89a');
  part('guard-far', [5.1, 0.42, 0.18], [0, 0.42, 1.66], '#be9d42', '#ffe89a');
  part('drive-motor', [0.82, 0.72, 0.82], [1.95, -0.72, -1.82], '#506a72', '#c4e6dc');
  part('drive-coupler', [0.28, 0.28, 1.1], [1.52, -0.28, -1.08], '#d0a640', '#ffeb9b');

  const supportOffsets: readonly (readonly [number, number])[] = [
    [-2.05, -1.38],
    [-2.05, 1.38],
    [2.05, -1.38],
    [2.05, 1.38],
  ];
  supportOffsets.forEach(([offsetX, offsetZ], index) => {
    part(`support-${index}`, [0.24, 1.22, 0.24], [offsetX, -0.84, offsetZ], '#39545a', '#83a8a0');
    part(`support-foot-${index}`, [0.48, 0.12, 0.48], [offsetX, -1.45, offsetZ], '#6f8987', '#b8d8ce');
  });

  part('entry-sensor-left', [0.12, 0.95, 0.12], [-2.36, 0.66, -1.36], '#6b8886', '#bde5d9');
  part('entry-sensor-right', [0.12, 0.95, 0.12], [-2.36, 0.66, 1.36], '#6b8886', '#bde5d9');
  part('entry-sensor-beam', [0.12, 0.12, 2.84], [-2.36, 1.12, 0], '#71918d', '#c9eee2');
  part('status-pole', [0.12, 0.9, 0.12], [1.88, 0.72, 1.92], '#6d8784', '#c4e6da');
  part('status-red', [0.26, 0.18, 0.26], [1.88, 1.25, 1.92], '#bf4e4a', '#ffaaa0');
  part('status-yellow', [0.26, 0.18, 0.26], [1.88, 1.01, 1.92], '#d5a83e', '#ffe99a');
  part('status-green', [0.26, 0.18, 0.26], [1.88, 0.77, 1.92], '#54b58b', '#b1f5d1');
  return { parts };
}

export function addWeldingRobotStation(
  scene: ICEScene,
  item: FactoryEquipment,
): FactoryStationVisual {
  const [x, y, z] = item.position;
  const parts = new Map<string, ICEMesh>();
  const part = (
    suffix: string,
    size: readonly [number, number, number],
    offset: readonly [number, number, number],
    color: string,
    edgeColor = '#cfe7df',
  ): void => {
    const visualPart = mesh(
      `equipment-${item.tag}-${suffix}`,
      size,
      [x + offset[0], y + offset[1], z + offset[2]],
      color,
      {
        selectionId: item.selectionId,
        edgeColor,
      },
    );
    parts.set(suffix, visualPart);
    scene.addChild(visualPart);
  };

  part('island-base', [4.3, 0.24, 5.5], [0, -1.3, 0], '#293e46', '#739692');
  part('weld-table', [2.8, 0.18, 2.4], [0, -0.55, 0.25], '#657f82', '#d8eee3');
  part('fixture-left', [0.18, 0.82, 0.18], [-1.05, -0.1, 0.25], '#d0a744', '#ffea9d');
  part('fixture-right', [0.18, 0.82, 0.18], [1.05, -0.1, 0.25], '#d0a744', '#ffea9d');

  part('safety-post-near', [0.2, 2.4, 0.2], [-2.05, 0.35, -2.45], '#d0a744', '#ffe99c');
  part('safety-post-far', [0.2, 2.4, 0.2], [2.05, 0.35, 2.45], '#d0a744', '#ffe99c');
  part('safety-beam-near', [4.3, 0.2, 0.2], [0, 1.55, -2.45], '#5a7477', '#c9e5db');
  part('safety-beam-far', [4.3, 0.2, 0.2], [0, 1.55, 2.45], '#5a7477', '#c9e5db');

  part('robot-base', [0.85, 0.72, 0.85], [-0.1, 0.05, -1.45], '#bd6844', '#ffd0ac');
  part('robot-arm-lower', [0.34, 1.7, 0.34], [-0.1, 1.15, -1.45], '#d47a48', '#ffd4b0');
  part('robot-arm-upper', [1.8, 0.3, 0.3], [0.45, 2.25, -1.45], '#e18b4f', '#ffe0bc');
  part('weld-torch', [0.26, 0.62, 0.26], [1.25, 1.92, -1.45], '#718e90', '#d4eee3');
  part('weld-spark-0', [0.18, 0.18, 0.18], [1.25, 1.5, -1.45], '#f0c64b', '#fff1a1');
  part('weld-spark-1', [0.14, 0.14, 0.14], [1.48, 1.63, -1.45], '#77d2c0', '#d3fff1');
  part('weld-spark-2', [0.12, 0.12, 0.12], [1.03, 1.68, -1.45], '#f0c64b', '#fff1a1');

  part('status-pole', [0.12, 0.95, 0.12], [1.75, 1.15, 2.05], '#6d8784', '#c4e6da');
  part('status-red', [0.26, 0.18, 0.26], [1.75, 1.68, 2.05], '#bf4e4a', '#ffaaa0');
  part('status-yellow', [0.26, 0.18, 0.26], [1.75, 1.44, 2.05], '#d5a83e', '#ffe99a');
  part('status-green', [0.26, 0.18, 0.26], [1.75, 1.2, 2.05], '#54b58b', '#b1f5d1');
  return { parts };
}

export function addPaintBoothStation(
  scene: ICEScene,
  item: FactoryEquipment,
): FactoryStationVisual {
  const [x, y, z] = item.position;
  const parts = new Map<string, ICEMesh>();
  const part = (
    suffix: string,
    size: readonly [number, number, number],
    offset: readonly [number, number, number],
    color: string,
    edgeColor = '#cfe7df',
  ): void => {
    const visualPart = mesh(
      `equipment-${item.tag}-${suffix}`,
      size,
      [x + offset[0], y + offset[1], z + offset[2]],
      color,
      {
        selectionId: item.selectionId,
        edgeColor,
      },
    );
    parts.set(suffix, visualPart);
    scene.addChild(visualPart);
  };

  part('booth-floor', [5, 0.24, 6], [0, -1.65, 0], '#263d43', '#739692');
  part('wall-left', [0.22, 3.2, 5.8], [-2.4, 0, 0], '#41656b', '#b6e2d6');
  part('wall-right', [0.22, 3.2, 5.8], [2.4, 0, 0], '#41656b', '#b6e2d6');
  part('wall-back', [4.8, 3.2, 0.22], [0, 0, 2.9], '#35575e', '#9dcbc1');
  part('booth-roof', [4.8, 0.22, 5.8], [0, 3.15, 0], '#2d4c53', '#80aaa4');
  part('turntable', [3.2, 0.18, 2.8], [0, -0.3, 0.2], '#778f8d', '#d9eee4');
  part('paint-fixture-left', [0.18, 0.72, 0.18], [-1.15, 0.18, 0.2], '#d1a842', '#ffe998');
  part('paint-fixture-right', [0.18, 0.72, 0.18], [1.15, 0.18, 0.2], '#d1a842', '#ffe998');

  part('gantry-rail', [4.2, 0.18, 0.18], [0, 2.3, -2.25], '#d0a744', '#ffeb9c');
  part('spray-arm', [0.24, 1.9, 0.24], [1.45, 1.35, -2.25], '#6a8c8c', '#c7eee1');
  part('spray-nozzle', [0.3, 0.32, 0.3], [1.45, 0.45, -2.25], '#d28a4e', '#ffdbb5');
  part('paint-mist-0', [0.22, 0.22, 0.22], [1.45, 0.1, -2.25], '#80d6c4', '#d7fff2');
  part('paint-mist-1', [0.16, 0.16, 0.16], [1.15, 0.25, -2.25], '#79c7bd', '#d7fff2');
  part('paint-mist-2', [0.16, 0.16, 0.16], [1.75, 0.25, -2.25], '#79c7bd', '#d7fff2');
  part('curtain-near', [4.6, 2.8, 0.08], [0, 0.1, -2.82], '#315d64', '#8bc7bc');
  part('curtain-far', [4.6, 2.8, 0.08], [0, 0.1, 2.82], '#315d64', '#8bc7bc');

  part('status-pole', [0.12, 0.95, 0.12], [1.9, 1.15, 2.55], '#6d8784', '#c4e6da');
  part('status-red', [0.26, 0.18, 0.26], [1.9, 1.68, 2.55], '#bf4e4a', '#ffaaa0');
  part('status-yellow', [0.26, 0.18, 0.26], [1.9, 1.44, 2.55], '#d5a83e', '#ffe99a');
  part('status-green', [0.26, 0.18, 0.26], [1.9, 1.2, 2.55], '#54b58b', '#b1f5d1');
  return { parts };
}

export function addDryingOvenStation(
  scene: ICEScene,
  item: FactoryEquipment,
): FactoryStationVisual {
  const [x, y, z] = item.position;
  const parts = new Map<string, ICEMesh>();
  const part = (
    suffix: string,
    size: readonly [number, number, number],
    offset: readonly [number, number, number],
    color: string,
    edgeColor = '#cfe7df',
  ): void => {
    const visualPart = mesh(
      `equipment-${item.tag}-${suffix}`,
      size,
      [x + offset[0], y + offset[1], z + offset[2]],
      color,
      {
        selectionId: item.selectionId,
        edgeColor,
      },
    );
    parts.set(suffix, visualPart);
    scene.addChild(visualPart);
  };

  part('oven-floor', [5.4, 0.24, 5.9], [0, -1.55, 0], '#263d43', '#739692');
  part('wall-left', [0.28, 3.2, 5.8], [-2.7, 0, 0], '#6e5646', '#e3c6a9');
  part('wall-right', [0.28, 3.2, 5.8], [2.7, 0, 0], '#6e5646', '#e3c6a9');
  part('roof', [5.4, 0.28, 5.8], [0, 3.02, 0], '#7a604c', '#f1d1ae');
  part('front-header', [5.2, 0.72, 0.3], [0, 2.45, -2.72], '#8d684d', '#f4d1ae');
  part('front-column-left', [0.72, 2.5, 0.3], [-2.25, 0.9, -2.72], '#8d684d', '#f4d1ae');
  part('front-column-right', [0.72, 2.5, 0.3], [2.25, 0.9, -2.72], '#8d684d', '#f4d1ae');
  part('rear-header', [5.2, 0.72, 0.3], [0, 2.45, 2.72], '#765643', '#e8c2a2');
  part('rear-column-left', [0.72, 2.5, 0.3], [-2.25, 0.9, 2.72], '#765643', '#e8c2a2');
  part('rear-column-right', [0.72, 2.5, 0.3], [2.25, 0.9, 2.72], '#765643', '#e8c2a2');

  [-2, -1, 0, 1, 2].forEach((offsetX, index) => {
    part(`roller-${index}`, [0.32, 0.2, 5.15], [offsetX, -0.95, 0], '#c7d6cf', '#f2fff7');
  });
  part('entry-guide-near', [0.18, 0.35, 5.2], [-2.46, -0.42, 0], '#d1a842', '#ffe998');
  part('entry-guide-far', [0.18, 0.35, 5.2], [2.46, -0.42, 0], '#d1a842', '#ffe998');

  [
    [-1.7, 2.64, -1.55],
    [0, 2.64, -1.55],
    [1.7, 2.64, -1.55],
    [-1.7, 2.64, 1.55],
    [0, 2.64, 1.55],
    [1.7, 2.64, 1.55],
  ].forEach(([offsetX, offsetY, offsetZ], index) => {
    part(`heat-glow-${index}`, [0.72, 0.16, 0.24], [offsetX, offsetY, offsetZ], '#e28b4e', '#ffd4a9');
  });
  part('exhaust-stack', [0.72, 1.2, 0.72], [1.75, 3.72, 1.35], '#536d70', '#c8e4db');
  part('exhaust-cap', [1.05, 0.16, 1.05], [1.75, 4.36, 1.35], '#78908e', '#ddf2e9');
  [
    [-0.38, 0, 0],
    [0.38, 0, 0],
    [0, 0, -0.38],
  ].forEach(([offsetX, offsetY, offsetZ], index) => {
    part(`exhaust-fan-${index}`, [0.14, 0.1, 0.72], [1.75 + offsetX, 4.48 + offsetY, 1.35 + offsetZ], '#bad0c9', '#f0fff8');
  });

  part('status-pole', [0.12, 0.95, 0.12], [2.25, 1.15, 2.98], '#6d8784', '#c4e6da');
  part('status-red', [0.26, 0.18, 0.26], [2.25, 1.68, 2.98], '#bf4e4a', '#ffaaa0');
  part('status-yellow', [0.26, 0.18, 0.26], [2.25, 1.44, 2.98], '#d5a83e', '#ffe99a');
  part('status-green', [0.26, 0.18, 0.26], [2.25, 1.2, 2.98], '#54b58b', '#b1f5d1');
  for (let index = 0; index < 6; index += 1) {
    const glow = parts.get(`heat-glow-${index}`);
    if (glow) glow.visible = false;
  }
  return { parts };
}

export function addTrimAssemblyStation(
  scene: ICEScene,
  item: FactoryEquipment,
): FactoryStationVisual {
  const [x, y, z] = item.position;
  const parts = new Map<string, ICEMesh>();
  const part = (
    suffix: string,
    size: readonly [number, number, number],
    offset: readonly [number, number, number],
    color: string,
    edgeColor = '#cfe7df',
  ): void => {
    const visualPart = mesh(
      `equipment-${item.tag}-${suffix}`,
      size,
      [x + offset[0], y + offset[1], z + offset[2]],
      color,
      {
        selectionId: item.selectionId,
        edgeColor,
      },
    );
    parts.set(suffix, visualPart);
    scene.addChild(visualPart);
  };

  part('assembly-floor', [5.7, 0.24, 6], [0, -1.45, 0], '#263d43', '#739692');
  part('body-platform', [4.1, 0.18, 4.4], [0, -0.62, 0], '#708987', '#d9eee4');
  part('dashboard', [0.32, 0.72, 3.5], [-1.55, 0.45, 0], '#536e75', '#c7e9df');
  part('center-console', [1.45, 0.3, 0.72], [-0.05, 0.06, 0], '#687f82', '#d8eee4');
  part('seat-left', [1.1, 0.62, 1.3], [-0.55, -0.02, -0.9], '#3e6970', '#a9e5d6');
  part('seat-right', [1.1, 0.62, 1.3], [-0.55, -0.02, 0.9], '#3e6970', '#a9e5d6');
  part('seat-back-left', [0.26, 0.92, 1.3], [-1.03, 0.58, -0.9], '#31545d', '#91cfc4');
  part('seat-back-right', [0.26, 0.92, 1.3], [-1.03, 0.58, 0.9], '#31545d', '#91cfc4');
  part('door-panel-near', [0.22, 0.88, 2.55], [1.35, 0.08, -2.15], '#58777b', '#c6e6dc');
  part('door-panel-far', [0.22, 0.88, 2.55], [1.35, 0.08, 2.15], '#58777b', '#c6e6dc');

  part('overhead-rail', [5.15, 0.2, 0.22], [0, 3.02, -2.35], '#5c777b', '#c8e7dc');
  part('overhead-beam', [0.22, 0.2, 4.8], [0, 2.8, -2.35], '#728d8c', '#d9f0e5');
  part('lift-frame', [1.85, 0.18, 0.18], [0, 2.45, -2.35], '#d0a744', '#ffeb9c');
  part('lift-cable-left', [0.12, 0.9, 0.12], [-0.68, 1.98, -2.35], '#7a9290', '#d8eee3');
  part('lift-cable-right', [0.12, 0.9, 0.12], [0.68, 1.98, -2.35], '#7a9290', '#d8eee3');

  part('robot-base-left', [0.78, 0.68, 0.78], [1.7, 0.02, -1.55], '#bd6844', '#ffd0ac');
  part('robot-arm-left-lower', [0.3, 1.45, 0.3], [1.7, 0.98, -1.55], '#d47a48', '#ffd4b0');
  part('robot-arm-left-upper', [1.45, 0.3, 0.3], [1.98, 1.78, -1.55], '#e18b4f', '#ffe0bc');
  part('robot-tool-left', [0.28, 0.52, 0.28], [2.55, 1.46, -1.55], '#718e90', '#d4eee3');
  part('robot-base-right', [0.78, 0.68, 0.78], [1.7, 0.02, 1.55], '#bd6844', '#ffd0ac');
  part('robot-arm-right-lower', [0.3, 1.45, 0.3], [1.7, 0.98, 1.55], '#d47a48', '#ffd4b0');
  part('robot-arm-right-upper', [1.45, 0.3, 0.3], [1.98, 1.78, 1.55], '#e18b4f', '#ffe0bc');
  part('robot-tool-right', [0.28, 0.52, 0.28], [2.55, 1.46, 1.55], '#718e90', '#d4eee3');

  part('interior-light-0', [0.36, 0.14, 0.36], [-0.9, 2.5, -1.35], '#7ed2bd', '#d8fff2');
  part('interior-light-1', [0.36, 0.14, 0.36], [-0.9, 2.5, 0], '#7ed2bd', '#d8fff2');
  part('interior-light-2', [0.36, 0.14, 0.36], [-0.9, 2.5, 1.35], '#7ed2bd', '#d8fff2');
  part('assembly-spark-0', [0.16, 0.16, 0.16], [2.55, 1.1, -1.55], '#f0c64b', '#fff1a1');
  part('assembly-spark-1', [0.14, 0.14, 0.14], [2.78, 1.28, -1.55], '#77d2c0', '#d3fff1');
  part('assembly-spark-2', [0.16, 0.16, 0.16], [2.55, 1.1, 1.55], '#f0c64b', '#fff1a1');

  part('status-pole', [0.12, 0.95, 0.12], [2.45, 1.15, 2.95], '#6d8784', '#c4e6da');
  part('status-red', [0.26, 0.18, 0.26], [2.45, 1.68, 2.95], '#bf4e4a', '#ffaaa0');
  part('status-yellow', [0.26, 0.18, 0.26], [2.45, 1.44, 2.95], '#d5a83e', '#ffe99a');
  part('status-green', [0.26, 0.18, 0.26], [2.45, 1.2, 2.95], '#54b58b', '#b1f5d1');
  for (const suffix of ['0', '1', '2']) {
    const spark = parts.get(`assembly-spark-${suffix}`);
    if (spark) spark.visible = false;
  }
  return { parts };
}

export function addQualityInspectionStation(
  scene: ICEScene,
  item: FactoryEquipment,
): FactoryStationVisual {
  const [x, y, z] = item.position;
  const parts = new Map<string, ICEMesh>();
  const part = (
    suffix: string,
    size: readonly [number, number, number],
    offset: readonly [number, number, number],
    color: string,
    edgeColor = '#cfe7df',
  ): void => {
    const visualPart = mesh(
      `equipment-${item.tag}-${suffix}`,
      size,
      [x + offset[0], y + offset[1], z + offset[2]],
      color,
      {
        selectionId: item.selectionId,
        edgeColor,
      },
    );
    parts.set(suffix, visualPart);
    scene.addChild(visualPart);
  };

  part('inspection-floor', [3.8, 0.24, 6.4], [0, -1.7, 0], '#263d43', '#739692');
  part('inspection-bed', [2.9, 0.18, 4.9], [0, -0.95, 0], '#728987', '#d9eee4');
  [-1, -0.5, 0, 0.5, 1].forEach((offsetX, index) => {
    part(`roller-${index}`, [0.24, 0.18, 4.55], [offsetX, -0.72, 0], '#c7d6cf', '#f2fff7');
  });
  part('portal-left', [0.3, 4.1, 5.8], [-1.55, 0, 0], '#514d78', '#c8c5f2');
  part('portal-right', [0.3, 4.1, 5.8], [1.55, 0, 0], '#514d78', '#c8c5f2');
  part('portal-top', [3.4, 0.3, 5.8], [0, 2.05, 0], '#60588a', '#d8d5ff');
  part('camera-rail-near', [2.4, 0.18, 0.18], [0, 1.55, -2.78], '#7b8f9a', '#ddf2e9');
  part('camera-rail-far', [2.4, 0.18, 0.18], [0, 1.55, 2.78], '#7b8f9a', '#ddf2e9');
  part('vision-camera-near', [0.52, 0.46, 0.52], [0, 1.25, -2.9], '#273b4d', '#c4e7e1');
  part('vision-camera-far', [0.52, 0.46, 0.52], [0, 1.25, 2.9], '#273b4d', '#c4e7e1');
  part('camera-lens-near', [0.18, 0.22, 0.3], [0, 1.22, -3.2], '#78c9c0', '#d7fff2');
  part('camera-lens-far', [0.18, 0.22, 0.3], [0, 1.22, 3.2], '#78c9c0', '#d7fff2');

  part('scan-light-0', [0.22, 0.16, 5.2], [-0.86, 1.8, 0], '#7ad5c1', '#d7fff2');
  part('scan-light-1', [0.22, 0.16, 5.2], [0, 1.8, 0], '#7ad5c1', '#d7fff2');
  part('scan-light-2', [0.22, 0.16, 5.2], [0.86, 1.8, 0], '#7ad5c1', '#d7fff2');
  part('scan-beam-0', [0.12, 3.1, 0.12], [-0.9, 0.25, -2.45], '#88e2cd', '#e0fff7');
  part('scan-beam-1', [0.12, 3.1, 0.12], [0.9, 0.25, 2.45], '#88e2cd', '#e0fff7');
  part('inspection-flash-0', [0.18, 0.18, 0.18], [-1.05, 1.1, -2.72], '#f0c64b', '#fff1a1');
  part('inspection-flash-1', [0.18, 0.18, 0.18], [1.05, 1.1, 2.72], '#77d2c0', '#d3fff1');

  part('status-pole', [0.12, 0.95, 0.12], [1.65, 1.05, 3.05], '#6d8784', '#c4e6da');
  part('status-red', [0.26, 0.18, 0.26], [1.65, 1.58, 3.05], '#bf4e4a', '#ffaaa0');
  part('status-yellow', [0.26, 0.18, 0.26], [1.65, 1.34, 3.05], '#d5a83e', '#ffe99a');
  part('status-green', [0.26, 0.18, 0.26], [1.65, 1.1, 3.05], '#54b58b', '#b1f5d1');
  for (const suffix of ['0', '1', '2']) {
    const light = parts.get(`scan-light-${suffix}`);
    if (light) light.visible = false;
  }
  for (const suffix of ['0', '1']) {
    const beam = parts.get(`scan-beam-${suffix}`);
    const flash = parts.get(`inspection-flash-${suffix}`);
    if (beam) beam.visible = false;
    if (flash) flash.visible = false;
  }
  return { parts };
}

export function addEndOfLineTestStation(
  scene: ICEScene,
  item: FactoryEquipment,
): FactoryStationVisual {
  const [x, y, z] = item.position;
  const parts = new Map<string, ICEMesh>();
  const part = (
    suffix: string,
    size: readonly [number, number, number],
    offset: readonly [number, number, number],
    color: string,
    edgeColor = '#cfe7df',
  ): void => {
    const visualPart = mesh(
      `equipment-${item.tag}-${suffix}`,
      size,
      [x + offset[0], y + offset[1], z + offset[2]],
      color,
      {
        selectionId: item.selectionId,
        edgeColor,
      },
    );
    parts.set(suffix, visualPart);
    scene.addChild(visualPart);
  };

  part('test-floor', [4.8, 0.24, 5.4], [0, -1.15, 0], '#263d43', '#739692');
  part('test-platform', [3.7, 0.18, 4], [0, -0.42, 0], '#718886', '#d9eee4');
  [-1.2, -0.6, 0, 0.6, 1.2].forEach((offsetX, index) => {
    part(`roller-${index}`, [0.24, 0.18, 3.8], [offsetX, -0.16, 0], '#c7d6cf', '#f2fff7');
  });
  part('gantry-post-left', [0.28, 2.6, 0.28], [-1.9, 0.6, -2.15], '#806e52', '#ead7ae');
  part('gantry-post-right', [0.28, 2.6, 0.28], [1.9, 0.6, -2.15], '#806e52', '#ead7ae');
  part('gantry-beam', [4.2, 0.24, 0.28], [0, 1.95, -2.15], '#9c8358', '#f4dfb8');
  part('dyno-left', [0.7, 0.3, 1.1], [-1.05, 0.05, -0.85], '#526e79', '#c6e9df');
  part('dyno-right', [0.7, 0.3, 1.1], [1.05, 0.05, 0.85], '#526e79', '#c6e9df');
  part('test-arm-left', [0.22, 1.35, 0.22], [-1.2, 1.08, -1.55], '#c16d45', '#ffd3ad');
  part('test-arm-right', [0.22, 1.35, 0.22], [1.2, 1.08, 1.55], '#c16d45', '#ffd3ad');
  part('test-probe-left', [0.32, 0.32, 0.32], [-1.2, 0.38, -1.55], '#74a29b', '#d6fff1');
  part('test-probe-right', [0.32, 0.32, 0.32], [1.2, 0.38, 1.55], '#74a29b', '#d6fff1');
  part('diagnostic-console', [0.82, 1, 0.62], [2.05, 0.05, -1.82], '#4c6670', '#c5e6dd');
  part('console-screen', [0.52, 0.4, 0.12], [2.05, 0.76, -1.82], '#6dc3bb', '#d7fff2');
  part('test-light-0', [0.24, 0.14, 0.24], [-1.2, 2.03, -2.15], '#7ad5c1', '#d7fff2');
  part('test-light-1', [0.24, 0.14, 0.24], [0, 2.03, -2.15], '#7ad5c1', '#d7fff2');
  part('test-light-2', [0.24, 0.14, 0.24], [1.2, 2.03, -2.15], '#7ad5c1', '#d7fff2');
  part('test-flash-0', [0.18, 0.18, 0.18], [-1.75, 1.1, -2.15], '#f0c64b', '#fff1a1');
  part('test-flash-1', [0.18, 0.18, 0.18], [1.75, 1.1, -2.15], '#77d2c0', '#d3fff1');

  part('status-pole', [0.12, 0.95, 0.12], [2.2, 1.05, 2.55], '#6d8784', '#c4e6da');
  part('status-red', [0.26, 0.18, 0.26], [2.2, 1.58, 2.55], '#bf4e4a', '#ffaaa0');
  part('status-yellow', [0.26, 0.18, 0.26], [2.2, 1.34, 2.55], '#d5a83e', '#ffe99a');
  part('status-green', [0.26, 0.18, 0.26], [2.2, 1.1, 2.55], '#54b58b', '#b1f5d1');
  for (const suffix of ['0', '1', '2']) {
    const light = parts.get(`test-light-${suffix}`);
    if (light) light.visible = false;
  }
  for (const suffix of ['0', '1']) {
    const flash = parts.get(`test-flash-${suffix}`);
    if (flash) flash.visible = false;
  }
  return { parts };
}

export function addFinishedVehicleDockStation(
  scene: ICEScene,
  item: FactoryEquipment,
): FactoryStationVisual {
  const [x, y, z] = item.position;
  const parts = new Map<string, ICEMesh>();
  const part = (
    suffix: string,
    size: readonly [number, number, number],
    offset: readonly [number, number, number],
    color: string,
    edgeColor = '#cfe7df',
  ): void => {
    const visualPart = mesh(
      `equipment-${item.tag}-${suffix}`,
      size,
      [x + offset[0], y + offset[1], z + offset[2]],
      color,
      {
        selectionId: item.selectionId,
        edgeColor,
      },
    );
    parts.set(suffix, visualPart);
    scene.addChild(visualPart);
  };

  part('dock-floor', [5.2, 0.24, 6], [0, -1.25, 0], '#263d43', '#739692');
  part('dock-platform', [4.6, 0.18, 4.5], [0, -0.58, 0], '#718886', '#d9eee4');
  part('outbound-ramp', [2.6, 0.18, 4.8], [2.25, -0.45, 0], '#536b70', '#c6e6dc');
  [-1.4, -0.7, 0, 0.7, 1.4].forEach((offsetX, index) => {
    part(`roller-${index}`, [0.26, 0.18, 4.15], [offsetX, -0.28, 0], '#c7d6cf', '#f2fff7');
  });
  part('dock-post-left', [0.3, 3.1, 0.3], [-2.15, 0.5, -2.55], '#526d72', '#c9e7dd');
  part('dock-post-right', [0.3, 3.1, 0.3], [-2.15, 0.5, 2.55], '#526d72', '#c9e7dd');
  part('dock-roof', [4.8, 0.24, 5.7], [-0.2, 2.25, 0], '#35565e', '#a8d4c8');
  part('dock-beam', [4.3, 0.22, 0.24], [-0.2, 1.95, -2.55], '#6b8586', '#d8efe5');
  part('loading-arm', [0.28, 1.4, 0.28], [-0.7, 1.1, -2.55], '#c48149', '#ffdbb3');
  part('loading-hook', [0.36, 0.32, 0.36], [-0.7, 0.35, -2.55], '#d2a242', '#ffeb9b');
  part('dock-barrier', [0.16, 0.95, 3.9], [1.65, 0.22, 0], '#d0a744', '#ffeb9c');
  part('dispatch-light-0', [0.28, 0.14, 0.28], [-1.35, 2.08, -2.55], '#7ad5c1', '#d7fff2');
  part('dispatch-light-1', [0.28, 0.14, 0.28], [-0.2, 2.08, -2.55], '#7ad5c1', '#d7fff2');
  part('dispatch-light-2', [0.28, 0.14, 0.28], [0.95, 2.08, -2.55], '#7ad5c1', '#d7fff2');
  part('dispatch-flash-0', [0.2, 0.2, 0.2], [1.85, 1.3, -2.55], '#f0c64b', '#fff1a1');
  part('dispatch-flash-1', [0.2, 0.2, 0.2], [1.85, 1.3, 2.55], '#77d2c0', '#d3fff1');
  part('status-pole', [0.12, 0.95, 0.12], [2.1, 1.05, 3], '#6d8784', '#c4e6da');
  part('status-red', [0.26, 0.18, 0.26], [2.1, 1.58, 3], '#bf4e4a', '#ffaaa0');
  part('status-yellow', [0.26, 0.18, 0.26], [2.1, 1.34, 3], '#d5a83e', '#ffe99a');
  part('status-green', [0.26, 0.18, 0.26], [2.1, 1.1, 3], '#54b58b', '#b1f5d1');
  for (const suffix of ['0', '1', '2']) {
    const light = parts.get(`dispatch-light-${suffix}`);
    if (light) light.visible = false;
  }
  for (const suffix of ['0', '1']) {
    const flash = parts.get(`dispatch-flash-${suffix}`);
    if (flash) flash.visible = false;
  }
  return { parts };
}

export function addPowertrainInstallStation(
  scene: ICEScene,
  item: FactoryEquipment,
): FactoryStationVisual {
  const [x, y, z] = item.position;
  const parts = new Map<string, ICEMesh>();
  const part = (
    suffix: string,
    size: readonly [number, number, number],
    offset: readonly [number, number, number],
    color: string,
    edgeColor = '#cfe7df',
  ): void => {
    const visualPart = mesh(
      `equipment-${item.tag}-${suffix}`,
      size,
      [x + offset[0], y + offset[1], z + offset[2]],
      color,
      {
        selectionId: item.selectionId,
        edgeColor,
      },
    );
    parts.set(suffix, visualPart);
    scene.addChild(visualPart);
  };

  part('power-floor', [4.2, 0.24, 3.8], [0, -1.3, 0], '#263d43', '#739692');
  part('power-platform', [3.3, 0.18, 2.8], [0, -0.48, 0], '#718886', '#d9eee4');
  part('engine-block', [1.9, 1.05, 1.55], [0, 0.18, 0], '#526d79', '#c6e9df');
  part('engine-head', [1.45, 0.45, 1.2], [0, 0.95, 0], '#6b8589', '#d7f1e6');
  part('engine-belt', [0.16, 0.72, 1.2], [-1.02, 0.3, 0], '#2b3c45', '#9ab8b2');
  part('mount-bracket-left', [0.22, 0.65, 0.22], [-1.35, 0.18, -0.95], '#d0a744', '#ffeb9c');
  part('mount-bracket-right', [0.22, 0.65, 0.22], [1.35, 0.18, 0.95], '#d0a744', '#ffeb9c');
  [-0.9, 0, 0.9].forEach((offsetX, index) => {
    part(`roller-${index}`, [0.22, 0.18, 2.45], [offsetX, -0.13, 0], '#c7d6cf', '#f2fff7');
  });
  part('lift-post-left', [0.22, 2.7, 0.22], [-1.75, 0.65, -1.25], '#647e81', '#d1ece3');
  part('lift-post-right', [0.22, 2.7, 0.22], [1.75, 0.65, -1.25], '#647e81', '#d1ece3');
  part('lift-rail', [3.7, 0.22, 0.22], [0, 2.12, -1.25], '#7e9691', '#e0f2e9');
  part('lift-beam', [0.22, 0.2, 2.65], [0, 2.45, -1.25], '#d0a744', '#ffeb9c');
  part('lift-cable', [0.12, 1.05, 0.12], [0, 1.65, -1.25], '#7a9290', '#d8eee3');
  part('lift-hook', [0.34, 0.32, 0.34], [0, 1.08, -1.25], '#d2a242', '#ffeb9b');
  part('torque-arm-left', [0.22, 1.05, 0.22], [-1.25, 1.25, 1.15], '#c48149', '#ffdbb3');
  part('torque-arm-right', [0.22, 1.05, 0.22], [1.25, 1.25, -1.15], '#c48149', '#ffdbb3');
  part('torque-tool-left', [0.3, 0.3, 0.3], [-1.25, 0.72, 1.15], '#78a39b', '#d6fff1');
  part('torque-tool-right', [0.3, 0.3, 0.3], [1.25, 0.72, -1.15], '#78a39b', '#d6fff1');
  part('torque-flash-0', [0.16, 0.16, 0.16], [-1.25, 0.5, 1.15], '#f0c64b', '#fff1a1');
  part('torque-flash-1', [0.16, 0.16, 0.16], [1.25, 0.5, -1.15], '#77d2c0', '#d3fff1');
  part('status-pole', [0.12, 0.95, 0.12], [2.05, 1.05, 1.55], '#6d8784', '#c4e6da');
  part('status-red', [0.26, 0.18, 0.26], [2.05, 1.58, 1.55], '#bf4e4a', '#ffaaa0');
  part('status-yellow', [0.26, 0.18, 0.26], [2.05, 1.34, 1.55], '#d5a83e', '#ffe99a');
  part('status-green', [0.26, 0.18, 0.26], [2.05, 1.1, 1.55], '#54b58b', '#b1f5d1');
  for (const suffix of ['0', '1']) {
    const flash = parts.get(`torque-flash-${suffix}`);
    if (flash) flash.visible = false;
  }
  return { parts };
}

export function addGlassDoorInstallStation(
  scene: ICEScene,
  item: FactoryEquipment,
): FactoryStationVisual {
  const [x, y, z] = item.position;
  const parts = new Map<string, ICEMesh>();
  const part = (
    suffix: string,
    size: readonly [number, number, number],
    offset: readonly [number, number, number],
    color: string,
    edgeColor = '#cfe7df',
  ): void => {
    const visualPart = mesh(
      `equipment-${item.tag}-${suffix}`,
      size,
      [x + offset[0], y + offset[1], z + offset[2]],
      color,
      { selectionId: item.selectionId, edgeColor },
    );
    parts.set(suffix, visualPart);
    scene.addChild(visualPart);
  };

  part('glass-floor', [4.6, 0.24, 5], [0, -1.2, 0], '#263d43', '#739692');
  part('glass-platform', [3.8, 0.18, 3.8], [0, -0.46, 0], '#718886', '#d9eee4');
  part('vehicle-cabin', [2.2, 0.85, 1.8], [0, 0.02, 0], '#456f78', '#a9e2d3');
  part('windshield', [0.18, 0.7, 1.55], [-1.1, 0.5, 0], '#79b5b8', '#d4fff3');
  part('rear-glass', [0.18, 0.58, 1.42], [1.05, 0.42, 0], '#6da3a9', '#c5f5eb');
  part('door-frame-near', [1.65, 1.25, 0.16], [0.2, 0.28, -1.05], '#58777b', '#c6e6dc');
  part('door-frame-far', [1.65, 1.25, 0.16], [0.2, 0.28, 1.05], '#58777b', '#c6e6dc');
  part('door-panel-near', [1.2, 0.85, 0.12], [0.35, 0.05, -1.18], '#688b8d', '#d2efe6');
  part('door-panel-far', [1.2, 0.85, 0.12], [0.35, 0.05, 1.18], '#688b8d', '#d2efe6');
  part('gantry-post-left', [0.24, 2.7, 0.24], [-1.85, 0.65, -2.15], '#647e81', '#d1ece3');
  part('gantry-post-right', [0.24, 2.7, 0.24], [1.85, 0.65, -2.15], '#647e81', '#d1ece3');
  part('gantry-rail', [3.9, 0.22, 0.22], [0, 2.12, -2.15], '#7e9691', '#e0f2e9');
  part('gantry-beam', [0.22, 0.2, 2.5], [0, 2.45, -2.15], '#d0a744', '#ffeb9c');
  part('suction-arm-near', [0.2, 1.15, 0.2], [-0.55, 1.55, -2.15], '#c48149', '#ffdbb3');
  part('suction-arm-far', [0.2, 1.15, 0.2], [0.55, 1.55, -2.15], '#c48149', '#ffdbb3');
  part('suction-cup-near', [0.34, 0.24, 0.34], [-0.55, 0.92, -2.15], '#78a39b', '#d6fff1');
  part('suction-cup-far', [0.34, 0.24, 0.34], [0.55, 0.92, -2.15], '#78a39b', '#d6fff1');
  part('install-flash-near', [0.16, 0.16, 0.16], [-0.55, 0.62, -2.15], '#f0c64b', '#fff1a1');
  part('install-flash-far', [0.16, 0.16, 0.16], [0.55, 0.62, -2.15], '#77d2c0', '#d3fff1');
  part('status-pole', [0.12, 0.95, 0.12], [2.1, 1.05, 2.55], '#6d8784', '#c4e6da');
  part('status-red', [0.26, 0.18, 0.26], [2.1, 1.58, 2.55], '#bf4e4a', '#ffaaa0');
  part('status-yellow', [0.26, 0.18, 0.26], [2.1, 1.34, 2.55], '#d5a83e', '#ffe99a');
  part('status-green', [0.26, 0.18, 0.26], [2.1, 1.1, 2.55], '#54b58b', '#b1f5d1');
  for (const suffix of ['near', 'far']) {
    const flash = parts.get(`install-flash-${suffix}`);
    if (flash) flash.visible = false;
  }
  return { parts };
}

function addFactoryEquipment(
  scene: ICEScene,
  stationVisuals: Map<string, FactoryStationVisual>,
): readonly EquipmentRecord[] {
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
    if (item.tag === 'BODY-101') {
      stationVisuals.set(item.tag, addBodyLoadingStation(scene, item));
      scene.addChild(mesh(
        `equipment-${item.tag}`,
        [2.25, 0.42, 2.15],
        [item.position[0], item.position[1] - 0.72, item.position[2]],
        item.color,
        {
          displayName: item.name,
          selectionId: item.selectionId,
          metadata: record.metadata,
          edgeColor: '#effff7',
        },
      ));
    } else if (item.tag === 'CONV-101') {
      stationVisuals.set(item.tag, addMainConveyorStation(scene, item));
    } else if (item.tag === 'WELD-201') {
      stationVisuals.set(item.tag, addWeldingRobotStation(scene, item));
    } else if (item.tag === 'PAINT-301') {
      stationVisuals.set(item.tag, addPaintBoothStation(scene, item));
    } else if (item.tag === 'OVEN-302') {
      stationVisuals.set(item.tag, addDryingOvenStation(scene, item));
    } else if (item.tag === 'TRIM-401') {
      stationVisuals.set(item.tag, addTrimAssemblyStation(scene, item));
    } else if (item.tag === 'QA-501') {
      stationVisuals.set(item.tag, addQualityInspectionStation(scene, item));
    } else if (item.tag === 'EOL-601') {
      stationVisuals.set(item.tag, addEndOfLineTestStation(scene, item));
    } else if (item.tag === 'LOGI-701') {
      stationVisuals.set(item.tag, addFinishedVehicleDockStation(scene, item));
    } else if (item.tag === 'POWER-402') {
      stationVisuals.set(item.tag, addPowertrainInstallStation(scene, item));
    } else if (item.tag === 'GLASS-403') {
      stationVisuals.set(item.tag, addGlassDoorInstallStation(scene, item));
    } else {
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
  }
  return Object.freeze(records);
}

type ProductionVisual = 'material' | 'body' | 'paint' | 'assembly' | 'complete';

interface ProductionStage {
  readonly tag?: string;
  readonly startX: number;
  readonly endX: number;
  readonly durationMs: number;
  readonly holdMs: number;
  readonly visual: ProductionVisual;
}

interface ProductionVehicle {
  readonly root: ICENode;
  readonly material: ICEMesh;
  readonly rawShell: ICEMesh;
  readonly paintedShell: ICEMesh;
  readonly cabin: ICEMesh;
  readonly glass: ICEMesh;
  readonly wheels: readonly ICEMesh[];
  readonly details: readonly ICEMesh[];
}

function translationMatrix(x: number, y = 0, z = 0): readonly [
  number, number, number, number,
  number, number, number, number,
  number, number, number, number,
  number, number, number, number,
] {
  return [
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    x, y, z, 1,
  ];
}

function zRotationMatrix(
  position: readonly [number, number, number],
  angle: number,
): readonly [
  number, number, number, number,
  number, number, number, number,
  number, number, number, number,
  number, number, number, number,
] {
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);
  return [
    cosine, sine, 0, 0,
    -sine, cosine, 0, 0,
    0, 0, 1, 0,
    position[0], position[1], position[2], 1,
  ];
}

export interface FactoryStationVisual {
  readonly parts: ReadonlyMap<string, ICEMesh>;
}

export interface FactoryStationMotion {
  update(progress: number): void;
  reset(): void;
}

export function createBodyStationMotion(
  visual: FactoryStationVisual | undefined,
): FactoryStationMotion {
  const parts = visual?.parts;
  const reset = (): void => {
    for (const part of parts?.values() ?? []) part.clearLocalMatrix();
    const green = parts?.get('status-green');
    const yellow = parts?.get('status-yellow');
    if (green) green.visible = true;
    if (yellow) yellow.visible = true;
  };
  return {
    update(progress: number): void {
      if (!parts) return;
      const beam = parts.get('gantry-beam');
      if (beam) {
        const base = beam.position;
        const lift = 0.28 * Math.sin(progress * Math.PI * 2);
        beam.setLocalMatrix(translationMatrix(base.x, base.y + lift, base.z));
      }
      for (const [index, suffix] of ['0', '1', '2', '3'].entries()) {
        const pad = parts.get(`locator-pad-${suffix}`);
        if (!pad) continue;
        const base = pad.position;
        const bob = 0.08 * Math.sin(progress * Math.PI * 2 + index * Math.PI / 2);
        pad.setLocalMatrix(translationMatrix(base.x, base.y + bob, base.z));
      }
      const green = parts.get('status-green');
      const yellow = parts.get('status-yellow');
      if (green) green.visible = Math.sin(progress * Math.PI * 4) >= 0;
      if (yellow) yellow.visible = !green?.visible;
    },
    reset,
  };
}

export function createConveyorStationMotion(
  visual: FactoryStationVisual | undefined,
): FactoryStationMotion {
  const parts = visual?.parts;
  const reset = (): void => {
    for (const part of parts?.values() ?? []) part.clearLocalMatrix();
    const beam = parts?.get('entry-sensor-beam');
    const green = parts?.get('status-green');
    if (beam) beam.visible = true;
    if (green) green.visible = true;
  };
  return {
    update(progress: number): void {
      if (!parts) return;
      const angle = progress * Math.PI * 8;
      for (let index = 0; index < 5; index += 1) {
        const roller = parts.get(`roller-${index}`);
        if (!roller) continue;
        const base = roller.position;
        roller.setLocalMatrix(zRotationMatrix([base.x, base.y, base.z], angle));
      }
      const beam = parts.get('entry-sensor-beam');
      if (beam) beam.visible = Math.sin(progress * Math.PI * 6) >= -0.2;
      const green = parts.get('status-green');
      if (green) green.visible = Math.sin(progress * Math.PI * 4) >= 0;
    },
    reset,
  };
}

export function createWeldingRobotMotion(
  visual: FactoryStationVisual | undefined,
): FactoryStationMotion {
  const parts = visual?.parts;
  const reset = (): void => {
    for (const part of parts?.values() ?? []) part.clearLocalMatrix();
    for (const suffix of ['0', '1', '2']) {
      const spark = parts?.get(`weld-spark-${suffix}`);
      if (spark) spark.visible = false;
    }
    const green = parts?.get('status-green');
    const yellow = parts?.get('status-yellow');
    if (green) green.visible = true;
    if (yellow) yellow.visible = true;
  };
  return {
    update(progress: number): void {
      if (!parts) return;
      const swing = 0.48 * Math.sin(progress * Math.PI * 2);
      const lowerArm = parts.get('robot-arm-lower');
      if (lowerArm) {
        const base = lowerArm.position;
        lowerArm.setLocalMatrix(zRotationMatrix([base.x, base.y, base.z], swing));
      }
      const upperArm = parts.get('robot-arm-upper');
      if (upperArm) {
        const base = upperArm.position;
        upperArm.setLocalMatrix(zRotationMatrix([base.x, base.y, base.z], -swing * 1.35));
      }
      const torch = parts.get('weld-torch');
      if (torch) {
        const base = torch.position;
        torch.setLocalMatrix(translationMatrix(
          base.x + Math.sin(progress * Math.PI * 2) * 0.22,
          base.y + Math.cos(progress * Math.PI * 2) * 0.12,
          base.z,
        ));
      }
      const sparkActive = Math.sin(progress * Math.PI * 12) > 0.2;
      for (const suffix of ['0', '1', '2']) {
        const spark = parts.get(`weld-spark-${suffix}`);
        if (spark) spark.visible = sparkActive;
      }
      const green = parts.get('status-green');
      const yellow = parts.get('status-yellow');
      if (green) green.visible = Math.sin(progress * Math.PI * 4) >= 0;
      if (yellow) yellow.visible = !green?.visible;
    },
    reset,
  };
}

export function createPaintBoothMotion(
  visual: FactoryStationVisual | undefined,
): FactoryStationMotion {
  const parts = visual?.parts;
  const reset = (): void => {
    for (const part of parts?.values() ?? []) part.clearLocalMatrix();
    for (const suffix of ['0', '1', '2']) {
      const mist = parts?.get(`paint-mist-${suffix}`);
      if (mist) mist.visible = false;
    }
    const green = parts?.get('status-green');
    const yellow = parts?.get('status-yellow');
    if (green) green.visible = true;
    if (yellow) yellow.visible = true;
  };
  return {
    update(progress: number): void {
      if (!parts) return;
      const sweep = Math.sin(progress * Math.PI * 2) * 1.45;
      const rail = parts.get('gantry-rail');
      if (rail) {
        const base = rail.position;
        rail.setLocalMatrix(translationMatrix(base.x, base.y, base.z + sweep));
      }
      const arm = parts.get('spray-arm');
      if (arm) {
        const base = arm.position;
        arm.setLocalMatrix(translationMatrix(base.x, base.y, base.z + sweep));
      }
      const nozzle = parts.get('spray-nozzle');
      if (nozzle) {
        const base = nozzle.position;
        nozzle.setLocalMatrix(translationMatrix(base.x, base.y, base.z + sweep));
      }
      const mistActive = Math.sin(progress * Math.PI * 14) > -0.15;
      for (const suffix of ['0', '1', '2']) {
        const mist = parts.get(`paint-mist-${suffix}`);
        if (mist) mist.visible = mistActive;
      }
      const green = parts.get('status-green');
      const yellow = parts.get('status-yellow');
      if (green) green.visible = Math.sin(progress * Math.PI * 4) >= 0;
      if (yellow) yellow.visible = !green?.visible;
    },
    reset,
  };
}

export function createDryingOvenMotion(
  visual: FactoryStationVisual | undefined,
): FactoryStationMotion {
  const parts = visual?.parts;
  const reset = (): void => {
    for (const part of parts?.values() ?? []) part.clearLocalMatrix();
    for (let index = 0; index < 6; index += 1) {
      const glow = parts?.get(`heat-glow-${index}`);
      if (glow) glow.visible = false;
    }
    const green = parts?.get('status-green');
    const yellow = parts?.get('status-yellow');
    if (green) green.visible = true;
    if (yellow) yellow.visible = true;
  };
  return {
    update(progress: number): void {
      if (!parts) return;
      const rollerAngle = progress * Math.PI * 10;
      for (let index = 0; index < 5; index += 1) {
        const roller = parts.get(`roller-${index}`);
        if (!roller) continue;
        const base = roller.position;
        roller.setLocalMatrix(zRotationMatrix([base.x, base.y, base.z], rollerAngle));
      }
      const fanAngle = -progress * Math.PI * 8;
      for (let index = 0; index < 3; index += 1) {
        const fan = parts.get(`exhaust-fan-${index}`);
        if (!fan) continue;
        const base = fan.position;
        fan.setLocalMatrix(zRotationMatrix([base.x, base.y, base.z], fanAngle));
      }
      const heatActive = Math.sin(progress * Math.PI * 12) > -0.25;
      for (let index = 0; index < 6; index += 1) {
        const glow = parts.get(`heat-glow-${index}`);
        if (glow) glow.visible = heatActive;
      }
      const green = parts.get('status-green');
      const yellow = parts.get('status-yellow');
      if (green) green.visible = Math.sin(progress * Math.PI * 4) >= 0;
      if (yellow) yellow.visible = !green?.visible;
    },
    reset,
  };
}

export function createTrimAssemblyMotion(
  visual: FactoryStationVisual | undefined,
): FactoryStationMotion {
  const parts = visual?.parts;
  const reset = (): void => {
    for (const part of parts?.values() ?? []) part.clearLocalMatrix();
    for (const suffix of ['0', '1', '2']) {
      const spark = parts?.get(`assembly-spark-${suffix}`);
      if (spark) spark.visible = false;
    }
    const green = parts?.get('status-green');
    const yellow = parts?.get('status-yellow');
    if (green) green.visible = true;
    if (yellow) yellow.visible = true;
  };
  return {
    update(progress: number): void {
      if (!parts) return;
      const lift = 0.24 * Math.sin(progress * Math.PI * 2);
      for (const suffix of ['lift-frame', 'lift-cable-left', 'lift-cable-right']) {
        const liftPart = parts.get(suffix);
        if (!liftPart) continue;
        const base = liftPart.position;
        liftPart.setLocalMatrix(translationMatrix(base.x, base.y + lift, base.z));
      }
      const swing = 0.42 * Math.sin(progress * Math.PI * 2);
      for (const [suffix, multiplier] of [
        ['robot-arm-left-lower', 1],
        ['robot-arm-right-lower', -1],
        ['robot-arm-left-upper', -1.2],
        ['robot-arm-right-upper', 1.2],
      ] as const) {
        const arm = parts.get(suffix);
        if (!arm) continue;
        const base = arm.position;
        arm.setLocalMatrix(zRotationMatrix([base.x, base.y, base.z], swing * multiplier));
      }
      for (const [suffix, phase] of [['left', 0], ['right', Math.PI]] as const) {
        const tool = parts.get(`robot-tool-${suffix}`);
        if (!tool) continue;
        const base = tool.position;
        tool.setLocalMatrix(translationMatrix(
          base.x + Math.sin(progress * Math.PI * 2 + phase) * 0.16,
          base.y + Math.cos(progress * Math.PI * 2 + phase) * 0.12,
          base.z,
        ));
      }
      const assemblyActive = Math.sin(progress * Math.PI * 12) > 0.15;
      for (const suffix of ['0', '1', '2']) {
        const spark = parts.get(`assembly-spark-${suffix}`);
        if (spark) spark.visible = assemblyActive;
      }
      const green = parts.get('status-green');
      const yellow = parts.get('status-yellow');
      if (green) green.visible = Math.sin(progress * Math.PI * 4) >= 0;
      if (yellow) yellow.visible = !green?.visible;
    },
    reset,
  };
}

export function createQualityInspectionMotion(
  visual: FactoryStationVisual | undefined,
): FactoryStationMotion {
  const parts = visual?.parts;
  const reset = (): void => {
    for (const part of parts?.values() ?? []) part.clearLocalMatrix();
    for (const suffix of ['0', '1', '2']) {
      const light = parts?.get(`scan-light-${suffix}`);
      if (light) light.visible = false;
    }
    for (const suffix of ['0', '1']) {
      const beam = parts?.get(`scan-beam-${suffix}`);
      const flash = parts?.get(`inspection-flash-${suffix}`);
      if (beam) beam.visible = false;
      if (flash) flash.visible = false;
    }
    const green = parts?.get('status-green');
    const yellow = parts?.get('status-yellow');
    if (green) green.visible = true;
    if (yellow) yellow.visible = true;
  };
  return {
    update(progress: number): void {
      if (!parts) return;
      const sweep = Math.sin(progress * Math.PI * 2) * 0.9;
      for (const suffix of ['0', '1', '2']) {
        const light = parts.get(`scan-light-${suffix}`);
        if (!light) continue;
        const base = light.position;
        light.setLocalMatrix(translationMatrix(base.x + sweep, base.y, base.z));
        light.visible = true;
      }
      for (const suffix of ['near', 'far']) {
        const camera = parts.get(`vision-camera-${suffix}`);
        if (!camera) continue;
        const base = camera.position;
        camera.setLocalMatrix(zRotationMatrix(
          [base.x, base.y, base.z],
          Math.sin(progress * Math.PI * 2) * (suffix === 'near' ? 0.24 : -0.24),
        ));
      }
      const scanActive = Math.sin(progress * Math.PI * 10) > -0.2;
      for (const suffix of ['0', '1']) {
        const beam = parts.get(`scan-beam-${suffix}`);
        const flash = parts.get(`inspection-flash-${suffix}`);
        if (beam) beam.visible = scanActive;
        if (flash) flash.visible = scanActive;
      }
      const green = parts.get('status-green');
      const yellow = parts.get('status-yellow');
      if (green) green.visible = Math.sin(progress * Math.PI * 4) >= 0;
      if (yellow) yellow.visible = !green?.visible;
    },
    reset,
  };
}

export function createEndOfLineTestMotion(
  visual: FactoryStationVisual | undefined,
): FactoryStationMotion {
  const parts = visual?.parts;
  const reset = (): void => {
    for (const part of parts?.values() ?? []) part.clearLocalMatrix();
    for (const suffix of ['0', '1', '2']) {
      const light = parts?.get(`test-light-${suffix}`);
      if (light) light.visible = false;
    }
    for (const suffix of ['0', '1']) {
      const flash = parts?.get(`test-flash-${suffix}`);
      if (flash) flash.visible = false;
    }
    const green = parts?.get('status-green');
    const yellow = parts?.get('status-yellow');
    if (green) green.visible = true;
    if (yellow) yellow.visible = true;
  };
  return {
    update(progress: number): void {
      if (!parts) return;
      const rollerAngle = progress * Math.PI * 10;
      for (let index = 0; index < 5; index += 1) {
        const roller = parts.get(`roller-${index}`);
        if (!roller) continue;
        const base = roller.position;
        roller.setLocalMatrix(zRotationMatrix([base.x, base.y, base.z], rollerAngle));
      }
      const dynoAngle = -progress * Math.PI * 8;
      for (const suffix of ['left', 'right']) {
        const dyno = parts.get(`dyno-${suffix}`);
        if (!dyno) continue;
        const base = dyno.position;
        dyno.setLocalMatrix(zRotationMatrix([base.x, base.y, base.z], dynoAngle));
      }
      const swing = 0.34 * Math.sin(progress * Math.PI * 2);
      for (const [suffix, multiplier] of [['left', 1], ['right', -1]] as const) {
        const arm = parts.get(`test-arm-${suffix}`);
        if (!arm) continue;
        const base = arm.position;
        arm.setLocalMatrix(zRotationMatrix([base.x, base.y, base.z], swing * multiplier));
      }
      const probeLift = 0.12 * Math.sin(progress * Math.PI * 2);
      for (const suffix of ['left', 'right']) {
        const probe = parts.get(`test-probe-${suffix}`);
        if (!probe) continue;
        const base = probe.position;
        probe.setLocalMatrix(translationMatrix(base.x, base.y + probeLift, base.z));
      }
      const testActive = Math.sin(progress * Math.PI * 12) > -0.15;
      for (const suffix of ['0', '1', '2']) {
        const light = parts.get(`test-light-${suffix}`);
        if (light) light.visible = true;
      }
      for (const suffix of ['0', '1']) {
        const flash = parts.get(`test-flash-${suffix}`);
        if (flash) flash.visible = testActive;
      }
      const green = parts.get('status-green');
      const yellow = parts.get('status-yellow');
      if (green) green.visible = Math.sin(progress * Math.PI * 4) >= 0;
      if (yellow) yellow.visible = !green?.visible;
    },
    reset,
  };
}

export function createFinishedVehicleDockMotion(
  visual: FactoryStationVisual | undefined,
): FactoryStationMotion {
  const parts = visual?.parts;
  const reset = (): void => {
    for (const part of parts?.values() ?? []) part.clearLocalMatrix();
    for (const suffix of ['0', '1', '2']) {
      const light = parts?.get(`dispatch-light-${suffix}`);
      if (light) light.visible = false;
    }
    for (const suffix of ['0', '1']) {
      const flash = parts?.get(`dispatch-flash-${suffix}`);
      if (flash) flash.visible = false;
    }
    const green = parts?.get('status-green');
    const yellow = parts?.get('status-yellow');
    if (green) green.visible = true;
    if (yellow) yellow.visible = true;
  };
  return {
    update(progress: number): void {
      if (!parts) return;
      const rollerAngle = progress * Math.PI * 10;
      for (let index = 0; index < 5; index += 1) {
        const roller = parts.get(`roller-${index}`);
        if (!roller) continue;
        const base = roller.position;
        roller.setLocalMatrix(zRotationMatrix([base.x, base.y, base.z], rollerAngle));
      }
      const arm = parts.get('loading-arm');
      if (arm) {
        const base = arm.position;
        arm.setLocalMatrix(zRotationMatrix(
          [base.x, base.y, base.z],
          Math.sin(progress * Math.PI * 2) * 0.35,
        ));
      }
      const hook = parts.get('loading-hook');
      if (hook) {
        const base = hook.position;
        hook.setLocalMatrix(translationMatrix(
          base.x,
          base.y + Math.sin(progress * Math.PI * 2) * 0.18,
          base.z,
        ));
      }
      const barrier = parts.get('dock-barrier');
      if (barrier) {
        const base = barrier.position;
        const lift = Math.max(0, Math.sin(progress * Math.PI * 2)) * 0.72;
        barrier.setLocalMatrix(translationMatrix(base.x, base.y + lift, base.z));
      }
      const dispatchActive = Math.sin(progress * Math.PI * 12) > -0.15;
      for (const suffix of ['0', '1', '2']) {
        const light = parts.get(`dispatch-light-${suffix}`);
        if (light) light.visible = true;
      }
      for (const suffix of ['0', '1']) {
        const flash = parts.get(`dispatch-flash-${suffix}`);
        if (flash) flash.visible = dispatchActive;
      }
      const green = parts.get('status-green');
      const yellow = parts.get('status-yellow');
      if (green) green.visible = Math.sin(progress * Math.PI * 4) >= 0;
      if (yellow) yellow.visible = !green?.visible;
    },
    reset,
  };
}

export function createPowertrainInstallMotion(
  visual: FactoryStationVisual | undefined,
): FactoryStationMotion {
  const parts = visual?.parts;
  const reset = (): void => {
    for (const part of parts?.values() ?? []) part.clearLocalMatrix();
    for (const suffix of ['0', '1']) {
      const flash = parts?.get(`torque-flash-${suffix}`);
      if (flash) flash.visible = false;
    }
    const green = parts?.get('status-green');
    const yellow = parts?.get('status-yellow');
    if (green) green.visible = true;
    if (yellow) yellow.visible = true;
  };
  return {
    update(progress: number): void {
      if (!parts) return;
      const rollerAngle = progress * Math.PI * 10;
      for (let index = 0; index < 3; index += 1) {
        const roller = parts.get(`roller-${index}`);
        if (!roller) continue;
        const base = roller.position;
        roller.setLocalMatrix(zRotationMatrix([base.x, base.y, base.z], rollerAngle));
      }
      const lift = 0.28 * Math.sin(progress * Math.PI * 2);
      for (const suffix of ['lift-beam', 'lift-cable', 'lift-hook']) {
        const liftPart = parts.get(suffix);
        if (!liftPart) continue;
        const base = liftPart.position;
        liftPart.setLocalMatrix(translationMatrix(base.x, base.y + lift, base.z));
      }
      const torqueSwing = 0.3 * Math.sin(progress * Math.PI * 2);
      for (const [suffix, multiplier] of [['left', 1], ['right', -1]] as const) {
        const arm = parts.get(`torque-arm-${suffix}`);
        if (!arm) continue;
        const base = arm.position;
        arm.setLocalMatrix(zRotationMatrix([base.x, base.y, base.z], torqueSwing * multiplier));
      }
      const toolLift = 0.1 * Math.cos(progress * Math.PI * 2);
      for (const suffix of ['left', 'right']) {
        const tool = parts.get(`torque-tool-${suffix}`);
        if (!tool) continue;
        const base = tool.position;
        tool.setLocalMatrix(translationMatrix(base.x, base.y + toolLift, base.z));
      }
      const torqueActive = Math.sin(progress * Math.PI * 12) > -0.15;
      for (const suffix of ['0', '1']) {
        const flash = parts.get(`torque-flash-${suffix}`);
        if (flash) flash.visible = torqueActive;
      }
      const green = parts.get('status-green');
      const yellow = parts.get('status-yellow');
      if (green) green.visible = Math.sin(progress * Math.PI * 4) >= 0;
      if (yellow) yellow.visible = !green?.visible;
    },
    reset,
  };
}

export function createGlassDoorInstallMotion(
  visual: FactoryStationVisual | undefined,
): FactoryStationMotion {
  const parts = visual?.parts;
  const reset = (): void => {
    for (const part of parts?.values() ?? []) part.clearLocalMatrix();
    for (const suffix of ['near', 'far']) {
      const flash = parts?.get(`install-flash-${suffix}`);
      if (flash) flash.visible = false;
    }
    const green = parts?.get('status-green');
    const yellow = parts?.get('status-yellow');
    if (green) green.visible = true;
    if (yellow) yellow.visible = true;
  };
  return {
    update(progress: number): void {
      if (!parts) return;
      const armSwing = 0.28 * Math.sin(progress * Math.PI * 2);
      for (const [suffix, multiplier] of [['near', 1], ['far', -1]] as const) {
        const arm = parts.get(`suction-arm-${suffix}`);
        if (arm) {
          const base = arm.position;
          arm.setLocalMatrix(zRotationMatrix([base.x, base.y, base.z], armSwing * multiplier));
        }
        const cup = parts.get(`suction-cup-${suffix}`);
        if (cup) {
          const base = cup.position;
          cup.setLocalMatrix(translationMatrix(
            base.x,
            base.y + 0.12 * Math.sin(progress * Math.PI * 2 + (multiplier < 0 ? Math.PI : 0)),
            base.z,
          ));
        }
      }
      const vehicle = parts.get('vehicle-cabin');
      if (vehicle) {
        const base = vehicle.position;
        vehicle.setLocalMatrix(translationMatrix(base.x + 0.08 * Math.sin(progress * Math.PI * 2), base.y, base.z));
      }
      const active = Math.sin(progress * Math.PI * 12) > -0.15;
      for (const suffix of ['near', 'far']) {
        const flash = parts.get(`install-flash-${suffix}`);
        if (flash) flash.visible = active;
      }
      const green = parts.get('status-green');
      const yellow = parts.get('status-yellow');
      if (green) green.visible = Math.sin(progress * Math.PI * 4) >= 0;
      if (yellow) yellow.visible = !green?.visible;
    },
    reset,
  };
}

function createProductionVehicle(scene: ICEScene): ProductionVehicle {
  const root = new ICENode({
    id: 'production-run-vehicle',
    displayName: '整车生产流车辆',
  });
  const material = mesh(
    'production-material-coil',
    [1.4, 0.75, 1.4],
    [0, 0.45, 0],
    '#a9b7b2',
    { edgeColor: '#f1fff7' },
  );
  const rawShell = mesh(
    'production-raw-shell',
    [3.7, 0.78, 1.85],
    [0, 0.55, 0],
    '#82979a',
    { edgeColor: '#d5ebe4' },
  );
  const paintedShell = mesh(
    'production-painted-shell',
    [3.7, 0.78, 1.85],
    [0, 0.55, 0],
    '#2f7891',
    { edgeColor: '#b5f2e5' },
  );
  const cabin = mesh(
    'production-cabin',
    [1.65, 0.7, 1.55],
    [-0.18, 1.2, 0],
    '#24505e',
    { edgeColor: '#a8e8df' },
  );
  const glass = mesh(
    'production-glass',
    [0.12, 0.4, 1.35],
    [-0.98, 1.18, 0],
    '#8ed5d1',
    { edgeColor: '#e0fff8' },
  );
  const wheels = [-1.25, 1.25].flatMap((x) => (
    [-0.92, 0.92].map((z, index) => mesh(
      `production-wheel-${x}-${index}`,
      [0.42, 0.46, 0.28],
      [x, 0.18, z],
      '#1b2528',
      { edgeColor: '#78908f' },
    ))
  ));
  const details = [
    mesh('production-front-bumper', [0.18, 0.34, 1.75], [-1.88, 0.48, 0], '#d5b34c', { edgeColor: '#fff2a6' }),
    mesh('production-roof-light', [0.3, 0.12, 0.3], [0.36, 1.66, -0.3], '#55c38d', { edgeColor: '#c6ffe1' }),
  ];
  root.addChild(material);
  root.addChild(rawShell);
  root.addChild(paintedShell);
  root.addChild(cabin);
  root.addChild(glass);
  wheels.forEach((wheel) => root.addChild(wheel));
  details.forEach((detail) => root.addChild(detail));
  const vehicle = {
    root,
    material,
    rawShell,
    paintedShell,
    cabin,
    glass,
    wheels,
    details,
  } satisfies ProductionVehicle;
  setProductionVisual(vehicle, 'material');
  root.setLocalMatrix(translationMatrix(-30));
  scene.addChild(root);
  return vehicle;
}

function setProductionVisual(vehicle: ProductionVehicle, visual: ProductionVisual): void {
  vehicle.material.visible = visual === 'material';
  vehicle.rawShell.visible = visual === 'body';
  vehicle.paintedShell.visible = ['paint', 'assembly', 'complete'].includes(visual);
  vehicle.cabin.visible = ['paint', 'assembly', 'complete'].includes(visual);
  vehicle.glass.visible = ['assembly', 'complete'].includes(visual);
  vehicle.wheels.forEach((wheel) => {
    wheel.visible = ['assembly', 'complete'].includes(visual);
  });
  vehicle.details.forEach((detail) => {
    detail.visible = visual === 'complete';
  });
}

function createProductionAnimation(
  engine: ICE3,
  vehicle: ProductionVehicle,
  findSelectionId: (tag: string) => string | undefined,
  onStage: (selectionId: string | null) => void,
  stationVisuals: ReadonlyMap<string, FactoryStationVisual>,
): { play(signal?: AbortSignal): Promise<void>; cancel(): void; dispose(): void } {
  const stages: readonly ProductionStage[] = [
    { startX: -30, endX: -23, durationMs: 1_000, holdMs: 850, visual: 'material' },
    { tag: 'BODY-101', startX: -23, endX: -18, durationMs: 1_150, holdMs: 1_350, visual: 'body' },
    { tag: 'CONV-101', startX: -18, endX: -12, durationMs: 1_150, holdMs: 1_350, visual: 'body' },
    { tag: 'WELD-201', startX: -12, endX: -5, durationMs: 1_000, holdMs: 900, visual: 'body' },
    { tag: 'PAINT-301', startX: -5, endX: 2, durationMs: 1_000, holdMs: 1_000, visual: 'paint' },
    { tag: 'OVEN-302', startX: 2, endX: 8, durationMs: 950, holdMs: 900, visual: 'paint' },
    { tag: 'TRIM-401', startX: 8, endX: 17, durationMs: 1_100, holdMs: 1_100, visual: 'assembly' },
    { tag: 'POWER-402', startX: 17, endX: 18, durationMs: 950, holdMs: 900, visual: 'assembly' },
    { tag: 'GLASS-403', startX: 18, endX: 22, durationMs: 1_000, holdMs: 950, visual: 'assembly' },
    { tag: 'QA-501', startX: 22, endX: 29, durationMs: 1_100, holdMs: 1_100, visual: 'complete' },
    { tag: 'EOL-601', startX: 29, endX: 34, durationMs: 1_000, holdMs: 1_000, visual: 'complete' },
    { tag: 'LOGI-701', startX: 34, endX: 38, durationMs: 1_000, holdMs: 1_250, visual: 'complete' },
  ];
  const stationMotions = new Map<string, FactoryStationMotion>([
    ['BODY-101', createBodyStationMotion(stationVisuals.get('BODY-101'))],
    ['CONV-101', createConveyorStationMotion(stationVisuals.get('CONV-101'))],
    ['WELD-201', createWeldingRobotMotion(stationVisuals.get('WELD-201'))],
    ['PAINT-301', createPaintBoothMotion(stationVisuals.get('PAINT-301'))],
    ['OVEN-302', createDryingOvenMotion(stationVisuals.get('OVEN-302'))],
    ['TRIM-401', createTrimAssemblyMotion(stationVisuals.get('TRIM-401'))],
    ['QA-501', createQualityInspectionMotion(stationVisuals.get('QA-501'))],
    ['EOL-601', createEndOfLineTestMotion(stationVisuals.get('EOL-601'))],
    ['LOGI-701', createFinishedVehicleDockMotion(stationVisuals.get('LOGI-701'))],
    ['POWER-402', createPowertrainInstallMotion(stationVisuals.get('POWER-402'))],
    ['GLASS-403', createGlassDoorInstallMotion(stationVisuals.get('GLASS-403'))],
  ]);
  let active: AbortController | null = null;
  let disposed = false;
  let runGeneration = 0;

  const sleep = (milliseconds: number): Promise<void> => new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });

  const play = async (externalSignal?: AbortSignal): Promise<void> => {
    if (disposed) return;
    active?.abort();
    runGeneration += 1;
    const generation = runGeneration;
    const controller = new AbortController();
    active = controller;
    const abortFromOutside = (): void => controller.abort();
    externalSignal?.addEventListener('abort', abortFromOutside, { once: true });
    vehicle.root.visible = true;
    setProductionVisual(vehicle, 'material');
    vehicle.root.setLocalMatrix(translationMatrix(stages[0]!.startX));
    stationMotions.forEach((motion) => motion.reset());
    onStage(null);

    try {
      for (const stage of stages) {
        if (controller.signal.aborted || disposed) return;
        stationMotions.forEach((motion, tag) => {
          if (tag !== stage.tag) motion.reset();
        });
        setProductionVisual(vehicle, stage.visual);
        onStage(stage.tag ? findSelectionId(stage.tag) ?? null : null);
        const startedAt = performance.now();
        while (true) {
          if (controller.signal.aborted || disposed) return;
          const progress = Math.min(1, (performance.now() - startedAt) / stage.durationMs);
          const eased = progress * progress * (3 - 2 * progress);
          vehicle.root.setLocalMatrix(translationMatrix(
            stage.startX + (stage.endX - stage.startX) * eased,
          ));
          if (stage.tag) stationMotions.get(stage.tag)?.update(progress);
          engine.requestRender('production-animation');
          if (progress >= 1) break;
          await sleep(16);
        }
        const holdStartedAt = performance.now();
        while (performance.now() - holdStartedAt < stage.holdMs) {
          if (controller.signal.aborted || disposed) return;
          const holdProgress = ((performance.now() - holdStartedAt) % 1_200) / 1_200;
          if (stage.tag) stationMotions.get(stage.tag)?.update(holdProgress);
          engine.requestRender('production-hold');
          await sleep(16);
        }
      }
    } finally {
      if (generation === runGeneration) {
        stationMotions.forEach((motion) => motion.reset());
      }
      externalSignal?.removeEventListener('abort', abortFromOutside);
      if (active === controller) active = null;
    }
  };

  return {
    play,
    cancel(): void {
      active?.abort();
      active = null;
      runGeneration += 1;
      stationMotions.forEach((motion) => motion.reset());
    },
    dispose(): void {
      disposed = true;
      active?.abort();
      active = null;
      runGeneration += 1;
      stationMotions.forEach((motion) => motion.reset());
      vehicle.root.dispose();
    },
  };
}

interface StationPreviewAnimation {
  play(tag: string): void;
  cancel(): void;
  dispose(): void;
}

function createStationPreviewAnimation(
  engine: ICE3,
  stationVisuals: ReadonlyMap<string, FactoryStationVisual>,
): StationPreviewAnimation {
  const stationMotions = new Map<string, FactoryStationMotion>([
    ['BODY-101', createBodyStationMotion(stationVisuals.get('BODY-101'))],
    ['CONV-101', createConveyorStationMotion(stationVisuals.get('CONV-101'))],
    ['WELD-201', createWeldingRobotMotion(stationVisuals.get('WELD-201'))],
    ['PAINT-301', createPaintBoothMotion(stationVisuals.get('PAINT-301'))],
    ['OVEN-302', createDryingOvenMotion(stationVisuals.get('OVEN-302'))],
    ['TRIM-401', createTrimAssemblyMotion(stationVisuals.get('TRIM-401'))],
    ['QA-501', createQualityInspectionMotion(stationVisuals.get('QA-501'))],
    ['EOL-601', createEndOfLineTestMotion(stationVisuals.get('EOL-601'))],
    ['LOGI-701', createFinishedVehicleDockMotion(stationVisuals.get('LOGI-701'))],
    ['POWER-402', createPowertrainInstallMotion(stationVisuals.get('POWER-402'))],
    ['GLASS-403', createGlassDoorInstallMotion(stationVisuals.get('GLASS-403'))],
  ]);
  const durationByTag: ReadonlyMap<string, number> = new Map([
    ['BODY-101', 1_400],
    ['CONV-101', 1_400],
    ['WELD-201', 1_700],
    ['PAINT-301', 1_800],
    ['OVEN-302', 1_800],
    ['TRIM-401', 1_900],
    ['QA-501', 2_000],
    ['EOL-601', 1_900],
    ['LOGI-701', 1_900],
    ['POWER-402', 1_900],
    ['GLASS-403', 1_900],
  ]);
  let active: {
    readonly controller: AbortController;
    readonly motion: FactoryStationMotion;
    timer: ReturnType<typeof setTimeout> | null;
  } | null = null;
  let disposed = false;

  const cancel = (): void => {
    if (!active) return;
    active.controller.abort();
    if (active.timer !== null) clearTimeout(active.timer);
    active.motion.reset();
    active = null;
    engine.requestRender('station-preview-cancel');
  };

  return {
    play(tag: string): void {
      const motion = stationMotions.get(tag);
      const duration = durationByTag.get(tag);
      if (!motion || duration === undefined || disposed) return;
      cancel();
      const run = {
        controller: new AbortController(),
        motion,
        timer: null as ReturnType<typeof setTimeout> | null,
      };
      active = run;
      motion.reset();
      const startedAt = performance.now();
      const tick = (): void => {
        if (disposed || active !== run || run.controller.signal.aborted) return;
        const progress = Math.min(1, (performance.now() - startedAt) / duration);
        motion.update(progress);
        engine.requestRender('station-preview-animation');
        if (progress >= 1) {
          motion.reset();
          active = null;
          engine.requestRender('station-preview-complete');
          return;
        }
        run.timer = setTimeout(tick, 16);
      };
      tick();
    },
    cancel,
    dispose(): void {
      disposed = true;
      cancel();
      stationMotions.forEach((motion) => motion.reset());
    },
  };
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
  options.onStatus?.({ text: '正在构建参数化场景', kind: 'loading' });
  const engine = await new ICE3({ renderer: 'webgl2' }).initAsync(options.stage);
  engine.setBackgroundColor('#071317');
  const scene = new ICEScene({ id: 'automotive-factory-scene' });
  addFactoryDecor(scene);
  const stationVisuals = new Map<string, FactoryStationVisual>();
  const records = addFactoryEquipment(scene, stationVisuals);
  const productionVehicle = createProductionVehicle(scene);
  const selectionIdForTag = (tag: string): string | undefined => (
    records.find((record) => record.metadata?.equipmentTag === tag)?.selectionId
  );
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
  const productionAnimation = createProductionAnimation(
    engine,
    productionVehicle,
    selectionIdForTag,
    (selectionId) => {
      logicalSelection = selectionId ? [selectionId] : [];
      applyProgrammaticSelection(logicalSelection);
      options.onProductionStage?.(selectionId);
    },
    stationVisuals,
  );
  const stationPreviewAnimation = createStationPreviewAnimation(engine, stationVisuals);
  const tagForSelectionId = (selectionId: string): string | undefined => {
    const tag = records.find((record) => record.selectionId === selectionId)?.metadata?.equipmentTag;
    return typeof tag === 'string' ? tag : undefined;
  };

  const port = {
    records: () => records,
    setSelection(ids: readonly string[]): void {
      stationPreviewAnimation.cancel();
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
    async playProduction(signal?: AbortSignal): Promise<void> {
      stationPreviewAnimation.cancel();
      stopSelectionBlink(false);
      if (signal?.aborted) return;
      await setView('overview');
      if (signal?.aborted) return;
      await productionAnimation.play(signal);
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
    productionAnimation.cancel();
    stationPreviewAnimation.cancel();
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
    const selectedTag = ids[0] ? tagForSelectionId(ids[0]) : undefined;
    if (
      selectedTag === 'BODY-101'
      || selectedTag === 'CONV-101'
      || selectedTag === 'WELD-201'
      || selectedTag === 'PAINT-301'
      || selectedTag === 'OVEN-302'
      || selectedTag === 'TRIM-401'
      || selectedTag === 'QA-501'
      || selectedTag === 'EOL-601'
      || selectedTag === 'LOGI-701'
      || selectedTag === 'POWER-402'
      || selectedTag === 'GLASS-403'
    ) {
      stationPreviewAnimation.play(selectedTag);
    } else {
      stationPreviewAnimation.cancel();
    }
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
    playProduction: port.playProduction,
    snapshot: port.snapshot,
    execute(command: SceneCommand, signal?: AbortSignal): Promise<SceneCommandResult> {
      return executor.execute(command, signal);
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
      productionAnimation.dispose();
      stationPreviewAnimation.dispose();
      motion?.abort();
      orbit.dispose();
      engine.destroy();
    },
  };
}
