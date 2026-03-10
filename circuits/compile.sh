#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

BUILD_DIR="build"
PTAU="powersOfTau28_hez_final_12.ptau"

mkdir -p "$BUILD_DIR"

# Check dependencies
command -v circom >/dev/null 2>&1 || { echo "circom not found. Install from https://docs.circom.io/"; exit 1; }
command -v snarkjs >/dev/null 2>&1 || { echo "snarkjs not found. Run: npm install -g snarkjs"; exit 1; }

if [ ! -f "$PTAU" ]; then
  echo "Downloading Powers of Tau..."
  curl -L -o "$PTAU" "https://storage.googleapis.com/zkevm/ptau/$PTAU"
fi

compile_and_setup() {
  local CIRCUIT=$1
  echo ""
  echo "============================================"
  echo "  Processing: $CIRCUIT"
  echo "============================================"

  # Compile
  echo "[1/5] Compiling $CIRCUIT.circom..."
  circom "$CIRCUIT.circom" --r1cs --wasm --sym -o "$BUILD_DIR"

  # Phase 2 setup
  echo "[2/5] Generating initial zkey..."
  snarkjs groth16 setup "$BUILD_DIR/$CIRCUIT.r1cs" "$PTAU" "$BUILD_DIR/${CIRCUIT}_0000.zkey"

  # Contribute to phase 2
  echo "[3/5] Contributing to phase 2 ceremony..."
  snarkjs zkey contribute "$BUILD_DIR/${CIRCUIT}_0000.zkey" "$BUILD_DIR/${CIRCUIT}_final.zkey" --name="zkPredict contributor" -v -e="$(head -c 64 /dev/urandom | xxd -p)"

  # Export verification key
  echo "[4/5] Exporting verification key..."
  snarkjs zkey export verificationkey "$BUILD_DIR/${CIRCUIT}_final.zkey" "$BUILD_DIR/${CIRCUIT}_verification_key.json"

  # Generate Solidity verifier
  echo "[5/5] Generating Solidity verifier..."
  local VERIFIER_NAME
  VERIFIER_NAME="$(echo "$CIRCUIT" | sed 's/.*/\u&/')Verifier"
  snarkjs zkey export solidityverifier "$BUILD_DIR/${CIRCUIT}_final.zkey" "../contracts/contracts/${VERIFIER_NAME}.sol"

  echo "Done: $CIRCUIT"
}

# Process each circuit
CIRCUITS="${1:-commitment settlement}"
for circuit in $CIRCUITS; do
  compile_and_setup "$circuit"
done

echo ""
echo "All circuits compiled and setup complete!"
echo "Verifiers generated in contracts/contracts/"
