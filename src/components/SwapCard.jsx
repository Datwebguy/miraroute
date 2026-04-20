import { useState, useEffect, useRef } from "react";
import { Icons, TokenLogo } from "./Icons";
import { getToken, fmt, fmtUSD } from "../utils/tokens";
import { FastModeBadge } from "./RoutePreview";
import RoutePreview from "./RoutePreview";

function LiveBadge({ live }) {
  if (live) return (
    <span className="text-[9px] mono uppercase tracking-wider px-1.5 py-0.5 rounded font-semibold"
          style={{ background: 'rgba(45,212,191,.15)', color: '#2DD4BF', boxShadow: 'inset 0 0 0 1px rgba(45,212,191,.4)' }}>
      LIVE
    </span>
  );
  return (
    <span className="demo-badge text-[9px] mono uppercase tracking-wider px-1.5 py-0.5 rounded"
          style={{ background: 'rgba(255,255,255,.06)', color: 'rgba(255,255,255,.4)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.08)' }}>
      DEMO
    </span>
  );
}

function AmountRow({ label, tokenSym, amount, onAmount, onOpenSelect, balance, readOnly, usd, max }) {
  return (
    <div className="rounded-2xl bg-white/[0.025] input-stroke p-4 input-glass">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] mono uppercase tracking-[0.15em] text-white/40">{label}</span>
        {balance != null && (
          <div className="flex items-center gap-2 text-[12px] text-white/55">
            <span>Bal <span className="mono text-white/75">{fmt(balance)}</span></span>
            {max && (
              <>
                <button onClick={() => onAmount((balance * 0.5).toString())}
                        className="text-[10.5px] mono px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/10 text-teal-400">50%</button>
                <button onClick={() => onAmount(balance.toString())}
                        className="text-[10.5px] mono px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/10 text-teal-400">MAX</button>
              </>
            )}
          </div>
        )}
      </div>
      <div className="flex items-center gap-3">
        <input
          value={amount} readOnly={readOnly}
          onChange={e => onAmount && onAmount(e.target.value.replace(/[^0-9.]/g, ''))}
          placeholder="0" inputMode="decimal"
          className="flex-1 min-w-0 bg-transparent text-[32px] font-light outline-none placeholder-white/20 tracking-tight"/>
        <button onClick={onOpenSelect}
                className="flex items-center gap-2 pl-1.5 pr-2.5 py-1.5 rounded-full bg-white/[0.06] hover:bg-white/[0.10] card-stroke shrink-0 transition">
          <TokenLogo sym={tokenSym} size={26}/>
          <span className="font-semibold text-[14px]">{tokenSym}</span>
          <Icons.ChevronDown size={14} className="text-white/60"/>
        </button>
      </div>
      <div className="mt-1"><span className="text-[12px] mono text-white/40">{usd}</span></div>
    </div>
  );
}

function RecipientField({ value, onChange }) {
  const [state, setState] = useState('idle');
  const [resolved, setResolved] = useState(null);
  const timerRef = useRef();

  useEffect(() => {
    clearTimeout(timerRef.current);
    setResolved(null);
    if (!value) { setState('idle'); return; }
    if (value.startsWith('0x')) {
      setState(/^0x[a-fA-F0-9]{40}$/.test(value) ? 'ok' : 'err');
      return;
    }
    if (value.endsWith('.arc') && value.length > 4) {
      setState('resolving');
      timerRef.current = setTimeout(() => {
        const hash = Array.from(value).reduce((a, c) => (a * 33 + c.charCodeAt(0)) >>> 0, 5381);
        const hex = hash.toString(16).padStart(8, '0');
        setResolved('0x' + (hex + 'e21f70c9b04a3cd5' + hex).slice(0, 40));
        setState('ok');
      }, 900);
    } else { setState('idle'); }
    return () => clearTimeout(timerRef.current);
  }, [value]);

  return (
    <div className="rounded-2xl bg-white/[0.025] input-stroke p-4 input-glass">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] mono uppercase tracking-[0.15em] text-white/40">Recipient (optional)</span>
        {state === 'ok' && resolved && <span className="text-[11px] mono text-teal-400 flex items-center gap-1"><Icons.Check size={11}/> resolved</span>}
        {state === 'resolving' && <span className="text-[11px] mono text-white/50 flex items-center gap-1.5"><span className="inline-block w-3 h-3 border border-teal-400 border-t-transparent rounded-full spin-slow"/> resolving…</span>}
        {state === 'err' && <span className="text-[11px] mono text-rose-400">invalid address</span>}
      </div>
      <div className="flex items-center gap-2">
        <input value={value} onChange={e => onChange(e.target.value)}
               placeholder="name.arc  or  0x address"
               className="flex-1 bg-transparent text-[15px] outline-none placeholder-white/25 mono"/>
        {value && <button onClick={() => onChange('')} className="text-white/40 hover:text-white"><Icons.Close size={13}/></button>}
      </div>
      {state === 'ok' && resolved && (
        <div className="mt-2 flex items-center gap-2 text-[11.5px] mono text-white/55">
          <span className="w-1 h-1 rounded-full bg-teal-400"/>
          {resolved.slice(0, 14)}…{resolved.slice(-8)}
          <button className="text-white/40 hover:text-teal-400"><Icons.Copy size={11}/></button>
        </div>
      )}
    </div>
  );
}

