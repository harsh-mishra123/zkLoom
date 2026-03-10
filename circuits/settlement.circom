pragma circom 2.0.0;

include "node_modules/circomlib/circuits/poseidon.circom";
include "node_modules/circomlib/circuits/comparators.circom";

template Settlement() {
    // Public inputs
    signal input commitment;
    signal input marketOutcome;
    signal input marketId;           // Add this!
    
    // Private inputs
    signal input prediction;
    signal input secret;
    
    // Output
    signal output isWinner;
    
    // 1. Verify commitment matches
    component hash1 = Poseidon(2);
    hash1.inputs[0] <== prediction;
    hash1.inputs[1] <== secret;
    
    component hash2 = Poseidon(2);
    hash2.inputs[0] <== hash1.out;
    hash2.inputs[1] <== marketId;
    
    // Check: hash2.out == commitment
    hash2.out === commitment;
    
    // 2. Check if prediction == marketOutcome
    component isEqual = IsEqual();
    isEqual.in[0] <== prediction;
    isEqual.in[1] <== marketOutcome;
    
    // 3. Set isWinner
    isWinner <== isEqual.out;
}

component main {public [commitment, marketOutcome, marketId]} = Settlement();