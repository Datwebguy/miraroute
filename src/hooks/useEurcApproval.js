import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { erc20Abi, maxUint256, parseUnits } from "viem";
import { arcTestnet, CONTRACTS, ARC_ADAPTER } from "../utils/constants";

function safeParseUnits(str, decimals) {
  try { return str ? parseUnits(str, decimals) : 0n; }
  catch { return 0n; }
}

export function useEurcApproval(address, amountStr) {
  const amountRaw = safeParseUnits(amountStr, 6);

  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: CONTRACTS.EURC,
    abi: erc20Abi,
    functionName: "allowance",
    args: address ? [address, ARC_ADAPTER] : undefined,
    chainId: arcTestnet.id,
    query: { enabled: !!address, staleTime: 4000 },
  });

  const {
    writeContractAsync,
    data: approveTxHash,
    isPending: isWritePending,
  } = useWriteContract();

  const { isSuccess: isApproveConfirmed, isLoading: isWaitingReceipt } =
    useWaitForTransactionReceipt({
      hash: approveTxHash,
      chainId: arcTestnet.id,
      query: { enabled: !!approveTxHash },
    });

  const needsApproval =
    !!address && allowance != null && amountRaw > 0n && allowance < amountRaw;

  const approve = () =>
    writeContractAsync({
      address: CONTRACTS.EURC,
      abi: erc20Abi,
      functionName: "approve",
      args: [ARC_ADAPTER, maxUint256],
      chainId: arcTestnet.id,
    });

  return {
    needsApproval,
    approve,
    isApproving: isWritePending || isWaitingReceipt,
    isApproveConfirmed,
    refetchAllowance,
  };
}
