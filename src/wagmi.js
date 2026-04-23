import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { sepolia } from "wagmi/chains";
import { http, fallback } from "wagmi";
import { arcTestnet, CHAIN } from "./utils/constants";

// ── RPC overrides ─────────────────────────────────────────────────────────────
// RainbowKit's getDefaultConfig injects Thirdweb RPCs for every chain.
// Using fallback({ rank: false }) forces our listed RPCs to be used in order
// and prevents Thirdweb from being re-ranked to the top.
const SEPOLIA_TRANSPORTS = fallback(
  [
    http('https://ethereum-sepolia-rpc.publicnode.com', { timeout: 10_000 }),
    http('https://sepolia.drpc.org',                   { timeout: 10_000 }),
    http('https://rpc2.sepolia.org',                   { timeout: 10_000 }),
  ],
  { rank: false }   // ← disable ranking so Thirdweb is never promoted first
);

export const wagmiConfig = getDefaultConfig({
  appName:        "MiraRoute",
  appDescription: "Swap, bridge, and earn on Arc Testnet — powered by Circle USDC",
  appUrl:         "https://miraroute.vercel.app",
  appIcon:        "https://miraroute.vercel.app/logo.svg",
  projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID,
  chains: [arcTestnet, sepolia],
  transports: {
    // Arc Testnet — explicit single RPC, no fallback needed
    [arcTestnet.id]: http(CHAIN.ARC_RPC, { timeout: 30_000 }),
    // Sepolia — three reliable public RPCs, in priority order, ranked off
    [sepolia.id]: SEPOLIA_TRANSPORTS,
  },
  ssr: false,
});
