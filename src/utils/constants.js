import { defineChain } from "viem";

// ── Chain ──────────────────────────────────────────────────────────────────────

export const ARC_TESTNET = {
  chainId:    5042002,
  name:       'Arc Testnet',
  rpcUrl:     'https://5042002.rpc.thirdweb.com',
  explorer:   'https://testnet.arcscan.app',
  nativeToken: 'USDC',
};

// viem chain definition used by wagmi — kept for backwards compatibility
export const arcTestnet = defineChain({
  id: 5042002,
  name: "Arc Testnet",
  nativeCurrency: {
    name: "USD Coin",
    symbol: "USDC",
    decimals: 18,
  },
  rpcUrls: {
    default: { http: [import.meta.env.VITE_ARC_RPC_URL || "https://5042002.rpc.thirdweb.com"] },
    public:  { http: ["https://5042002.rpc.thirdweb.com"] },
  },
  blockExplorers: {
    default: { name: "ArcScan", url: "https://testnet.arcscan.app" },
  },
  testnet: true,
});

// ── Tokens ─────────────────────────────────────────────────────────────────────

export const TOKENS = {
  USDC: { address: '0x3600000000000000000000000000000000000000', decimals: 6, symbol: 'USDC', name: 'USD Coin' },
  EURC: { address: '0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a', decimals: 6, symbol: 'EURC', name: 'Euro Coin' },
};

// Backwards-compatible map used by existing hooks/components
export const CONTRACTS = {
  USDC: TOKENS.USDC.address,
  EURC: TOKENS.EURC.address,
};

// ── Circle contracts ───────────────────────────────────────────────────────────

// Circle App Kit adapter — spender for ERC-20 approvals on Arc Testnet
export const ARC_ADAPTER = "0xBBD70b01a1CAbc96d5b7b129Ae1AAabdf50dd40b";

// CCTP v2 contracts
export const CCTP = {
  TOKEN_MESSENGER:     '0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA',
  MESSAGE_TRANSMITTER: '0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275',
  ARC_DOMAIN:          26,
};

// Backwards-compatible alias
export const BRIDGE_CONTRACT = CCTP.TOKEN_MESSENGER;

// ── Helpers ────────────────────────────────────────────────────────────────────

export const getTxUrl = (hash, explorer = ARC_TESTNET.explorer) =>
  hash ? `${explorer}/tx/${hash}` : null;
