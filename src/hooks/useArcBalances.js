import { useBalance, useReadContract } from "wagmi";
import { erc20Abi, formatUnits } from "viem";
import { arcTestnet, CONTRACTS } from "../utils/constants";

export function useArcBalances(address) {
  const { data: usdcNative, refetch: refetchUsdc } = useBalance({
    address,
    chainId: arcTestnet.id,
    query: { enabled: !!address, refetchInterval: 8000 },
  });

  const { data: eurcRaw, refetch: refetchEurc } = useReadContract({
    address: CONTRACTS.EURC,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    chainId: arcTestnet.id,
    query: { enabled: !!address, refetchInterval: 8000 },
  });

  const refetch = () => { refetchUsdc(); refetchEurc(); };

  return {
    USDC: usdcNative ? parseFloat(usdcNative.formatted) : null,
    EURC: eurcRaw != null ? parseFloat(formatUnits(eurcRaw, 6)) : null,
    refetch,
  };
}
