import { useCallback } from "react";
import { useAccount, useChainId, useSwitchChain } from "wagmi";
import {
  writeContract,
  readContract,
  waitForTransactionReceipt,
} from "@wagmi/core";
import { parseUnits, formatUnits, erc20Abi } from "viem";
import { sepolia } from "wagmi/chains";
import { wagmiConfig } from "../wagmi";
import { arcTestnet, TOKENS, CONTRACTS, STABLE_SWAP_POOL, CCTP, CHAIN } from "../utils/constants";

// ── StableSwapPool ABI ────────────────────────────────────────────────────────
const STABLE_SWAP_ABI = [
  {
    name: "swap", type: "function",
    inputs: [
      { name: "i",  type: "uint256" },
      { name: "j",  type: "uint256" },
      { name: "dx", type: "uint256" },
    ],
    outputs: [{ type: "uint256" }],
    stateMutability: "nonpayable",
  },
  {
    name: "get_dy", type: "function",
    inputs: [
      { name: "i",  type: "uint256" },
      { name: "j",  type: "uint256" },
      { name: "dx", type: "uint256" },
    ],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
  {
    name: "balances", type: "function",
    inputs: [{ name: "i", type: "uint256" }],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
  {
    name: "fee", type: "function",
    inputs: [],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
  {
    name: "addLiquidity", type: "function",
    inputs: [{ name: "amounts", type: "uint256[]" }],
    outputs: [{ type: "uint256" }],
    stateMutability: "nonpayable",
  },
  {
    name: "remove_liquidity", type: "function",
    inputs: [
      { name: "_amount",     type: "uint256"   },
      { name: "min_amounts", type: "uint256[]" },
    ],
    outputs: [{ type: "uint256[]" }],
    stateMutability: "nonpayable",
  },
];

const COIN_INDEX = { USDC: 0n, EURC: 1n };

// ── CCTP v2 ABI ───────────────────────────────────────────────────────────────
const TOKEN_MESSENGER_ABI = [{
  name: "depositForBurn", type: "function",
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
}];

const MESSAGE_TRANSMITTER_ABI = [{
  name: "receiveMessage", type: "function",
  inputs: [
    { name: "message",     type: "bytes" },
    { name: "attestation", type: "bytes" },
  ],
  outputs: [{ type: "bool" }],
  stateMutability: "nonpayable",
}];

const ZERO_BYTES32    = `0x${"0".repeat(64)}`;
const ATTESTATION_API = "https://iris-api-sandbox.circle.com/v2/messages";

// ── Helper: approve token if allowance is insufficient ────────────────────────
async function ensureApproval({ token, owner, spender, amount, chainId, onApproving }) {
  const allowance = await readContract(wagmiConfig, {
    address: token, abi: erc20Abi, functionName: "allowance",
    args: [owner, spender], chainId,
  });
  if (allowance >= amount) return;

  onApproving?.();
  const hash = await writeContract(wagmiConfig, {
    address: token, abi: erc20Abi, functionName: "approve",
    args: [spender, amount], chainId,
  });
  const receipt = await waitForTransactionReceipt(wagmiConfig, { hash, timeout: 60_000, chainId });
  if (receipt.status !== "success") throw new Error("Token approval failed on-chain.");
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useArcKit() {
  const { isConnected, address } = useAccount();
  const chainId = useChainId();
  const { switchChainAsync } = useSwitchChain();

  // ── quote (read-only) ─────────────────────────────────────────────────────────
  const quote = useCallback(async ({ tokenIn, tokenOut, amountIn }) => {
    if (!amountIn || parseFloat(amountIn) <= 0) return null;
    try {
      const out = await readContract(wagmiConfig, {
        address: STABLE_SWAP_POOL, abi: STABLE_SWAP_ABI, functionName: "get_dy",
        args: [COIN_INDEX[tokenIn], COIN_INDEX[tokenOut], parseUnits(amountIn.toString(), 6)],
        chainId: arcTestnet.id,
      });
      return parseFloat(formatUnits(out, 6));
    } catch {
      return null;
    }
  }, []);

  // ── swap ──────────────────────────────────────────────────────────────────────
  const swap = useCallback(async ({ tokenIn, tokenOut, amountIn, onProgress }) => {
    if (!isConnected || !address) throw new Error("Wallet not connected");

    if (chainId !== CHAIN.ARC_TESTNET_ID) {
      await switchChainAsync({ chainId: CHAIN.ARC_TESTNET_ID });
      await new Promise(r => setTimeout(r, 600));
    }

    const amountRaw = parseUnits(amountIn.toString(), 6);
    const cid       = arcTestnet.id;

    // Approve if needed
    await ensureApproval({
      token: CONTRACTS[tokenIn], owner: address, spender: STABLE_SWAP_POOL,
      amount: amountRaw, chainId: cid,
      onApproving: () => onProgress?.("approving"),
    });

    // Swap
    onProgress?.("swapping");
    const txHash = await writeContract(wagmiConfig, {
      address: STABLE_SWAP_POOL, abi: STABLE_SWAP_ABI, functionName: "swap",
      args: [COIN_INDEX[tokenIn], COIN_INDEX[tokenOut], amountRaw],
      chainId: cid,
    });
    console.log("[MiraRoute] swap submitted:", txHash);

    onProgress?.("confirming");
    const receipt = await waitForTransactionReceipt(wagmiConfig, {
      hash: txHash, timeout: 60_000, chainId: cid,
    });

    if (receipt.status !== "success") {
      throw new Error("Swap reverted on-chain. Pool may have insufficient liquidity.");
    }

    console.log("[MiraRoute] swap confirmed:", receipt.transactionHash);
    return { txHash: receipt.transactionHash };
  }, [isConnected, address, chainId, switchChainAsync]);

  // ── addLiquidity ──────────────────────────────────────────────────────────────
  const addLiquidity = useCallback(async ({ usdcAmt, eurcAmt, onProgress }) => {
    if (!isConnected || !address) throw new Error("Wallet not connected");

    if (chainId !== CHAIN.ARC_TESTNET_ID) {
      await switchChainAsync({ chainId: CHAIN.ARC_TESTNET_ID });
      await new Promise(r => setTimeout(r, 600));
    }

    const usdcRaw = usdcAmt > 0 ? parseUnits(usdcAmt.toString(), 6) : 0n;
    const eurcRaw = eurcAmt > 0 ? parseUnits(eurcAmt.toString(), 6) : 0n;
    if (usdcRaw === 0n && eurcRaw === 0n) throw new Error("Enter at least one amount");

    const cid = arcTestnet.id;

    if (usdcRaw > 0n) {
      await ensureApproval({
        token: CONTRACTS.USDC, owner: address, spender: STABLE_SWAP_POOL,
        amount: usdcRaw, chainId: cid,
        onApproving: () => onProgress?.("approving-usdc"),
      });
    }
    if (eurcRaw > 0n) {
      await ensureApproval({
        token: CONTRACTS.EURC, owner: address, spender: STABLE_SWAP_POOL,
        amount: eurcRaw, chainId: cid,
        onApproving: () => onProgress?.("approving-eurc"),
      });
    }

    onProgress?.("depositing");
    const txHash = await writeContract(wagmiConfig, {
      address: STABLE_SWAP_POOL, abi: STABLE_SWAP_ABI, functionName: "addLiquidity",
      args: [[usdcRaw, eurcRaw, 0n]],
      chainId: cid,
    });

    onProgress?.("confirming");
    const receipt = await waitForTransactionReceipt(wagmiConfig, {
      hash: txHash, timeout: 60_000, chainId: cid,
    });
    if (receipt.status !== "success") throw new Error("Add liquidity reverted on-chain.");

    console.log("[MiraRoute] addLiquidity confirmed:", receipt.transactionHash);
    return { txHash: receipt.transactionHash };
  }, [isConnected, address, chainId, switchChainAsync]);

  // ── removeLiquidity ───────────────────────────────────────────────────────────
  const removeLiquidity = useCallback(async ({ lpAmt, onProgress }) => {
    if (!isConnected || !address) throw new Error("Wallet not connected");

    if (chainId !== CHAIN.ARC_TESTNET_ID) {
      await switchChainAsync({ chainId: CHAIN.ARC_TESTNET_ID });
      await new Promise(r => setTimeout(r, 600));
    }

    const cid   = arcTestnet.id;
    const lpRaw = parseUnits(lpAmt.toString(), 18);

    onProgress?.("withdrawing");
    const txHash = await writeContract(wagmiConfig, {
      address: STABLE_SWAP_POOL, abi: STABLE_SWAP_ABI, functionName: "remove_liquidity",
      args: [lpRaw, [0n, 0n, 0n]],
      chainId: cid,
    });

    onProgress?.("confirming");
    const receipt = await waitForTransactionReceipt(wagmiConfig, {
      hash: txHash, timeout: 60_000, chainId: cid,
    });
    if (receipt.status !== "success") throw new Error("Remove liquidity reverted on-chain.");

    console.log("[MiraRoute] removeLiquidity confirmed:", receipt.transactionHash);
    return { txHash: receipt.transactionHash };
  }, [isConnected, address, chainId, switchChainAsync]);

  // ── bridge (Sepolia → Arc via CCTP v2) ───────────────────────────────────────
  const bridge = useCallback(async ({ amount, onProgress }) => {
    if (!isConnected || !address) throw new Error("Wallet not connected");

    // Switch to Sepolia
    if (chainId !== CHAIN.SEPOLIA_ID) {
      onProgress?.({ step: 0, label: "Switching to Ethereum Sepolia…" });
      await switchChainAsync({ chainId: CHAIN.SEPOLIA_ID });
      await new Promise(r => setTimeout(r, 1000));
    }

    const amountRaw  = parseUnits(amount.toString(), 6);
    const sepoliaId  = sepolia.id;

    // Step 1 — approve USDC to TokenMessenger on Sepolia
    onProgress?.(1);
    await ensureApproval({
      token: TOKENS.USDC_SEPOLIA.address, owner: address,
      spender: CCTP.TOKEN_MESSENGER, amount: amountRaw, chainId: sepoliaId,
      onApproving: () => {},
    });

    // Step 2 — depositForBurn
    onProgress?.(2);
    const mintRecipient = `0x${address.slice(2).padStart(64, "0")}`;
    const burnTxHash = await writeContract(wagmiConfig, {
      address: CCTP.TOKEN_MESSENGER, abi: TOKEN_MESSENGER_ABI,
      functionName: "depositForBurn",
      args: [amountRaw, CCTP.ARC_DOMAIN, mintRecipient, TOKENS.USDC_SEPOLIA.address, ZERO_BYTES32, 0n, 1000],
      chainId: sepoliaId,
    });
    console.log("[MiraRoute] burn tx (Sepolia):", burnTxHash);
    await waitForTransactionReceipt(wagmiConfig, { hash: burnTxHash, chainId: sepoliaId });

    // Step 3 — poll Circle attestation (~2–4 min)
    onProgress?.(3);
    let attestationMsg = null;
    for (let k = 0; k < 72; k++) {
      await new Promise(r => setTimeout(r, 5000));
      try {
        const res  = await fetch(`${ATTESTATION_API}/${CCTP.SEPOLIA_DOMAIN}?transactionHash=${burnTxHash}`);
        const data = await res.json();
        if (data?.messages?.[0]?.status === "complete") {
          attestationMsg = data.messages[0];
          break;
        }
      } catch {}
    }
    if (!attestationMsg) throw new Error("Attestation timed out. Check ArcScan for mint status.");

    // Step 4 — switch to Arc and receiveMessage
    onProgress?.(4);
    await switchChainAsync({ chainId: CHAIN.ARC_TESTNET_ID });
    await new Promise(r => setTimeout(r, 800));

    const mintTxHash = await writeContract(wagmiConfig, {
      address: CCTP.MESSAGE_TRANSMITTER, abi: MESSAGE_TRANSMITTER_ABI,
      functionName: "receiveMessage",
      args: [attestationMsg.message, attestationMsg.attestation],
      chainId: arcTestnet.id,
    });
    console.log("[MiraRoute] mint tx (Arc):", mintTxHash);
    await waitForTransactionReceipt(wagmiConfig, { hash: mintTxHash, timeout: 60_000, chainId: arcTestnet.id });

    return { txHash: mintTxHash, burnTxHash };
  }, [isConnected, address, chainId, switchChainAsync]);

  return { swap, bridge, quote, addLiquidity, removeLiquidity, isReady: isConnected };
}
