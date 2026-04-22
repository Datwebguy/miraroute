import { useCallback } from "react";
import { useAccount, useChainId, useSwitchChain } from "wagmi";
import {
  createWalletClient,
  createPublicClient,
  custom,
  http,
  parseUnits,
  formatUnits,
  erc20Abi,
} from "viem";
import { sepolia } from "wagmi/chains";
import { arcTestnet, TOKENS, CONTRACTS, STABLE_SWAP_POOL, CCTP, CHAIN } from "../utils/constants";

// ── StableSwapPool ABI (verified from ArcScan — Solidity 0.8.20) ─────────────
// Address: 0x2F4490e7c6F3DaC23ffEe6e71bFcb5d1CCd7d4eC
// tokens[0]=USDC, tokens[1]=EURC, tokens[2]=third token
// LP token = pool contract itself (ERC-20, 18 decimals)
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
      { name: "amounts",     type: "uint256[]" },
      { name: "is_deposit",  type: "bool"      },
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

  // ── quote (read-only) ─────────────────────────────────────────────────────────
  const quote = useCallback(async ({ tokenIn, tokenOut, amountIn }) => {
    if (!amountIn || parseFloat(amountIn) <= 0) return null;
    const amountRaw = parseUnits(amountIn.toString(), 6);
    const i = COIN_INDEX[tokenIn];
    const j = COIN_INDEX[tokenOut];
    try {
      const publicClient = createPublicClient({
        chain: arcTestnet, transport: http(CHAIN.ARC_RPC),
      });
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
  // onProgress: 'approving' | 'swapping' | 'confirming'
  // Returns { txHash } only after on-chain receipt confirms with status='success'
  const swap = useCallback(async ({ tokenIn, tokenOut, amountIn, onProgress }) => {
    if (!connector || !address) throw new Error("Wallet not connected");

    const provider = await connector.getProvider();

    const walletClient = createWalletClient({
      account: address, chain: arcTestnet, transport: custom(provider),
    });
    // Use same provider transport as wallet so polling sees the same mempool
    const publicClient = createPublicClient({
      chain: arcTestnet, transport: custom(provider),
    });

    const amountRaw   = parseUnits(amountIn.toString(), 6);
    const tokenInAddr = CONTRACTS[tokenIn];
    const i = COIN_INDEX[tokenIn];
    const j = COIN_INDEX[tokenOut];

    // Step 1 — Check allowance, approve only if needed (exact amount)
    const allowance = await publicClient.readContract({
      address: tokenInAddr, abi: erc20Abi, functionName: 'allowance',
      args: [address, STABLE_SWAP_POOL],
    });

    if (allowance < amountRaw) {
      onProgress?.('approving');
      const approveTx = await walletClient.writeContract({
        address: tokenInAddr, abi: erc20Abi, functionName: 'approve',
        args: [STABLE_SWAP_POOL, amountRaw],
      });
      const approveReceipt = await publicClient.waitForTransactionReceipt({
        hash: approveTx, timeout: 60_000,
      });
      if (approveReceipt.status !== 'success') {
        throw new Error('Approval transaction failed on-chain.');
      }
    }

    // Step 2 — Submit swap
    onProgress?.('swapping');
    const txHash = await walletClient.writeContract({
      address: STABLE_SWAP_POOL, abi: STABLE_SWAP_ABI,
      functionName: 'swap', args: [i, j, amountRaw],
    });
    console.log('[MiraRoute] swap submitted:', txHash);

    // Step 3 — Wait for on-chain confirmation (DO NOT return early)
    onProgress?.('confirming');
    const receipt = await publicClient.waitForTransactionReceipt({
      hash: txHash, timeout: 60_000,
    });

    if (receipt.status !== 'success') {
      throw new Error(
        'Swap reverted on-chain. The pool may have insufficient liquidity or your balance is too low.'
      );
    }

    console.log('[MiraRoute] swap confirmed:', receipt.transactionHash);
    return { txHash: receipt.transactionHash };
  }, [connector, address]);

  // ── bridge (Sepolia → Arc via CCTP v2) ───────────────────────────────────────
  const bridge = useCallback(async ({ amount, onProgress }) => {
    if (!connector || !address) throw new Error("Wallet not connected");

    // Must be on Sepolia to initiate the burn
    if (chainId !== CHAIN.SEPOLIA_ID) {
      onProgress?.({ step: 0, label: 'Switching to Ethereum Sepolia…' });
      await switchChainAsync({ chainId: CHAIN.SEPOLIA_ID });
      await new Promise(r => setTimeout(r, 1000));
    }

    const provider = await connector.getProvider();
    const sepoliaWallet = createWalletClient({
      account: address, chain: sepolia, transport: custom(provider),
    });
    // Use same provider as wallet — avoids unreliable public RPCs timing out
    const sepoliaPublic = createPublicClient({
      chain: sepolia, transport: custom(provider),
    });

    const amountRaw = parseUnits(amount.toString(), 6);

    // Step 1 — Approve USDC to TokenMessenger on Sepolia (exact amount)
    onProgress?.(1);
    const sepoliaAllowance = await sepoliaPublic.readContract({
      address: TOKENS.USDC_SEPOLIA.address, abi: erc20Abi, functionName: 'allowance',
      args: [address, CCTP.TOKEN_MESSENGER],
    });
    if (sepoliaAllowance < amountRaw) {
      const approveTx = await sepoliaWallet.writeContract({
        address: TOKENS.USDC_SEPOLIA.address, abi: erc20Abi, functionName: 'approve',
        args: [CCTP.TOKEN_MESSENGER, amountRaw],
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

    // Step 4 — Switch back to Arc and receiveMessage
    onProgress?.(4);
    await switchChainAsync({ chainId: CHAIN.ARC_TESTNET_ID });
    await new Promise(r => setTimeout(r, 800));

    const arcProvider = await connector.getProvider();
    const arcWallet   = createWalletClient({
      account: address, chain: arcTestnet, transport: custom(arcProvider),
    });
    const arcPublic = createPublicClient({
      chain: arcTestnet, transport: custom(arcProvider),
    });
    const mintTxHash = await arcWallet.writeContract({
      address: CCTP.MESSAGE_TRANSMITTER, abi: MESSAGE_TRANSMITTER_ABI,
      functionName: 'receiveMessage',
      args: [attestationMsg.message, attestationMsg.attestation],
    });
    console.log('[MiraRoute] mint tx (Arc):', mintTxHash);
    await arcPublic.waitForTransactionReceipt({ hash: mintTxHash, timeout: 60_000 });

    return { txHash: mintTxHash, burnTxHash };
  }, [connector, address, chainId, switchChainAsync]);

  // ── addLiquidity (deposit USDC + EURC into the pool) ─────────────────────────
  // onProgress: 'approving-usdc' | 'approving-eurc' | 'depositing' | 'confirming'
  const addLiquidity = useCallback(async ({ usdcAmt, eurcAmt, onProgress }) => {
    if (!connector || !address) throw new Error("Wallet not connected");

    const provider = await connector.getProvider();
    const walletClient = createWalletClient({
      account: address, chain: arcTestnet, transport: custom(provider),
    });
    const publicClient = createPublicClient({
      chain: arcTestnet, transport: custom(provider),
    });

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
        });
        const r = await publicClient.waitForTransactionReceipt({ hash: tx, timeout: 60_000 });
        if (r.status !== 'success') throw new Error('EURC approval failed');
      }
    }

    // addLiquidity([usdc, eurc, 0]) — 3-token pool, 3rd slot is 0
    onProgress?.('depositing');
    const txHash = await walletClient.writeContract({
      address: STABLE_SWAP_POOL, abi: STABLE_SWAP_ABI,
      functionName: 'addLiquidity',
      args: [[usdcRaw, eurcRaw, 0n]],
    });

    onProgress?.('confirming');
    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash, timeout: 60_000 });
    if (receipt.status !== 'success') throw new Error('Add liquidity reverted on-chain.');

    console.log('[MiraRoute] addLiquidity confirmed:', receipt.transactionHash);
    return { txHash: receipt.transactionHash };
  }, [connector, address]);

  // ── removeLiquidity (withdraw LP tokens from the pool) ────────────────────────
  // onProgress: 'withdrawing' | 'confirming'
  const removeLiquidity = useCallback(async ({ lpAmt, onProgress }) => {
    if (!connector || !address) throw new Error("Wallet not connected");

    const provider = await connector.getProvider();
    const walletClient = createWalletClient({
      account: address, chain: arcTestnet, transport: custom(provider),
    });
    const publicClient = createPublicClient({
      chain: arcTestnet, transport: custom(provider),
    });

    // LP tokens are 18-decimal (CurveStableSwap LP standard)
    const lpRaw = parseUnits(lpAmt.toString(), 18);

    onProgress?.('withdrawing');
    const txHash = await walletClient.writeContract({
      address: STABLE_SWAP_POOL, abi: STABLE_SWAP_ABI,
      functionName: 'remove_liquidity',
      args: [lpRaw, [0n, 0n, 0n]],
    });

    onProgress?.('confirming');
    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash, timeout: 60_000 });
    if (receipt.status !== 'success') throw new Error('Remove liquidity reverted on-chain.');

    console.log('[MiraRoute] removeLiquidity confirmed:', receipt.transactionHash);
    return { txHash: receipt.transactionHash };
  }, [connector, address]);

  return { swap, bridge, quote, addLiquidity, removeLiquidity, isReady: isConnected };
}
