import { defineChain } from "viem";

export const arcTestnet = defineChain({
  id: 5042002,
  name: "Arc Testnet",
  nativeCurrency: {
    name: "USD Coin",
    symbol: "USDC",
    decimals: 18,
  },
  rpcUrls: {
    default: { http: [import.meta.env.VITE_ARC_RPC_URL || "https://rpc.testnet.arc.network"] },
    public:  { http: ["https://rpc.testnet.arc.network"] },
  },
  blockExplorers: {
    default: { name: "ArcScan", url: "https://testnet.arcscan.app" },
  },
  testnet: true,
});

export const CONTRACTS = {
  USDC: import.meta.env.VITE_USDC_ADDRESS || "0x3600000000000000000000000000000000000000",
  EURC: import.meta.env.VITE_EURC_ADDRESS || "0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a",
};
