import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { sepolia } from "wagmi/chains";
import { http, fallback } from "wagmi";
import { arcTestnet, CHAIN } from "./utils/constants";

export const wagmiConfig = getDefaultConfig({
  appName: "MiraRoute",
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
