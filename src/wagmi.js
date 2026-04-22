import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { sepolia } from "wagmi/chains";
import { http, fallback } from "wagmi";
import { arcTestnet, CHAIN } from "./utils/constants";

export const wagmiConfig = getDefaultConfig({
  appName:        "MiraRoute",
  appDescription: "Swap, bridge, and earn on Arc Testnet — powered by Circle USDC",
  appUrl:         "https://miraroute.vercel.app",
  appIcon:        "https://miraroute.vercel.app/logo.svg",
  projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID,
  chains: [arcTestnet, sepolia],
  transports: {
    [arcTestnet.id]: http(CHAIN.ARC_RPC),
    [sepolia.id]: fallback([
      http('https://sepolia.drpc.org'),
      http('https://rpc2.sepolia.org'),
      http('https://ethereum-sepolia-rpc.publicnode.com'),
    ]),
  },
  ssr: false,
});
