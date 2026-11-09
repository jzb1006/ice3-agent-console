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

export type SceneStatusKind = 'loading' | 'ready' | 'error';

export interface SceneStatusUpdate {
  readonly text: string;
  readonly kind: SceneStatusKind;
}

export type SceneStatusListener = (status: SceneStatusUpdate) => void;

export interface EquipmentRecord {
  readonly selectionId: string;
  readonly name: string;
  readonly metadata?: Readonly<Record<string, unknown>>;
  readonly bounds: ICEGeometryBoundsLike;
}

export interface SceneDiagnostics {
  readonly fps: number;
  readonly cpuFrameTimeMs: number;
  readonly backend: 'webgl2' | 'webgpu' | 'fake';
  readonly drawCalls: number;
  readonly renderedMeshes: number;
  readonly renderedBatches: number;
  readonly gpuBytes: number;
  readonly selectionCount: number;
  readonly contextLossCount: number;
  readonly lastPickTimeMs: number;
  readonly lastDiagnostic?: Readonly<{
    readonly severity: 'error' | 'warning' | 'info';
    readonly code: string;
    readonly message: string;
  }>;
}

export interface ScenePort {
  records(): readonly EquipmentRecord[];
  setSelection(ids: readonly string[]): void;
  focus(bounds: ICEGeometryBoundsLike): Promise<void>;
  setView(view: CameraView, area?: string): Promise<void>;
  readonly playProduction?: (signal?: AbortSignal) => Promise<void>;
  snapshot(): SceneSnapshot;
  diagnostics?(): SceneDiagnostics;
}

export interface SceneController extends ScenePort {
  execute(command: SceneCommand, signal?: AbortSignal): Promise<SceneCommandResult>;
  onSelection(listener: (ids: readonly string[]) => void): () => void;
  onUserCameraIntent(listener: () => void): () => void;
  whenReady(): Promise<void>;
  dispose(): void;
}
