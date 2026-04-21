import { useCallback } from "react";
import { useAccount } from "wagmi";
import { AppKit, Blockchain } from "@circle-fin/app-kit";
import { createAdapterFromProvider } from "@circle-fin/adapter-viem-v2";
import {
  createWalletClient,
  createPublicClient,
  custom,
  http,
  parseUnits,
  maxUint256,
  erc20Abi,
} from "viem";
import { arcTestnet, CONTRACTS, CURVE_USDC_EURC_POOL } from "../utils/constants";

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

// Circle App Kit — used only for bridge (CCTP)
const kit = new AppKit();
const KIT_KEY = import.meta.env.VITE_CIRCLE_KIT_KEY;

// ── Curve StableSwap ABI (direct pool: coins[0]=EURC, coins[1]=USDC) ────────────
const CURVE_ABI = [
  {
    name: "exchange",
    type: "function",
    inputs: [
      { name: "i",       type: "int128"  },
      { name: "j",       type: "int128"  },
      { name: "_dx",     type: "uint256" },
      { name: "_min_dy", type: "uint256" },
    ],
    outputs: [{ type: "uint256" }],
    stateMutability: "nonpayable",
  },
  {
    name: "get_dy",
    type: "function",
    inputs: [
      { name: "i",  type: "int128"  },
      { name: "j",  type: "int128"  },
      { name: "dx", type: "uint256" },
    ],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
];

// coins[0] = EURC, coins[1] = USDC
const COIN_INDEX = { EURC: 0n, USDC: 1n };

export function useArcKit() {
  const { connector, isConnected, address } = useAccount();

  // ── Direct Curve pool swap (USDC ↔ EURC, no routing middleware) ──────────────
  const swap = useCallback(async ({ tokenIn, tokenOut, amountIn, slippageBps = 50 }) => {
    if (!connector || !address) throw new Error("Wallet not connected");

    const provider   = await connector.getProvider();
    const walletClient = createWalletClient({
      account:   address,
      chain:     arcTestnet,
      transport: custom(provider),
    });
    const publicClient = createPublicClient({
      chain:     arcTestnet,
      transport: http(arcTestnet.rpcUrls.default.http[0]),
    });

    const amountRaw   = parseUnits(amountIn.toString(), 6);
    const tokenInAddr = CONTRACTS[tokenIn];
    const i = COIN_INDEX[tokenIn];
    const j = COIN_INDEX[tokenOut];

    // Quote expected output
    const expectedOut = await publicClient.readContract({
      address:      CURVE_USDC_EURC_POOL,
      abi:          CURVE_ABI,
      functionName: "get_dy",
      args:         [i, j, amountRaw],
    });

    // Apply slippage tolerance
    const minOut = expectedOut * BigInt(10000 - slippageBps) / 10000n;

    // Check allowance — approve with maxUint256 once if needed
    const allowance = await publicClient.readContract({
      address:      tokenInAddr,
      abi:          erc20Abi,
      functionName: "allowance",
      args:         [address, CURVE_USDC_EURC_POOL],
    });

    if (allowance < amountRaw) {
      const approveTx = await walletClient.writeContract({
        address:      tokenInAddr,
        abi:          erc20Abi,
        functionName: "approve",
        args:         [CURVE_USDC_EURC_POOL, maxUint256],
      });
      // Wait for confirmation, but don't throw if polling times out
      try {
        await publicClient.waitForTransactionReceipt({ hash: approveTx, timeout: 30_000 });
      } catch {}
    }

    // Execute swap directly on Curve pool
    const txHash = await walletClient.writeContract({
      address:      CURVE_USDC_EURC_POOL,
      abi:          CURVE_ABI,
      functionName: "exchange",
      args:         [i, j, amountRaw, minOut],
    });

    return { txHash };
  }, [connector, address]);

  // ── Bridge (CCTP via Circle SDK) ─────────────────────────────────────────────
  const getAdapter = useCallback(async () => {
    if (!connector) throw new Error("Wallet not connected");
    const provider = await connector.getProvider();
    return createAdapterFromProvider({ provider });
  }, [connector]);

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
