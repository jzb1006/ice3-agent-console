export type CameraView = 'overview' | 'area' | 'equipment' | 'top';

export interface EquipmentSummary {
  readonly selectionId: string;
  readonly name: string;
  readonly tag?: string;
  readonly stage?: string;
  readonly area?: string;
  readonly connectionCount?: number;
}

export interface SceneCommand {
  readonly type:
    | 'find'
    | 'select'
    | 'focus'
    | 'highlight'
    | 'camera'
    | 'clear'
    | 'production';
  readonly query?: string;
  readonly selectionIds?: readonly string[];
  readonly area?: string;
  readonly durationMs?: number;
  readonly view?: CameraView;
}

export interface SceneCommandResult {
  readonly ok: boolean;
  readonly selectionIds: readonly string[];
  readonly message: string;
  readonly matches?: readonly {
    readonly selectionId: string;
    readonly name: string;
    readonly tag?: string;
  }[];
}

export interface SceneSnapshot {
  readonly selectedIds: readonly string[];
  readonly view: CameraView;
  readonly cameraPosition: readonly [number, number, number];
  readonly cameraTarget: readonly [number, number, number];
}
