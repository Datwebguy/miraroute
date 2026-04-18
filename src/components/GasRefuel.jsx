import { Icons } from "./Icons";

export default function GasRefuel({ visible, onDismiss, onRefuel }) {
  if (!visible) return null;
  return (
    <div className="rounded-2xl p-3.5 anim-slidedown relative overflow-hidden"
         style={{ background: 'linear-gradient(90deg, rgba(251,191,36,.10), rgba(45,212,191,.06))', boxShadow: 'inset 0 0 0 1px rgba(251,191,36,.25)' }}>
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
             style={{ background: 'rgba(251,191,36,.15)', boxShadow: 'inset 0 0 0 1px rgba(251,191,36,.3)' }}>
          <Icons.Gas size={15} stroke="#FBBF24"/>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-medium text-amber-200 flex items-center gap-2">
            Low USDC for gas <span className="mono text-[11px] text-amber-300/70">0.42 USDC ≈ 18 txs left</span>
          </div>
          <div className="text-[12px] text-white/60 mt-0.5">
            Refuel automatically from this swap — ~$2.00 in USDC covers your next 250 transactions.
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={onRefuel}
                  className="px-3 py-1.5 rounded-lg bg-amber-400/20 hover:bg-amber-400/30 text-amber-200 text-[12px] font-medium card-stroke">
            Refuel $2
          </button>
          <button onClick={onDismiss} className="text-white/40 hover:text-white">
            <Icons.Close size={14}/>
          </button>
        </div>
      </div>
    </div>
  );
}
