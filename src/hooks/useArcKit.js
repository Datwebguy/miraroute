import { useState, useCallback, useEffect, useRef } from "react";
import {
  useAccount,
  useChainId,
  useSwitchChain,
  useWriteContract,
  useWaitForTransactionReceipt,
  usePublicClient,
} from "wagmi";
import { readContract } from "@wagmi/core";
import { parseUnits, formatUnits, erc20Abi } from "viem";
import { sepolia } from "wagmi/chains";
import { wagmiConfig } from "../wagmi";
import {
  arcTestnet, TOKENS, CONTRACTS,
  STABLE_SWAP_POOL, CCTP, CHAIN,
} from "../utils/constants";

// ── ABIs ──────────────────────────────────────────────────────────────────────

const STABLE_SWAP_ABI = [
  { name: "swap",      type: "function", stateMutability: "nonpayable",
    inputs: [{ name: "i", type: "uint256" }, { name: "j", type: "uint256" }, { name: "dx", type: "uint256" }],
    outputs: [{ type: "uint256" }] },
  { name: "get_dy",   type: "function", stateMutability: "view",
    inputs: [{ name: "i", type: "uint256" }, { name: "j", type: "uint256" }, { name: "dx", type: "uint256" }],
    outputs: [{ type: "uint256" }] },
  { name: "balances", type: "function", stateMutability: "view",
    inputs: [{ name: "i", type: "uint256" }], outputs: [{ type: "uint256" }] },
  { name: "fee",      type: "function", stateMutability: "view",
    inputs: [], outputs: [{ type: "uint256" }] },
  { name: "addLiquidity", type: "function", stateMutability: "nonpayable",
    inputs: [{ name: "amounts", type: "uint256[]" }], outputs: [{ type: "uint256" }] },
  { name: "remove_liquidity", type: "function", stateMutability: "nonpayable",
    inputs: [{ name: "_amount", type: "uint256" }, { name: "min_amounts", type: "uint256[]" }],
    outputs: [{ type: "uint256[]" }] },
];

const COIN_INDEX = { USDC: 0n, EURC: 1n };

const TOKEN_MESSENGER_ABI = [{
  name: "depositForBurn", type: "function", stateMutability: "nonpayable",
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
}];

const MESSAGE_TRANSMITTER_ABI = [{
  name: "receiveMessage", type: "function", stateMutability: "nonpayable",
  inputs: [{ name: "message", type: "bytes" }, { name: "attestation", type: "bytes" }],
  outputs: [{ type: "bool" }],
}];

