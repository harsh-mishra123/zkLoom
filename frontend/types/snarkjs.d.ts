declare module 'snarkjs' {
  export const groth16: {
    fullProve(
      input: Record<string, string>,
      wasmFile: string,
      zkeyFile: string,
    ): Promise<{ proof: unknown; publicSignals: string[] }>;
    exportSolidityCallData(
      proof: unknown,
      publicSignals: string[],
    ): Promise<string>;
    verify(
      vkey: unknown,
      publicSignals: string[],
      proof: unknown,
    ): Promise<boolean>;
  };
}
