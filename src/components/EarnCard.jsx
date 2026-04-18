import { Icons, TokenLogo } from "./Icons";
import { fmt } from "../utils/tokens";

export default function SuccessOverlay({ open, onClose, fromSym, toSym, amountIn, amountOut, onGoEarn }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center p-4 sm:p-6 anim-fadein">
      <div className="absolute inset-0 bg-[#070F1A]/75 backdrop-blur-sm" onClick={onClose}/>
      <div className="relative w-full max-w-[460px] anim-slideup">
        <div className="rounded-3xl bg-[#0F1E2E] card-stroke shadow-card p-6 relative overflow-hidden">
          <div className="absolute -top-16 -right-16 w-40 h-40 rounded-full pointer-events-none"
               style={{ background: 'radial-gradient(circle, rgba(45,212,191,.25), transparent 70%)' }}/>

          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full grad-teal flex items-center justify-center shrink-0"
                 style={{ boxShadow: '0 0 24px rgba(45,212,191,.4)' }}>
              <Icons.Check size={22} stroke="#07261F" sw={2.8}/>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[11px] mono uppercase tracking-[0.18em] text-teal-400 mb-1">Swap complete</div>
              <div className="text-[18px] font-semibold tracking-tight">
                Swapped <span className="mono">{fmt(amountIn)}</span> {fromSym} → <span className="mono">{fmt(amountOut, 4)}</span> {toSym}
              </div>
              <div className="text-[12px] text-white/50 mt-1 flex items-center gap-2 mono">
                0x8e9f…a42c
                <button className="text-white/40 hover:text-teal-400"><Icons.External size={11}/></button>
                <span className="text-white/25">·</span>
                Settled in 1.18s
              </div>
            </div>
          </div>

          {/* Earn suggestions */}
          <div className="mt-5 rounded-2xl overflow-hidden relative anim-slideup"
               style={{ animationDelay: '.2s', background: 'linear-gradient(135deg, rgba(45,212,191,.10), rgba(255,255,255,.02))', boxShadow: 'inset 0 0 0 1px rgba(45,212,191,.25)' }}>
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Icons.Sparkle size={13} stroke="#2DD4BF" fill="rgba(45,212,191,.25)"/>
                  <span className="text-[11px] mono uppercase tracking-[0.18em] text-teal-300">Put it to work</span>
                </div>
                <span className="text-[10.5px] mono text-white/40">Arc · Curated</span>
              </div>

              <div className="space-y-2">
                {[
                  { pair: `${toSym}/USDC LP`,    apy: '24.8%', tag: 'High yield', icons: [toSym, 'USDC'] },
                  { pair: `${toSym} Lending`,   apy: '6.4%',  tag: 'Stable',    icons: [toSym] },
                  { pair: 'stUSDC staking',      apy: '11.2%', tag: 'Native',    icons: ['USDC'] },
                ].map((o, i) => (
                  <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] transition card-stroke cursor-pointer">
                    <div className="flex -space-x-2">
                      {o.icons.map((s, j) => <div key={j} style={{ zIndex: 10 - j }}><TokenLogo sym={s} size={26}/></div>)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-medium flex items-center gap-2">
                        {o.pair}
                        <span className="text-[9.5px] mono uppercase tracking-wider text-white/50 px-1.5 py-0.5 rounded bg-white/5">{o.tag}</span>
                      </div>
                      <div className="text-[11px] mono text-white/45">{fmt(amountOut * 0.9, 2)} {toSym} available to deposit</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-[14px] font-semibold grad-text">{o.apy}</div>
                      <div className="text-[9.5px] mono uppercase tracking-wider text-white/40">APY</div>
                    </div>
                    <Icons.ChevronRight size={14} className="text-white/30"/>
                  </div>
                ))}
              </div>

              <div className="mt-3 flex items-center gap-2">
                <button onClick={onGoEarn} className="flex-1 grad-btn py-2.5 rounded-xl text-[13px] font-semibold">
                  Deposit on Arc
                </button>
                <button onClick={onClose} className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-[13px] text-white/75 card-stroke">
                  Not now
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
