import { Icons, TokenLogo } from "../components/Icons";
import { TOKENS, getToken, fmt, fmtUSD } from "../utils/tokens";

function agoText(ts) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function ActivityRow({ tx }) {
  const iconFor = tx.type === 'swap'    ? <Icons.Swap size={13} stroke="#5EEAD4"/>
                : tx.type === 'deposit' ? <Icons.Plus size={13} stroke="#5EEAD4"/>
                : <Icons.ArrowDown size={13} stroke="#5EEAD4" className="-rotate-90"/>;
  const labelFor = tx.type === 'swap' ? 'Swap' : tx.type === 'deposit' ? 'Deposit' : 'Bridge';
  return (
    <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] card-stroke transition">
      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
           style={{ background: 'rgba(45,212,191,.10)', boxShadow: 'inset 0 0 0 1px rgba(45,212,191,.25)' }}>
        {iconFor}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[12.5px] font-medium flex items-center gap-1.5">
          {labelFor}
          {tx.type === 'swap'    && <span className="text-white/65 mono">{tx.fromSym} → {tx.toSym}</span>}
          {tx.type === 'deposit' && <span className="text-white/65 mono">{tx.poolName}</span>}
          {tx.type === 'bridge'  && <span className="text-white/65 mono">{tx.fromChain} → {tx.toChain}</span>}
        </div>
        <div className="text-[10.5px] mono text-white/40 flex items-center gap-1.5">
          {agoText(tx.ts)}
          {tx.hash && (
            <>
              <span className="text-white/25">·</span>
              <a href={`https://testnet.arcscan.app/tx/${tx.hash}`}
                 target="_blank" rel="noreferrer"
                 className="flex items-center gap-0.5 text-teal-400/70 hover:text-teal-300 transition truncate"
                 onClick={e => e.stopPropagation()}>
                {tx.hash.slice(0, 8)}…{tx.hash.slice(-4)}
                <Icons.External size={9} className="shrink-0"/>
              </a>
            </>
          )}
        </div>
      </div>
      <div className="text-right shrink-0">
        {tx.type === 'swap' && (
          <>
            <div className="text-[12px] mono text-rose-300/80">−{fmt(tx.amountIn)} {tx.fromSym}</div>
            <div className="text-[12px] mono text-teal-300">+{fmt(tx.amountOut, 4)} {tx.toSym}</div>
          </>
        )}
        {tx.type === 'deposit' && (
          <>
            <div className="text-[12px] mono text-white/85">{fmt(tx.amount)} {tx.sym}</div>
            <div className="text-[10.5px] mono text-teal-300">{tx.apy?.toFixed(1)}% APY</div>
          </>
        )}
        {tx.type === 'bridge' && (
          <>
            <div className="text-[12px] mono text-white/85">{fmt(tx.amount)} {tx.sym}</div>
            <div className="text-[10.5px] mono text-teal-300">→ {tx.toChain}</div>
          </>
        )}
      </div>
    </div>
  );
}

const CHANGES = { USDC: 0.01, EURC: 0.02, USDT: 0.02, WETH: -1.2, WBTC: 3.1, wSOL: -0.6, MIRA: 8.7 };

