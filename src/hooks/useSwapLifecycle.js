import { useState, useEffect, useCallback } from 'react';
import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { erc20Abi, maxUint256, parseUnits } from 'viem';
import { arcTestnet, CONTRACTS, ARC_ADAPTER } from '../utils/constants';
import { adapterContractAbi } from '../utils/swapAbi';
import { fetchSwapTx } from '../utils/fetchSwapTx';

function safeParseUnits(str) {
  try { return str && parseFloat(str) > 0 ? parseUnits(str, 6) : 0n; }
  catch { return 0n; }
}

// 4-step wagmi state machine:
// 1. useReadContract  — check allowance
// 2. useWriteContract — approve tokenIn
// 3. useWaitForTransactionReceipt — wait for approval to mine
// 4. useWriteContract — call adapter execute()

export function useSwapLifecycle({ address, fromSym, toSym, amount, slippageBps = 50 }) {
  const amountRaw    = safeParseUnits(amount);
  const tokenInAddr  = CONTRACTS[fromSym];

  const [approveTxHash, setApproveTxHash] = useState(undefined);
  const [executeTxHash, setExecuteTxHash] = useState(undefined);
  const [error,         setError]         = useState(null);
  const [isFetching,    setIsFetching]    = useState(false);

  // ── Step 1: read current allowance ──────────────────────────────────────────
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address:      tokenInAddr,
    abi:          erc20Abi,
    functionName: 'allowance',
    args:         address ? [address, ARC_ADAPTER] : undefined,
    chainId:      arcTestnet.id,
    query:        { enabled: !!address && !!tokenInAddr && amountRaw > 0n, staleTime: 3000 },
  });

  const needsApproval = !!address && allowance !== undefined && amountRaw > 0n && allowance < amountRaw;

  // ── Step 2: approve ──────────────────────────────────────────────────────────
  const { writeContractAsync: approveAsync, isPending: isApprovePending } = useWriteContract();

  // ── Step 3: wait for approval receipt ────────────────────────────────────────
  const { isSuccess: isApproveConfirmed, isLoading: isWaitingApprove } =
    useWaitForTransactionReceipt({
      hash:    approveTxHash,
      chainId: arcTestnet.id,
      query:   { enabled: !!approveTxHash },
    });

  useEffect(() => {
    if (isApproveConfirmed && approveTxHash) refetchAllowance();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isApproveConfirmed, approveTxHash]);

  // ── Step 4: execute swap ──────────────────────────────────────────────────────
  const { writeContractAsync: executeAsync, isPending: isExecutePending } = useWriteContract();

  const { isSuccess: isSwapConfirmed, isLoading: isWaitingSwap, data: swapReceipt } =
    useWaitForTransactionReceipt({
      hash:    executeTxHash,
      chainId: arcTestnet.id,
      query:   { enabled: !!executeTxHash },
    });

  // ── Derived state ─────────────────────────────────────────────────────────────
  const isApproving = isApprovePending || isWaitingApprove;
  const isExecuting = isFetching || isExecutePending || isWaitingSwap;

  const swapStatus =
    isExecuting     ? 'executing'      :
    isApproving     ? 'approving'      :
    isSwapConfirmed ? 'success'        :
    needsApproval   ? 'needs_approval' :
                      'ready';

  const txHash = swapReceipt?.transactionHash ?? executeTxHash ?? null;

  // ── Actions ───────────────────────────────────────────────────────────────────
  const approve = useCallback(async () => {
    setError(null);
    try {
      const hash = await approveAsync({
        address:      tokenInAddr,
        abi:          erc20Abi,
        functionName: 'approve',
        args:         [ARC_ADAPTER, maxUint256],
        chainId:      arcTestnet.id,
      });
      setApproveTxHash(hash);
    } catch (err) {
      const msg = String(err?.message ?? '');
      setError(
        msg.toLowerCase().includes('rejected') || msg.toLowerCase().includes('denied')
          ? 'Approval rejected by wallet'
          : 'Approval failed. Please try again.'
      );
    }
  }, [tokenInAddr, approveAsync]);

  const executeSwap = useCallback(async () => {
    setError(null);
    setIsFetching(true);
    try {
      const { executeParams, tokenInputs, signature, nativeValue } = await fetchSwapTx({
        tokenIn:    fromSym,
        tokenOut:   toSym,
        amount,
        fromAddress: address,
        slippageBps,
      });
      setIsFetching(false);
      const hash = await executeAsync({
        address:      ARC_ADAPTER,
        abi:          adapterContractAbi,
        functionName: 'execute',
        args:         [executeParams, tokenInputs, signature],
        value:        nativeValue,
        chainId:      arcTestnet.id,
      });
      setExecuteTxHash(hash);
    } catch (err) {
      setIsFetching(false);
      const msg = String(err?.message ?? err ?? '');
      console.error('[MiraRoute swap error]', err);
      setError(
        msg.toLowerCase().includes('rejected') || msg.toLowerCase().includes('denied')
          ? 'Transaction rejected by wallet'
          : msg ? `Swap error: ${msg.slice(0, 100)}` : 'Swap failed. Try again.'
      );
    }
  }, [fromSym, toSym, amount, address, slippageBps, executeAsync]);

  const reset = useCallback(() => {
    setApproveTxHash(undefined);
    setExecuteTxHash(undefined);
    setError(null);
    setIsFetching(false);
  }, []);

  return {
    swapStatus,
    needsApproval,
    approve,
    executeSwap,
    reset,
    txHash,
    error,
    isApproving,
    isExecuting,
    refetchAllowance,
  };
}