const ZERO_BYTES32    = `0x${"0".repeat(64)}`;
const ATTESTATION_API = "https://iris-api-sandbox.circle.com/v2/messages";

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useArcKit() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChainAsync } = useSwitchChain();

  const {
    writeContractAsync,
    isPending: isWritePending,
    error: writeError,
    reset: resetWrite
  } = useWriteContract();

  const arcClient = usePublicClient({ chainId: arcTestnet.id });
  const sepoliaClient = usePublicClient({ chainId: sepolia.id });

  // ── Core helper: submit tx and return the hash immediately ──
  const submitAndWait = useCallback(async (params, cid = arcTestnet.id) => {
    try {
      // Get nonce from OUR RPC with a strict 3s timeout to avoid hanging
      let nonce;
      try {
        const client = cid === sepolia.id ? sepoliaClient : arcClient;
        nonce = await Promise.race([
          client.getTransactionCount({ address, blockTag: 'pending' }),
          new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 3000))
        ]);
      } catch (e) {
        console.warn(`[MiraRoute] Nonce fetch ${e?.message === 'timeout' ? 'timed out' : 'failed'}, using wallet default:`, e);
        nonce = undefined;
      }

      const txParams = {
        ...params,
        gas: params.gas ?? 800000n,
      };

      // Aggressive gas pricing for Arc (EIP-1559 only)
      if (cid === arcTestnet.id) {
        txParams.maxFeePerGas = parseUnits("1000", "gwei");
        txParams.maxPriorityFeePerGas = parseUnits("100", "gwei");
      }

      if (nonce !== undefined) txParams.nonce = nonce;

      console.log(`[MiraRoute] Attempting wallet push: ${params.functionName}`, txParams);
      
      // Brief delay for wallet state to settle
      await new Promise(r => setTimeout(r, 1000));

      const hash = await writeContractAsync(txParams);
      console.log(`[MiraRoute] Wallet accepted! Hash: ${hash}`);
      return hash;
    } catch (err) {
      console.error("[MiraRoute] Wallet push failed:", err);
      throw err;
    }
  }, [writeContractAsync, address, arcClient, sepoliaClient]);

  // ── approve ──────────────────────────────────────────────────────────────
  const approve = useCallback(async ({ token, spender, amount, cid }) => {
    const amountRaw = typeof amount === "string" ? parseUnits(amount, 6) : amount;
    return await submitAndWait({
      address: token, abi: erc20Abi, functionName: "approve",
      args: [spender, amountRaw],
    }, cid);
  }, [submitAndWait]);

  // ── quote (read-only, no wallet needed) ──────────────────────────────────
  const quote = useCallback(async ({ tokenIn, tokenOut, amountIn }) => {
    if (!amountIn || parseFloat(amountIn) <= 0) return null;
    try {
      const out = await readContract(wagmiConfig, {
        address: STABLE_SWAP_POOL, abi: STABLE_SWAP_ABI, functionName: "get_dy",
        args: [COIN_INDEX[tokenIn], COIN_INDEX[tokenOut], parseUnits(amountIn.toString(), 6)],
        chainId: arcTestnet.id,
      });
      return parseFloat(formatUnits(out, 6));
    } catch { return null; }
  }, []);

  // ── swap ──────────────────────────────────────────────────────────────────
  const swap = useCallback(async ({ tokenIn, tokenOut, amountIn }) => {
    if (!isConnected || !address) throw new Error("Wallet not connected");

    if (chainId !== CHAIN.ARC_TESTNET_ID) {
      console.log("[MiraRoute] Switching chain to Arc...");
      try {
        await switchChainAsync({ chainId: CHAIN.ARC_TESTNET_ID });
        await new Promise(r => setTimeout(r, 1200));
      } catch (err) {
        console.warn("[MiraRoute] Chain switch failed or cancelled:", err);
      }
    }

    const amountRaw = parseUnits(amountIn.toString(), 6);
    const cid       = arcTestnet.id;

    const hash = await submitAndWait({
      address: STABLE_SWAP_POOL, abi: STABLE_SWAP_ABI, functionName: "swap",
      args: [COIN_INDEX[tokenIn], COIN_INDEX[tokenOut], amountRaw],
    }, cid);

    return { txHash: hash };
  }, [isConnected, address, chainId, switchChainAsync, submitAndWait]);

  // ── addLiquidity ──────────────────────────────────────────────────────────
  const addLiquidity = useCallback(async ({ usdcAmt, eurcAmt }) => {
    if (!isConnected || !address) throw new Error("Wallet not connected");

    if (chainId !== CHAIN.ARC_TESTNET_ID) {
      console.log("[MiraRoute] Switching chain to Arc...");
      try {
        await switchChainAsync({ chainId: CHAIN.ARC_TESTNET_ID });
        await new Promise(r => setTimeout(r, 1200));
      } catch (err) {
        console.warn("[MiraRoute] Chain switch failed or cancelled:", err);
      }
    }

    const usdcRaw = usdcAmt > 0 ? parseUnits(usdcAmt.toString(), 6) : 0n;
    const eurcRaw = eurcAmt > 0 ? parseUnits(eurcAmt.toString(), 6) : 0n;
    const cid = arcTestnet.id;

    const hash = await submitAndWait({
      address: STABLE_SWAP_POOL, abi: STABLE_SWAP_ABI, functionName: "addLiquidity",
      args: [[usdcRaw, eurcRaw, 0n]],
    }, cid);

    return { txHash: hash };
  }, [isConnected, address, chainId, switchChainAsync, submitAndWait]);

  // ── removeLiquidity ───────────────────────────────────────────────────────
  const removeLiquidity = useCallback(async ({ lpAmt }) => {
    if (!isConnected || !address) throw new Error("Wallet not connected");
    const lpRaw = parseUnits(lpAmt.toString(), 6);
    const hash = await submitAndWait({
      address: STABLE_SWAP_POOL, abi: STABLE_SWAP_ABI, functionName: "remove_liquidity",
      args: [lpRaw, [0n, 0n, 0n]],
    }, arcTestnet.id);
    return { txHash: hash };
  }, [isConnected, address, submitAndWait]);

  // ── bridge (Circle CCTP) ─────────────────────────────────────────────────
  const bridge = useCallback(async ({ amount, onProgress }) => {
    if (!isConnected || !address) throw new Error("Wallet not connected");

    // Step 1: Switch to Sepolia
    if (chainId !== sepolia.id) {
      console.log("[MiraRoute] Switching chain to Sepolia...");
      try {
        await switchChainAsync({ chainId: sepolia.id });
        await new Promise(r => setTimeout(r, 1200));
      } catch (err) {
        console.warn("[MiraRoute] Chain switch failed or cancelled:", err);
      }
    }

    const amountRaw = parseUnits(amount.toString(), 6);
    const sepoliaId = sepolia.id;

    // Step 2: Lock on Sepolia
    onProgress?.(2);
    const hash = await submitAndWait({
      address: CCTP.TOKEN_MESSENGER, abi: TOKEN_MESSENGER_ABI,
      functionName: "depositForBurn",
      args: [amountRaw, CCTP.ARC_DOMAIN, `0x${address.slice(2).padStart(64, "0")}`,
             TOKENS.USDC_SEPOLIA.address, ZERO_BYTES32, 0n, 1000],
    }, sepoliaId);

    console.log("[MiraRoute] Waiting for Sepolia lock confirmation...", hash);
    const burnReceipt = await sepoliaClient.waitForTransactionReceipt({ hash });
    const burnTxHash = burnReceipt.transactionHash;
    console.log("[MiraRoute] burn tx confirmed:", burnTxHash);

    // Step 3: Poll Circle attestation
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

    // Step 4: Switch to Arc + receiveMessage (Mint)
    onProgress?.(4);
    await switchChainAsync({ chainId: CHAIN.ARC_TESTNET_ID });
    await new Promise(r => setTimeout(r, 1200));

    const mintHash = await submitAndWait({
      address: CCTP.MESSAGE_TRANSMITTER, abi: MESSAGE_TRANSMITTER_ABI,
      functionName: "receiveMessage",
      args: [attestationMsg.message, attestationMsg.attestation],
    }, arcTestnet.id);

    console.log("[MiraRoute] Waiting for Arc mint confirmation...", mintHash);
    const mintReceipt = await arcClient.waitForTransactionReceipt({ hash: mintHash });

    console.log("[MiraRoute] mint confirmed:", mintReceipt.transactionHash);
    return { txHash: mintReceipt.transactionHash, burnTxHash };
  }, [isConnected, address, chainId, switchChainAsync, submitAndWait, sepoliaClient, arcClient]);

  return {
    submitAndWait,
    approve,
    quote,
    swap,
    addLiquidity,
    removeLiquidity,
    bridge,
    isWritePending,
    writeError,
    resetWrite,
  };
}
