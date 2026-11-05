declare module '*.css' {
  const css: string;
  export default css;
}

declare const __ICE_DEMO__: boolean;

interface Window {
  __ICE3_AGENT_CONSOLE__?: {
    send(text: string): Promise<void>;
    selectedIds(): readonly string[];
    snapshot(): {
      selectedIds: readonly string[];
      view: 'overview' | 'area' | 'equipment' | 'top';
      cameraPosition: readonly [number, number, number];
      cameraTarget: readonly [number, number, number];
    };
    assistantMode(): 'scripted' | 'model';
    transportMode(): 'server' | 'local';
    state(): unknown;
  };
}
