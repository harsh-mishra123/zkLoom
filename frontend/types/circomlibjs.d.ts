declare module 'circomlibjs' {
  export function buildPoseidon(): Promise<{
    (inputs: bigint[]): Uint8Array;
    F: {
      toObject(val: Uint8Array): bigint;
    };
  }>;
}
