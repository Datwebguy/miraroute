import { useReadContract } from "wagmi";
import { erc20Abi, formatUnits } from "viem";
import { arcTestnet, TOKENS } from "../utils/constants";

// CRITICAL: Use ERC-20 balanceOf (6 decimals) — NOT useBalance (18-decimal native).
// The native balance on Arc uses 18 decimals internally but the ERC-20 interface
// for USDC and EURC uses 6 decimals. Always read via balanceOf + formatUnits(raw, 6).

export function useArcBalances(address) {
  const { data: usdcRaw, refetch: refetchUsdc } = useReadContract({
    address:      TOKENS.USDC_ARC.address,
    abi:          erc20Abi,
    functionName: 'balanceOf',
    args:         address ? [address] : undefined,
    chainId:      arcTestnet.id,
    query:        { enabled: !!address, refetchInterval: 8000 },
  });

  const { data: eurcRaw, refetch: refetchEurc } = useReadContract({
    address:      TOKENS.EURC_ARC.address,
    abi:          erc20Abi,
    functionName: 'balanceOf',
    args:         address ? [address] : undefined,
    chainId:      arcTestnet.id,
    query:        { enabled: !!address, refetchInterval: 8000 },
  });

  const refetch = () => { refetchUsdc(); refetchEurc(); };

  return {
    USDC: usdcRaw != null ? parseFloat(formatUnits(usdcRaw, 6)) : null,
    EURC: eurcRaw != null ? parseFloat(formatUnits(eurcRaw, 6)) : null,
    refetch,
  };
}
