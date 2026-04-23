import { useState } from "react";
import { useAccount } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { useReadContract } from "wagmi";
import { formatUnits, erc20Abi } from "viem";
import { Icons, TokenLogo } from "../components/Icons";
import { fmt, fmtUSD } from "../utils/tokens";
import { arcTestnet, STABLE_SWAP_POOL, TOKENS, getTxUrl } from "../utils/constants";
import { useArcKit } from "../hooks/useArcKit";

// ── Pool ABI (read-only subset) ──────────────────────────────────────────────
const POOL_READ_ABI = [
  { name: "balances",     type: "function", inputs: [{ name: "i", type: "uint256" }], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { name: "totalSupply",  type: "function", inputs: [],                               outputs: [{ type: "uint256" }], stateMutability: "view" },
];

const APY = 6.4;
const FEE = 0.04;

const tvlFmt = n => n >= 1e6 ? '$' + (n / 1e6).toFixed(2) + 'M' : '$' + (n / 1e3).toFixed(1) + 'K';

function StatCard({ label, value, accent }) {
  return (
    <div className="rounded-xl card-stroke bg-white/[0.02] px-4 py-3 flex-1 min-w-0">
      <div className="text-[10px] md:text-[10.5px] mono uppercase tracking-[0.15em] text-white/40">{label}</div>
      <div className={`text-[18px] md:text-[20px] font-medium mono mt-0.5 ${accent ? 'grad-text' : ''}`}>{value}</div>
    </div>
  );
}

function ExplorerLink({ hash, label = 'View on ArcScan →' }) {
  if (!hash) return null;
  return (
    <a href={getTxUrl(hash)} target="_blank" rel="noreferrer"
       className="inline-flex items-center gap-1.5 text-[12px] mono text-teal-400 hover:text-teal-300 transition">
      {label} <Icons.External size={11}/>
    </a>
  );
}

function AmountInput({ label, sym, value, onChange, balance, max }) {
  return (
    <div className="rounded-2xl bg-white/[0.025] input-stroke p-3.5 input-glass">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10.5px] mono uppercase tracking-[0.15em] text-white/40">{label}</span>
        {balance != null && (
          <div className="flex items-center gap-1.5 text-[11px] text-white/50">
            <span>Bal <span className="mono text-white/70">{fmt(balance, 4)}</span></span>
            {max && (
              <button onClick={() => onChange(balance.toString())}
                      className="text-[10px] mono px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-teal-400">
                MAX
              </button>
            )}
          </div>
        )}
      </div>
      <div className="flex items-center gap-3">
        <input value={value}
               onChange={e => onChange(e.target.value.replace(/[^0-9.]/g, ''))}
               placeholder="0" inputMode="decimal"
               className="flex-1 min-w-0 bg-transparent text-[26px] font-light outline-none placeholder-white/20 tracking-tight"/>
        <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-full bg-white/[0.06] card-stroke shrink-0">
          <TokenLogo sym={sym} size={22}/>
          <span className="font-semibold text-[13px]">{sym}</span>
        </div>
      </div>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

export default function EarnView({ balances }) {
  const { address, isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();
  const arcKit = useArcKit();

  // Tabs
  const [tab, setTab] = useState('deposit'); // 'deposit' | 'withdraw'

  // Deposit form
  const [usdcAmt, setUsdcAmt] = useState('');
  const [eurcAmt, setEurcAmt] = useState('');
  const [depositStep, setDepositStep] = useState('idle');
  const [depositError, setDepositError] = useState(null);
  const [depositHash, setDepositHash] = useState(null);

  // Withdraw form
  const [lpWithdrawAmt, setLpWithdrawAmt] = useState('');
  const [withdrawStep, setWithdrawStep] = useState('idle');
  const [withdrawError, setWithdrawError] = useState(null);
  const [withdrawHash, setWithdrawHash] = useState(null);

  // ── On-chain reads ────────────────────────────────────────────────────────
  const { data: poolUSDCRaw } = useReadContract({
    address: STABLE_SWAP_POOL, abi: POOL_READ_ABI, functionName: 'balances',
    args: [0n], chainId: arcTestnet.id, query: { refetchInterval: 15000 },
  });
  const { data: poolEURCRaw } = useReadContract({
    address: STABLE_SWAP_POOL, abi: POOL_READ_ABI, functionName: 'balances',
    args: [1n], chainId: arcTestnet.id, query: { refetchInterval: 15000 },
  });
  const { data: lpTotalRaw } = useReadContract({
    address: STABLE_SWAP_POOL, abi: POOL_READ_ABI, functionName: 'totalSupply',
    chainId: arcTestnet.id, query: { refetchInterval: 15000 },
  });
  // User LP token balance (pool contract IS the LP token)
  const { data: lpBalRaw, refetch: refetchLp } = useReadContract({
    address: STABLE_SWAP_POOL, abi: erc20Abi, functionName: 'balanceOf',
    args: address ? [address] : undefined,
    chainId: arcTestnet.id, query: { enabled: !!address, refetchInterval: 8000 },
  });

  // ── Derived values ────────────────────────────────────────────────────────
  const poolUSDC  = poolUSDCRaw ? parseFloat(formatUnits(poolUSDCRaw, 6))  : 0;
  const poolEURC  = poolEURCRaw ? parseFloat(formatUnits(poolEURCRaw, 6))  : 0;
  const tvlUSD    = poolUSDC + poolEURC * 1.08;

  const lpBalance = lpBalRaw ? parseFloat(formatUnits(lpBalRaw, 18)) : 0;
  const lpTotal   = lpTotalRaw ? parseFloat(formatUnits(lpTotalRaw, 18)) : 0;
  const lpShare   = lpTotal > 0 ? (lpBalance / lpTotal) * 100 : 0;
  const lpValueUSD = lpTotal > 0 ? (lpBalance / lpTotal) * tvlUSD : 0;

  const userUSDC  = balances?.USDC ?? 0;
  const userEURC  = balances?.EURC ?? 0;

  // Pool ratio (only used for UI display, NOT forced on inputs)
  // Since this is a stableswap pool, users can supply tokens in any ratio.
  // We used to auto-fill the paired amount, but this forced 1:1 on empty pools.

  const handleUsdcChange = (val) => {
    setUsdcAmt(val);
  };

  const handleEurcChange = (val) => {
    setEurcAmt(val);
  };

  const usdcNum   = parseFloat(usdcAmt) || 0;
  const eurcNum   = parseFloat(eurcAmt) || 0;
  const lpWithdrawNum = parseFloat(lpWithdrawAmt) || 0;

  const depositBusy   = depositStep !== 'idle';
  const withdrawBusy  = withdrawStep !== 'idle';

  const depositLabel =
    depositStep === 'approving-usdc' ? 'Approving USDC…'
    : depositStep === 'approving-eurc' ? 'Approving EURC…'
    : depositStep === 'depositing'    ? 'Confirm in Wallet…'
    : depositStep === 'confirming'    ? 'Confirming…'
    : (usdcNum > 0 || eurcNum > 0)   ? 'Add Liquidity'
    : 'Enter an amount';

  const withdrawLabel =
    withdrawStep === 'withdrawing' ? 'Confirm in Wallet…'
    : withdrawStep === 'confirming' ? 'Confirming…'
    : lpWithdrawNum > 0            ? 'Remove Liquidity'
    : 'Enter LP amount';

  // ── Actions ───────────────────────────────────────────────────────────────
  const handleDeposit = async () => {
    if (!isConnected) { openConnectModal?.(); return; }
    setDepositError(null);
    setDepositHash(null);
    try {
      const result = await arcKit.addLiquidity({
        usdcAmt: usdcNum,
        eurcAmt: eurcNum,
        onProgress: setDepositStep,
      });
      setDepositHash(result.txHash);
      setUsdcAmt(''); setEurcAmt('');
      refetchLp();
    } catch (err) {
      const msg = String(err?.message ?? '');
      setDepositError(
        msg.toLowerCase().includes('rejected') || msg.toLowerCase().includes('denied')
          ? 'Transaction rejected by wallet'
          : msg.slice(0, 140) || 'Deposit failed. Try again.'
      );
    } finally {
      setDepositStep('idle');
    }
  };

  const handleWithdraw = async () => {
    if (!isConnected) { openConnectModal?.(); return; }
    setWithdrawError(null);
    setWithdrawHash(null);
    try {
      const result = await arcKit.removeLiquidity({
        lpAmt: lpWithdrawNum,
        onProgress: setWithdrawStep,
      });
      setWithdrawHash(result.txHash);
      setLpWithdrawAmt('');
      refetchLp();
    } catch (err) {
      const msg = String(err?.message ?? '');
      setWithdrawError(
        msg.toLowerCase().includes('rejected') || msg.toLowerCase().includes('denied')
          ? 'Transaction rejected by wallet'
          : msg.slice(0, 140) || 'Withdraw failed. Try again.'
      );
    } finally {
      setWithdrawStep('idle');
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="w-full max-w-5xl mx-auto anim-fadein">

      {/* Header */}
      <div className="mb-5 md:mb-6 flex flex-col md:flex-row md:items-end md:justify-between gap-3 md:gap-4">
        <div>
          <div className="text-[11px] mono uppercase tracking-[0.18em] text-teal-400 mb-1.5">Arc · Earn</div>
          <h1 className="text-[28px] sm:text-[32px] md:text-[36px] font-light tracking-[-0.02em] leading-tight">
            Put your USDC to <span className="grad-text font-medium">work</span>
          </h1>
          <p className="text-white/55 text-[13px] mt-2 max-w-lg">
            Provide liquidity to the USDC/EURC StableSwapPool and earn {APY.toFixed(1)}% APY from swap fees.
          </p>
        </div>
        <div className="flex gap-3 shrink-0">
          <StatCard label="Pool TVL" value={poolUSDCRaw == null ? 'Loading…' : tvlUSD > 0 ? tvlFmt(tvlUSD) : '$0.00'}/>
          <StatCard label="APY" value={APY.toFixed(1) + '%'} accent/>
          <StatCard label="Fee" value={FEE.toFixed(2) + '%'}/>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4">

        {/* ── Left: deposit/withdraw panel ───────────────────────────── */}
        <div className="flex-1 min-w-0">
          <div className="rounded-3xl bg-[#0F1E2E]/70 backdrop-blur card-stroke shadow-card overflow-hidden">

            {/* Tabs */}
            <div className="flex border-b border-white/[0.06]">
              {['deposit', 'withdraw'].map(t => (
                <button key={t} onClick={() => { setTab(t); setDepositError(null); setWithdrawError(null); }}
                        className={`flex-1 py-3.5 text-[13px] font-medium tracking-tight transition ${
                          tab === t ? 'text-white border-b-2 border-teal-400' : 'text-white/45 hover:text-white/70'
                        }`}>
                  {t === 'deposit' ? '+ Add Liquidity' : '− Remove Liquidity'}
                </button>
              ))}
            </div>

            <div className="p-4 sm:p-5 space-y-3">

              {/* ── Deposit tab ─────────────────────────────────────── */}
              {tab === 'deposit' && (
                <>
                  <AmountInput label="USDC amount" sym="USDC" value={usdcAmt} onChange={handleUsdcChange}
                                balance={userUSDC} max/>
                  <div className="flex items-center gap-2 px-1 text-[11px] mono text-white/35">
                    <div className="flex-1 h-px bg-white/[0.05]"/>
                    <span className="px-1 text-teal-400/60">+</span>
                    <div className="flex-1 h-px bg-white/[0.05]"/>
                  </div>
                  <AmountInput label="EURC amount" sym="EURC" value={eurcAmt} onChange={handleEurcChange}
                                balance={userEURC} max/>

                  {/* Estimated LP preview */}
                  {(usdcNum > 0 || eurcNum > 0) && tvlUSD > 0 && lpTotal > 0 && (
                    <div className="rounded-xl px-4 py-3 text-[12.5px] space-y-1.5"
                         style={{ background: 'rgba(45,212,191,.05)', boxShadow: 'inset 0 0 0 1px rgba(45,212,191,.15)' }}>
                      <div className="flex justify-between text-white/50">
                        <span>Deposit value</span>
                        <span className="mono text-white/80">{fmtUSD(usdcNum + eurcNum * 1.08)}</span>
                      </div>
                      <div className="flex justify-between text-white/50">
                        <span>Pool share</span>
                        <span className="mono text-teal-400">
                          ~{((usdcNum + eurcNum * 1.08) / (tvlUSD + usdcNum + eurcNum * 1.08) * 100).toFixed(4)}%
                        </span>
                      </div>
                    </div>
                  )}

                  {depositError && (
                    <div className="flex items-start gap-2 text-[11.5px] mono text-rose-400 px-1">
                      <span className="shrink-0 mt-0.5">⚠</span>{depositError}
                    </div>
                  )}

                  {depositHash && (
                    <div className="rounded-xl px-4 py-3 space-y-1"
                         style={{ background: 'rgba(45,212,191,.06)', boxShadow: 'inset 0 0 0 1px rgba(45,212,191,.2)' }}>
                      <div className="text-[11px] mono uppercase tracking-wider text-teal-400 flex items-center gap-1.5">
                        <Icons.Check size={12}/> Liquidity added!
                      </div>
                      <ExplorerLink hash={depositHash}/>
                    </div>
                  )}

                  <button
                    onClick={handleDeposit}
                    disabled={depositBusy || (!isConnected ? false : usdcNum === 0 && eurcNum === 0)}
                    style={{ minHeight: 52 }}
                    className={`w-full py-3.5 rounded-2xl font-semibold text-[14px] tracking-tight transition touch-manipulation ${
                      depositBusy
                        ? 'shimmer text-[#07261F] relative overflow-hidden'
                        : !isConnected || (usdcNum > 0 || eurcNum > 0)
                          ? 'grad-btn'
                          : 'bg-white/[0.04] text-white/30 cursor-not-allowed'
                    }`}>
                    {depositBusy
                      ? <span className="relative z-10 flex items-center justify-center gap-2">
                          <span className="inline-block w-4 h-4 border-2 border-[#07261F]/70 border-t-transparent rounded-full spin-slow"/>
                          {depositLabel}
                        </span>
                      : !isConnected ? 'Connect Wallet'
                      : depositLabel}
                  </button>
                </>
              )}

              {/* ── Withdraw tab ────────────────────────────────────── */}
              {tab === 'withdraw' && (
                <>
                  {/* LP balance */}
                  <div className="rounded-2xl bg-white/[0.025] input-stroke p-3.5 input-glass">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10.5px] mono uppercase tracking-[0.15em] text-white/40">LP Tokens to withdraw</span>
                      {lpBalance > 0 && (
                        <div className="flex items-center gap-1.5 text-[11px] text-white/50">
                          <span>Bal <span className="mono text-white/70">{fmt(lpBalance, 6)}</span></span>
                          <button onClick={() => setLpWithdrawAmt(lpBalance.toString())}
                                  className="text-[10px] mono px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-teal-400">
                            MAX
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <input value={lpWithdrawAmt}
                             onChange={e => setLpWithdrawAmt(e.target.value.replace(/[^0-9.]/g, ''))}
                             placeholder="0" inputMode="decimal"
                             className="flex-1 min-w-0 bg-transparent text-[26px] font-light outline-none placeholder-white/20 tracking-tight"/>
                      <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-full bg-white/[0.06] card-stroke shrink-0">
                        <div className="flex -space-x-1">
                          {['USDC','EURC'].map((s, i) => (
                            <div key={s} style={{ zIndex: 10 - i }}><TokenLogo sym={s} size={18}/></div>
                          ))}
                        </div>
                        <span className="font-semibold text-[12px]">LP</span>
                      </div>
                    </div>
                  </div>

                  {/* Percent shortcuts */}
                  {lpBalance > 0 && (
                    <div className="flex gap-2">
                      {[25, 50, 75, 100].map(p => (
                        <button key={p}
                                onClick={() => setLpWithdrawAmt((lpBalance * p / 100).toString())}
                                className="flex-1 py-1.5 rounded-lg text-[12px] mono card-stroke bg-white/[0.03] hover:bg-white/[0.06] text-white/60 transition">
                          {p}%
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Estimated receive preview */}
                  {lpWithdrawNum > 0 && lpTotal > 0 && tvlUSD > 0 && (
                    <div className="rounded-xl px-4 py-3 text-[12.5px] space-y-1.5"
                         style={{ background: 'rgba(45,212,191,.05)', boxShadow: 'inset 0 0 0 1px rgba(45,212,191,.15)' }}>
                      <div className="text-[10.5px] mono uppercase tracking-wider text-white/40 mb-1">Estimated receive</div>
                      <div className="flex justify-between text-white/50">
                        <span>USDC</span>
                        <span className="mono text-white/80">~{fmt((lpWithdrawNum / lpTotal) * poolUSDC, 4)}</span>
                      </div>
                      <div className="flex justify-between text-white/50">
                        <span>EURC</span>
                        <span className="mono text-white/80">~{fmt((lpWithdrawNum / lpTotal) * poolEURC, 4)}</span>
                      </div>
                      <div className="flex justify-between text-white/50 pt-1 border-t border-white/[0.05]">
                        <span>Value</span>
                        <span className="mono text-white/80">{fmtUSD((lpWithdrawNum / lpTotal) * tvlUSD)}</span>
                      </div>
                    </div>
                  )}

                  {!isConnected && (
                    <div className="text-[12px] mono text-white/40 text-center py-2">
                      Connect your wallet to see LP balance
                    </div>
                  )}

                  {isConnected && lpBalance === 0 && lpBalRaw != null && (
                    <div className="flex items-center gap-2 text-[12px] mono text-white/40 px-1">
                      <Icons.Info size={12} className="text-teal-400 shrink-0"/>
                      You have no LP tokens. Add liquidity first.
                    </div>
                  )}

                  {withdrawError && (
                    <div className="flex items-start gap-2 text-[11.5px] mono text-rose-400 px-1">
                      <span className="shrink-0 mt-0.5">⚠</span>{withdrawError}
                    </div>
                  )}

                  {withdrawHash && (
                    <div className="rounded-xl px-4 py-3 space-y-1"
                         style={{ background: 'rgba(45,212,191,.06)', boxShadow: 'inset 0 0 0 1px rgba(45,212,191,.2)' }}>
                      <div className="text-[11px] mono uppercase tracking-wider text-teal-400 flex items-center gap-1.5">
                        <Icons.Check size={12}/> Withdrawn!
                      </div>
                      <ExplorerLink hash={withdrawHash}/>
                    </div>
                  )}

                  <button
                    onClick={handleWithdraw}
                    disabled={withdrawBusy || (!isConnected ? false : lpWithdrawNum === 0 || lpWithdrawNum > lpBalance)}
                    style={{ minHeight: 52 }}
                    className={`w-full py-3.5 rounded-2xl font-semibold text-[14px] tracking-tight transition touch-manipulation ${
                      withdrawBusy
                        ? 'shimmer text-[#07261F] relative overflow-hidden'
                        : !isConnected || (lpWithdrawNum > 0 && lpWithdrawNum <= lpBalance)
                          ? 'grad-btn'
                          : 'bg-white/[0.04] text-white/30 cursor-not-allowed'
                    }`}>
                    {withdrawBusy
                      ? <span className="relative z-10 flex items-center justify-center gap-2">
                          <span className="inline-block w-4 h-4 border-2 border-[#07261F]/70 border-t-transparent rounded-full spin-slow"/>
                          {withdrawLabel}
                        </span>
                      : !isConnected ? 'Connect Wallet'
                      : lpWithdrawNum > lpBalance && lpBalance > 0 ? 'Insufficient LP balance'
                      : withdrawLabel}
                  </button>
                </>
              )}

              <div className="flex items-center gap-1.5 text-[11px] mono text-white/30 pt-1">
                <Icons.Shield size={10}/> CurveStableSwap · {FEE.toFixed(2)}% fee · {APY.toFixed(1)}% APY
              </div>
            </div>
          </div>
        </div>

        {/* ── Right: pool info + your position ───────────────────────── */}
        <div className="lg:w-[300px] shrink-0 space-y-3">

          {/* Your position */}
          <div className="rounded-2xl card-stroke bg-white/[0.02] p-4 space-y-3">
            <div className="text-[10.5px] mono uppercase tracking-[0.18em] text-white/40">Your Position</div>
            {isConnected ? (
              lpBalance > 0 ? (
                <>
                  <div className="flex items-center gap-3">
                    <div className="flex -space-x-2">
                      {['USDC','EURC'].map((s, i) => (
                        <div key={s} style={{ zIndex: 10 - i }}><TokenLogo sym={s} size={28}/></div>
                      ))}
                    </div>
                    <div>
                      <div className="text-[15px] font-medium">USDC / EURC</div>
                      <div className="text-[11px] mono text-white/45">{lpShare.toFixed(4)}% pool share</div>
                    </div>
                  </div>
                  <div className="space-y-2 text-[13px]">
                    <div className="flex justify-between">
                      <span className="text-white/50">LP tokens</span>
                      <span className="mono font-medium">{fmt(lpBalance, 6)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/50">USDC share</span>
                      <span className="mono font-medium">~{fmt((lpBalance / lpTotal) * poolUSDC, 4)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/50">EURC share</span>
                      <span className="mono font-medium">~{fmt((lpBalance / lpTotal) * poolEURC, 4)}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-white/[0.05]">
                      <span className="text-white/50">Value</span>
                      <span className="mono font-medium text-teal-400">{fmtUSD(lpValueUSD)}</span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-[12.5px] text-white/40 py-2">
                  {lpBalRaw == null ? 'Loading…' : 'No position yet. Add liquidity to start earning.'}
                </div>
              )
            ) : (
              <div className="text-[12.5px] text-white/40 py-2">Connect wallet to see your position.</div>
            )}
          </div>

          {/* Pool details */}
          <div className="rounded-2xl card-stroke bg-white/[0.02] p-4 space-y-2.5">
            <div className="text-[10.5px] mono uppercase tracking-[0.18em] text-white/40">Pool Details</div>
            {[
              { k: 'USDC in pool', v: poolUSDC > 0 ? fmt(poolUSDC, 2) + ' USDC' : '—' },
              { k: 'EURC in pool', v: poolEURC > 0 ? fmt(poolEURC, 2) + ' EURC' : '—' },
              { k: 'Amplification', v: '200' },
              { k: 'Swap fee', v: FEE.toFixed(2) + '%' },
              { k: 'Your USDC', v: fmt(balances?.USDC ?? 0, 4) },
              { k: 'Your EURC', v: fmt(balances?.EURC ?? 0, 4) },
            ].map(({ k, v }) => (
              <div key={k} className="flex justify-between text-[12.5px]">
                <span className="text-white/45">{k}</span>
                <span className="mono font-medium">{v}</span>
              </div>
            ))}
          </div>

          {/* Faucet hint */}
          <div className="rounded-xl px-3.5 py-2.5 text-[11.5px] mono text-white/45 flex items-center gap-2"
               style={{ background: 'rgba(45,212,191,.04)', boxShadow: 'inset 0 0 0 1px rgba(45,212,191,.1)' }}>
            <Icons.Zap size={12} fill="#2DD4BF" stroke="#2DD4BF" className="shrink-0"/>
            <span>Need USDC? <a href="https://faucet.circle.com" target="_blank" rel="noreferrer"
                                className="text-teal-400 hover:text-teal-300">Get from Circle Faucet →</a></span>
          </div>
        </div>
      </div>
    </div>
  );
}
