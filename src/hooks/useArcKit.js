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

  const resolveRef = useRef(null);
  const rejectRef  = useRef(null);
  const [watchHash,  setWatchHash]  = useState(undefined);
  const [watchChain, setWatchChain] = useState(arcTestnet.id);

  const {
    isLoading: isWaiting,
    isSuccess,
    isError,
    data: receipt,
    error: receiptError
  } = useWaitForTransactionReceipt({
    hash:    watchHash,
    chainId: watchChain,
    query:   { enabled: !!watchHash, staleTime: 0 },
  });

  // When the receipt arrives (success or error), resolve/reject the pending promise
  useEffect(() => {
    if (!watchHash) return;

    if (isSuccess && receipt) {
      const resolve = resolveRef.current;
      resolveRef.current = null;
      rejectRef.current  = null;
      setWatchHash(undefined);
      resolve?.(receipt);
    } else if (isError) {
      const reject = rejectRef.current;
      resolveRef.current = null;
      rejectRef.current  = null;
      setWatchHash(undefined);
      reject?.(receiptError ?? new Error("Transaction failed"));
    }
  }, [isSuccess, isError, receipt, receiptError, watchHash]);

  // ── Core helper: submit tx and return a promise that resolves with receipt ─
  // We pre-fetch the nonce from our own public client (publicnode.com) and
  // pass it explicitly to writeContractAsync. This bypasses the wallet's
  // internal eth_getTransactionCount call which hits Thirdweb by default.
  // We also force a manual gas limit and robust gas prices to bypass estimation failures.
  const submitAndWait = useCallback((params, cid = arcTestnet.id) => {
    return new Promise(async (resolve, reject) => {
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
        
        // Brief delay for wallet state to settle (especially after chain switch)
        await new Promise(r => setTimeout(r, 1000));

        const hash = await writeContractAsync(txParams);
        console.log(`[MiraRoute] Wallet accepted! Hash: ${hash}`);
        
        resolveRef.current = resolve;
        rejectRef.current  = reject;
        setWatchChain(cid);
        setWatchHash(hash);
      } catch (err) {
        console.error("[MiraRoute] Wallet push failed:", err);
        reject(err);
      }
    });
  }, [writeContractAsync, address, arcClient, sepoliaClient]);

  // ── Helper: ensure allowance, approve if needed ───────────────────────────
  const ensureApproval = useCallback(async ({ token, spender, amount, cid, onApproving }) => {
    const allowance = await readContract(wagmiConfig, {
      address: token, abi: erc20Abi, functionName: "allowance",
      args: [address, spender], chainId: cid,
    });
    if (allowance >= amount) return;

    onApproving?.();
    const receipt = await submitAndWait({
      address: token, abi: erc20Abi, functionName: "approve",
      args: [spender, amount],
    }, cid);
    if (receipt.status !== "success") throw new Error("Token approval failed on-chain.");
  }, [address, submitAndWait]);

  // ── approve ──────────────────────────────────────────────────────────────
  const approve = useCallback(async ({ token, spender, amount, cid }) => {
    const amountRaw = typeof amount === "string" ? parseUnits(amount, 6) : amount;
    const receipt = await submitAndWait({
      address: token, abi: erc20Abi, functionName: "approve",
      args: [spender, amountRaw],
    }, cid);
    if (receipt.status !== "success") throw new Error("Token approval failed on-chain.");
    return receipt;
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

    const swapReceipt = await submitAndWait({
      address: STABLE_SWAP_POOL, abi: STABLE_SWAP_ABI, functionName: "swap",
      args: [COIN_INDEX[tokenIn], COIN_INDEX[tokenOut], amountRaw],
    }, cid);

    console.log("[MiraRoute] swap confirmed:", swapReceipt.transactionHash);
    return { txHash: swapReceipt.transactionHash };
  }, [isConnected, address, chainId, switchChainAsync, submitAndWait]);

  // ── addLiquidity ──────────────────────────────────────────────────────────
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

    onProgress?.("depositing");
    const receipt = await submitAndWait({
      address: STABLE_SWAP_POOL, abi: STABLE_SWAP_ABI, functionName: "addLiquidity",
      args: [[usdcRaw, eurcRaw, 0n]],
    }, cid);

    if (receipt.status !== "success") throw new Error("Add liquidity reverted on-chain.");
    console.log("[MiraRoute] addLiquidity confirmed:", receipt.transactionHash);
    return { txHash: receipt.transactionHash };
  }, [isConnected, address, chainId, switchChainAsync, submitAndWait]);

  // ── removeLiquidity ───────────────────────────────────────────────────────
  const removeLiquidity = useCallback(async ({ lpAmt, onProgress }) => {
    if (!isConnected || !address) throw new Error("Wallet not connected");

    if (chainId !== CHAIN.ARC_TESTNET_ID) {
      await switchChainAsync({ chainId: CHAIN.ARC_TESTNET_ID });
      await new Promise(r => setTimeout(r, 600));
    }

    const cid   = arcTestnet.id;
    const lpRaw = parseUnits(lpAmt.toString(), 18);

    onProgress?.("withdrawing");
    const receipt = await submitAndWait({
      address: STABLE_SWAP_POOL, abi: STABLE_SWAP_ABI, functionName: "remove_liquidity",
      args: [lpRaw, [0n, 0n, 0n]],
    }, cid);

    if (receipt.status !== "success") throw new Error("Remove liquidity reverted on-chain.");
    console.log("[MiraRoute] removeLiquidity confirmed:", receipt.transactionHash);
    return { txHash: receipt.transactionHash };
  }, [isConnected, address, chainId, switchChainAsync, submitAndWait]);

  // ── bridge (Sepolia → Arc via CCTP v2) ───────────────────────────────────
  const bridge = useCallback(async ({ amount, onProgress }) => {
    if (!isConnected || !address) throw new Error("Wallet not connected");

    if (chainId !== CHAIN.SEPOLIA_ID) {
      onProgress?.({ step: 0, label: "Switching to Ethereum Sepolia…" });
      try {
        await switchChainAsync({ chainId: CHAIN.SEPOLIA_ID });
        await new Promise(r => setTimeout(r, 1000));
      } catch (switchErr) {
        const msg = String(switchErr?.message ?? '');
        if (
          msg.toLowerCase().includes('programmatic chain switching') ||
          msg.toLowerCase().includes('does not support')
        ) {
          // Wallet like Rabby blocks programmatic switching — tell the UI
          const err = new Error('CHAIN_SWITCH_REQUIRED');
          err.code = 'CHAIN_SWITCH_REQUIRED';
          err.requiredChainId = CHAIN.SEPOLIA_ID;
          throw err;
        }
        throw switchErr; // Unknown error — re-throw normally
      }
    }

    const amountRaw = parseUnits(amount.toString(), 6);
    const sepoliaId = sepolia.id;

    // Execution ONLY — allowance must be pre-handled by UI
    onProgress?.(2);
    const mintRecipient = `0x${address.slice(2).padStart(64, "0")}`;
    const burnReceipt = await submitAndWait({
      address: CCTP.TOKEN_MESSENGER, abi: TOKEN_MESSENGER_ABI,
      functionName: "depositForBurn",
      args: [amountRaw, CCTP.ARC_DOMAIN, mintRecipient,
             TOKENS.USDC_SEPOLIA.address, ZERO_BYTES32, 0n, 1000],
    }, sepoliaId);
    const burnTxHash = burnReceipt.transactionHash;
    console.log("[MiraRoute] burn tx:", burnTxHash);

    // Step 3 — poll Circle attestation
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

    // Step 4 — switch to Arc + receiveMessage
    onProgress?.(4);
    await switchChainAsync({ chainId: CHAIN.ARC_TESTNET_ID });
    await new Promise(r => setTimeout(r, 800));

    const mintReceipt = await submitAndWait({
      address: CCTP.MESSAGE_TRANSMITTER, abi: MESSAGE_TRANSMITTER_ABI,
      functionName: "receiveMessage",
      args: [attestationMsg.message, attestationMsg.attestation],
    }, arcTestnet.id);

    console.log("[MiraRoute] mint tx:", mintReceipt.transactionHash);
    return { txHash: mintReceipt.transactionHash, burnTxHash };
  }, [isConnected, address, chainId, switchChainAsync, ensureApproval, submitAndWait]);

  return {
    submitAndWait,
    approve,
    quote,
    swap,
    addLiquidity,
    removeLiquidity,
    bridge,
    isWritePending,
    isWaiting,
    writeError,
    resetWrite,
  };
}
