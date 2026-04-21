import { useCallback } from "react";
import { useAccount } from "wagmi";
import {
  createWalletClient,
  createPublicClient,
  custom,
  http,
  parseUnits,
  maxUint256,
  erc20Abi,
} from "viem";
import { sepolia } from "wagmi/chains";
import { arcTestnet, CONTRACTS, CURVE_USDC_EURC_POOL, CCTP } from "../utils/constants";

// Proxy Circle's API through our own domain to avoid CORS restrictions.
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

// ── Curve StableSwap ABI — coins[0]=EURC, coins[1]=USDC ──────────────────────
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

// coins[0] = EURC (index 0), coins[1] = USDC (index 1)
const COIN_INDEX = { EURC: 0n, USDC: 1n };

// ── CCTP v2 ABI ───────────────────────────────────────────────────────────────
const TOKEN_MESSENGER_ABI = [
  {
    name: "depositForBurn",
    type: "function",
    inputs: [
      { name: "amount",               type: "uint256" },
      { name: "destinationDomain",    type: "uint32"  },
      { name: "mintRecipient",        type: "bytes32" },
      { name: "burnToken",            type: "address" },
      { name: "destinationCaller",    type: "bytes32" },
      { name: "maxFee",               type: "uint256" },
      { name: "minFinalityThreshold", type: "uint32"  },
    ],
    outputs: [{ type: "uint64" }],
    stateMutability: "nonpayable",
  },
];

const MESSAGE_TRANSMITTER_ABI = [
  {
    name: "receiveMessage",
    type: "function",
    inputs: [
      { name: "message",     type: "bytes" },
      { name: "attestation", type: "bytes" },
    ],
    outputs: [{ type: "bool" }],
    stateMutability: "nonpayable",
  },
];

// Sepolia USDC address (Circle official)
const SEPOLIA_USDC  = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238";
const SEPOLIA_DOMAIN = 0;
const ZERO_BYTES32   = `0x${"0".repeat(64)}`;
// Circle CCTP attestation API (testnet)
const ATTESTATION_API = "https://iris-api-sandbox.circle.com/v2/messages";

export function useArcKit() {
  const { connector, isConnected, address } = useAccount();

  // ── Direct Curve pool swap (USDC ↔ EURC) ─────────────────────────────────
  const swap = useCallback(async ({ tokenIn, tokenOut, amountIn, slippageBps = 50 }) => {
    if (!connector || !address) throw new Error("Wallet not connected");

    const provider    = await connector.getProvider();
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

    const minOut = expectedOut * BigInt(10000 - slippageBps) / 10000n;

    // Approve once (maxUint256) if allowance is insufficient
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
      try { await publicClient.waitForTransactionReceipt({ hash: approveTx, timeout: 30_000 }); } catch {}
    }

    // Execute swap directly on CurveStableSwap
    const txHash = await walletClient.writeContract({
      address:      CURVE_USDC_EURC_POOL,
      abi:          CURVE_ABI,
      functionName: "exchange",
      args:         [i, j, amountRaw, minOut],
    });

    return { txHash };
  }, [connector, address]);

  // ── Direct CCTP v2 bridge (Sepolia → Arc Testnet) ────────────────────────
  const bridge = useCallback(async ({ amount, onProgress }) => {
    if (!connector || !address) throw new Error("Wallet not connected");

    const provider = await connector.getProvider();

    // Sepolia walletClient + publicClient
    const sepoliaWallet = createWalletClient({
      account:   address,
      chain:     sepolia,
      transport: custom(provider),
    });
    const sepoliaPublic = createPublicClient({
      chain:     sepolia,
      transport: http(),
    });

    const amountRaw = parseUnits(amount.toString(), 6);

    // Step 1 — Approve USDC to TokenMessenger on Sepolia (once)
    onProgress?.(1);
    const allowance = await sepoliaPublic.readContract({
      address:      SEPOLIA_USDC,
      abi:          erc20Abi,
      functionName: "allowance",
      args:         [address, CCTP.TOKEN_MESSENGER],
    });

    if (allowance < amountRaw) {
      const approveTx = await sepoliaWallet.writeContract({
        address:      SEPOLIA_USDC,
        abi:          erc20Abi,
        functionName: "approve",
        args:         [CCTP.TOKEN_MESSENGER, maxUint256],
      });
      await sepoliaPublic.waitForTransactionReceipt({ hash: approveTx });
    }

    // Step 2 — depositForBurn on Sepolia
    onProgress?.(2);
    const mintRecipient = `0x${address.slice(2).padStart(64, "0")}`;
    const burnTxHash = await sepoliaWallet.writeContract({
      address:      CCTP.TOKEN_MESSENGER,
      abi:          TOKEN_MESSENGER_ABI,
      functionName: "depositForBurn",
      args: [
        amountRaw,
        CCTP.ARC_DOMAIN,      // destination: Arc Testnet domain 26
        mintRecipient,        // recipient in bytes32
        SEPOLIA_USDC,         // USDC to burn on Sepolia
        ZERO_BYTES32,         // any caller can relay
        0n,                   // no max fee
        1000,                 // fast transfer threshold
      ],
    });
    await sepoliaPublic.waitForTransactionReceipt({ hash: burnTxHash });

    // Step 3 — Poll Circle attestation API (~2–4 min)
    onProgress?.(3);
    let attestationMsg = null;
    for (let attempts = 0; attempts < 72; attempts++) {   // 6 min max
      await new Promise(r => setTimeout(r, 5000));
      try {
        const res  = await fetch(`${ATTESTATION_API}/${SEPOLIA_DOMAIN}?transactionHash=${burnTxHash}`);
        const data = await res.json();
        if (data?.messages?.[0]?.status === "complete") {
          attestationMsg = data.messages[0];
          break;
        }
      } catch {}
    }
    if (!attestationMsg) throw new Error("Attestation timed out. Check ArcScan for mint status.");

    // Step 4 — receiveMessage on Arc Testnet (mints USDC)
    onProgress?.(4);
    const arcWallet = createWalletClient({
      account:   address,
      chain:     arcTestnet,
      transport: custom(provider),
    });
    const mintTxHash = await arcWallet.writeContract({
      address:      CCTP.MESSAGE_TRANSMITTER,
      abi:          MESSAGE_TRANSMITTER_ABI,
      functionName: "receiveMessage",
      args:         [attestationMsg.message, attestationMsg.attestation],
    });

    return { txHash: mintTxHash, burnTxHash };
  }, [connector, address]);

  return { swap, bridge, isReady: isConnected };
}