export function AdvancedSettings({ open, onToggle, slippage, onSlippage, gas, onGas, autoSlip, onAutoSlip }) {
  const presets = [0.1, 0.5, 1.0];
  return (
    <div className="rounded-2xl card-stroke bg-white/[0.015] overflow-hidden">
      <button onClick={onToggle} className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/[0.02] transition">
        <div className="flex items-center gap-2">
          <Icons.Settings size={14} className="text-white/55"/>
          <span className="text-[13px] text-white/75">Advanced settings</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[11.5px] mono text-white/45">
            Slip <span className="text-white/70">{autoSlip ? 'Auto' : slippage + '%'}</span> · Gas <span className="text-white/70 capitalize">{gas}</span>
          </span>
          {open ? <Icons.ChevronUp size={14} className="text-white/50"/> : <Icons.ChevronDown size={14} className="text-white/50"/>}
        </div>
      </button>
      <div className="expandy" style={{ maxHeight: open ? 300 : 0, opacity: open ? 1 : 0 }}>
        <div className="px-4 pb-4 pt-1 space-y-4 border-t border-white/5">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-[12px] text-white/60 flex items-center gap-1.5">Max slippage <Icons.Info size={11} className="text-white/30"/></div>
              <label className="flex items-center gap-2 text-[11.5px] text-white/55 cursor-pointer">
                Auto
                <span onClick={() => onAutoSlip(!autoSlip)}
                      className={`switch relative w-7 h-4 rounded-full ${autoSlip ? 'bg-teal-400' : 'bg-white/10'}`}>
                  <span className={`knob absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white ${autoSlip ? 'translate-x-3' : ''}`}/>
                </span>
              </label>
            </div>
            <div className={`flex items-center gap-2 ${autoSlip ? 'opacity-40 pointer-events-none' : ''}`}>
              {presets.map(p => (
                <button key={p} onClick={() => onSlippage(p)}
                        className={`px-3 py-1.5 rounded-lg text-[12.5px] mono card-stroke ${slippage === p ? 'bg-teal-400/15 text-teal-300' : 'bg-white/[0.03] text-white/70 hover:bg-white/5'}`}>
                  {p.toFixed(1)}%
                </button>
              ))}
              <div className="flex-1 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.03] input-stroke">
                <input value={slippage} onChange={e => onSlippage(parseFloat(e.target.value) || 0)}
                       className="flex-1 min-w-0 bg-transparent outline-none text-[12.5px] mono text-right"/>
                <span className="text-white/40 text-[12px]">%</span>
              </div>
            </div>
          </div>
          <div>
            <div className="text-[12px] text-white/60 mb-2 flex items-center gap-1.5">Transaction speed <Icons.Info size={11} className="text-white/30"/></div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { k: 'standard', label: 'Standard', fee: '$0.004', eta: 'under 2s' },
                { k: 'fast',     label: 'Fast',     fee: '$0.011', eta: 'under 1s' },
                { k: 'instant',  label: 'Instant',  fee: '$0.028', eta: 'instant'  },
              ].map(o => (
                <button key={o.k} onClick={() => onGas(o.k)}
                        className={`p-2.5 rounded-lg text-left card-stroke ${gas === o.k ? 'bg-teal-400/10' : 'bg-white/[0.02] hover:bg-white/[0.04]'}`}
                        style={gas === o.k ? { boxShadow: 'inset 0 0 0 1px rgba(45,212,191,.4)' } : {}}>
                  <div className="text-[12.5px] font-medium">{o.label}</div>
                  <div className="text-[10.5px] mono text-white/50 mt-0.5">{o.eta} · {o.fee}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SwapButton({ state, label, onClick, disabled }) {
  if (state === 'approving') {
    return (
      <button disabled className="w-full py-4 rounded-2xl font-semibold text-[14px] relative overflow-hidden shimmer text-[#07261F]">
        <span className="relative z-10 flex items-center justify-center gap-2">
          <span className="inline-block w-4 h-4 border-2 border-[#07261F]/70 border-t-transparent rounded-full spin-slow"/>
          Approving EURC in wallet…
        </span>
      </button>
    );
  }
  if (state === 'submitting' || state === 'confirming') {
    return (
      <button disabled className="w-full py-4 rounded-2xl font-semibold text-[14px] relative overflow-hidden shimmer text-[#07261F]">
        <span className="relative z-10 flex items-center justify-center gap-2">
          <span className="inline-block w-4 h-4 border-2 border-[#07261F]/70 border-t-transparent rounded-full spin-slow"/>
          {state === 'confirming' ? 'Confirm swap in wallet…' : 'Submitting to Arc…'}
        </span>
      </button>
    );
  }
  return (
    <button disabled={disabled} onClick={onClick}
            className={`w-full py-4 rounded-2xl font-semibold text-[14px] tracking-tight transition ${disabled ? 'bg-white/[0.04] text-white/30 cursor-not-allowed' : 'grad-btn'}`}>
      {label}
    </button>
  );
}

export default function SwapCard({
  fromSym, toSym, amount, setAmount, setFromSym, setToSym,
  balances, swapState, onSwap, onOpenPicker,
  fastMode, slippage, setSlippage, autoSlip, setAutoSlip,
  gas, setGas, recipient, setRecipient, isConnected, onConnect,
  needsApproval,
}) {
  const [advOpen, setAdvOpen] = useState(false);
  const [routeOpen, setRouteOpen] = useState(true);

  const fromT = getToken(fromSym);
  const toT   = getToken(toSym);
  const isLivePair = fromT.live && toT.live;
  const amountNum = parseFloat(amount) || 0;
  const amountOut = amountNum * (fromT.price / toT.price) * 0.999;
  const balance   = balances[fromSym] ?? 0;
  const toBal     = balances[toSym]   ?? 0;
  const usdIn     = amountNum > 0 ? fmtUSD(amountNum * fromT.price) : '$0.00';
  const usdOut    = amountNum > 0 ? fmtUSD(amountOut * toT.price)   : '$0.00';
  const insufficient = amountNum > balance && amountNum > 0;

  const canSwap = isConnected && amountNum > 0 && !insufficient && swapState === 'idle' && isLivePair;
  const btnLabel =
    !isConnected              ? 'Connect wallet'
    : !isLivePair && amountNum > 0 ? 'Demo only. Live swaps need USDC or EURC.'
    : amountNum === 0         ? 'Enter an amount'
    : insufficient            ? `Insufficient ${fromSym}`
    : needsApproval           ? `Approve ${fromSym} to swap`
    : fastMode                ? 'Swap via Fast Mode'
    : `Swap ${fromSym} → ${toSym} on Arc`;

  const handleBtn = () => {
    if (!isConnected) { onConnect?.(); return; }
    if (canSwap) onSwap();
  };
  const flip = () => { setFromSym(toSym); setToSym(fromSym); setAmount(''); };

  return (
    <div className="w-full max-w-[500px] relative">
      <div className="absolute -inset-8 rounded-[40px] pointer-events-none"
           style={{ background: 'radial-gradient(circle at 50% 0%, rgba(45,212,191,.16), transparent 65%)' }}/>

      <div className="relative rounded-[24px] bg-[#0F1E2E]/90 backdrop-blur card-stroke shadow-card p-5 space-y-3 swap-glass">
        {/* Header */}
        <div className="flex items-center justify-between px-1 pt-0.5 pb-1">
          <div className="flex items-center gap-2">
            <h2 className="text-[16px] font-semibold tracking-tight">Swap</h2>
            <FastModeBadge visible={fastMode}/>
            <LiveBadge live={isLivePair}/>
          </div>
          <button title="Refresh" className="p-1.5 rounded-lg hover:bg-white/5 text-white/50 hover:text-white transition">
            <Icons.Refresh size={14}/>
          </button>
        </div>

        {/* You pay */}
        <AmountRow label="You pay" tokenSym={fromSym} amount={amount} onAmount={setAmount}
                   onOpenSelect={() => onOpenPicker('from')} balance={balance} usd={usdIn} max/>

        {/* Flip */}
        <div className="relative h-0">
          <div className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
            <button onClick={flip}
                    className="w-9 h-9 rounded-xl bg-[#0C1822] card-stroke flex items-center justify-center hover:bg-[#162638] hover:rotate-180 transition-all duration-300">
              <Icons.ArrowDown size={15} className="text-teal-400"/>
            </button>
          </div>
        </div>

        {/* You receive */}
        <AmountRow label="You receive" tokenSym={toSym}
                   amount={amountNum > 0 ? fmt(amountOut, 6) : ''} readOnly
                   onOpenSelect={() => onOpenPicker('to')} balance={toBal} usd={usdOut}/>

        {/* Recipient */}
        <RecipientField value={recipient} onChange={setRecipient}/>

        {/* Advanced settings — always inside the card */}
        <AdvancedSettings
          open={advOpen} onToggle={() => setAdvOpen(o => !o)}
          slippage={slippage} onSlippage={setSlippage}
          autoSlip={autoSlip} onAutoSlip={setAutoSlip}
          gas={gas} onGas={setGas}/>

        {/* Route preview — always inside the card */}
        {amountNum > 0 && (
          <RoutePreview
            open={routeOpen} onToggle={() => setRouteOpen(o => !o)}
            fromSym={fromSym} toSym={toSym}
            amountIn={amountNum} amountOut={amountOut}
            fastMode={fastMode}
            slippage={autoSlip ? 0.5 : slippage} gas={gas}/>
        )}

        {/* Swap button */}
        <div className="pt-1">
          <SwapButton state={swapState} label={btnLabel}
                      disabled={isConnected && !canSwap} onClick={handleBtn}/>
        </div>

        <div className="flex items-center justify-between text-[11px] mono text-white/35 px-1">
          <span className="flex items-center gap-1.5"><Icons.Lock size={10}/> Your keys, your coins. MEV shield active.</span>
          <span>Quote refreshes in 12s</span>
        </div>
      </div>
    </div>
  );
}
