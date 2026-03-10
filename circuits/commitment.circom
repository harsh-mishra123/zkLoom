pragma circom 2.0.0;

include "node_modules/circomlib/circuits/poseidon.circom";

template Commitment() {
    // Public inputs
    signal input marketId;
    
    // Private inputs (by default private)
    signal input prediction;
    signal input secret;
    
    // Output
    signal output commitment;
    
    // Prediction must be 0 or 1
    signal predCheck;
    predCheck <== prediction * (1 - prediction);
    predCheck === 0;
    
    // commitment = hash(prediction, secret, marketId)
    component hash1 = Poseidon(2);
    hash1.inputs[0] <== prediction;
    hash1.inputs[1] <== secret;
    
    component hash2 = Poseidon(2);
    hash2.inputs[0] <== hash1.out;
    hash2.inputs[1] <== marketId;
    
    commitment <== hash2.out;
}

component main = Commitment();
