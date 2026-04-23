import { createConfig, http, fallback } from "wagmi";
import { injected, walletConnect, coinbaseWallet } from "wagmi/connectors";
import { sepolia } from "wagmi/chains";
import { arcTestnet, CHAIN } from "./utils/constants";

const PROJECT_ID = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID;

// ── Connectors ────────────────────────────────────────────────────────────────
const connectors = [
  injected(),
  walletConnect({ projectId: PROJECT_ID }),
  coinbaseWallet({ appName: "MiraRoute" }),
];

// ── Config ────────────────────────────────────────────────────────────────────
// Using fallback() with multiple providers and aggressive timeouts (60s)
// to combat the frequent "Failed to fetch" and timeout errors on testnets.
export const wagmiConfig = createConfig({
  connectors,
  chains: [arcTestnet, sepolia],
  transports: {
    [arcTestnet.id]: fallback([
      http(CHAIN.ARC_RPC, { timeout: 60_000 }),
      http("https://rpc.testnet.arc.network", { timeout: 60_000 }),
    ]),
    [sepolia.id]: fallback([
      http("https://ethereum-sepolia-rpc.publicnode.com", { timeout: 60_000 }),
      http("https://sepolia.drpc.org", { timeout: 60_000 }),
      http("https://rpc.ankr.com/eth_sepolia", { timeout: 60_000 }),
    ]),
  },
  ssr: false,
});
