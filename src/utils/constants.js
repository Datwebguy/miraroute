import { defineChain } from "viem";

// ── Chain config ───────────────────────────────────────────────────────────────

export const CHAIN = {
  ARC_TESTNET_ID:   5042002,
  SEPOLIA_ID:       11155111,
  ARC_RPC:          'https://rpc.testnet.arc.network',
  ARC_EXPLORER:     'https://testnet.arcscan.app',
  SEPOLIA_EXPLORER: 'https://sepolia.etherscan.io',
};

// viem chain definition used by wagmi
export const arcTestnet = defineChain({
  id: 5042002,
  name: 'Arc Testnet',
  nativeCurrency: { name: 'USD Coin', symbol: 'USDC', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://rpc.testnet.arc.network'] },
    public:  { http: ['https://rpc.testnet.arc.network'] },
  },
  blockExplorers: {
    default: { name: 'ArcScan', url: 'https://testnet.arcscan.app' },
  },
  testnet: true,
});

// Backwards-compatible alias
export const ARC_TESTNET = {
  chainId:     5042002,
  name:        'Arc Testnet',
  rpcUrl:      'https://rpc.testnet.arc.network',
  explorer:    'https://testnet.arcscan.app',
  nativeToken: 'USDC',
};

// ── Tokens ─────────────────────────────────────────────────────────────────────
// DECIMAL RULE: parseUnits(amount, 6) for inputs · formatUnits(raw, 6) for display
// NEVER use parseEther / 1e18 / BigInt*10n**18n for USDC or EURC

export const TOKENS = {
  USDC_ARC: {
    address:  '0x3600000000000000000000000000000000000000',
    decimals: 6,
    symbol:   'USDC',
    chain:    5042002,
  },
  EURC_ARC: {
    address:  '0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a',
    decimals: 6,
    symbol:   'EURC',
    chain:    5042002,
  },
  USDC_SEPOLIA: {
    address:  '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
    decimals: 6,
    symbol:   'USDC',
    chain:    11155111,
  },
};

// Backwards-compatible map used by hooks/components
export const CONTRACTS = {
  USDC: TOKENS.USDC_ARC.address,
  EURC: TOKENS.EURC_ARC.address,
};

// ── Contracts ──────────────────────────────────────────────────────────────────

// Verified StableSwapPool on Arc Testnet
// Confirmed via: https://testnet.arcscan.app/tx/0x8cd92b0155bae9479c98d3e613e39cd893787f99d4529a54d56c61ef5508e926
// coins[0] = USDC (i=0), coins[1] = EURC (i=1)
export const STABLE_SWAP_POOL = '0x8c54b8A819b48EaAC277B1634792acCBE9E6219F'; // DEPLOYED LIVE

// Backwards-compatible alias
export const CURVE_USDC_EURC_POOL = STABLE_SWAP_POOL;

// CCTP v2 — same address on Sepolia and Arc
export const CCTP = {
  TOKEN_MESSENGER:     '0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA',
  MESSAGE_TRANSMITTER: '0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275',
  ARC_DOMAIN:          26,
  SEPOLIA_DOMAIN:      0,
};

export const BRIDGE_CONTRACT = CCTP.TOKEN_MESSENGER;

// Kept for backwards compat — approvals now go to pool directly
export const ARC_ADAPTER = '0xBBD70b01a1CAbc96d5b7b129Ae1AAabdf50dd40b';

// ── Helpers ────────────────────────────────────────────────────────────────────

export const getTxUrl = (hash, chain = 'arc') => {
  if (!hash) return null;
  return chain === 'arc'
    ? `https://testnet.arcscan.app/tx/${hash}`
    : `https://sepolia.etherscan.io/tx/${hash}`;
};

export const getAddressUrl = (address) =>
  address ? `https://testnet.arcscan.app/address/${address}` : null;
