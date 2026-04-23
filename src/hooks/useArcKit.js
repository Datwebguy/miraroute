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

    // 2. Gas Estimation
    let gasLimit = 800000n;
    try {
      const client = cid === sepolia.id ? sepoliaClient : arcClient;
      gasLimit = await client.estimateContractGas({
        address: params.address,
        abi: params.abi,
        functionName: params.functionName,
        args: params.args,
        account: address,
      });
      // Add 20% buffer
      gasLimit = (gasLimit * 120n) / 100n;
    } catch (e) {
      console.warn("[ArcKit] Gas estimation failed, using fallback 800k", e);
    }

    // 3. Raw Params for RPC
    const txParams = {
      ...params,
      gas: gasLimit,
      nonce: nonce,
    };

    if (cid === arcTestnet.id) {
      // Arc Testnet specific fee strategy: USDC as gas
      txParams.maxFeePerGas = parseUnits("1.5", "gwei"); // Lowered from 1000 to be more realistic but safe
      txParams.maxPriorityFeePerGas = parseUnits("0.1", "gwei");
    }

    // 4. THE TRUTH TEST LOG
    console.log("SENDING RAW TRANSACTION TO RPC:", {
      address: params.address,
      function: params.functionName,
      args: params.args,
      nonce: nonce,
      gas: gasLimit.toString(),
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
  const bridge = useCallback(async ({ amount, onProgress, burnHash: existingHash, onBurnHash }) => {
    let burnHash = existingHash;

    if (!burnHash) {
      if (chainId !== sepolia.id) {
        await switchChainAsync({ chainId: sepolia.id });
        await new Promise(r => setTimeout(r, 1000));
      }

      onProgress?.(2); // Step 2: Locking/Burning
      const amountRaw = parseUnits(amount.toString(), 6);
      burnHash = await exec({
        address: CCTP.TOKEN_MESSENGER,
        abi: TOKEN_MESSENGER_ABI,
        functionName: "depositForBurn",
        args: [amountRaw, CCTP.ARC_DOMAIN, `0x${address.slice(2).padStart(64, "0")}`,
               TOKENS.USDC_SEPOLIA.address, ZERO_BYTES32, 0n, 1000],
      }, sepolia.id);
      
      onBurnHash?.(burnHash);
    }

    // Wait for real receipt (if we just burned or if we resumed)
    console.log("WAITING FOR ON-CHAIN CONFIRMATION (SEPOLIA)...", burnHash);
    const receipt = await sepoliaClient.waitForTransactionReceipt({ hash: burnHash });
    
    onProgress?.(3); // Step 3: Attesting
    let attestationMsg = null;
    for (let k = 0; k < 120; k++) { // Increased timeout to 10 mins (120 * 5s)
      await new Promise(r => setTimeout(r, 5000));
      const res = await fetch(`${ATTESTATION_API}/${CCTP.SEPOLIA_DOMAIN}?transactionHash=${receipt.transactionHash}`);
      const data = await res.json();
      if (data?.messages?.[0]?.status === "complete") {
        attestationMsg = data.messages[0];
        break;
      }
      if (k % 5 === 0) console.log(`[ArcKit] Polling attestation... (${k}/120)`);
    }
    if (!attestationMsg) throw new Error("CCTP Attestation timeout. Please try again later.");

    onProgress?.(4); // Step 4: Minting
    if (chainId !== CHAIN.ARC_TESTNET_ID) {
      await switchChainAsync({ chainId: CHAIN.ARC_TESTNET_ID });
      await new Promise(r => setTimeout(r, 1000));
    }

    const mintHash = await exec({
      address: CCTP.MESSAGE_TRANSMITTER,
      abi: MESSAGE_TRANSMITTER_ABI,
      functionName: "receiveMessage",
      args: [attestationMsg.message, attestationMsg.attestation],
    }, arcTestnet.id);

    return { txHash: mintHash, burnTxHash: burnHash };
  }, [address, chainId, switchChainAsync, writeContractAsync, arcClient, sepoliaClient]);

  // ── approve ──────────────────────────────────────────────────────────────
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

  // ── Gateway (Unified Balance) ──────────────────────────────────────────
  
  const signBurnIntent = useCallback(async ({ amount, destinationDomain, destinationRecipient }) => {
    if (!address) throw new Error("Wallet not connected");

    const domain = { name: "GatewayWallet", version: "1", chainId: CHAIN.ARC_TESTNET_ID };
    const types = {
      TransferSpec: [
        { name: "version", type: "uint32" },
        { name: "sourceDomain", type: "uint32" },
        { name: "destinationDomain", type: "uint32" },
        { name: "sourceContract", type: "bytes32" },
        { name: "destinationContract", type: "bytes32" },
        { name: "sourceToken", type: "bytes32" },
        { name: "destinationToken", type: "bytes32" },
        { name: "sourceDepositor", type: "bytes32" },
        { name: "destinationRecipient", type: "bytes32" },
        { name: "sourceSigner", type: "bytes32" },
        { name: "destinationCaller", type: "bytes32" },
        { name: "value", type: "uint256" },
        { name: "salt", type: "bytes32" },
        { name: "hookData", type: "bytes" },
      ],
      BurnIntent: [
        { name: "maxBlockHeight", type: "uint256" },
        { name: "maxFee", type: "uint256" },
        { name: "spec", type: "TransferSpec" },
      ],
    };

    const addrTo32 = (addr) => `0x${addr.toLowerCase().replace(/^0x/, "").padStart(64, "0")}`;
    
    const amountRaw = parseUnits(amount.toString(), 6);
    const salt = `0x${Array.from(crypto.getRandomValues(new Uint8Array(32))).map(b => b.toString(16).padStart(2, '0')).join('')}`;

    const message = {
      maxBlockHeight: 0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffn,
      maxFee: 2010000n,
      spec: {
        version: 1,
        sourceDomain: GATEWAY.SUPPORTED_CHAINS[GATEWAY.ARC_DOMAIN] ? 26 : 26, // ARC
        destinationDomain: destinationDomain,
        sourceContract: addrTo32(GATEWAY.WALLET),
        destinationContract: addrTo32(GATEWAY.MINTER),
        sourceToken: addrTo32(TOKENS.USDC_ARC.address),
        destinationToken: addrTo32(TOKENS.USDC_SEPOLIA.address), // Default to Sepolia USDC
        sourceDepositor: addrTo32(address),
        destinationRecipient: addrTo32(destinationRecipient || address),
        sourceSigner: addrTo32(address),
        destinationCaller: ZERO_BYTES32,
        value: amountRaw,
        salt: salt,
        hookData: "0x",
      }
    };

    const signature = await wagmiConfig.connector.signTypedData({
      domain,
      types,
      primaryType: "BurnIntent",
      message
    });

    return { burnIntent: message, signature };
  }, [address]);

  const gatewayMint = useCallback(async ({ attestation, signature }) => {
    const hash = await exec({
      address: GATEWAY.MINTER,
      abi: [{
        name: "gatewayMint", type: "function", stateMutability: "nonpayable",
        inputs: [{ name: "attestationPayload", type: "bytes" }, { name: "signature", type: "bytes" }],
        outputs: [],
      }],
      functionName: "gatewayMint",
      args: [attestation, signature],
    }, arcTestnet.id); // Or sepolia if minting on sepolia
    return hash;
  }, [address, writeContractAsync]);

  const gatewayBridge = useCallback(async ({ amount, destinationDomain, onProgress }) => {
    onProgress?.(1); // Step 1: Signing Intent
    const { burnIntent, signature } = await signBurnIntent({ amount, destinationDomain });

    onProgress?.(2); // Step 2: Submitting to Gateway
    const response = await fetch(`${GATEWAY.API_URL}/v1/transfer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([{ burnIntent, signature }]),
    });

    if (!response.ok) throw new Error(`Gateway API Error: ${response.status}`);
    const { attestation, signature: gatewaySig } = await response.json();

    onProgress?.(3); // Step 3: Minting on Destination
    // For Arc -> Sepolia, we need to switch to Sepolia to mint
    const destChainId = Object.keys(CHAIN).find(k => CHAIN[k] === destinationDomain) || CHAIN.SEPOLIA_ID; // Simplified logic
    if (chainId !== destChainId) {
      await switchChainAsync({ chainId: destChainId });
      await new Promise(r => setTimeout(r, 1000));
    }

    const mintHash = await gatewayMint({ attestation, signature: gatewaySig });
    return { txHash: mintHash, burnIntent };
  }, [address, chainId, signBurnIntent, gatewayMint, switchChainAsync]);

  return {
    approve,
    quote,
    swap,
    bridge,
    gatewayBridge,
    signBurnIntent,
    gatewayMint,
    isWritePending,
  };
}
