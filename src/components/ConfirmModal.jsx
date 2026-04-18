import { Icons, TokenLogo } from "./Icons";
import { getToken, fmt, fmtUSD } from "../utils/tokens";

export default function ConfirmModal({ open, onClose, onConfirm, fromSym, toSym, amountIn, amountOut, slippage, gas, isLive }) {
  if (!open) return null;

  const fromT  = getToken(fromSym);
  const toT    = getToken(toSym);
  const rate   = amountIn > 0 ? amountOut / amountIn : 0;
  const minRec = amountOut * (1 - slippage / 100);
  const gasFee = gas === 'instant' ? 0.028 : gas === 'fast' ? 0.011 : 0.004;
  const fee    = (amountIn * fromT.price * 0.0005 + gasFee).toFixed(4);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 anim-fadein">
      <div className="absolute inset-0 bg-[#070F1A]/80 backdrop-blur-sm" onClick={onClose}/>

      <div className="relative w-full max-w-[420px] rounded-2xl bg-[#0F1E2E] card-stroke shadow-card anim-slideup overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-teal-400/15 flex items-center justify-center">
              <Icons.Swap size={12} stroke="#2DD4BF"/>
            </div>
            <span className="text-[15px] font-semibold">Confirm Swap</span>
            {isLive && (
              <span className="text-[9px] mono uppercase tracking-wider px-1.5 py-0.5 rounded font-semibold"
                    style={{ background: 'rgba(45,212,191,.15)', color: '#2DD4BF', boxShadow: 'inset 0 0 0 1px rgba(45,212,191,.4)' }}>
                LIVE · Arc
              </span>
            )}
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white">
            <Icons.Close size={16}/>
          </button>
        </div>

        <div className="p-5 space-y-3">
          {/* You pay */}
          <div className="rounded-xl bg-white/[0.03] card-stroke p-4">
            <div className="text-[10.5px] mono uppercase tracking-[0.15em] text-white/40 mb-2">You pay</div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <TokenLogo sym={fromSym} size={36}/>
                <div>
                  <div className="text-[22px] font-light">{fmt(amountIn)}</div>
                  <div className="text-[11.5px] mono text-white/50">{fromSym}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[13px] mono text-white/60">{fmtUSD(amountIn * fromT.price)}</div>
              </div>
            </div>
          </div>

          {/* Arrow */}
          <div className="flex justify-center">
            <div className="w-8 h-8 rounded-xl bg-[#0F1E2E] card-stroke flex items-center justify-center">
              <Icons.ArrowDown size={15} className="text-teal-400"/>
            </div>
          </div>

          {/* You receive */}
          <div className="rounded-xl bg-teal-400/[0.06] p-4" style={{ boxShadow: 'inset 0 0 0 1px rgba(45,212,191,.2)' }}>
            <div className="text-[10.5px] mono uppercase tracking-[0.15em] text-teal-400/70 mb-2">You receive (estimated)</div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <TokenLogo sym={toSym} size={36}/>
                <div>
                  <div className="text-[22px] font-light grad-text">{fmt(amountOut, 4)}</div>
                  <div className="text-[11.5px] mono text-white/50">{toSym}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[13px] mono text-white/60">{fmtUSD(amountOut * toT.price)}</div>
              </div>
            </div>
          </div>

          {/* Details */}
          <div className="rounded-xl bg-white/[0.02] card-stroke p-4 space-y-2.5 text-[12.5px]">
            <div className="flex justify-between">
              <span className="text-white/50">Rate</span>
              <span className="mono">1 {fromSym} = {fmt(rate, 4)} {toSym}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/50">Price impact</span>
              <span className="mono text-teal-400">0.02%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/50">Network fee</span>
              <span className="mono">{fmtUSD(parseFloat(fee))}</span>
            </div>
            <div className="flex justify-between border-t border-white/5 pt-2.5">
              <span className="text-white/50">Min received</span>
              <span className="mono text-white/85">{fmt(minRec, 4)} {toSym}</span>
            </div>
          </div>

          {/* Warning */}
          <div className="flex items-start gap-2 text-[11.5px] text-white/45 mono">
            <Icons.Info size={13} className="text-white/30 shrink-0 mt-0.5"/>
            Output is estimated. If the price changes by more than {slippage}% your transaction will revert.
          </div>

          {/* Buttons */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <button onClick={onClose}
                    className="py-3.5 rounded-xl text-[13.5px] font-medium card-stroke bg-white/[0.04] hover:bg-white/[0.07] transition">
              Cancel
            </button>
            <button onClick={onConfirm}
                    className="py-3.5 rounded-xl text-[13.5px] font-semibold grad-btn">
              Confirm Swap
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
