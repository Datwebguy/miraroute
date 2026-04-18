// main.jsx — app entry point
// Wraps the entire app in three providers (order matters):
//   1. WagmiProvider      — makes wallet state available everywhere
//   2. QueryClientProvider — required by wagmi for async data fetching
//   3. RainbowKitProvider  — renders the connect modal with MiraRoute's colors

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

// RainbowKit CSS must be imported before our own styles
import "@rainbow-me/rainbowkit/styles.css";
import "./index.css";

import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit";

import { wagmiConfig } from "./wagmi";
import App from "./App.jsx";

const queryClient = new QueryClient();

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={darkTheme({
            // Match MiraRoute's teal accent and navy background
            accentColor: "#2DD4BF",
            accentColorForeground: "#0D1B2A",
            borderRadius: "large",
            fontStack: "system",
            overlayBlur: "small",
          })}
        >
          <App />
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  </StrictMode>
);
