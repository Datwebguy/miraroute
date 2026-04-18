import { useState } from "react";
import { useAccount } from "wagmi";
import { Icons, TokenLogo } from "../components/Icons";
import { fmt, fmtUSD } from "../utils/tokens";
import { Blockchain } from "@circle-fin/app-kit";

const CHAINS = [
  { id: 'eth',  name: 'Ethereum',        short: 'ETH',  color: '#93C5FD', fee: 1.20, time: '~4 min',  liveChain: Blockchain.Ethereum_Sepolia },
  { id: 'bsc',  name: 'BNB Smart Chain', short: 'BSC',  color: '#FCD34D', fee: 0.35, time: '~90 sec', liveChain: null },
  { id: 'arb',  name: 'Arbitrum',        short: 'ARB',  color: '#5EEAD4', fee: 0.40, time: '~2 min',  liveChain: null },
  { id: 'base', name: 'Base',            short: 'BASE', color: '#A5B4FC', fee: 0.30, time: '~90 sec', liveChain: null },
  { id: 'sol',  name: 'Solana',          short: 'SOL',  color: '#C4B5FD', fee: 0.50, time: '~45 sec', liveChain: null },
  { id: 'arc',  name: 'Arc Testnet',     short: 'ARC',  color: '#2DD4BF', fee: 0.01, time: '~5 sec',  liveChain: Blockchain.Arc_Testnet, isArc: true },
];

const CHAIN_TOKENS = {
  eth:  [
    { sym: 'ETH',  name: 'Ethereum',    price: 3142.70, receives: 'QETH',  receiveTag: 'Wrapped' },
    { sym: 'USDC', name: 'USD Coin',    price: 1.00,    receives: 'USDC',  receiveTag: 'Live',   live: true },
    { sym: 'USDT', name: 'Tether',      price: 1.00,    receives: 'QUSDT', receiveTag: 'Stable'  },
    { sym: 'WBTC', name: 'Wrapped BTC', price: 63210.0, receives: 'QBTC',  receiveTag: 'Wrapped' },
  ],
  bsc: [
    { sym: 'BNB',  name: 'BNB',         price: 580.0,   receives: 'QIE',   receiveTag: 'Native'  },
    { sym: 'BUSD', name: 'Binance USD', price: 1.00,    receives: 'QUSDT', receiveTag: 'Stable'  },
    { sym: 'USDT', name: 'BSC Tether',  price: 1.00,    receives: 'QUSDT', receiveTag: 'Stable'  },
  ],
  arb: [
    { sym: 'ETH',  name: 'Ethereum',    price: 3142.70, receives: 'QETH',  receiveTag: 'Wrapped' },
    { sym: 'USDC', name: 'USD Coin',    price: 1.00,    receives: 'QUSDC', receiveTag: 'Stable'  },
    { sym: 'ARB',  name: 'Arbitrum',    price: 1.20,    receives: 'QIE',   receiveTag: 'Native'  },
  ],
  base: [
    { sym: 'ETH',  name: 'Ethereum',    price: 3142.70, receives: 'QETH',  receiveTag: 'Wrapped' },
    { sym: 'USDC', name: 'USD Coin',    price: 1.00,    receives: 'QUSDC', receiveTag: 'Stable'  },
  ],
  sol: [
    { sym: 'SOL',  name: 'Solana',      price: 148.20,  receives: 'qSOL',  receiveTag: 'Wrapped' },
    { sym: 'USDC', name: 'USD Coin',    price: 1.00,    receives: 'QUSDC', receiveTag: 'Stable'  },
  ],
  arc: [
    { sym: 'USDC', name: 'USD Coin',    price: 1.00,    receives: 'USDC',  receiveTag: 'Native',  live: true },
    { sym: 'EURC', name: 'Euro Coin',   price: 1.08,    receives: 'EURC',  receiveTag: 'Live',    live: true },
  ],
};

function ChainDot({ color }) {
  return <div className="w-2.5 h-2.5 rounded-full" style={{ background: color, boxShadow: `0 0 6px ${color}` }}/>;
}

