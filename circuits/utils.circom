pragma circom 2.0.0;

include "node_modules/circomlib/circuits/poseidon.circom";
include "node_modules/circomlib/circuits/comparators.circom";

// Hash function for commitments
template Hash2() {
    signal input in[2];
    signal output out;

    component poseidon = Poseidon(2);
    poseidon.inputs[0] <== in[0];
    poseidon.inputs[1] <== in[1];
    out <== poseidon.out;
}

// Custom equality check - name changed from IsEqual to CheckEqual
template CheckEqual() {
    signal input a;
    signal input b;
    signal output out;

    component eq = IsEqual();  // using circomlib's IsEqual
    eq.in[0] <== a;
    eq.in[1] <== b;
    out <== eq.out;
}

// Simple boolean check
template ForceEqual() {
    signal input a;
    signal input b;

    a === b;
}

// Main component
component main = Hash2();