function Spark({ up }) {
  const d = up
    ? 'M0 20 L8 16 L16 18 L24 10 L32 14 L40 6 L48 8'
    : 'M0 6 L8 10 L16 8 L24 16 L32 12 L40 18 L48 20';
  return (
    <svg width="48" height="22" viewBox="0 0 48 22">
      <path d={d} stroke={up ? '#2DD4BF' : '#fb7185'} strokeWidth="1.3"
            fill="none" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

export default function PortfolioView({ address, balances, transactions, onGoSwap }) {
  const shortAddr = address ? `${address.slice(0, 8)}…${address.slice(-4)}` : '—';

  const holdings = TOKENS
    .map(t => ({ sym: t.sym, amount: balances[t.sym] ?? 0, price: t.price, change: CHANGES[t.sym] ?? 0 }))
    .filter(h => h.amount > 0);
  const netWorth = holdings.reduce((a, h) => a + h.amount * h.price, 0);
  const dayChangePct = netWorth > 0 ? 1.84 : 0;
  const dayChangeUsd = netWorth * dayChangePct / 100;

  return (
    <div className="w-full max-w-5xl mx-auto px-4 anim-fadein">
      {/* Net worth card */}
      <div className="rounded-3xl bg-[#0F1E2E]/70 backdrop-blur card-stroke shadow-card p-7 mb-5 relative overflow-hidden">
        <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full pointer-events-none"
             style={{ background: 'radial-gradient(circle, rgba(45,212,191,.2), transparent 70%)' }}/>
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 relative">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[11px] mono uppercase tracking-[0.18em] text-white/45">Net worth</span>
              <span className="text-[11px] mono text-teal-400 flex items-center gap-1">
                <span className="w-1 h-1 rounded-full bg-teal-400 pulse-ring"/>
                {shortAddr}
              </span>
            </div>
            <div className="text-[56px] font-light tracking-[-0.02em] leading-none">
              <span className="text-white/40">$</span>
              <span className="grad-text font-medium">{netWorth.toLocaleString('en-US', { maximumFractionDigits: 2 })}</span>
            </div>
            <div className="mt-3 flex items-center gap-3 text-[13px]">
              <span className={`flex items-center gap-1 mono ${dayChangePct >= 0 ? 'text-teal-400' : 'text-rose-400'}`}>
                <Icons.TrendUp size={13}/> +{fmtUSD(dayChangeUsd)} ({dayChangePct.toFixed(2)}%)
              </span>
              <span className="text-white/40">24h</span>
            </div>
          </div>
          <div className="flex flex-col items-start md:items-end gap-3">
            <div className="flex gap-1">
              {['1D','1W','1M','3M','ALL'].map((r, i) => (
                <button key={r} className={`px-2.5 py-1 rounded-md text-[11px] mono ${i === 1 ? 'bg-teal-400/15 text-teal-300' : 'text-white/50 hover:text-white/80'}`}>{r}</button>
              ))}
            </div>
            <svg width="240" height="72" viewBox="0 0 240 72" className="opacity-90">
              <defs>
                <linearGradient id="pfGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#2DD4BF" stopOpacity=".4"/>
                  <stop offset="1" stopColor="#2DD4BF" stopOpacity="0"/>
                </linearGradient>
              </defs>
              <path d="M0 50 L20 48 L40 42 L60 46 L80 38 L100 34 L120 30 L140 32 L160 22 L180 24 L200 14 L220 18 L240 10 L240 72 L0 72 Z" fill="url(#pfGrad)"/>
              <path d="M0 50 L20 48 L40 42 L60 46 L80 38 L100 34 L120 30 L140 32 L160 22 L180 24 L200 14 L220 18 L240 10"
                    stroke="#2DD4BF" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
            </svg>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-7 pt-5 border-t border-white/5">
          {[
            { k: 'Available',          v: fmtUSD(netWorth), sub: 'across ' + holdings.length + ' assets' },
            { k: 'Staked',             v: '$0.00',          sub: 'Nothing yet' },
            { k: 'Providing liquidity',v: '$0.00',          sub: 'Nothing yet' },
            { k: 'Rewards (all-time)', v: '$0.00',          sub: '—' },
          ].map((s, i) => (
            <div key={i}>
              <div className="text-[10.5px] mono uppercase tracking-[0.15em] text-white/40">{s.k}</div>
              <div className="text-[19px] font-medium mt-1 mono">{s.v}</div>
              <div className="text-[11px] text-white/40 mt-0.5">{s.sub}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Assets table */}
        <div className="lg:col-span-2 rounded-3xl bg-[#0F1E2E]/70 backdrop-blur card-stroke shadow-card p-2">
          <div className="flex items-center justify-between px-4 pt-3 pb-3">
            <div className="text-[14px] font-semibold">Assets</div>
            <div className="flex items-center gap-2 text-[11px] mono text-white/40">
              <Icons.Dot size={10} className="text-teal-400"/> Arc Testnet
            </div>
          </div>
          <div className="grid grid-cols-[1.6fr_1fr_1fr_1fr_auto] px-4 py-2 text-[10.5px] mono uppercase tracking-[0.15em] text-white/35 border-b border-white/5">
            <div>Asset</div>
            <div className="text-right">Price · 24h</div>
            <div className="text-right">Balance</div>
            <div className="text-right">Value</div>
            <div className="w-16"/>
          </div>
          {holdings.length === 0 ? (
            <div className="px-4 py-8 text-center text-[13px] text-white/40">No assets yet</div>
          ) : holdings.map(h => {
            const t = getToken(h.sym);
            const val = h.amount * h.price;
            return (
              <div key={h.sym} className="grid grid-cols-[1.6fr_1fr_1fr_1fr_auto] px-4 py-3.5 items-center hover:bg-white/[0.02] border-b border-white/[0.04]">
                <div className="flex items-center gap-3">
                  <TokenLogo sym={h.sym} size={32}/>
                  <div>
                    <div className="text-[14px] font-medium">{h.sym}</div>
                    <div className="text-[11.5px] text-white/45">{t.name}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[13px] mono">${h.price.toLocaleString('en-US', { maximumFractionDigits: 2 })}</div>
                  <div className={`text-[11px] mono ${h.change >= 0 ? 'text-teal-400' : 'text-rose-400'}`}>{h.change >= 0 ? '+' : ''}{h.change.toFixed(2)}%</div>
                </div>
                <div className="text-right mono text-[13px]">{fmt(h.amount)}</div>
                <div className="text-right">
                  <div className="text-[13.5px] mono font-medium">{fmtUSD(val)}</div>
                  <div className="mt-0.5 flex justify-end"><Spark up={h.change >= 0}/></div>
                </div>
                <div className="w-16 flex justify-end">
                  <button className="text-[11.5px] mono text-teal-400 hover:text-teal-300 px-2 py-1">Swap</button>
                </div>
              </div>
            );
          })}
          <div className="px-4 py-3 flex items-center justify-between">
            <button className="text-[12px] text-white/55 hover:text-white flex items-center gap-1.5">
              <Icons.Plus size={12}/> Import custom token
            </button>
            <span className="text-[11px] mono text-white/35">{holdings.length} assets · Arc Testnet</span>
          </div>
        </div>

        {/* Activity + account */}
        <div className="rounded-3xl bg-[#0F1E2E]/70 backdrop-blur card-stroke shadow-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="text-[14px] font-semibold">Recent activity</div>
            {transactions?.length > 0 && (
              <span className="text-[11px] mono text-white/45">{transactions.length} {transactions.length === 1 ? 'tx' : 'txs'}</span>
            )}
          </div>
          {!transactions?.length ? (
            <div className="flex flex-col items-center justify-center text-center py-10 px-2">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
                   style={{ background: 'radial-gradient(circle, rgba(45,212,191,.15), transparent 70%)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.06)' }}>
                <Icons.Flag size={20} stroke="#5EEAD4"/>
              </div>
              <div className="text-[14px] font-medium mb-1">Nothing here yet</div>
              <div className="text-[12px] text-white/50 leading-relaxed max-w-[220px]">
                Your swaps, bridges and deposits will appear here as soon as you make a move.
              </div>
              <button onClick={onGoSwap} className="mt-4 grad-btn px-3.5 py-2 rounded-lg text-[12px] font-semibold">
                Start a swap
              </button>
            </div>
          ) : (
            <div className="space-y-2 max-h-[320px] overflow-y-auto no-scrollbar pr-1">
              {transactions.map(tx => <ActivityRow key={tx.id} tx={tx}/>)}
            </div>
          )}

          <div className="mt-5 pt-4 border-t border-white/5">
            <div className="text-[10.5px] mono uppercase tracking-[0.15em] text-white/35 mb-3">Account</div>
            <div className="space-y-2.5 text-[12.5px]">
              <div className="flex items-center justify-between">
                <span className="text-white/50">Address</span>
                <span className="mono text-white/85 flex items-center gap-1.5">
                  {shortAddr}
                  <button onClick={() => address && navigator.clipboard.writeText(address)}
                          className="text-white/40 hover:text-teal-400">
                    <Icons.Copy size={11}/>
                  </button>
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/50">Network</span>
                <span className="mono text-teal-400">Arc Testnet</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
