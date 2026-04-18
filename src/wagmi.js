import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { arcTestnet } from "./utils/constants";

export const wagmiConfig = getDefaultConfig({
  appName: "MiraRoute",
  projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID,
  chains: [arcTestnet],
  ssr: false,
});
