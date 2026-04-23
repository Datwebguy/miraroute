/**
 * wagmi.js — MiraRoute chain configuration
 *
 * IMPORTANT: This file uses wagmi's native `createConfig` + `injected` / `walletConnect`
 * connectors DIRECTLY — NOT RainbowKit's wrapper functions (getDefaultConfig,
 * connectorsForWallets). Those wrappers silently inject Thirdweb RPCs via the
 * WalletConnect / RainbowKit SDK, causing "Failed to fetch" errors on Sepolia.
 *
 * By using wagmi's own connectors, we get ZERO hidden RPC injection.
 * RainbowKitProvider still works fine — it reads chains from the wagmiConfig.
 */
import { createConfig, http } from "wagmi";
import { injected, walletConnect, coinbaseWallet } from "wagmi/connectors";
import { sepolia } from "wagmi/chains";
import { arcTestnet, CHAIN } from "./utils/constants";

const PROJECT_ID = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID;

// ── Connectors ────────────────────────────────────────────────────────────────
// wagmi native connectors — no Thirdweb injection from any RainbowKit wrapper.
const connectors = [
  injected(),                                      // MetaMask, Rabby, Brave, etc.
  walletConnect({ projectId: PROJECT_ID }),        // WalletConnect v2 (mobile)
  coinbaseWallet({ appName: "MiraRoute" }),        // Coinbase Wallet
];

// ── Config ────────────────────────────────────────────────────────────────────
// Explicit single http() transport per chain — no fallback(), no ranking,
// no way for any library to inject a secondary Thirdweb URL.
export const wagmiConfig = createConfig({
  connectors,
  chains: [arcTestnet, sepolia],
  transports: {
    [arcTestnet.id]: http(CHAIN.ARC_RPC),
    [sepolia.id]:   http("https://ethereum-sepolia-rpc.publicnode.com"),
  },
  ssr: false,
});
