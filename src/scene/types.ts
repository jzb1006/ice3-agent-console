import type {
  CameraView,
  SceneCommand,
  SceneCommandResult,
  SceneSnapshot,
} from '../../shared/scene.js';

export type {
  CameraView,
  SceneCommand,
  SceneCommandResult,
  SceneSnapshot,
} from '../../shared/scene.js';

export interface ICEGeometryBoundsLike {
  readonly min: readonly [number, number, number];
  readonly max: readonly [number, number, number];
}

export interface EquipmentRecord {
  readonly selectionId: string;
  readonly name: string;
  readonly metadata?: Readonly<Record<string, unknown>>;
  readonly bounds: ICEGeometryBoundsLike;
}

export interface ScenePort {
  records(): readonly EquipmentRecord[];
  setSelection(ids: readonly string[]): void;
  focus(bounds: ICEGeometryBoundsLike): Promise<void>;
  setView(view: CameraView): Promise<void>;
  readonly playProduction?: (signal?: AbortSignal) => Promise<void>;
  snapshot(): SceneSnapshot;
}

export interface SceneController extends ScenePort {
  execute(command: SceneCommand, signal?: AbortSignal): Promise<SceneCommandResult>;
  onSelection(listener: (ids: readonly string[]) => void): () => void;
  onUserCameraIntent(listener: () => void): () => void;
  whenReady(): Promise<void>;
  dispose(): void;
}
