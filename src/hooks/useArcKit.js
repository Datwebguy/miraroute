import { useCallback } from "react";
import { useAccount } from "wagmi";
import { AppKit, Blockchain } from "@circle-fin/app-kit";
import { createAdapterFromProvider } from "@circle-fin/adapter-viem-v2";

// Proxy Circle's API through our own domain to avoid browser CORS restrictions.
// Vercel rewrites /api/circle-proxy/* → https://api.circle.com/*
if (typeof window !== "undefined" && !window.__circleFetchPatched) {
  const _fetch = window.fetch.bind(window);
  window.fetch = (input, init) => {
    if (typeof input === "string" && input.startsWith("https://api.circle.com")) {
      input = input.replace("https://api.circle.com", "/api/circle-proxy");
    } else if (input instanceof Request && input.url.startsWith("https://api.circle.com")) {
      input = new Request(input.url.replace("https://api.circle.com", "/api/circle-proxy"), input);
    }
    return _fetch(input, init);
  };
  window.__circleFetchPatched = true;
}

const kit = new AppKit();
const KIT_KEY = import.meta.env.VITE_CIRCLE_KIT_KEY;

export function useArcKit() {
  const { connector, isConnected } = useAccount();

  const getAdapter = useCallback(async () => {
    if (!connector) throw new Error("Wallet not connected");
    const provider = await connector.getProvider();
    return createAdapterFromProvider({ provider });
  }, [connector]);

  const swap = useCallback(async ({ tokenIn, tokenOut, amountIn, slippageBps = 50 }) => {
    const adapter = await getAdapter();
    try {
      return await kit.swap({
        from:     { adapter, chain: Blockchain.Arc_Testnet },
        tokenIn,
        tokenOut,
        amountIn: amountIn.toString(),
        config:   { slippageBps, kitKey: KIT_KEY, allowanceStrategy: 'permit' },
      });
    } catch (err) {
      // Circle SDK throws an enhanced error WITH txHash if the tx was submitted
      // but waitForTransaction failed (e.g., Arc Testnet RPC timeout/polling issue).
      // Surface the hash so the UI can show the correct explorer link.
      const hash = err?.txHash || err?.details?.txHash || err?.cause?.txHash || null;
      if (hash) return { txHash: hash, partialResult: true };
      throw err;
    }
  }, [getAdapter]);

  const bridge = useCallback(async ({ fromChain, toChain, amount, token = "USDC" }) => {
    const adapter = await getAdapter();
    try {
      return await kit.bridge({
        from:   { adapter, chain: fromChain },
        to:     { adapter, chain: toChain },
        amount: amount.toString(),
        token,
        config: { kitKey: KIT_KEY },
      });
    } catch (err) {
      const hash = err?.txHash || err?.sourceTxHash || err?.details?.txHash || null;
      if (hash) return { txHash: hash, partialResult: true };
      throw err;
    }
  }, [getAdapter]);

  return { swap, bridge, isReady: isConnected };
}
