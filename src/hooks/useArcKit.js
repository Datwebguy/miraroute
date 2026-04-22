import { useCallback } from "react";
import { useAccount, useChainId, useSwitchChain } from "wagmi";
import { getConnectorClient, getPublicClient } from "@wagmi/core";
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
    name: "getBalances", type: "function",
    inputs: [],
    outputs: [{ type: "uint256[]" }],
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
  {
    name: "calc_token_amount", type: "function",
    inputs: [
      { name: "amounts",    type: "uint256[]" },
      { name: "is_deposit", type: "bool"      },
    ],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
];

// coins[0]=USDC (i=0), coins[1]=EURC (i=1)
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

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useArcKit() {
  const { connector, isConnected, address } = useAccount();
  const chainId = useChainId();
  const { switchChainAsync } = useSwitchChain();

  // ── quote (read-only, no wallet needed) ──────────────────────────────────────
  const quote = useCallback(async ({ tokenIn, tokenOut, amountIn }) => {
    if (!amountIn || parseFloat(amountIn) <= 0) return null;
    const amountRaw = parseUnits(amountIn.toString(), 6);
    const i = COIN_INDEX[tokenIn];
    const j = COIN_INDEX[tokenOut];
    try {
      const publicClient = getPublicClient(wagmiConfig, { chainId: arcTestnet.id });
      const out = await publicClient.readContract({
        address: STABLE_SWAP_POOL, abi: STABLE_SWAP_ABI,
        functionName: 'get_dy', args: [i, j, amountRaw],
      });
      return parseFloat(formatUnits(out, 6));
    } catch {
      return null;
    }
  }, []);

  // ── swap ──────────────────────────────────────────────────────────────────────
  const swap = useCallback(async ({ tokenIn, tokenOut, amountIn, onProgress }) => {
    if (!isConnected || !address) throw new Error("Wallet not connected");

    // Ensure we are on Arc Testnet before writing
    if (chainId !== CHAIN.ARC_TESTNET_ID) {
      await switchChainAsync({ chainId: CHAIN.ARC_TESTNET_ID });
      await new Promise(r => setTimeout(r, 600));
    }

    const walletClient = await getConnectorClient(wagmiConfig, {
      account: address, chainId: arcTestnet.id, connector,
    });
    const publicClient = getPublicClient(wagmiConfig, { chainId: arcTestnet.id });

    const amountRaw   = parseUnits(amountIn.toString(), 6);
    const tokenInAddr = CONTRACTS[tokenIn];
    const i = COIN_INDEX[tokenIn];
    const j = COIN_INDEX[tokenOut];

    // Step 1 — approve if needed
    const allowance = await publicClient.readContract({
      address: tokenInAddr, abi: erc20Abi, functionName: 'allowance',
      args: [address, STABLE_SWAP_POOL],
    });

    if (allowance < amountRaw) {
      onProgress?.('approving');
      const approveTx = await walletClient.writeContract({
        address: tokenInAddr, abi: erc20Abi, functionName: 'approve',
        args: [STABLE_SWAP_POOL, amountRaw],
        account: address, chain: arcTestnet,
      });
      const approveReceipt = await publicClient.waitForTransactionReceipt({
        hash: approveTx, timeout: 60_000,
      });
      if (approveReceipt.status !== 'success') throw new Error('Approval transaction failed on-chain.');
    }

    // Step 2 — swap
    onProgress?.('swapping');
    const txHash = await walletClient.writeContract({
      address: STABLE_SWAP_POOL, abi: STABLE_SWAP_ABI,
      functionName: 'swap', args: [i, j, amountRaw],
      account: address, chain: arcTestnet,
    });
    console.log('[MiraRoute] swap submitted:', txHash);

    // Step 3 — wait for receipt
    onProgress?.('confirming');
    const receipt = await publicClient.waitForTransactionReceipt({
      hash: txHash, timeout: 60_000,
    });

    if (receipt.status !== 'success') {
      throw new Error('Swap reverted on-chain. The pool may have insufficient liquidity.');
    }

    console.log('[MiraRoute] swap confirmed:', receipt.transactionHash);
    return { txHash: receipt.transactionHash };
  }, [connector, isConnected, address, chainId, switchChainAsync]);

  // ── addLiquidity ──────────────────────────────────────────────────────────────
  const addLiquidity = useCallback(async ({ usdcAmt, eurcAmt, onProgress }) => {
    if (!isConnected || !address) throw new Error("Wallet not connected");

    if (chainId !== CHAIN.ARC_TESTNET_ID) {
      await switchChainAsync({ chainId: CHAIN.ARC_TESTNET_ID });
      await new Promise(r => setTimeout(r, 600));
    }

    const walletClient = await getConnectorClient(wagmiConfig, {
      account: address, chainId: arcTestnet.id, connector,
    });
    const publicClient = getPublicClient(wagmiConfig, { chainId: arcTestnet.id });

    const usdcRaw = usdcAmt > 0 ? parseUnits(usdcAmt.toString(), 6) : 0n;
    const eurcRaw = eurcAmt > 0 ? parseUnits(eurcAmt.toString(), 6) : 0n;

    if (usdcRaw === 0n && eurcRaw === 0n) throw new Error("Enter at least one amount");

    // Approve USDC if needed
    if (usdcRaw > 0n) {
      const allowance = await publicClient.readContract({
        address: CONTRACTS.USDC, abi: erc20Abi, functionName: 'allowance',
        args: [address, STABLE_SWAP_POOL],
      });
      if (allowance < usdcRaw) {
        onProgress?.('approving-usdc');
        const tx = await walletClient.writeContract({
          address: CONTRACTS.USDC, abi: erc20Abi, functionName: 'approve',
          args: [STABLE_SWAP_POOL, usdcRaw],
          account: address, chain: arcTestnet,
        });
        const r = await publicClient.waitForTransactionReceipt({ hash: tx, timeout: 60_000 });
        if (r.status !== 'success') throw new Error('USDC approval failed');
      }
    }

    // Approve EURC if needed
    if (eurcRaw > 0n) {
      const allowance = await publicClient.readContract({
        address: CONTRACTS.EURC, abi: erc20Abi, functionName: 'allowance',
        args: [address, STABLE_SWAP_POOL],
      });
      if (allowance < eurcRaw) {
        onProgress?.('approving-eurc');
        const tx = await walletClient.writeContract({
          address: CONTRACTS.EURC, abi: erc20Abi, functionName: 'approve',
          args: [STABLE_SWAP_POOL, eurcRaw],
          account: address, chain: arcTestnet,
        });
        const r = await publicClient.waitForTransactionReceipt({ hash: tx, timeout: 60_000 });
        if (r.status !== 'success') throw new Error('EURC approval failed');
      }
    }

    // addLiquidity([usdc, eurc, 0]) — 3-token pool
    onProgress?.('depositing');
    const txHash = await walletClient.writeContract({
      address: STABLE_SWAP_POOL, abi: STABLE_SWAP_ABI,
      functionName: 'addLiquidity', args: [[usdcRaw, eurcRaw, 0n]],
      account: address, chain: arcTestnet,
    });

    onProgress?.('confirming');
    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash, timeout: 60_000 });
    if (receipt.status !== 'success') throw new Error('Add liquidity reverted on-chain.');

    console.log('[MiraRoute] addLiquidity confirmed:', receipt.transactionHash);
    return { txHash: receipt.transactionHash };
  }, [connector, isConnected, address, chainId, switchChainAsync]);

  // ── removeLiquidity ───────────────────────────────────────────────────────────
  const removeLiquidity = useCallback(async ({ lpAmt, onProgress }) => {
    if (!isConnected || !address) throw new Error("Wallet not connected");

    if (chainId !== CHAIN.ARC_TESTNET_ID) {
      await switchChainAsync({ chainId: CHAIN.ARC_TESTNET_ID });
      await new Promise(r => setTimeout(r, 600));
    }

    const walletClient = await getConnectorClient(wagmiConfig, {
      account: address, chainId: arcTestnet.id, connector,
    });
    const publicClient = getPublicClient(wagmiConfig, { chainId: arcTestnet.id });

    const lpRaw = parseUnits(lpAmt.toString(), 18);

    onProgress?.('withdrawing');
    const txHash = await walletClient.writeContract({
      address: STABLE_SWAP_POOL, abi: STABLE_SWAP_ABI,
      functionName: 'remove_liquidity', args: [lpRaw, [0n, 0n, 0n]],
      account: address, chain: arcTestnet,
    });

    onProgress?.('confirming');
    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash, timeout: 60_000 });
    if (receipt.status !== 'success') throw new Error('Remove liquidity reverted on-chain.');

    console.log('[MiraRoute] removeLiquidity confirmed:', receipt.transactionHash);
    return { txHash: receipt.transactionHash };
  }, [connector, isConnected, address, chainId, switchChainAsync]);

  // ── bridge (Sepolia → Arc via CCTP v2) ───────────────────────────────────────
  const bridge = useCallback(async ({ amount, onProgress }) => {
    if (!isConnected || !address) throw new Error("Wallet not connected");

    // Switch to Sepolia first
    if (chainId !== CHAIN.SEPOLIA_ID) {
      onProgress?.({ step: 0, label: 'Switching to Ethereum Sepolia…' });
      await switchChainAsync({ chainId: CHAIN.SEPOLIA_ID });
      await new Promise(r => setTimeout(r, 1000));
    }

    const sepoliaWallet = await getConnectorClient(wagmiConfig, {
      account: address, chainId: sepolia.id, connector,
    });
    const sepoliaPublic = getPublicClient(wagmiConfig, { chainId: sepolia.id });

    const amountRaw = parseUnits(amount.toString(), 6);

    // Step 1 — Approve USDC to TokenMessenger on Sepolia
    onProgress?.(1);
    const sepoliaAllowance = await sepoliaPublic.readContract({
      address: TOKENS.USDC_SEPOLIA.address, abi: erc20Abi, functionName: 'allowance',
      args: [address, CCTP.TOKEN_MESSENGER],
    });
    if (sepoliaAllowance < amountRaw) {
      const approveTx = await sepoliaWallet.writeContract({
        address: TOKENS.USDC_SEPOLIA.address, abi: erc20Abi, functionName: 'approve',
        args: [CCTP.TOKEN_MESSENGER, amountRaw],
        account: address, chain: sepolia,
      });
      await sepoliaPublic.waitForTransactionReceipt({ hash: approveTx, timeout: 60_000 });
    }

    // Step 2 — depositForBurn on Sepolia
    onProgress?.(2);
    const mintRecipient = `0x${address.slice(2).padStart(64, '0')}`;
    const burnTxHash = await sepoliaWallet.writeContract({
      address: CCTP.TOKEN_MESSENGER, abi: TOKEN_MESSENGER_ABI,
      functionName: 'depositForBurn',
      args: [amountRaw, CCTP.ARC_DOMAIN, mintRecipient, TOKENS.USDC_SEPOLIA.address, ZERO_BYTES32, 0n, 1000],
      account: address, chain: sepolia,
    });
    console.log('[MiraRoute] burn tx (Sepolia):', burnTxHash);
    await sepoliaPublic.waitForTransactionReceipt({ hash: burnTxHash });

    // Step 3 — Poll Circle attestation (~2–4 min)
    onProgress?.(3);
    let attestationMsg = null;
    for (let k = 0; k < 72; k++) {
      await new Promise(r => setTimeout(r, 5000));
      try {
        const res  = await fetch(`${ATTESTATION_API}/${CCTP.SEPOLIA_DOMAIN}?transactionHash=${burnTxHash}`);
        const data = await res.json();
        if (data?.messages?.[0]?.status === 'complete') {
          attestationMsg = data.messages[0];
          break;
        }
      } catch {}
    }
    if (!attestationMsg) throw new Error("Attestation timed out. Check ArcScan for mint status.");

    // Step 4 — Switch to Arc and receiveMessage
    onProgress?.(4);
    await switchChainAsync({ chainId: CHAIN.ARC_TESTNET_ID });
    await new Promise(r => setTimeout(r, 800));

    const arcWallet = await getConnectorClient(wagmiConfig, {
      account: address, chainId: arcTestnet.id, connector,
    });
    const arcPublic = getPublicClient(wagmiConfig, { chainId: arcTestnet.id });

    const mintTxHash = await arcWallet.writeContract({
      address: CCTP.MESSAGE_TRANSMITTER, abi: MESSAGE_TRANSMITTER_ABI,
      functionName: 'receiveMessage',
      args: [attestationMsg.message, attestationMsg.attestation],
      account: address, chain: arcTestnet,
    });
    console.log('[MiraRoute] mint tx (Arc):', mintTxHash);
    await arcPublic.waitForTransactionReceipt({ hash: mintTxHash, timeout: 60_000 });

    return { txHash: mintTxHash, burnTxHash };
  }, [connector, isConnected, address, chainId, switchChainAsync]);

  return { swap, bridge, quote, addLiquidity, removeLiquidity, isReady: isConnected };
}