function ChainBadge({ chain, side, onClick }) {
  return (
    <button onClick={onClick}
            className="flex-1 rounded-2xl p-4 text-left hover:bg-white/[0.03] transition group"
            style={{ background: 'rgba(255,255,255,0.025)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.06)' }}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] mono uppercase tracking-[0.18em] text-white/40">{side}</span>
        <Icons.ChevronDown size={12} className="text-white/30 group-hover:text-white/60 transition"/>
      </div>
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-full flex items-center justify-center shrink-0"
             style={{ background: `radial-gradient(circle at 35% 35%, ${chain.color}40, ${chain.color}08)`, boxShadow: `inset 0 0 0 1.5px ${chain.color}55` }}>
          <span className="text-[10.5px] mono font-bold" style={{ color: chain.color }}>{chain.short}</span>
        </div>
        <div>
          <div className="text-[14px] font-semibold">{chain.name}</div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <ChainDot color={chain.color}/>
            <span className="text-[11px] mono text-white/45">{chain.time}</span>
            {chain.isArc && (
              <span className="text-[9px] mono uppercase tracking-wider px-1 py-0.5 rounded ml-1"
                    style={{ background: 'rgba(45,212,191,.15)', color: '#2DD4BF' }}>LIVE</span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}

function TokenPill({ tok, chain, selected, onClick }) {
  return (
    <button onClick={onClick}
            className={`flex items-center gap-2 px-3 py-2 rounded-full transition text-[12.5px] font-medium ${
              selected ? 'text-teal-300' : 'bg-white/[0.04] text-white/70 hover:bg-white/[0.07] hover:text-white'
            }`}
            style={selected ? { background: 'rgba(45,212,191,.15)', boxShadow: 'inset 0 0 0 1px rgba(45,212,191,.4)' } : {}}>
      <div className="w-1.5 h-1.5 rounded-full" style={{ background: chain.color }}/>
      {tok.sym}
      {tok.live && (
        <span className="text-[8px] mono uppercase px-1 rounded"
              style={{ background: 'rgba(45,212,191,.2)', color: '#2DD4BF' }}>live</span>
      )}
    </button>
  );
}

const STEP_LABELS = ['Lock', 'Relay', 'Mint', 'Arrived'];
const STEP_DESC = (fromShort, toShort, sym) => [
  `Lock ${sym} on ${fromShort}`,
  'CCTP attestation',
  `Mint on ${toShort}`,
  'Settled ✓',
];

export default function BridgeView({ onToast, balances, onBridge, arcKit }) {
  const { isConnected } = useAccount();
  const [fromChain, setFromChain] = useState(CHAINS[0]);
  const [toChain,   setToChain]   = useState(CHAINS[5]);
  const [chainPick, setChainPick] = useState(null);
  const [step,      setStep]      = useState(0);
  const [bridgeErr, setBridgeErr] = useState(null);

  const fromTokens = CHAIN_TOKENS[fromChain.id] ?? [];
  const [selectedTok, setSelectedTok] = useState(fromTokens[0]);
  const [amt, setAmt]  = useState('500');
  const amtNum = parseFloat(amt) || 0;

  const switchFrom = (chain) => {
    setFromChain(chain);
    const tokens = CHAIN_TOKENS[chain.id] ?? [];
    setSelectedTok(tokens[0] ?? null);
  };

  const receiveSym = selectedTok?.receives ?? 'USDC';
  const receiveTag = selectedTok?.receiveTag ?? 'Wrapped';
  const receiveAmt = amtNum * 0.998;
  const totalFee   = fromChain.fee + toChain.fee;
  const eta        = fromChain.isArc || toChain.isArc ? '~5 sec' : fromChain.time;

  // Live route: Ethereum Sepolia → Arc Testnet USDC via CCTP
  const isLiveRoute = selectedTok?.live && toChain.isArc && fromChain.liveChain && arcKit?.isReady;

  const flip = () => {
    const f = fromChain, t = toChain;
    switchFrom(t);
    setToChain(f);
  };

  const startBridge = async () => {
    if (!amtNum || step > 0) return;
    setBridgeErr(null);
    setStep(1);

    if (isLiveRoute) {
      try {
        setStep(2);
        await arcKit.bridge({
          fromChain: fromChain.liveChain,
          toChain:   toChain.liveChain ?? Blockchain.Arc_Testnet,
          amount:    amt,
          token:     'USDC',
        });
        setStep(3);
        setTimeout(() => {
          setStep(4);
          onBridge?.({ sym: receiveSym, amount: amtNum, fromChain: fromChain.short, toChain: toChain.short });
          onToast?.(`Bridged ${amt} ${selectedTok?.sym} → ${receiveSym} on Arc via CCTP`);
          setTimeout(() => setStep(0), 4000);
        }, 500);
      } catch (err) {
        console.error('[Arc bridge error]', err);
        setBridgeErr(err?.message ?? 'Bridge failed');
        setStep(0);
      }
      return;
    }

    // Simulated bridge for non-live routes
    setTimeout(() => setStep(2), 1100);
    setTimeout(() => setStep(3), 2400);
    setTimeout(() => {
      setStep(4);
      onBridge?.({ sym: receiveSym, amount: amtNum, fromChain: fromChain.short, toChain: toChain.short });
      onToast?.(`Bridged ${amt} ${selectedTok?.sym} → ${receiveSym} on ${toChain.short}`);
    }, 3600);
    setTimeout(() => setStep(0), 7000);
  };

  const stepDescs = STEP_DESC(fromChain.short, toChain.short, selectedTok?.sym ?? '');

  return (
    <div className="w-full max-w-[520px] mx-auto px-4 anim-fadein">
      <div className="text-center mb-7">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] card-stroke mb-3">
          <Icons.ArrowDown size={11} stroke="#2DD4BF" className="-rotate-90"/>
          <span className="text-[11px] mono uppercase tracking-[0.18em] text-white/55">MiraRoute · Bridge</span>
        </div>
        <h1 className="text-[30px] font-light tracking-[-0.02em]">
          Move assets <span className="grad-text font-semibold">cross-chain</span>
        </h1>
        <p className="text-white/50 text-[13px] mt-1.5">
          USDC → Arc via CCTP is live. All other routes are demo.
        </p>
      </div>

      <div className="rounded-[26px] p-5 space-y-3 relative"
           style={{ background: 'rgba(15,30,46,0.85)', backdropFilter: 'blur(16px)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.07), 0 0 60px -20px rgba(45,212,191,.18)' }}>

        <div className="grid grid-cols-[1fr_48px_1fr] gap-2 items-center">
          <ChainBadge chain={fromChain} side="From" onClick={() => setChainPick('from')}/>

          <div className="flex items-center justify-center">
            <button onClick={flip}
                    className="w-11 h-11 rounded-full flex items-center justify-center transition-all duration-300 hover:rotate-180"
                    style={{ background: 'linear-gradient(135deg, rgba(45,212,191,.2), rgba(255,255,255,.06))', boxShadow: 'inset 0 0 0 1px rgba(45,212,191,.35), 0 0 18px rgba(45,212,191,.2)' }}>
              <Icons.Swap size={15} className="text-teal-300"/>
            </button>
          </div>

          <ChainBadge chain={toChain} side="To" onClick={() => setChainPick('to')}/>
        </div>

        {isLiveRoute && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-[11.5px] mono"
               style={{ background: 'rgba(45,212,191,.06)', boxShadow: 'inset 0 0 0 1px rgba(45,212,191,.2)' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-teal-400 pulse-ring"/>
            <span className="text-teal-300">Live CCTP bridge via Circle</span>
            <span className="text-white/40 ml-auto">Ethereum Sepolia → Arc</span>
          </div>
        )}

        <div className="rounded-2xl p-4 space-y-2"
             style={{ background: 'rgba(255,255,255,.025)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.05)' }}>
          <div className="flex items-center justify-between text-[11px] mono uppercase tracking-[0.15em] text-white/40">
            <span>Amount</span>
            <span>Balance&nbsp;<span className="text-white/70">{fmt(balances[selectedTok?.sym] ?? 0)}</span></span>
          </div>

          <div className="flex items-center gap-3">
            <input value={amt}
                   onChange={e => setAmt(e.target.value.replace(/[^0-9.]/g, ''))}
                   className="flex-1 min-w-0 bg-transparent text-[36px] font-light outline-none placeholder-white/15 tracking-tight"
                   placeholder="0"/>
            <button className="flex items-center gap-2 pl-2 pr-3 py-2 rounded-full shrink-0 transition hover:brightness-110"
                    style={{ background: 'rgba(255,255,255,.07)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.1)' }}>
              <div className="w-6 h-6 rounded-full" style={{ background: `radial-gradient(circle, ${fromChain.color}55, transparent)`, boxShadow: `inset 0 0 0 1px ${fromChain.color}66` }}>
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-[9px] mono font-bold" style={{ color: fromChain.color }}>{selectedTok?.sym?.slice(0,3)}</span>
                </div>
              </div>
              <span className="text-[13.5px] font-semibold">{selectedTok?.sym ?? '—'}</span>
              <Icons.ChevronDown size={13} className="text-white/50"/>
            </button>
          </div>

          <div className="flex items-center gap-2 text-[11.5px] mono text-white/40">
            <span>{amtNum > 0 && selectedTok ? fmtUSD(amtNum * selectedTok.price) : '$0.00'}</span>
            <div className="flex gap-1 ml-auto flex-wrap justify-end">
              {fromTokens.map(t => (
                <TokenPill key={t.sym} tok={t} chain={fromChain}
                           selected={t.sym === selectedTok?.sym}
                           onClick={() => setSelectedTok(t)}/>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-2xl p-4 space-y-3"
             style={{ background: 'rgba(0,0,0,.25)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.04)' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-white/55 text-[12.5px]">
              <Icons.Dot size={9} className="text-teal-400"/>
              You receive
            </div>
            <div className="flex items-center gap-2">
              <div className="text-[14px] mono font-semibold">{amtNum > 0 ? fmt(receiveAmt, 4) : '—'} {receiveSym}</div>
              <span className="text-[9.5px] mono uppercase tracking-wider px-1.5 py-0.5 rounded"
                    style={{ background: 'rgba(45,212,191,.12)', color: '#5EEAD4', boxShadow: 'inset 0 0 0 1px rgba(45,212,191,.3)' }}>
                {receiveTag}
              </span>
            </div>
          </div>

          <div className="h-px bg-white/[0.04]"/>

          <div className="grid grid-cols-2 gap-y-2.5 text-[12.5px]">
            <div>
              <div className="text-white/40 text-[11px] mono mb-0.5">Bridge fee</div>
              <div className="mono font-medium">{fmtUSD(totalFee)}</div>
            </div>
            <div className="text-right">
              <div className="text-white/40 text-[11px] mono mb-0.5">Est. time</div>
              <div className="mono font-medium text-teal-300 flex items-center justify-end gap-1">
                <Icons.Zap size={11} fill="#5EEAD4" stroke="#5EEAD4"/>
                {eta}
              </div>
            </div>
            <div className="col-span-2">
              <div className="text-white/40 text-[11px] mono mb-0.5">Route</div>
              <div className="mono text-white/75">
                {fromChain.short} → {isLiveRoute ? 'Circle CCTP' : 'MiraBridge'} → {toChain.short}
              </div>
            </div>
          </div>
        </div>

        {bridgeErr && (
          <div className="flex items-start gap-2 text-[11.5px] mono text-rose-400 px-1">
            <Icons.Info size={13} className="shrink-0 mt-0.5"/>
            {bridgeErr}
          </div>
        )}

        {step > 0 && (
          <div className="rounded-2xl p-4 anim-slidedown"
               style={{ background: 'rgba(45,212,191,.05)', boxShadow: 'inset 0 0 0 1px rgba(45,212,191,.2)' }}>
            <div className="text-[11px] mono uppercase tracking-[0.15em] text-teal-400 mb-3 flex items-center gap-2">
              {step < 4 ? (
                <><span className="inline-block w-3 h-3 border-[1.5px] border-teal-400 border-t-transparent rounded-full spin-slow"/>Bridging in progress…</>
              ) : (
                <><Icons.Check size={12}/> Bridge complete</>
              )}
            </div>
            <div className="flex items-center gap-0">
              {STEP_LABELS.map((label, i) => {
                const done   = step > i + 1 || (step === 4 && i === 3);
                const active = step === i + 1;
                return (
                  <div key={label} className="flex items-center flex-1 last:flex-none">
                    <div className="flex flex-col items-center gap-1">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] mono shrink-0 transition-all ${
                        done ? 'grad-teal' : active ? 'bg-teal-400/20' : 'bg-white/5'
                      }`}
                           style={active ? { boxShadow: 'inset 0 0 0 1px rgba(45,212,191,.5)' } : {}}>
                        {done   ? <Icons.Check size={12} stroke="#07261F" sw={3}/> :
                         active ? <span className="inline-block w-2.5 h-2.5 border-[1.5px] border-teal-400 border-t-transparent rounded-full spin-slow"/> :
                                  <span className="text-white/30">{i + 1}</span>}
                      </div>
                      <div className={`text-[10px] mono text-center ${done || active ? 'text-white' : 'text-white/30'}`}>{label}</div>
                    </div>
                    {i < 3 && <div className={`flex-1 h-px mx-1 mb-4 ${done ? 'bg-teal-400/60' : 'bg-white/10'}`}/>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <button onClick={isConnected || !isLiveRoute ? startBridge : () => {}}
                disabled={!amtNum || step > 0}
                className={`w-full py-4 rounded-2xl font-semibold text-[14.5px] tracking-tight transition-all ${
                  !amtNum || step > 0 ? 'bg-white/[0.04] text-white/25 cursor-not-allowed' : 'grad-btn'
                }`}
                style={amtNum && step === 0 ? { animation: 'pulseRing 2.5s infinite' } : {}}>
          {step > 0 ? (
            <span className="flex items-center justify-center gap-2">
              <span className="inline-block w-4 h-4 border-2 border-[#07261F]/60 border-t-transparent rounded-full spin-slow"/>
              Bridging…
            </span>
          ) : !amtNum ? 'Enter an amount' : (
            <span className="flex items-center justify-center gap-2">
              <Icons.ArrowDown size={15} stroke="currentColor" className="-rotate-90"/>
              Bridge {selectedTok?.sym} to {toChain.short}
              {isLiveRoute && <span className="text-[11px] opacity-80">(CCTP)</span>}
            </span>
          )}
        </button>

        <div className="flex items-center justify-between text-[10.5px] mono text-white/30 px-1">
          <span className="flex items-center gap-1.5"><Icons.Shield size={10}/> Canonical · MEV-protected</span>
          <span>{isLiveRoute ? 'Powered by Circle CCTP' : '12,408 inbound today'}</span>
        </div>
      </div>

      {chainPick && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 anim-fadein"
             onClick={() => setChainPick(null)}>
          <div className="absolute inset-0 bg-[#070F1A]/80 backdrop-blur-sm"/>
          <div className="relative w-full max-w-sm rounded-2xl anim-slideup overflow-hidden"
               style={{ background: 'rgba(15,30,46,.98)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.08), 0 24px 60px rgba(0,0,0,.5)' }}
               onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-white/5 flex items-center justify-between">
              <div className="text-[14px] font-semibold">Select {chainPick === 'from' ? 'source' : 'destination'} network</div>
              <button onClick={() => setChainPick(null)} className="text-white/40 hover:text-white">
                <Icons.Close size={15}/>
              </button>
            </div>
            <div className="p-2">
              {CHAINS
                .filter(c => chainPick === 'from' ? c.id !== toChain.id : c.id !== fromChain.id)
                .map(c => (
                  <button key={c.id}
                          onClick={() => {
                            if (chainPick === 'from') switchFrom(c);
                            else setToChain(c);
                            setChainPick(null);
                          }}
                          className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/[0.04] transition text-left">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                         style={{ background: `radial-gradient(circle, ${c.color}33, transparent 70%)`, boxShadow: `inset 0 0 0 1.5px ${c.color}55` }}>
                      <span className="text-[10px] mono font-bold" style={{ color: c.color }}>{c.short}</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <div className="text-[14px] font-medium">{c.name}</div>
                        {c.isArc && (
                          <span className="text-[9px] mono uppercase px-1.5 py-0.5 rounded"
                                style={{ background: 'rgba(45,212,191,.15)', color: '#2DD4BF' }}>LIVE</span>
                        )}
                      </div>
                      <div className="text-[11px] mono text-white/40 flex items-center gap-1.5 mt-0.5">
                        <ChainDot color={c.color}/> {c.time} · fee {fmtUSD(c.fee)}
                        <span className="ml-auto text-[11px] mono text-white/35">
                          {(CHAIN_TOKENS[c.id] ?? []).length} tokens
                        </span>
                      </div>
                    </div>
                    {chainPick === 'to' && c.isArc && (
                      <span className="text-[10px] mono text-teal-400 uppercase tracking-wider">Recommended</span>
                    )}
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
