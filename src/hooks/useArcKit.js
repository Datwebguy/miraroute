import { useCallback } from "react";
import {
  useAccount,
  useChainId,
  useSwitchChain,
  useWriteContract,
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
  { name: "addLiquidity", type: "function", stateMutability: "nonpayable",
    inputs: [{ name: "amounts", type: "uint256[]" }], outputs: [{ type: "uint256" }] },
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
  const { writeContractAsync, isPending: isWritePending } = useWriteContract();

  const arcClient = usePublicClient({ chainId: arcTestnet.id });
  const sepoliaClient = usePublicClient({ chainId: sepolia.id });

  // ── INTERNAL RAW EXECUTION (No mocks, no fluff) ───────────────────────────
  const exec = async (params, cid) => {
    if (!address) throw new Error("Wallet not connected");
    
    // 1. Hard Nonce Fetch
    let nonce;
    try {
      const client = cid === sepolia.id ? sepoliaClient : arcClient;
      nonce = await client.getTransactionCount({ address, blockTag: 'pending' });
    } catch (e) {
      console.warn("[ArcKit] Nonce fetch failed, proceeding with wallet default");
    }

    // 2. Raw Params for RPC
    const txParams = {
      ...params,
      gas: 800000n,
      nonce: nonce,
    };

    if (cid === arcTestnet.id) {
      txParams.maxFeePerGas = parseUnits("1000", "gwei");
      txParams.maxPriorityFeePerGas = parseUnits("100", "gwei");
    }

    // 3. THE TRUTH TEST LOG
    console.log("SENDING RAW TRANSACTION TO RPC:", {
      address: params.address,
      function: params.functionName,
      args: params.args,
      nonce: nonce,
      chainId: cid
    });

    // 4. THE HARD CALL
    const hash = await writeContractAsync(txParams);
    if (!hash) throw new Error("RPC returned empty hash - transaction failed to broadcast");
    
    console.log("TRANSACTION BROADCASTED:", hash);
    return hash;
  };

  // ── swap ──────────────────────────────────────────────────────────────────
  const swap = useCallback(async ({ tokenIn, tokenOut, amountIn }) => {
    if (chainId !== CHAIN.ARC_TESTNET_ID) {
      await switchChainAsync({ chainId: CHAIN.ARC_TESTNET_ID });
      await new Promise(r => setTimeout(r, 1000));
    }

    const hash = await exec({
      address: STABLE_SWAP_POOL,
      abi: STABLE_SWAP_ABI,
      functionName: "swap",
      args: [COIN_INDEX[tokenIn], COIN_INDEX[tokenOut], parseUnits(amountIn.toString(), 6)],
    }, arcTestnet.id);

    return { txHash: hash };
  }, [address, chainId, switchChainAsync, writeContractAsync, arcClient, sepoliaClient]);

  // ── bridge ───────────────────────────────────────────────────────────────
  const bridge = useCallback(async ({ amount, onProgress }) => {
    if (chainId !== sepolia.id) {
      await switchChainAsync({ chainId: sepolia.id });
      await new Promise(r => setTimeout(r, 1000));
    }

    onProgress?.(2);
    const amountRaw = parseUnits(amount.toString(), 6);
    const hash = await exec({
      address: CCTP.TOKEN_MESSENGER,
      abi: TOKEN_MESSENGER_ABI,
      functionName: "depositForBurn",
      args: [amountRaw, CCTP.ARC_DOMAIN, `0x${address.slice(2).padStart(64, "0")}`,
             TOKENS.USDC_SEPOLIA.address, ZERO_BYTES32, 0n, 1000],
    }, sepolia.id);

    // Wait for real receipt
    console.log("WAITING FOR ON-CHAIN CONFIRMATION (SEPOLIA)...");
    const receipt = await sepoliaClient.waitForTransactionReceipt({ hash });
    
    onProgress?.(3);
    let attestationMsg = null;
    for (let k = 0; k < 72; k++) {
      await new Promise(r => setTimeout(r, 5000));
      const res = await fetch(`${ATTESTATION_API}/${CCTP.SEPOLIA_DOMAIN}?transactionHash=${receipt.transactionHash}`);
      const data = await res.json();
      if (data?.messages?.[0]?.status === "complete") {
        attestationMsg = data.messages[0];
        break;
      }
    }
    if (!attestationMsg) throw new Error("CCTP Attestation timeout");

    onProgress?.(4);
    await switchChainAsync({ chainId: CHAIN.ARC_TESTNET_ID });
    await new Promise(r => setTimeout(r, 1000));

    const mintHash = await exec({
      address: CCTP.MESSAGE_TRANSMITTER,
      abi: MESSAGE_TRANSMITTER_ABI,
      functionName: "receiveMessage",
      args: [attestationMsg.message, attestationMsg.attestation],
    }, arcTestnet.id);

    return { txHash: mintHash };
  }, [address, chainId, switchChainAsync, writeContractAsync, arcClient, sepoliaClient]);

  // ── approve ──────────────────────────────────────────────────────────────
  const approve = useCallback(async ({ token, spender, amount, cid }) => {
    const hash = await exec({
      address: token,
      abi: erc20Abi,
      functionName: "approve",
      args: [spender, typeof amount === "string" ? parseUnits(amount, 6) : amount],
    }, cid);
    return hash;
  }, [address, writeContractAsync, arcClient, sepoliaClient]);

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

  return {
    approve,
    quote,
    swap,
    bridge,
    isWritePending,
  };
}
