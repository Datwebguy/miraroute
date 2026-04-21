import { useState, useCallback } from 'react';
import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { erc20Abi, maxUint256, parseUnits } from 'viem';
import { arcTestnet, CONTRACTS, ARC_ADAPTER } from '../utils/constants';
import { useArcKit } from './useArcKit';

function safeParseUnits(str) {
  try { return str && parseFloat(str) > 0 ? parseUnits(str, 6) : 0n; }
  catch { return 0n; }
}

function saveMiraHistory(entry) {
  try {
    const h = JSON.parse(localStorage.getItem('miraHistory') || '[]');
    h.unshift(entry);
    localStorage.setItem('miraHistory', JSON.stringify(h.slice(0, 100)));
  } catch {}
}

// step: 'idle' | 'approving' | 'swapping' | 'success' | 'error'
export function useSwap({ address, fromSym, toSym, amount, slippageBps = 50 }) {
  const arcKit = useArcKit();
  const amountRaw    = safeParseUnits(amount);
  const tokenInAddr  = CONTRACTS[fromSym];

  const [step,        setStep]        = useState('idle');
  const [error,       setError]       = useState(null);
  const [txHash,      setTxHash]      = useState(null);
  const [approveTxHash, setApproveTxHash] = useState(undefined);

  // ── allowance check ───────────────────────────────────────────────────────
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address:      tokenInAddr,
    abi:          erc20Abi,
    functionName: 'allowance',
    args:         address ? [address, ARC_ADAPTER] : undefined,
    chainId:      arcTestnet.id,
    query:        { enabled: !!address && !!tokenInAddr && amountRaw > 0n, staleTime: 3000 },
  });

  const needsApproval = !!address && allowance !== undefined && amountRaw > 0n && allowance < amountRaw;

  // ── approval tx ───────────────────────────────────────────────────────────
  const { writeContractAsync: approveAsync, isPending: isApprovePending } = useWriteContract();

  const { isLoading: isWaitingApprove, isSuccess: isApproveConfirmed } =
    useWaitForTransactionReceipt({
      hash:    approveTxHash,
      chainId: arcTestnet.id,
      query:   { enabled: !!approveTxHash },
    });

  // ── actions ───────────────────────────────────────────────────────────────
  const approve = useCallback(async () => {
    setError(null);
    setStep('approving');
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
      setError(msg.toLowerCase().includes('rejected') ? 'Approval rejected' : 'Approval failed. Try again.');
      setStep('error');
    }
  }, [tokenInAddr, approveAsync]);

  const executeSwap = useCallback(async () => {
    setError(null);
    setStep('swapping');
    try {
      await refetchAllowance();
      const result = await arcKit.swap({ tokenIn: fromSym, tokenOut: toSym, amountIn: amount, slippageBps });
      const hash =
        result?.txHash || result?.hash || result?.transactionHash ||
        result?.receipt?.transactionHash ||
        (result?.explorerUrl ? result.explorerUrl.split('/tx/').pop() : null) ||
        null;
      setTxHash(hash);
      saveMiraHistory({ type: 'Swap', fromSym, toSym, amount: parseFloat(amount) || 0, hash, date: Date.now() });
      setStep('success');
      return { txHash: hash };
    } catch (err) {
      const msg = String(err?.message ?? err ?? '');
      setError(msg.toLowerCase().includes('rejected') ? 'Transaction rejected' : msg.slice(0, 100) || 'Swap failed.');
      setStep('error');
      return null;
    }
  }, [fromSym, toSym, amount, slippageBps, arcKit, refetchAllowance]);

  const reset = useCallback(() => {
    setStep('idle');
    setError(null);
    setTxHash(null);
    setApproveTxHash(undefined);
  }, []);

  const isApproving = isApprovePending || isWaitingApprove;

  return {
    step,
    needsApproval,
    isApproving,
    isApproveConfirmed,
    approve,
    executeSwap,
    reset,
    txHash,
    error,
    refetchAllowance,
  };
}
