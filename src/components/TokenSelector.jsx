import { useState, useEffect } from "react";
import { TOKENS, fmt, fmtUSD } from "../utils/tokens";
import { Icons, TokenLogo } from "./Icons";

export default function TokenSelector({ open, onClose, onPick, exclude, balances = {} }) {
  const [q, setQ] = useState('');
  useEffect(() => { if (open) setQ(''); }, [open]);
  if (!open) return null;

  const filtered = TOKENS.filter(t =>
    t.sym !== exclude &&
    (t.sym.toLowerCase().includes(q.toLowerCase()) || t.name.toLowerCase().includes(q.toLowerCase()))
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 anim-fadein" onClick={onClose}>
      <div className="absolute inset-0 bg-[#070F1A]/75 backdrop-blur-sm"/>
      <div className="relative w-full max-w-md rounded-2xl bg-[#0F1E2E] card-stroke shadow-card anim-slideup"
           onClick={e => e.stopPropagation()}>
        <div className="p-5 border-b border-white/5 flex items-center justify-between">
          <div className="text-[15px] font-semibold">Select token</div>
          <button onClick={onClose} className="text-white/50 hover:text-white"><Icons.Close size={16}/></button>
        </div>
        <div className="p-4 border-b border-white/5">
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-white/[0.03] input-stroke">
            <Icons.Search size={15} className="text-white/40"/>
            <input autoFocus value={q} onChange={e => setQ(e.target.value)}
                   placeholder="Search name or paste address"
                   className="flex-1 bg-transparent outline-none text-[14px] placeholder-white/30"/>
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            {['USDC', 'EURC', 'WETH', 'MIRA'].map(s => (
              <button key={s} onClick={() => onPick(s)}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full card-stroke hover:bg-white/5 text-[12px]">
                <TokenLogo sym={s} size={16}/> {s}
              </button>
            ))}
          </div>
        </div>
        <div className="max-h-[360px] overflow-y-auto no-scrollbar p-2">
          {filtered.map(t => (
            <button key={t.sym} onClick={() => onPick(t.sym)}
                    className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-white/[0.04] transition text-left">
              <TokenLogo sym={t.sym} size={32}/>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <div className="text-[14px] font-medium">{t.sym}</div>
                  <div className={`text-[9.5px] mono uppercase tracking-wider px-1.5 py-0.5 rounded ${t.live ? 'text-teal-300' : 'demo-badge text-white/40 bg-white/5'}`}
                       style={t.live ? { background: 'rgba(45,212,191,.15)', boxShadow: 'inset 0 0 0 1px rgba(45,212,191,.3)' } : {}}>
                    {t.tag}
                  </div>
                </div>
                <div className="text-[12px] text-white/50">{t.name}</div>
              </div>
              <div className="text-right">
                <div className="text-[13px] mono">{fmt(balances[t.sym] ?? 0)}</div>
                <div className="text-[11px] text-white/40 mono">{fmtUSD((balances[t.sym] ?? 0) * t.price)}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
