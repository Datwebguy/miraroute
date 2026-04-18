import { useState } from "react";
import { Icons, TokenLogo } from "../components/Icons";
import { getToken, fmt, fmtUSD } from "../utils/tokens";

const POOLS = [
  { pair: ['USDC','EURC'],  name: 'USDC / EURC',    apy: 24.8, tvl: 14_200_000, type: 'LP',      risk: 'Low',    boost: true },
  { pair: ['USDC','EURC'],  name: 'USDC / EURC Stable', apy: 6.4, tvl: 38_500_000, type: 'Stable', risk: 'Low' },
  { pair: ['USDC'],         name: 'stUSDC staking',  apy: 11.2, tvl: 92_100_000, type: 'Staking', risk: 'Low' },
  { pair: ['WETH','USDC'],  name: 'WETH / USDC',     apy: 18.3, tvl: 6_800_000,  type: 'LP',      risk: 'Medium' },
  { pair: ['WBTC','USDC'],  name: 'WBTC / USDC',     apy: 15.1, tvl: 4_400_000,  type: 'LP',      risk: 'Medium' },
  { pair: ['USDC'],         name: 'USDC Lending',    apy: 5.9,  tvl: 26_700_000, type: 'Lending', risk: 'Low' },
  { pair: ['MIRA','USDC'],  name: 'MIRA / USDC',     apy: 42.6, tvl: 1_900_000,  type: 'LP',      risk: 'High',  boost: true },
  { pair: ['EURC','USDC'],  name: 'EURC / USDC',     apy: 28.2, tvl: 2_100_000,  type: 'LP',      risk: 'Medium' },
];

const tvlFmt = n => n >= 1e6 ? '$' + (n / 1e6).toFixed(1) + 'M' : '$' + (n / 1e3).toFixed(0) + 'K';
const riskColor = r => r === 'Low' ? 'text-teal-400' : r === 'Medium' ? 'text-amber-300' : 'text-rose-300';

