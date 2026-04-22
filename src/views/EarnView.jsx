import { useState } from "react";
import { useAccount, useReadContract } from "wagmi";
import { erc20Abi, formatUnits } from "viem";
import { Icons, TokenLogo } from "../components/Icons";
import { fmt, fmtUSD } from "../utils/tokens";
import { useArcKit } from "../hooks/useArcKit";
import { arcTestnet, TOKENS, STABLE_SWAP_POOL, getTxUrl } from "../utils/constants";

// ── Pool read ABI (view-only functions) ───────────────────────────────────────
const POOL_READ_ABI = [
  {
    name: "balances", type: "function",
    inputs: [{ name: "i", type: "uint256" }],
    outputs: [{ type: "uint256" }], stateMutability: "view",
  },
  {
    name: "token", type: "function",
    inputs: [], outputs: [{ type: "address" }], stateMutability: "view",
  },
];

const APY = 6.4;
const FEE = 0.30;
const tvlFmt    = n => n >= 1e6 ? '$' + (n / 1e6).toFixed(2) + 'M' : '$' + (n / 1e3).toFixed(0) + 'K';
const riskColor = () => 'text-teal-400';

// ── ExplorerLink ──────────────────────────────────────────────────────────────
function ExplorerLink({ hash, label = 'View on ArcScan →' }) {
  if (!hash) return null;
  return (
    <a href={getTxUrl(hash)} target="_blank" rel="noreferrer"
       className="flex items-center gap-1.5 text-[12px] mono text-teal-400 hover:text-teal-300 transition">
      {label} <Icons.External size={11}/>
    </a>
  );
}

