import { createConfig } from "wagmi";
import { sepolia } from "wagmi/chains";
import { http, fallback } from "wagmi";
import { connectorsForWallets } from "@rainbow-me/rainbowkit";
import {
  metaMaskWallet,
  walletConnectWallet,
  coinbaseWallet,
  rainbowWallet,
  trustWallet,
  injectedWallet,
} from "@rainbow-me/rainbowkit/wallets";
import { arcTestnet, CHAIN } from "./utils/constants";

const PROJECT_ID = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID;

// ── Wallets ───────────────────────────────────────────────────────────────────
// Using connectorsForWallets instead of getDefaultConfig so we never get
// the Thirdweb RPC injection that getDefaultConfig adds automatically.
const connectors = connectorsForWallets(
  [
    {
      groupName: "Popular",
      wallets: [
        metaMaskWallet,
        walletConnectWallet,
        coinbaseWallet,
        rainbowWallet,
        trustWallet,
        injectedWallet,
      ],
    },
  ],
  { appName: "MiraRoute", projectId: PROJECT_ID }
);

// ── Transports ────────────────────────────────────────────────────────────────
// 100% controlled — no Thirdweb, no hidden defaults.
export const wagmiConfig = createConfig({
  connectors,
  chains: [arcTestnet, sepolia],
  transports: {
    // Arc Testnet — single reliable RPC
    [arcTestnet.id]: http(CHAIN.ARC_RPC, { timeout: 30_000 }),
    // Sepolia — three reliable public RPCs in priority order, no re-ranking
    [sepolia.id]: fallback(
      [
        http("https://ethereum-sepolia-rpc.publicnode.com", { timeout: 10_000 }),
        http("https://sepolia.drpc.org",                   { timeout: 10_000 }),
        http("https://rpc2.sepolia.org",                   { timeout: 10_000 }),
      ],
      { rank: false }
    ),
  },
  ssr: false,
});