function DepositModal({ pool, onClose, onConfirm, balances }) {
  const [amt, setAmt] = useState('');
  const [depSym, setDepSym] = useState(pool?.pair?.[0] || 'USDC');
  const t   = getToken(depSym);
  const bal = balances[depSym] ?? 0;
  const amtNum = parseFloat(amt) || 0;
  const usd = amtNum * t.price;
  const projected = usd * (pool.apy / 100);
  const insufficient = amtNum > bal;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 anim-fadein" onClick={onClose}>
      <div className="absolute inset-0 bg-[#070F1A]/75 backdrop-blur-sm"/>
      <div className="relative w-full max-w-[420px] rounded-2xl bg-[#0F1E2E] card-stroke shadow-card anim-slideup" onClick={e => e.stopPropagation()}>
        <div className="p-5 border-b border-white/5 flex items-start justify-between">
          <div>
            <div className="text-[11px] mono uppercase tracking-[0.18em] text-teal-400 mb-1">Deposit into</div>
            <div className="flex items-center gap-2.5">
              <div className="flex -space-x-2">
                {pool.pair.map((s, i) => <div key={s} style={{ zIndex: 10 - i }}><TokenLogo sym={s} size={28}/></div>)}
              </div>
              <div className="text-[16px] font-semibold">{pool.name}</div>
            </div>
          </div>
          <button onClick={onClose} className="text-white/50 hover:text-white"><Icons.Close size={16}/></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3 text-[12px]">
            <div className="rounded-lg bg-white/[0.03] card-stroke p-3">
              <div className="text-[10.5px] mono uppercase tracking-wider text-white/40">APY</div>
              <div className="text-[18px] font-semibold grad-text mono">{pool.apy.toFixed(1)}%</div>
            </div>
            <div className="rounded-lg bg-white/[0.03] card-stroke p-3">
              <div className="text-[10.5px] mono uppercase tracking-wider text-white/40">Type</div>
              <div className="text-[14px] mt-1.5">{pool.type} · <span className="text-white/50">{pool.risk} risk</span></div>
            </div>
          </div>

          <div className="rounded-xl bg-white/[0.025] input-stroke p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] mono uppercase tracking-[0.15em] text-white/40">Amount</span>
              <div className="flex items-center gap-2 text-[11.5px] text-white/55">
                <span>Balance <span className="mono text-white/80">{fmt(bal)}</span></span>
                <button onClick={() => setAmt(bal.toString())}
                        className="text-[10.5px] mono px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/10 text-teal-400">MAX</button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input value={amt} onChange={e => setAmt(e.target.value.replace(/[^0-9.]/g, ''))}
                     placeholder="0"
                     className="flex-1 min-w-0 bg-transparent text-[26px] font-light outline-none placeholder-white/20 mono"/>
              {pool.pair.length > 1 ? (
                <div className="flex gap-1 shrink-0">
                  {pool.pair.map(s => (
                    <button key={s} onClick={() => setDepSym(s)}
                            className={`flex items-center gap-1.5 pl-1 pr-2 py-1 rounded-full card-stroke ${depSym === s ? 'bg-teal-400/15' : 'bg-white/[0.04] hover:bg-white/[0.07]'}`}>
                      <TokenLogo sym={s} size={20}/><span className="text-[12px] font-medium">{s}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-1.5 pl-1 pr-2 py-1 rounded-full bg-white/[0.06] card-stroke shrink-0">
                  <TokenLogo sym={depSym} size={22}/><span className="text-[13px] font-medium">{depSym}</span>
                </div>
              )}
            </div>
            <div className="mt-1 text-[11.5px] mono text-white/40">{fmtUSD(usd)}</div>
          </div>

          <div className="rounded-xl bg-white/[0.02] card-stroke p-3.5 space-y-2 text-[12.5px]">
            <div className="flex justify-between">
              <span className="text-white/50">Projected yield (1y)</span>
              <span className="mono text-teal-300">+{fmtUSD(projected)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/50">Deposit fee</span>
              <span className="mono text-white/80">0.00%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/50">Unlock</span>
              <span className="mono text-white/80">Anytime</span>
            </div>
          </div>

          <button disabled={!amtNum || insufficient}
                  onClick={() => onConfirm(pool, amtNum, depSym)}
                  className={`w-full py-3.5 rounded-xl font-semibold text-[13.5px] ${!amtNum || insufficient ? 'bg-white/[0.04] text-white/30 cursor-not-allowed' : 'grad-btn'}`}>
            {!amtNum ? 'Enter an amount' : insufficient ? `Insufficient ${depSym}` : `Deposit ${amt} ${depSym}`}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function EarnView({ onDeposit, balances }) {
  const [cat, setCat] = useState('all');
  const [depositPool, setDepositPool] = useState(null);

  const cats = ['all', 'LP', 'Stable', 'Staking', 'Lending'];
  const filtered = cat === 'all' ? POOLS : POOLS.filter(p => p.type === cat);
  const totalTvl = POOLS.reduce((a, p) => a + p.tvl, 0);
  const avgApy   = POOLS.reduce((a, p) => a + p.apy, 0) / POOLS.length;

  const handleDeposit = (pool, amt, sym) => {
    onDeposit?.(pool, amt, sym);
    setDepositPool(null);
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 anim-fadein">
      <div className="mb-6 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <div className="text-[11px] mono uppercase tracking-[0.18em] text-teal-400 mb-1.5">Arc · Earn</div>
          <h1 className="text-[36px] font-light tracking-[-0.02em] leading-tight">
            Put your USDC to <span className="grad-text font-medium">work</span>
          </h1>
          <p className="text-white/55 text-[13.5px] mt-2 max-w-lg">
            Curated yield opportunities across Arc pools, stable rails and USDC staking. All positions non-custodial, settled on Arc Testnet.
          </p>
        </div>
        <div className="flex gap-4 shrink-0">
          <div className="rounded-xl card-stroke bg-white/[0.02] px-4 py-3">
            <div className="text-[10.5px] mono uppercase tracking-[0.15em] text-white/40">Total TVL</div>
            <div className="text-[20px] font-medium mono mt-0.5">${(totalTvl / 1e6).toFixed(1)}M</div>
          </div>
          <div className="rounded-xl card-stroke bg-white/[0.02] px-4 py-3">
            <div className="text-[10.5px] mono uppercase tracking-[0.15em] text-white/40">Avg APY</div>
            <div className="text-[20px] font-medium grad-text mt-0.5">{avgApy.toFixed(1)}%</div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        {cats.map(c => (
          <button key={c} onClick={() => setCat(c)}
                  className={`px-3 py-1.5 rounded-full text-[12px] card-stroke capitalize ${cat === c ? 'bg-teal-400/15 text-teal-300' : 'bg-white/[0.03] text-white/60 hover:text-white'}`}>
            {c === 'all' ? 'All' : c}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.03] card-stroke text-[12px] text-white/55">
          <Icons.Search size={12} className="text-white/40"/>
          <input placeholder="Search pools" className="bg-transparent outline-none w-36 placeholder-white/30"/>
        </div>
      </div>

      <div className="rounded-3xl bg-[#0F1E2E]/70 backdrop-blur card-stroke shadow-card overflow-hidden">
        <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] px-5 py-3 text-[10.5px] mono uppercase tracking-[0.15em] text-white/35 border-b border-white/5">
          <div>Pool</div>
          <div>Type</div>
          <div className="text-right">APY</div>
          <div className="text-right">TVL</div>
          <div>Risk</div>
          <div className="w-24 text-right">Action</div>
        </div>
        {filtered.map(p => (
          <div key={p.name} className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] px-5 py-4 items-center hover:bg-white/[0.02] border-b border-white/[0.04] last:border-b-0">
            <div className="flex items-center gap-3">
              <div className="flex -space-x-2">
                {p.pair.map((s, i) => <div key={s} style={{ zIndex: 10 - i }}><TokenLogo sym={s} size={30}/></div>)}
              </div>
              <div>
                <div className="text-[14px] font-medium flex items-center gap-2">
                  {p.name}
                  {p.boost && (
                    <span className="text-[9.5px] mono uppercase tracking-wider px-1.5 py-0.5 rounded bg-teal-400/15 text-teal-300 flex items-center gap-1">
                      <Icons.Zap size={9} fill="#5EEAD4" stroke="#5EEAD4"/>Boosted
                    </span>
                  )}
                </div>
                <div className="text-[11px] mono text-white/40">Arc DEX · MiraPool</div>
              </div>
            </div>
            <div>
              <span className="text-[11.5px] mono text-white/70 px-2 py-0.5 rounded bg-white/[0.04] card-stroke">{p.type}</span>
            </div>
            <div className="text-right">
              <div className="text-[17px] font-semibold grad-text">{p.apy.toFixed(1)}%</div>
              <div className="text-[10px] mono text-white/40 uppercase tracking-wider">APY</div>
            </div>
            <div className="text-right mono text-[13px] text-white/80">{tvlFmt(p.tvl)}</div>
            <div className={`text-[12.5px] mono flex items-center gap-1.5 ${riskColor(p.risk)}`}>
              <Icons.Shield size={12}/> {p.risk}
            </div>
            <div className="w-24 text-right">
              <button onClick={() => setDepositPool(p)}
                      className="grad-btn px-3.5 py-1.5 rounded-lg text-[12.5px] font-semibold">
                Deposit
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 text-[11px] mono text-white/35 flex items-center gap-2 justify-center">
        <Icons.Shield size={11}/> Smart contracts audited by Trail of Bits &amp; Spearbit · Last review Apr 2026
      </div>

      {depositPool && (
        <DepositModal pool={depositPool} balances={balances}
                      onClose={() => setDepositPool(null)}
                      onConfirm={handleDeposit}/>
      )}
    </div>
  );
}
