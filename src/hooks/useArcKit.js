import { useCallback } from "react";
import { useAccount } from "wagmi";
import { AppKit, Blockchain } from "@circle-fin/app-kit";
import { createAdapterFromProvider } from "@circle-fin/adapter-viem-v2";

// Pass API key at construction — required for Circle API calls
const kit = new AppKit(
  import.meta.env.VITE_CIRCLE_KIT_KEY
    ? { apiKey: import.meta.env.VITE_CIRCLE_KIT_KEY }
    : {}
);

export function useArcKit() {
  const { connector, isConnected } = useAccount();

  const getAdapter = useCallback(async () => {
    if (!connector) throw new Error("Wallet not connected");
    const provider = await connector.getProvider();
    return createAdapterFromProvider({ provider });
  }, [connector]);

  const swap = useCallback(async ({ tokenIn, tokenOut, amountIn, slippageBps = 50 }) => {
    const adapter = await getAdapter();
    return kit.swap({
      from:     { adapter, chain: Blockchain.Arc_Testnet },
      tokenIn,
      tokenOut,
      amountIn: amountIn.toString(),
      config:   { slippageBps },
    });
  }, [getAdapter]);

  const bridge = useCallback(async ({ fromChain, toChain, amount, token = "USDC" }) => {
    const adapter = await getAdapter();
    return kit.bridge({
      from:   { adapter, chain: fromChain },
      to:     { adapter, chain: toChain },
      amount: amount.toString(),
      token,
    });
  }, [getAdapter]);

  return { swap, bridge, isReady: isConnected };
}
