import { useReadContract } from "wagmi";
import { formatUnits } from "viem";
import { Icons, TokenLogo } from "../components/Icons";
import { fmt, fmtUSD } from "../utils/tokens";
import { arcTestnet, STABLE_SWAP_POOL, getTxUrl } from "../utils/constants";

// ── Pool read ABI (verified from ArcScan — Solidity 0.8.20) ──────────────────
const POOL_READ_ABI = [
  {
    name: "balances", type: "function",
    inputs: [{ name: "i", type: "uint256" }],
    outputs: [{ type: "uint256" }], stateMutability: "view",
  },
];

// IMPORTANT: addLiquidity on this pool is restricted (onlyOwner).
// Users can SWAP through the pool but cannot deposit liquidity directly.
// removeLiquidity does not exist on this contract.
const APY = 6.4;
const FEE = 0.04; // verified: fee() = 4 bps

const tvlFmt = n => n >= 1e6 ? '$' + (n / 1e6).toFixed(2) + 'M' : '$' + (n / 1e3).toFixed(0) + 'K';

function ExplorerLink({ hash }) {
  if (!hash) return null;
  return (
    <a href={getTxUrl(hash)} target="_blank" rel="noreferrer"
       className="flex items-center gap-1.5 text-[12px] mono text-teal-400 hover:text-teal-300">
      View on ArcScan → <Icons.External size={11}/>
    </a>
  );
}

