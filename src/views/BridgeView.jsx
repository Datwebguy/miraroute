import { useState } from "react";
import { useAccount, useReadContract } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { Icons, TokenLogo } from "../components/Icons";
import { fmt, fmtUSD } from "../utils/tokens";
import { Blockchain } from "@circle-fin/app-kit";

// Circle's official USDC contract on Ethereum Sepolia testnet
const SEPOLIA_USDC = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238";
const SEPOLIA_CHAIN_ID = 11155111;
const ERC20_BALANCE_ABI = [
  { name: "balanceOf", type: "function", stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }] },
  { name: "decimals", type: "function", stateMutability: "view",
    inputs: [], outputs: [{ name: "", type: "uint8" }] },
];

const STEP_LABELS = ['Lock', 'Relay', 'Mint', 'Arrived'];

const COMING_SOON = [
  { name: 'BNB Smart Chain', short: 'BSC',  color: '#FCD34D' },
  { name: 'Arbitrum One',    short: 'ARB',  color: '#5EEAD4' },
  { name: 'Base',            short: 'BASE', color: '#A5B4FC' },
  { name: 'Solana',          short: 'SOL',  color: '#C4B5FD' },
  { name: 'Polygon',         short: 'POL',  color: '#8B5CF6' },
];

export default function BridgeView({ onToast, onBridge, arcKit }) {
  const { address, isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();
  const [amt, setAmt]             = useState('');
  const [step, setStep]           = useState(0);
  const [bridgeErr, setBridgeErr] = useState(null);

  // Fetch Sepolia USDC balance — explicit chainId ensures this works regardless of connected chain
  const { data: rawBalance } = useReadContract({
    address: SEPOLIA_USDC,
    abi: ERC20_BALANCE_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    chainId: SEPOLIA_CHAIN_ID,
    query: { enabled: !!address, refetchInterval: 8000 },
  });

  // USDC has 6 decimals
  const sepoliaBalance = rawBalance != null ? Number(rawBalance) / 1e6 : null;

  const amtNum     = parseFloat(amt) || 0;
  const receiveAmt = amtNum * 0.998;
  const fee        = 1.20;

  const insufficient = sepoliaBalance != null && amtNum > 0 && amtNum > sepoliaBalance;
  const canBridge    = isConnected && amtNum > 0 && !insufficient && step === 0;

  const startBridge = async () => {
    if (!canBridge) return;
    setBridgeErr(null);
    setStep(1);
    try {
      setStep(2);
      await arcKit.bridge({
        fromChain: Blockchain.Ethereum_Sepolia,
        toChain:   Blockchain.Arc_Testnet,
        amount:    amt,
        token:     'USDC',
      });
      setStep(3);
      setTimeout(() => {
        setStep(4);
        onBridge?.({ sym: 'USDC', amount: amtNum, fromChain: 'ETH', toChain: 'ARC' });
        onToast?.(`Bridged ${amt} USDC → Arc Testnet via Circle CCTP`);
        setTimeout(() => { setStep(0); setAmt(''); }, 4000);
      }, 600);
    } catch (err) {
      const msg = String(err?.message ?? '');
      setBridgeErr(
        msg.toLowerCase().includes('rejected') || msg.toLowerCase().includes('denied')
          ? 'Transaction rejected by wallet'
          : err?.message ?? 'Bridge failed. Please try again.'
      );
      setStep(0);
    }
  };

  return (
    <div className="w-full max-w-[500px] mx-auto anim-fadein">
      {/* Header */}
      <div className="text-center mb-7">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] card-stroke mb-3">
          <Icons.ArrowDown size={11} stroke="#2DD4BF" className="-rotate-90"/>
          <span className="text-[11px] mono uppercase tracking-[0.18em] text-white/55">MiraRoute · Bridge</span>
        </div>
        <h1 className="text-[30px] font-light tracking-[-0.02em]">
          Bridge USDC <span className="grad-text font-semibold">to Arc</span>
        </h1>
        <p className="text-white/50 text-[13px] mt-1.5">
          Ethereum Sepolia → Arc Testnet via Circle CCTP. Other chains coming soon.
        </p>
      </div>

      {/* Main card */}
      <div className="rounded-[26px] p-5 space-y-3"
           style={{ background: 'var(--bg-card)', backdropFilter: 'blur(16px)', boxShadow: 'inset 0 0 0 1px var(--border), 0 0 60px -20px rgba(45,212,191,.18)' }}>

        {/* Route display */}
        <div className="grid grid-cols-[1fr_40px_1fr] gap-2 items-center">
          <div className="rounded-2xl p-4"
               style={{ background: 'var(--bg-input)', boxShadow: 'inset 0 0 0 1px var(--border)' }}>
            <div className="text-[10px] mono uppercase tracking-[0.18em] text-white/40 mb-2">From</div>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                   style={{ background: 'radial-gradient(circle at 35% 35%, #93C5FD25, #93C5FD08)', boxShadow: 'inset 0 0 0 1.5px #93C5FD55' }}>
                <span className="text-[10px] mono font-bold text-blue-300">ETH</span>
              </div>
              <div>
                <div className="text-[13px] font-semibold">Ethereum</div>
                <div className="text-[10.5px] mono text-white/40">Sepolia Testnet</div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center">
            <div className="w-9 h-9 rounded-full flex items-center justify-center"
                 style={{ background: 'linear-gradient(135deg, rgba(45,212,191,.2), rgba(255,255,255,.06))', boxShadow: 'inset 0 0 0 1px rgba(45,212,191,.35)' }}>
              <Icons.ArrowDown size={14} stroke="#2DD4BF" className="-rotate-90"/>
            </div>
          </div>

          <div className="rounded-2xl p-4"
               style={{ background: 'rgba(255,255,255,0.025)', boxShadow: 'inset 0 0 0 1px rgba(45,212,191,.2)' }}>
            <div className="text-[10px] mono uppercase tracking-[0.18em] text-teal-400/70 mb-2">To</div>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                   style={{ background: 'radial-gradient(circle at 35% 35%, #2DD4BF25, #2DD4BF08)', boxShadow: 'inset 0 0 0 1.5px #2DD4BF55' }}>
                <span className="text-[10px] mono font-bold text-teal-300">ARC</span>
              </div>
              <div>
                <div className="text-[13px] font-semibold">Arc Testnet</div>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="text-[9px] mono uppercase px-1.5 py-0.5 rounded"
                        style={{ background: 'rgba(45,212,191,.15)', color: '#2DD4BF' }}>LIVE</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CCTP badge */}
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-[11.5px] mono"
             style={{ background: 'rgba(45,212,191,.06)', boxShadow: 'inset 0 0 0 1px rgba(45,212,191,.2)' }}>
          <span className="w-1.5 h-1.5 rounded-full bg-teal-400 pulse-ring"/>
          <span className="text-teal-300">Circle CCTP, the standard for moving USDC between chains</span>
          <span className="text-white/35 ml-auto">about 4 min</span>
        </div>

        {/* Amount input */}
        <div className="rounded-2xl p-4 space-y-2"
             style={{ background: 'var(--bg-input)', boxShadow: `inset 0 0 0 1px ${insufficient ? 'rgba(248,113,113,.35)' : 'var(--border-in)'}` }}>
          <div className="flex items-center justify-between text-[11px] mono uppercase tracking-[0.15em] text-white/40">
            <span>Amount</span>
            <span>Sending from Ethereum Sepolia</span>
          </div>
          <div className="flex items-center gap-3">
            <input
              value={amt}
              onChange={e => setAmt(e.target.value.replace(/[^0-9.]/g, ''))}
              className="flex-1 min-w-0 bg-transparent text-[36px] font-light outline-none placeholder-white/15 tracking-tight"
              placeholder="0"
            />
            {/* Token locked to USDC — CCTP only supports USDC */}
            <div className="flex items-center gap-2 pl-2 pr-3 py-2 rounded-full shrink-0"
                 style={{ background: 'rgba(255,255,255,.07)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.1)' }}>
              <TokenLogo sym="USDC" size={24}/>
              <span className="text-[13.5px] font-semibold">USDC</span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className={`text-[11.5px] mono ${insufficient ? 'text-rose-400' : 'text-white/40'}`}>
              {amtNum > 0 ? fmtUSD(amtNum) : '$0.00'}
            </div>
            <div className="text-[11.5px] mono text-white/40">
              {sepoliaBalance != null
                ? <span className={insufficient ? 'text-rose-400' : ''}>Balance: {fmt(sepoliaBalance, 2)} USDC</span>
                : isConnected ? <span className="opacity-50">Loading…</span> : null}
            </div>
          </div>
        </div>

        {/* Receive estimate */}
        <div className="rounded-2xl p-4 space-y-3"
             style={{ background: 'var(--bg-input)', boxShadow: 'inset 0 0 0 1px var(--border-in)' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-white/55 text-[12.5px]">
              <Icons.Dot size={9} className="text-teal-400"/>
              You receive on Arc
            </div>
            <div className="flex items-center gap-2">
              <div className="text-[14px] mono font-semibold">{amtNum > 0 ? fmt(receiveAmt, 4) : '—'} USDC</div>
              <span className="text-[9.5px] mono uppercase tracking-wider px-1.5 py-0.5 rounded"
                    style={{ background: 'rgba(45,212,191,.12)', color: '#5EEAD4', boxShadow: 'inset 0 0 0 1px rgba(45,212,191,.3)' }}>
                Native
              </span>
            </div>
          </div>
          <div className="h-px bg-white/[0.04]"/>
          <div className="grid grid-cols-2 gap-y-2.5 text-[12.5px]">
            <div>
              <div className="text-white/40 text-[11px] mono mb-0.5">Bridge fee</div>
              <div className="mono font-medium">{fmtUSD(fee)}</div>
            </div>
            <div className="text-right">
              <div className="text-white/40 text-[11px] mono mb-0.5">Est. time</div>
              <div className="mono font-medium text-teal-300 flex items-center justify-end gap-1">
                <Icons.Zap size={11} fill="#5EEAD4" stroke="#5EEAD4"/>
                about 4 min
              </div>
            </div>
            <div className="col-span-2">
              <div className="text-white/40 text-[11px] mono mb-0.5">Protocol</div>
              <div className="mono text-white/75">ETH Sepolia → Circle CCTP → Arc Testnet</div>
            </div>
          </div>
        </div>

        {/* Error */}
        {bridgeErr && (
          <div className="flex items-start gap-2 text-[11.5px] mono text-rose-400 px-1">
            <Icons.Info size={13} className="shrink-0 mt-0.5"/>
            {bridgeErr}
          </div>
        )}

        {/* Progress steps */}
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
            <div className="flex items-center">
              {STEP_LABELS.map((label, i) => {
                const done   = step > i + 1 || (step === 4 && i === 3);
                const active = step === i + 1;
                return (
                  <div key={label} className="flex items-center flex-1 last:flex-none">
                    <div className="flex flex-col items-center gap-1">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] mono shrink-0 transition-all ${
                        done ? 'grad-teal' : active ? 'bg-teal-400/20' : 'bg-white/5'
                      }`} style={active ? { boxShadow: 'inset 0 0 0 1px rgba(45,212,191,.5)' } : {}}>
                        {done   ? <Icons.Check size={12} stroke="#07261F" sw={3}/> :
                         active ? <span className="inline-block w-2.5 h-2.5 border-[1.5px] border-teal-400 border-t-transparent rounded-full spin-slow"/> :
                                  <span className="text-white/30">{i + 1}</span>}
                      </div>
                      <div className={`text-[9.5px] mono text-center ${done || active ? 'text-white' : 'text-white/30'}`}>{label}</div>
                    </div>
                    {i < 3 && <div className={`flex-1 h-px mx-1 mb-4 ${done ? 'bg-teal-400/60' : 'bg-white/10'}`}/>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Bridge button */}
        {!isConnected ? (
          <button onClick={openConnectModal}
                  className="w-full py-4 rounded-2xl font-semibold text-[14.5px] grad-btn">
            Connect Wallet
          </button>
        ) : (
          <button onClick={startBridge}
                  disabled={!canBridge}
                  className={`w-full py-4 rounded-2xl font-semibold text-[14.5px] tracking-tight transition-all ${
                    !canBridge ? 'bg-white/[0.04] text-white/25 cursor-not-allowed' : 'grad-btn'
                  }`}>
            {step > 0 ? (
              <span className="flex items-center justify-center gap-2">
                <span className="inline-block w-4 h-4 border-2 border-[#07261F]/60 border-t-transparent rounded-full spin-slow"/>
                Bridging…
              </span>
            ) : insufficient ? 'Insufficient USDC Balance'
              : !amtNum ? 'Enter an amount' : (
              <span className="flex items-center justify-center gap-2">
                <Icons.ArrowDown size={15} stroke="currentColor" className="-rotate-90"/>
                Bridge USDC to Arc (CCTP)
              </span>
            )}
          </button>
        )}

        {/* CCTP note */}
        <div className="flex items-center gap-1.5 text-[11px] mono text-white/35 px-1">
          <Icons.Info size={11} className="shrink-0"/>
          CCTP only bridges stablecoins. To bridge ETH, swap it to USDC on Ethereum first.
        </div>

        <div className="flex items-center justify-between text-[10.5px] mono text-white/30 px-1">
          <span className="flex items-center gap-1.5"><Icons.Shield size={10}/> Canonical bridge. Protected from MEV.</span>
          <span>Powered by Circle CCTP</span>
        </div>
      </div>

      {/* Coming soon chains */}
      <div className="mt-6">
        <div className="text-[11px] mono uppercase tracking-[0.18em] text-white/35 mb-3 px-1">
          More chains coming soon
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {COMING_SOON.map(c => (
            <div key={c.name}
                 className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl opacity-40 select-none"
                 style={{ background: 'rgba(255,255,255,.02)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.05)' }}>
              <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                   style={{ background: `radial-gradient(circle, ${c.color}22, transparent 70%)`, boxShadow: `inset 0 0 0 1px ${c.color}44` }}>
                <span className="text-[8.5px] mono font-bold" style={{ color: c.color }}>{c.short}</span>
              </div>
              <span className="text-[12px] font-medium">{c.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
