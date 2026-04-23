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
  STABLE_SWAP_POOL, CCTP, CHAIN, GATEWAY
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
  const { writeContractAsync, isPending: isWritePending } = useWriteContract();

  const arcClient = usePublicClient({ chainId: arcTestnet.id });
  const sepoliaClient = usePublicClient({ chainId: sepolia.id });

  // ── INTERNAL RAW EXECUTION ────────────────────────────────────────────────
  const exec = async (params, cid) => {
    if (!address) throw new Error("Wallet not connected");
    
    let nonce;
    try {
      const client = cid === sepolia.id ? sepoliaClient : arcClient;
      nonce = await client.getTransactionCount({ address, blockTag: 'pending' });
    } catch (e) {
      console.warn("[ArcKit] Nonce fetch failed", e);
    }

    let gasLimit = 800000n;
    try {
      const client = cid === sepolia.id ? sepoliaClient : arcClient;
      gasLimit = await client.estimateContractGas({
        address: params.address, abi: params.abi, functionName: params.functionName,
        args: params.args, account: address,
      });
      gasLimit = (gasLimit * 130n) / 100n; // 30% buffer
    } catch (e) {
      console.warn("[ArcKit] Gas estimation failed, using 800k", e);
    }

    const txParams = { ...params, gas: gasLimit, nonce };
    if (cid === arcTestnet.id) {
      txParams.maxFeePerGas = parseUnits("1.5", "gwei");
      txParams.maxPriorityFeePerGas = parseUnits("0.1", "gwei");
    }

    console.log("SENDING RAW TRANSACTION TO RPC:", {
      address: params.address, function: params.functionName, args: params.args,
      nonce, gas: gasLimit.toString(), chainId: cid
    });

    const hash = await writeContractAsync(txParams);
    if (!hash) throw new Error("Broadcast failed");
    console.log("TRANSACTION BROADCASTED:", hash);
    return hash;
  };

  // ── Helper: Allowance Check ──
  const ensureAllowance = async (token, spender, amount, cid) => {
    const client = cid === sepolia.id ? sepoliaClient : arcClient;
    const currentAllowance = await client.readContract({
      address: token, abi: erc20Abi, functionName: 'allowance', args: [address, spender]
    });
    if (currentAllowance < amount) {
      console.log(`[ArcKit] Insufficient allowance for ${token}. Approving...`);
      const hash = await exec({
        address: token, abi: erc20Abi, functionName: 'approve', args: [spender, amount]
      }, cid);
      await client.waitForTransactionReceipt({ hash });
      console.log(`[ArcKit] Approval confirmed for ${token}`);
    }
  };

  // ── swap ──────────────────────────────────────────────────────────────────
  const swap = useCallback(async ({ tokenIn, tokenOut, amountIn }) => {
    if (chainId !== CHAIN.ARC_TESTNET_ID) {
      await switchChainAsync({ chainId: CHAIN.ARC_TESTNET_ID });
      await new Promise(r => setTimeout(r, 1000));
    }

    const tokenInAddr = TOKENS[`${tokenIn}_ARC`].address;
    const amountRaw = parseUnits(amountIn.toString(), 6);

    await ensureAllowance(tokenInAddr, STABLE_SWAP_POOL, amountRaw, arcTestnet.id);

    const hash = await exec({
      address: STABLE_SWAP_POOL, abi: STABLE_SWAP_ABI, functionName: "swap",
      args: [COIN_INDEX[tokenIn], COIN_INDEX[tokenOut], amountRaw],
    }, arcTestnet.id);

    return { txHash: hash };
  }, [address, chainId, switchChainAsync, writeContractAsync, arcClient]);

  // ── bridge ───────────────────────────────────────────────────────────────
  const bridge = useCallback(async ({ amount, onProgress, burnHash: existingHash, onBurnHash }) => {
    let burnHash = existingHash;
    if (!burnHash) {
      if (chainId !== sepolia.id) {
        await switchChainAsync({ chainId: sepolia.id });
        await new Promise(r => setTimeout(r, 1000));
      }
      onProgress?.(2); 
      const amountRaw = parseUnits(amount.toString(), 6);
      
      await ensureAllowance(TOKENS.USDC_SEPOLIA.address, CCTP.TOKEN_MESSENGER, amountRaw, sepolia.id);

      burnHash = await exec({
        address: CCTP.TOKEN_MESSENGER, abi: TOKEN_MESSENGER_ABI, functionName: "depositForBurn",
        args: [amountRaw, CCTP.ARC_DOMAIN, `0x${address.slice(2).padStart(64, "0")}`,
               TOKENS.USDC_SEPOLIA.address, ZERO_BYTES32, 0n, 1000],
      }, sepolia.id);
      onBurnHash?.(burnHash);
    }

    console.log("WAITING FOR ON-CHAIN CONFIRMATION (SEPOLIA)...", burnHash);
    const receipt = await sepoliaClient.waitForTransactionReceipt({ hash: burnHash });
    
    onProgress?.(3);
    let attestationMsg = null;
    for (let k = 0; k < 120; k++) {
      await new Promise(r => setTimeout(r, 5000));
      try {
        const res = await fetch(`${ATTESTATION_API}/${CCTP.SEPOLIA_DOMAIN}?transactionHash=${receipt.transactionHash}`);
        const data = await res.json();
        if (data?.messages?.[0]?.status === "complete") {
          attestationMsg = data.messages[0];
          break;
        }
      } catch {}
      if (k % 5 === 0) console.log(`[ArcKit] Polling CCTP... (${k}/120)`);
    }
    if (!attestationMsg) throw new Error("CCTP Attestation timeout");

    onProgress?.(4);
    if (chainId !== CHAIN.ARC_TESTNET_ID) {
      await switchChainAsync({ chainId: CHAIN.ARC_TESTNET_ID });
      await new Promise(r => setTimeout(r, 1000));
    }

    const mintHash = await exec({
      address: CCTP.MESSAGE_TRANSMITTER, abi: MESSAGE_TRANSMITTER_ABI, functionName: "receiveMessage",
      args: [attestationMsg.message, attestationMsg.attestation],
    }, arcTestnet.id);

    return { txHash: mintHash, burnTxHash: burnHash };
  }, [address, chainId, switchChainAsync, writeContractAsync, sepoliaClient, arcClient]);

  // ── addLiquidity ──────────────────────────────────────────────────────────
  const addLiquidity = useCallback(async ({ usdcAmt, eurcAmt, onProgress }) => {
    if (chainId !== CHAIN.ARC_TESTNET_ID) {
      await switchChainAsync({ chainId: CHAIN.ARC_TESTNET_ID });
      await new Promise(r => setTimeout(r, 1000));
    }

    const usdcRaw = usdcAmt > 0 ? parseUnits(usdcAmt.toString(), 6) : 0n;
    const eurcRaw = eurcAmt > 0 ? parseUnits(eurcAmt.toString(), 6) : 0n;

    if (usdcRaw > 0) {
      onProgress?.('approving-usdc');
      await ensureAllowance(TOKENS.USDC_ARC.address, STABLE_SWAP_POOL, usdcRaw, arcTestnet.id);
    }
    if (eurcRaw > 0) {
      onProgress?.('approving-eurc');
      await ensureAllowance(TOKENS.EURC_ARC.address, STABLE_SWAP_POOL, eurcRaw, arcTestnet.id);
    }

    onProgress?.('depositing');
    const hash = await exec({
      address: STABLE_SWAP_POOL, abi: STABLE_SWAP_ABI, functionName: "addLiquidity",
      args: [[usdcRaw, eurcRaw, 0n]],
    }, arcTestnet.id);

    return { txHash: hash };
  }, [address, chainId, switchChainAsync, writeContractAsync, arcClient]);

  // ── removeLiquidity ───────────────────────────────────────────────────────
  const removeLiquidity = useCallback(async ({ lpAmt, onProgress }) => {
    onProgress?.('withdrawing');
    const lpRaw = parseUnits(lpAmt.toString(), 18); // LP tokens have 18 decimals
    const hash = await exec({
      address: STABLE_SWAP_POOL, abi: STABLE_SWAP_ABI, functionName: "remove_liquidity",
      args: [lpRaw, [0n, 0n, 0n]],
    }, arcTestnet.id);
    return { txHash: hash };
  }, [address, writeContractAsync]);

  // ── approve ──
  const approve = useCallback(async ({ token, spender, amount, cid }) => {
    const hash = await exec({
      address: token, abi: erc20Abi, functionName: "approve",
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
    approve, quote, swap, bridge,
    addLiquidity, removeLiquidity,
    isWritePending,
  };
}