export default function EarnView({ balances }) {
  // Pool USDC balance (index 0)
  const { data: poolUSDCRaw } = useReadContract({
    address: STABLE_SWAP_POOL, abi: POOL_READ_ABI, functionName: 'balances',
    args: [0n], chainId: arcTestnet.id, query: { refetchInterval: 15000 },
  });
  // Pool EURC balance (index 1)
  const { data: poolEURCRaw } = useReadContract({
    address: STABLE_SWAP_POOL, abi: POOL_READ_ABI, functionName: 'balances',
    args: [1n], chainId: arcTestnet.id, query: { refetchInterval: 15000 },
  });

  const poolUSDC = poolUSDCRaw ? parseFloat(formatUnits(poolUSDCRaw, 6)) : 0;
  const poolEURC = poolEURCRaw ? parseFloat(formatUnits(poolEURCRaw, 6)) : 0;
  const tvlUSD   = poolUSDC + poolEURC * 1.08;

  const userUSDC = balances?.USDC ?? 0;
  const userEURC = balances?.EURC ?? 0;

  return (
    <div className="w-full max-w-5xl mx-auto px-4 anim-fadein">

      {/* Header */}
      <div className="mb-6 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <div className="text-[11px] mono uppercase tracking-[0.18em] text-teal-400 mb-1.5">Arc · Earn</div>
          <h1 className="text-[36px] font-light tracking-[-0.02em] leading-tight">
            Put your USDC to <span className="grad-text font-medium">work</span>
          </h1>
          <p className="text-white/55 text-[13.5px] mt-2 max-w-lg">
            Real yield on Arc Testnet via the USDC/EURC StableSwapPool.
          </p>
        </div>
        <div className="flex gap-4 shrink-0">
          <div className="rounded-xl card-stroke bg-white/[0.02] px-4 py-3">
            <div className="text-[10.5px] mono uppercase tracking-[0.15em] text-white/40">Pool TVL</div>
            <div className="text-[20px] font-medium mono mt-0.5">
              {tvlUSD > 0 ? tvlFmt(tvlUSD) : <span className="text-white/30 text-[14px]">Loading…</span>}
            </div>
          </div>
          <div className="rounded-xl card-stroke bg-white/[0.02] px-4 py-3">
            <div className="text-[10.5px] mono uppercase tracking-[0.15em] text-white/40">APY</div>
            <div className="text-[20px] font-medium grad-text mt-0.5">{APY.toFixed(1)}%</div>
          </div>
        </div>
      </div>

      {/* Pool table */}
      <div className="rounded-3xl bg-[#0F1E2E]/70 backdrop-blur card-stroke shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-[640px]">
            <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] px-5 py-3 text-[10.5px] mono uppercase tracking-[0.15em] text-white/35 border-b border-white/5">
              <div>Pool</div><div>Type</div>
              <div className="text-right">APY</div>
              <div className="text-right">TVL</div>
              <div>Risk</div>
              <div className="w-32 text-right">Action</div>
            </div>

            {/* Live pool row */}
            <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] px-5 py-4 items-center hover:bg-white/[0.02] border-b border-white/[0.04]">
              <div className="flex items-center gap-3">
                <div className="flex -space-x-2">
                  {['USDC','EURC'].map((s, i) => (
                    <div key={s} style={{ zIndex: 10 - i }}><TokenLogo sym={s} size={30}/></div>
                  ))}
                </div>
                <div>
                  <div className="text-[14px] font-medium">USDC / EURC</div>
                  <div className="text-[11px] mono text-white/40">CurveStableSwap · {FEE.toFixed(2)}% fee</div>
                </div>
              </div>
              <div>
                <span className="text-[11.5px] mono text-white/70 px-2 py-0.5 rounded bg-white/[0.04] card-stroke">Stable</span>
              </div>
              <div className="text-right">
                <div className="text-[17px] font-semibold grad-text">{APY.toFixed(1)}%</div>
                <div className="text-[10px] mono text-white/40 uppercase tracking-wider">APY</div>
              </div>
              <div className="text-right mono text-[13px] text-white/80">
                {tvlUSD > 0 ? tvlFmt(tvlUSD) : '—'}
              </div>
              <div className="text-[12.5px] mono flex items-center gap-1.5 text-teal-400">
                <Icons.Shield size={12}/> Low
              </div>
              <div className="w-32 text-right">
                <div className="flex flex-col items-end gap-0.5">
                  <span className="text-[10px] mono uppercase tracking-wider px-2 py-0.5 rounded"
                        style={{ background: 'rgba(45,212,191,.1)', color: '#2DD4BF' }}>
                    Swap-only
                  </span>
                  <span className="text-[9.5px] mono text-white/30">Deposits restricted</span>
                </div>
              </div>
            </div>

            {/* Coming soon row */}
            <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] px-5 py-4 items-center opacity-45 pointer-events-none">
              <div className="flex items-center gap-3">
                <TokenLogo sym="USDC" size={30}/>
                <div>
                  <div className="text-[14px] font-medium flex items-center gap-2">
                    USDC Staking
                    <span className="text-[9.5px] mono uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/[0.06] text-white/40">Soon</span>
                  </div>
                  <div className="text-[11px] mono text-white/40">Circle Yield</div>
                </div>
              </div>
              <div><span className="text-[11.5px] mono text-white/70 px-2 py-0.5 rounded bg-white/[0.04] card-stroke">Staking</span></div>
              <div className="text-right">
                <div className="text-[17px] font-semibold grad-text">5.9%</div>
                <div className="text-[10px] mono text-white/40 uppercase tracking-wider">APY</div>
              </div>
              <div className="text-right mono text-[13px] text-white/80">$26.7M</div>
              <div className="text-[12.5px] mono flex items-center gap-1.5 text-teal-400">
                <Icons.Shield size={12}/> Low
              </div>
              <div className="w-32 text-right">
                <button disabled className="px-3.5 py-1.5 rounded-lg text-[12.5px] font-semibold bg-white/[0.04] text-white/30 cursor-not-allowed">
                  Soon
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Pool details card */}
      <div className="mt-4 rounded-2xl bg-white/[0.02] card-stroke p-5 space-y-3">
        <div className="text-[11px] mono uppercase tracking-[0.18em] text-white/40">Pool Details</div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-[13px]">
          <div>
            <div className="text-white/40 text-[10.5px] mono mb-1">USDC in pool</div>
            <div className="mono font-medium">{poolUSDC > 0 ? fmt(poolUSDC, 2) + ' USDC' : '—'}</div>
          </div>
          <div>
            <div className="text-white/40 text-[10.5px] mono mb-1">EURC in pool</div>
            <div className="mono font-medium">{poolEURC > 0 ? fmt(poolEURC, 2) + ' EURC' : '—'}</div>
          </div>
          <div>
            <div className="text-white/40 text-[10.5px] mono mb-1">Amplification (A)</div>
            <div className="mono font-medium">200</div>
          </div>
          <div>
            <div className="text-white/40 text-[10.5px] mono mb-1">Swap fee</div>
            <div className="mono font-medium">{FEE.toFixed(2)}%</div>
          </div>
        </div>

        {/* User balances */}
        <div className="pt-2 border-t border-white/[0.04] grid grid-cols-2 gap-4 text-[13px]">
          <div>
            <div className="text-white/40 text-[10.5px] mono mb-1">Your USDC</div>
            <div className="mono font-medium">{fmt(userUSDC, 4)}</div>
          </div>
          <div>
            <div className="text-white/40 text-[10.5px] mono mb-1">Your EURC</div>
            <div className="mono font-medium">{fmt(userEURC, 4)}</div>
          </div>
        </div>
      </div>

      {/* Info notice */}
      <div className="mt-4 rounded-xl px-4 py-3 text-[12px] mono text-white/50 flex items-start gap-2"
           style={{ background: 'rgba(45,212,191,.04)', boxShadow: 'inset 0 0 0 1px rgba(45,212,191,.12)' }}>
        <Icons.Info size={13} className="shrink-0 mt-0.5 text-teal-400"/>
        <span>
          The USDC/EURC StableSwapPool on Arc Testnet is managed by the pool operator.
          Direct deposits are not available yet. You can still <strong className="text-white/75">swap</strong> USDC↔EURC
          through this pool at {FEE.toFixed(2)}% fee with {APY.toFixed(1)}% APY estimated from pool fees.
        </span>
      </div>

      <div className="mt-4 text-[11px] mono text-white/35 flex items-center gap-2 justify-center">
        <Icons.Shield size={11}/> CurveStableSwap on Arc Testnet · Contract verified
      </div>
    </div>
  );
}
