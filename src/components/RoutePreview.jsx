import { Icons, TokenLogo } from "./Icons";
import { fmt, fmtUSD, getToken } from "../utils/tokens";

function FastModeBadge({ visible }) {
  if (!visible) return null;
  return (
    <div className="anim-slidedown inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full"
         style={{ background: 'linear-gradient(135deg, rgba(45,212,191,.18), rgba(255,255,255,.08))', boxShadow: 'inset 0 0 0 1px rgba(45,212,191,.35)' }}>
      <Icons.Zap size={11} stroke="#5EEAD4" fill="#5EEAD4"/>
      <span className="text-[10.5px] mono uppercase tracking-[0.15em] text-teal-300 font-medium">Fast Mode</span>
    </div>
  );
}

export { FastModeBadge };

export default function RoutePreview({ open, onToggle, fromSym, toSym, amountIn, amountOut, fastMode, slippage, gas }) {
  const mid = !fastMode && fromSym !== 'USDC' && toSym !== 'USDC' ? 'USDC' : null;
  const hops = [fromSym, mid, toSym].filter(Boolean);
  const swapFee = amountIn * getToken(fromSym).price * 0.0005;
  const price   = amountIn > 0 ? amountOut / amountIn : 0;
  // Arc Testnet gas is paid in USDC and is very cheap (~$0.001–0.003)
  const gasFee  = gas === 'instant' ? 0.003 : gas === 'fast' ? 0.0018 : 0.0008;

  return (
    <div className="rounded-2xl card-stroke bg-white/[0.015] overflow-hidden">
      <button onClick={onToggle} className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/[0.02]">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded-md grad-teal flex items-center justify-center shrink-0">
            <Icons.Spark size={11} stroke="#07261F" sw={2.4}/>
          </div>
          <div className="flex items-center gap-2 text-[12.5px] min-w-0">
            <span className="text-white/55">Route</span>
            <div className="flex items-center gap-1 mono truncate">
              {hops.map((h, i) => (
                <span key={i} className="flex items-center gap-1">
                  <span>{h}</span>
                  {i < hops.length - 1 && <Icons.ChevronRight size={11} className="text-white/30"/>}
                </span>
              ))}
            </div>
            <FastModeBadge visible={fastMode}/>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {open ? <Icons.ChevronUp size={14} className="text-white/50"/> : <Icons.ChevronDown size={14} className="text-white/50"/>}
        </div>
      </button>

      <div className="expandy" style={{ maxHeight: open ? 520 : 0, opacity: open ? 1 : 0 }}>
        <div className="px-4 pb-4 pt-3 border-t border-white/5 space-y-4">
          {/* Visual route */}
          <div className="relative py-3">
            <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 60">
              <path d="M 8 30 Q 50 8 92 30" stroke="rgba(45,212,191,.5)" strokeWidth="0.4" fill="none" className="route-dash" pathLength="100"/>
            </svg>
            <div className="relative flex items-center justify-between">
              {hops.map((h, i) => (
                <div key={i} className="flex flex-col items-center gap-1.5 z-10">
                  <div className="relative">
                    <TokenLogo sym={h} size={36}/>
                    {fastMode && i === 0 && <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full grad-teal pulse-ring"/>}
                  </div>
                  <div className="text-[11px] mono text-white/70">{h}</div>
                  {i < hops.length - 1 && (
                    <div className="text-[9px] mono uppercase tracking-wider text-white/35">
                      {fastMode ? 'Arc DEX v3' : i === 0 ? 'Arc DEX' : 'MiraPool'}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-6 gap-y-2.5 text-[12.5px]">
            <div className="flex items-center justify-between">
              <span className="text-white/50">Rate</span>
              <span className="mono text-white/85">1 {fromSym} = {fmt(price, 4)} {toSym}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white/50">Price impact</span>
              <span className="mono text-teal-400">0.02%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white/50">Network fee</span>
              <span className="mono text-white/85">{fmtUSD(swapFee + gasFee)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white/50">Min received</span>
              <span className="mono text-white/85">{fmt(amountOut * (1 - slippage / 100), 4)} {toSym}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-[11px] mono text-white/40">
            <Icons.Shield size={12} className="text-white/50"/>
            <span>Audited route. Protected from MEV. Settles in about 1 second on Arc.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