// ── DepositModal ──────────────────────────────────────────────────────────────
function DepositModal({ balances, onClose, onSuccess }) {
  const arcKit = useArcKit();

  const [usdcAmt, setUsdcAmt] = useState('');
  const [eurcAmt, setEurcAmt] = useState('');
  const [status,  setStatus]  = useState('idle');
  const [txHash,  setTxHash]  = useState(null);
  const [error,   setError]   = useState(null);

  const usdcBal   = balances?.USDC ?? 0;
  const eurcBal   = balances?.EURC ?? 0;
  const usdcNum   = parseFloat(usdcAmt) || 0;
  const eurcNum   = parseFloat(eurcAmt) || 0;
  const usdcInsuf = usdcNum > 0 && usdcNum > usdcBal;
  const eurcInsuf = eurcNum > 0 && eurcNum > eurcBal;
  const canDeposit = (usdcNum > 0 || eurcNum > 0) && !usdcInsuf && !eurcInsuf && status === 'idle';

  const projectedUSD = (usdcNum + eurcNum * 1.08) * (APY / 100);

  const isBusy = status !== 'idle' && status !== 'success' && status !== 'error';

  const stepLabel = {
    'approving-usdc': 'Approving USDC…',
    'approving-eurc': 'Approving EURC…',
    'depositing':     'Depositing liquidity…',
  }[status] ?? '';

  const handleDeposit = async () => {
    if (!canDeposit) return;
    setError(null);
    try {
      const result = await arcKit.addLiquidity({
        usdcAmount: usdcNum,
        eurcAmount: eurcNum,
        onProgress: (s) => setStatus(s),
      });
      setTxHash(result.txHash);
      setStatus('success');
      onSuccess?.({ usdcNum, eurcNum, txHash: result.txHash });
    } catch (err) {
      const msg = String(err?.message ?? '');
      setError(
        msg.toLowerCase().includes('rejected') ? 'Transaction rejected by wallet'
          : msg.slice(0, 120) || 'Deposit failed. Try again.'
      );
      setStatus('idle');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 anim-fadein" onClick={onClose}>
      <div className="absolute inset-0 bg-[#070F1A]/75 backdrop-blur-sm"/>
      <div className="relative w-full max-w-[440px] rounded-2xl bg-[#0F1E2E] card-stroke shadow-card anim-slideup"
           onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="p-5 border-b border-white/5 flex items-start justify-between">
          <div>
            <div className="text-[11px] mono uppercase tracking-[0.18em] text-teal-400 mb-1">Deposit Liquidity</div>
            <div className="flex items-center gap-2.5">
              <div className="flex -space-x-2">
                {['USDC', 'EURC'].map((s, i) => (
                  <div key={s} style={{ zIndex: 10 - i }}><TokenLogo sym={s} size={28}/></div>
                ))}
              </div>
              <div className="text-[16px] font-semibold">USDC / EURC</div>
            </div>
          </div>
          <button onClick={onClose} className="text-white/50 hover:text-white"><Icons.Close size={16}/></button>
        </div>

        <div className="p-5 space-y-4">
          {/* Stats row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-white/[0.03] card-stroke p-3">
              <div className="text-[10.5px] mono uppercase tracking-wider text-white/40">APY</div>
              <div className="text-[18px] font-semibold grad-text mono">{APY.toFixed(1)}%</div>
            </div>
            <div className="rounded-lg bg-white/[0.03] card-stroke p-3">
              <div className="text-[10.5px] mono uppercase tracking-wider text-white/40">Current Pool Fee</div>
              <div className="text-[14px] mt-1.5 mono">{FEE.toFixed(2)}%</div>
            </div>
          </div>

          {/* USDC input */}
          <div className="rounded-xl bg-white/[0.025] input-stroke p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] mono uppercase tracking-[0.15em] text-white/40">USDC Amount</span>
              <div className="flex items-center gap-2 text-[11.5px] text-white/55">
                <span>Balance <span className="mono text-white/80">{fmt(usdcBal, 4)}</span></span>
                <button onClick={() => setUsdcAmt(usdcBal.toString())}
                        className="text-[10.5px] mono px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/10 text-teal-400">MAX</button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                value={usdcAmt}
                onChange={e => setUsdcAmt(e.target.value.replace(/[^0-9.]/g, ''))}
                placeholder="0"
                className={`flex-1 min-w-0 bg-transparent text-[24px] font-light outline-none placeholder-white/20 mono ${usdcInsuf ? 'text-rose-400' : ''}`}
              />
              <div className="flex items-center gap-1.5 pl-1 pr-2 py-1 rounded-full bg-white/[0.06] card-stroke shrink-0">
                <TokenLogo sym="USDC" size={20}/><span className="text-[13px] font-medium">USDC</span>
              </div>
            </div>
            {usdcInsuf && <div className="text-[11px] mono text-rose-400 mt-1">Insufficient USDC</div>}
          </div>

          {/* EURC input */}
          <div className="rounded-xl bg-white/[0.025] input-stroke p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] mono uppercase tracking-[0.15em] text-white/40">EURC Amount</span>
              <div className="flex items-center gap-2 text-[11.5px] text-white/55">
                <span>Balance <span className="mono text-white/80">{fmt(eurcBal, 4)}</span></span>
                <button onClick={() => setEurcAmt(eurcBal.toString())}
                        className="text-[10.5px] mono px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/10 text-teal-400">MAX</button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                value={eurcAmt}
                onChange={e => setEurcAmt(e.target.value.replace(/[^0-9.]/g, ''))}
                placeholder="0"
                className={`flex-1 min-w-0 bg-transparent text-[24px] font-light outline-none placeholder-white/20 mono ${eurcInsuf ? 'text-rose-400' : ''}`}
              />
              <div className="flex items-center gap-1.5 pl-1 pr-2 py-1 rounded-full bg-white/[0.06] card-stroke shrink-0">
                <TokenLogo sym="EURC" size={20}/><span className="text-[13px] font-medium">EURC</span>
              </div>
            </div>
            {eurcInsuf && <div className="text-[11px] mono text-rose-400 mt-1">Insufficient EURC</div>}
          </div>

          {/* Summary */}
          <div className="rounded-xl bg-white/[0.02] card-stroke p-3.5 space-y-2 text-[12.5px]">
            <div className="flex justify-between">
              <span className="text-white/50">Projected yield (1y)</span>
              <span className="mono text-teal-300">+{fmtUSD(projectedUSD)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/50">Pool fee</span>
              <span className="mono">{FEE.toFixed(2)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/50">Unlock</span>
              <span className="mono">Anytime</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/50">Protocol</span>
              <span className="mono text-white/80">CurveStableSwap</span>
            </div>
          </div>

          {/* Progress */}
          {isBusy && (
            <div className="flex items-center gap-2 text-[12.5px] mono text-teal-400">
              <span className="inline-block w-3.5 h-3.5 border-[1.5px] border-teal-400 border-t-transparent rounded-full spin-slow"/>
              {stepLabel}
            </div>
          )}

          {/* Success */}
          {status === 'success' && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-[12.5px] mono text-teal-400">
                <Icons.Check size={14}/> Deposited successfully
              </div>
              <ExplorerLink hash={txHash}/>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="text-[11.5px] mono text-rose-400 flex items-start gap-1.5">
              <span className="shrink-0 mt-0.5">⚠</span>{error}
            </div>
          )}

          {/* Button */}
          {status === 'success' ? (
            <button onClick={onClose} className="w-full py-3.5 rounded-xl grad-btn font-semibold text-[13.5px]">
              Done
            </button>
          ) : isBusy ? (
            <button disabled
                    className="w-full py-3.5 rounded-xl font-semibold text-[13.5px] relative overflow-hidden shimmer text-[#07261F]">
              <span className="relative z-10 flex items-center justify-center gap-2">
                <span className="inline-block w-4 h-4 border-2 border-[#07261F]/60 border-t-transparent rounded-full spin-slow"/>
                {stepLabel}
              </span>
            </button>
          ) : (
            <button
              disabled={!canDeposit}
              onClick={handleDeposit}
              className={`w-full py-3.5 rounded-xl font-semibold text-[13.5px] transition ${
                !canDeposit ? 'bg-white/[0.04] text-white/30 cursor-not-allowed' : 'grad-btn'
              }`}>
              {!usdcNum && !eurcNum ? 'Enter an amount'
                : usdcInsuf || eurcInsuf ? 'Insufficient balance'
                : 'Supply Liquidity'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── MyPosition ────────────────────────────────────────────────────────────────
function MyPosition({ address, onWithdraw }) {
  const arcKit = useArcKit();

  // LP token address from pool contract
  const { data: lpTokenAddr } = useReadContract({
    address: STABLE_SWAP_POOL, abi: POOL_READ_ABI, functionName: 'token',
    chainId: arcTestnet.id, query: { staleTime: 60_000 },
  });

  const { data: lpRaw, refetch: refetchLp } = useReadContract({
    address: lpTokenAddr, abi: erc20Abi, functionName: 'balanceOf',
    args: address ? [address] : undefined,
    chainId: arcTestnet.id,
    query: { enabled: !!address && !!lpTokenAddr, refetchInterval: 10000 },
  });

  const { data: lpTotalRaw } = useReadContract({
    address: lpTokenAddr, abi: erc20Abi, functionName: 'totalSupply',
    chainId: arcTestnet.id,
    query: { enabled: !!lpTokenAddr, refetchInterval: 10000 },
  });

  const { data: poolUSDCRaw } = useReadContract({
    address: STABLE_SWAP_POOL, abi: POOL_READ_ABI, functionName: 'balances',
    args: [0n], chainId: arcTestnet.id, query: { refetchInterval: 10000 },
  });

  const { data: poolEURCRaw } = useReadContract({
    address: STABLE_SWAP_POOL, abi: POOL_READ_ABI, functionName: 'balances',
    args: [1n], chainId: arcTestnet.id, query: { refetchInterval: 10000 },
  });

  const [withdrawStatus, setWithdrawStatus] = useState('idle');
  const [withdrawHash,   setWithdrawHash]   = useState(null);
  const [withdrawError,  setWithdrawError]  = useState(null);

  if (!lpRaw || lpRaw === 0n) return null;

  const lpBalance  = parseFloat(formatUnits(lpRaw, 18));
  const lpTotal    = lpTotalRaw ? parseFloat(formatUnits(lpTotalRaw, 18)) : 0;
  const share      = lpTotal > 0 ? lpBalance / lpTotal : 0;
  const poolUSDC   = poolUSDCRaw ? parseFloat(formatUnits(poolUSDCRaw, 6)) : 0;
  const poolEURC   = poolEURCRaw ? parseFloat(formatUnits(poolEURCRaw, 6)) : 0;
  const myUSDC     = poolUSDC * share;
  const myEURC     = poolEURC * share;
  const myValueUSD = myUSDC + myEURC * 1.08;

  const handleWithdraw = async () => {
    if (!lpTokenAddr) return;
    setWithdrawError(null);
    setWithdrawStatus('approving');
    try {
      const result = await arcKit.removeLiquidity({
        lpAmount:    lpBalance,
        lpTokenAddr: lpTokenAddr,
        onProgress:  (s) => setWithdrawStatus(s),
      });
      setWithdrawHash(result.txHash);
      setWithdrawStatus('success');
      setTimeout(() => refetchLp(), 3000);
    } catch (err) {
      const msg = String(err?.message ?? '');
      setWithdrawError(msg.includes('rejected') ? 'Rejected' : msg.slice(0, 80) || 'Withdraw failed.');
      setWithdrawStatus('idle');
    }
  };

  const isWithdrawBusy = withdrawStatus !== 'idle' && withdrawStatus !== 'success';

  return (
    <div className="rounded-2xl bg-white/[0.02] card-stroke p-5 space-y-4 mt-4">
      <div className="text-[11px] mono uppercase tracking-[0.18em] text-teal-400">My Position · USDC/EURC</div>

      <div className="grid grid-cols-2 gap-3 text-[13px]">
        <div className="rounded-lg bg-white/[0.03] p-3">
          <div className="text-white/40 text-[10.5px] mono mb-0.5">LP Value</div>
          <div className="font-semibold text-[16px]">{fmtUSD(myValueUSD)}</div>
        </div>
        <div className="rounded-lg bg-white/[0.03] p-3">
          <div className="text-white/40 text-[10.5px] mono mb-0.5">Pool Share</div>
          <div className="mono text-[14px]">{(share * 100).toFixed(4)}%</div>
        </div>
        <div className="rounded-lg bg-white/[0.03] p-3">
          <div className="text-white/40 text-[10.5px] mono mb-0.5">USDC</div>
          <div className="mono">{fmt(myUSDC, 4)}</div>
        </div>
        <div className="rounded-lg bg-white/[0.03] p-3">
          <div className="text-white/40 text-[10.5px] mono mb-0.5">EURC</div>
          <div className="mono">{fmt(myEURC, 4)}</div>
        </div>
      </div>

      {withdrawStatus === 'success' && (
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-[12.5px] mono text-teal-400">
            <Icons.Check size={13}/> Liquidity removed
          </div>
          <ExplorerLink hash={withdrawHash}/>
        </div>
      )}

      {withdrawError && (
        <div className="text-[11.5px] mono text-rose-400 flex items-start gap-1.5">
          <span className="shrink-0">⚠</span>{withdrawError}
        </div>
      )}

      {isWithdrawBusy ? (
        <button disabled
                className="w-full py-2.5 rounded-xl font-semibold text-[13px] relative overflow-hidden shimmer text-[#07261F]">
          <span className="relative z-10 flex items-center justify-center gap-2">
            <span className="inline-block w-3.5 h-3.5 border-2 border-[#07261F]/60 border-t-transparent rounded-full spin-slow"/>
            {withdrawStatus === 'approving' ? 'Approving…' : 'Removing…'}
          </span>
        </button>
      ) : withdrawStatus !== 'success' && (
        <button onClick={handleWithdraw}
                className="w-full py-2.5 rounded-xl bg-rose-400/10 text-rose-300 text-[13px] font-semibold hover:bg-rose-400/20 transition card-stroke">
          Remove Liquidity
        </button>
      )}
    </div>
  );
}

// ── EarnView ──────────────────────────────────────────────────────────────────
export default function EarnView({ balances }) {
  const { address, isConnected } = useAccount();
  const [depositOpen, setDepositOpen] = useState(false);
  const [toast,       setToast]       = useState(null);

  // Live TVL from pool
  const { data: poolUSDCRaw } = useReadContract({
    address: STABLE_SWAP_POOL, abi: POOL_READ_ABI, functionName: 'balances',
    args: [0n], chainId: arcTestnet.id, query: { refetchInterval: 15000 },
  });
  const { data: poolEURCRaw } = useReadContract({
    address: STABLE_SWAP_POOL, abi: POOL_READ_ABI, functionName: 'balances',
    args: [1n], chainId: arcTestnet.id, query: { refetchInterval: 15000 },
  });

  const poolUSDC = poolUSDCRaw ? parseFloat(formatUnits(poolUSDCRaw, 6)) : 0;
  const poolEURC = poolEURCRaw ? parseFloat(formatUnits(poolEURCRaw, 6)) : 0;
  const tvlUSD   = poolUSDC + poolEURC * 1.08;

  const showToast = (data) => {
    setToast(data);
    setTimeout(() => setToast(null), 8000);
  };

  const handleDepositSuccess = (data) => {
    setDepositOpen(false);
    showToast({
      msg:    `Deposited ${fmt(data.usdcNum)} USDC + ${fmt(data.eurcNum)} EURC`,
      txHash: data.txHash,
    });
  };

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
            Real yield opportunities on Arc Testnet. USDC/EURC liquidity on CurveStableSwap. More protocols coming soon.
          </p>
        </div>
        <div className="flex gap-4 shrink-0">
          <div className="rounded-xl card-stroke bg-white/[0.02] px-4 py-3">
            <div className="text-[10.5px] mono uppercase tracking-[0.15em] text-white/40">Pool TVL</div>
            <div className="text-[20px] font-medium mono mt-0.5">
              {tvlUSD > 0
                ? tvlFmt(tvlUSD)
                : <span className="text-white/30 text-[14px]">Loading…</span>}
            </div>
          </div>
          <div className="rounded-xl card-stroke bg-white/[0.02] px-4 py-3">
            <div className="text-[10.5px] mono uppercase tracking-[0.15em] text-white/40">Avg APY</div>
            <div className="text-[20px] font-medium grad-text mt-0.5">{APY.toFixed(1)}%</div>
          </div>
        </div>
      </div>

      {/* Pool table */}
      <div className="rounded-3xl bg-[#0F1E2E]/70 backdrop-blur card-stroke shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-[640px]">
            <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] px-5 py-3 text-[10.5px] mono uppercase tracking-[0.15em] text-white/35 border-b border-white/5">
              <div>Pool</div>
              <div>Type</div>
              <div className="text-right">APY</div>
              <div className="text-right">TVL</div>
              <div>Risk</div>
              <div className="w-24 text-right">Action</div>
            </div>

            {/* Live pool — USDC/EURC */}
            <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] px-5 py-4 items-center hover:bg-white/[0.02] border-b border-white/[0.04]">
              <div className="flex items-center gap-3">
                <div className="flex -space-x-2">
                  {['USDC', 'EURC'].map((s, i) => (
                    <div key={s} style={{ zIndex: 10 - i }}><TokenLogo sym={s} size={30}/></div>
                  ))}
                </div>
                <div>
                  <div className="text-[14px] font-medium">USDC / EURC</div>
                  <div className="text-[11px] mono text-white/40">CurveStableSwap</div>
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
              <div className={`text-[12.5px] mono flex items-center gap-1.5 ${riskColor()}`}>
                <Icons.Shield size={12}/> Low
              </div>
              <div className="w-24 text-right">
                <button
                  onClick={() => setDepositOpen(true)}
                  className="px-3.5 py-1.5 rounded-lg text-[12.5px] font-semibold grad-btn">
                  Deposit
                </button>
              </div>
            </div>

            {/* Coming soon — USDC Staking */}
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
              <div className={`text-[12.5px] mono flex items-center gap-1.5 ${riskColor()}`}>
                <Icons.Shield size={12}/> Low
              </div>
              <div className="w-24 text-right">
                <button disabled className="px-3.5 py-1.5 rounded-lg text-[12.5px] font-semibold bg-white/[0.04] text-white/30 cursor-not-allowed">
                  Soon
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* My position — only shown when user has LP tokens */}
      {isConnected && address && (
        <MyPosition address={address} onWithdraw={() => {}} />
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[60] rounded-2xl bg-[#0F1E2E] card-stroke px-5 py-3 flex flex-col gap-1.5 shadow-card anim-fadein">
          <div className="flex items-center gap-2 text-[13px]">
            <Icons.Check size={14} className="text-teal-400 shrink-0"/>
            {toast.msg}
          </div>
          {toast.txHash && <ExplorerLink hash={toast.txHash}/>}
        </div>
      )}

      <div className="mt-4 text-[11px] mono text-white/35 flex items-center gap-2 justify-center">
        <Icons.Shield size={11}/> CurveStableSwap on Arc Testnet · Pool fee {FEE.toFixed(2)}%
      </div>

      {depositOpen && (
        <DepositModal
          balances={balances}
          onClose={() => setDepositOpen(false)}
          onSuccess={handleDepositSuccess}
        />
      )}
    </div>
  );
}
