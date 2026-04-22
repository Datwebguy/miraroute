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

// ── StableSwapPool ABI ────────────────────────────────────────────────────────
// Verified pool: 0x2F4490e7c6F3DaC23ffEe6e71bFcb5d1CCd7d4eC
// coins[0] = USDC (i=0), coins[1] = EURC (i=1)
// All index params use uint256 (not int128).
const STABLE_SWAP_ABI = [
  {
    name: "swap", type: "function",
    inputs: [
      { name: "i",     type: "uint256" },
      { name: "j",     type: "uint256" },
      { name: "dx",    type: "uint256" },
      { name: "minDy", type: "uint256" },
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
    name: "addLiquidity", type: "function",
    inputs: [
      { name: "amounts",       type: "uint256[]" },
      { name: "minMintAmount", type: "uint256"   },
    ],
    outputs: [{ type: "uint256" }],
    stateMutability: "nonpayable",
  },
  {
    name: "removeLiquidity", type: "function",
    inputs: [
      { name: "amount",     type: "uint256"   },
      { name: "minAmounts", type: "uint256[]" },
    ],
    outputs: [{ type: "uint256[]" }],
    stateMutability: "nonpayable",
  },
  {
    name: "removeLiquidityOneToken", type: "function",
    inputs: [
      { name: "tokenAmount", type: "uint256" },
      { name: "i",           type: "uint256" },
      { name: "minAmount",   type: "uint256" },
    ],
    outputs: [{ type: "uint256" }],
    stateMutability: "nonpayable",
  },
  {
    name: "balances", type: "function",
    inputs: [{ name: "i", type: "uint256" }],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
  {
    name: "get_virtual_price", type: "function",
    inputs: [],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
  {
    name: "token", type: "function",
    inputs: [],
    outputs: [{ type: "address" }],
    stateMutability: "view",
  },
];

// coins[0] = USDC (i=0), coins[1] = EURC (i=1)
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

// ── Shared helpers ────────────────────────────────────────────────────────────

function makeArcPublic() {
  return createPublicClient({
    chain:     arcTestnet,
    transport: http(CHAIN.ARC_RPC),
  });
}

async function ensureApproval(walletClient, publicClient, tokenAddr, owner, spender, amountRaw) {
  const allowance = await publicClient.readContract({
    address: tokenAddr, abi: erc20Abi, functionName: 'allowance',
    args: [owner, spender],
  });
  if (allowance < amountRaw) {
    const hash = await walletClient.writeContract({
      address: tokenAddr, abi: erc20Abi, functionName: 'approve',
      args: [spender, amountRaw],
    });
    await publicClient.waitForTransactionReceipt({ hash, timeout: 60_000 });
  }
}

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
      const out = await makeArcPublic().readContract({
        address: STABLE_SWAP_POOL, abi: STABLE_SWAP_ABI,
        functionName: 'get_dy', args: [i, j, amountRaw],
      });
      return parseFloat(formatUnits(out, 6));
    } catch {
      return null;
    }
  }, []);

  // ── swap ──────────────────────────────────────────────────────────────────────
  const swap = useCallback(async ({ tokenIn, tokenOut, amountIn, slippageBps = 50 }) => {
    if (!connector || !address) throw new Error("Wallet not connected");

    const provider    = await connector.getProvider();
    const walletClient = createWalletClient({
      account: address, chain: arcTestnet, transport: custom(provider),
    });
    const publicClient = makeArcPublic();

    const amountRaw   = parseUnits(amountIn.toString(), 6);
    const tokenInAddr = CONTRACTS[tokenIn];
    const i = COIN_INDEX[tokenIn];
    const j = COIN_INDEX[tokenOut];

    // On-chain quote for slippage protection
    let minOut = 0n;
    try {
      const expectedOut = await publicClient.readContract({
        address: STABLE_SWAP_POOL, abi: STABLE_SWAP_ABI,
        functionName: 'get_dy', args: [i, j, amountRaw],
      });
      minOut = expectedOut * BigInt(10000 - slippageBps) / 10000n;
    } catch {}

    // Approve exact amount (not maxUint256)
    await ensureApproval(walletClient, publicClient, tokenInAddr, address, STABLE_SWAP_POOL, amountRaw);

    // Execute swap
    const txHash = await walletClient.writeContract({
      address: STABLE_SWAP_POOL, abi: STABLE_SWAP_ABI,
      functionName: 'swap', args: [i, j, amountRaw, minOut],
    });
    console.log('[MiraRoute] swap tx:', txHash);

    return { txHash };
  }, [connector, address]);

  // ── addLiquidity ──────────────────────────────────────────────────────────────
  // amounts[0] = USDC (index 0), amounts[1] = EURC (index 1)
  const addLiquidity = useCallback(async ({ usdcAmount, eurcAmount, onProgress }) => {
    if (!connector || !address) throw new Error("Wallet not connected");

    const provider    = await connector.getProvider();
    const walletClient = createWalletClient({
      account: address, chain: arcTestnet, transport: custom(provider),
    });
    const publicClient = makeArcPublic();

    const usdcRaw = parseUnits((usdcAmount || 0).toString(), 6);
    const eurcRaw = parseUnits((eurcAmount || 0).toString(), 6);

    if (usdcRaw > 0n) {
      onProgress?.('approving-usdc');
      await ensureApproval(walletClient, publicClient, CONTRACTS.USDC, address, STABLE_SWAP_POOL, usdcRaw);
    }

    if (eurcRaw > 0n) {
      onProgress?.('approving-eurc');
      await ensureApproval(walletClient, publicClient, CONTRACTS.EURC, address, STABLE_SWAP_POOL, eurcRaw);
    }

    onProgress?.('depositing');
    const txHash = await walletClient.writeContract({
      address: STABLE_SWAP_POOL, abi: STABLE_SWAP_ABI,
      functionName: 'addLiquidity',
      args: [[usdcRaw, eurcRaw], 0n],
    });
    console.log('[MiraRoute] addLiquidity tx:', txHash);

    return { txHash };
  }, [connector, address]);

  // ── removeLiquidity ───────────────────────────────────────────────────────────
  const removeLiquidity = useCallback(async ({ lpAmount, lpTokenAddr, onProgress }) => {
    if (!connector || !address) throw new Error("Wallet not connected");

    const provider    = await connector.getProvider();
    const walletClient = createWalletClient({
      account: address, chain: arcTestnet, transport: custom(provider),
    });
    const publicClient = makeArcPublic();

    const lpRaw = parseUnits(lpAmount.toString(), 18);

    onProgress?.('approving');
    await ensureApproval(walletClient, publicClient, lpTokenAddr, address, STABLE_SWAP_POOL, lpRaw);

    onProgress?.('removing');
    const txHash = await walletClient.writeContract({
      address: STABLE_SWAP_POOL, abi: STABLE_SWAP_ABI,
      functionName: 'removeLiquidity',
      args: [lpRaw, [0n, 0n]],
    });
    console.log('[MiraRoute] removeLiquidity tx:', txHash);

    return { txHash };
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
    const sepoliaPublic = createPublicClient({
      chain: sepolia, transport: http('https://rpc.sepolia.org'),
    });

    const amountRaw = parseUnits(amount.toString(), 6);

    // Step 1 — Approve USDC to TokenMessenger on Sepolia (exact amount)
    onProgress?.(1);
    await ensureApproval(
      sepoliaWallet, sepoliaPublic,
      TOKENS.USDC_SEPOLIA.address, address,
      CCTP.TOKEN_MESSENGER, amountRaw,
    );

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
    for (let i = 0; i < 72; i++) {
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

    // Step 4 — Switch back to Arc and receiveMessage (mints USDC)
    onProgress?.(4);
    await switchChainAsync({ chainId: CHAIN.ARC_TESTNET_ID });
    await new Promise(r => setTimeout(r, 800));

    const arcProvider = await connector.getProvider();
    const arcWallet   = createWalletClient({
      account: address, chain: arcTestnet, transport: custom(arcProvider),
    });
    const mintTxHash = await arcWallet.writeContract({
      address: CCTP.MESSAGE_TRANSMITTER, abi: MESSAGE_TRANSMITTER_ABI,
      functionName: 'receiveMessage',
      args: [attestationMsg.message, attestationMsg.attestation],
    });
    console.log('[MiraRoute] mint tx (Arc):', mintTxHash);

    return { txHash: mintTxHash, burnTxHash };
  }, [connector, address, chainId, switchChainAsync]);

  return { swap, bridge, quote, addLiquidity, removeLiquidity, isReady: isConnected };
}
