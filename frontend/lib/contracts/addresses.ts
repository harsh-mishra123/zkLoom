export const CONTRACT_ADDRESSES = {
    // Remix se copy kiye gaye addresses
    commitmentVerifier: "0xd8b934580fcE35a11B58C6D73aDeE468a2833fa8",  // CommitmentVerifier ka address
    settlementVerifier: "0xf8e81D47203A594245E36C48e151709F0C19fBe8",  // SettlementVerifier ka address
    market: "0xD7ACd2a9FD159E69Bb102A1ca21C9a3e3A5F771B"               // zkPredictionMarket ka address
} as const;

export const NETWORK_CONFIG = {
    chainId: 11155111,  // Sepolia
    chainName: "Sepolia"
} as const;