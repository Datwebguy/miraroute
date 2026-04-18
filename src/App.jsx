import { useState, useEffect } from "react";
import { useAccount, useDisconnect } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";

import ParallaxOcean from "./components/ParallaxOcean";
import Navbar from "./components/Navbar";
import SwapCard, { AdvancedSettings } from "./components/SwapCard";
import TokenSelector from "./components/TokenSelector";
import SuccessOverlay from "./components/EarnCard";
import RoutePreview from "./components/RoutePreview";
import ConfirmModal from "./components/ConfirmModal";
import { Icons } from "./components/Icons";

import LandingPage from "./views/LandingPage";
import EarnView from "./views/EarnView";
import BridgeView from "./views/BridgeView";
import PortfolioView from "./views/PortfolioView";

import { INITIAL_BALANCES, getToken, fmt } from "./utils/tokens";
import { useArcKit } from "./hooks/useArcKit";
import { useArcBalances } from "./hooks/useArcBalances";

const randHash = () => {
  const c = '0123456789abcdef';
  let h = '0x';
  for (let i = 0; i < 10; i++) h += c[Math.floor(Math.random() * 16)];
  h += '…';
  for (let i = 0; i < 4; i++) h += c[Math.floor(Math.random() * 16)];
  return h;
};

export default function App() {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { openConnectModal } = useConnectModal();
  const arcKit = useArcKit();
  const arcBalances = useArcBalances(address);

  useEffect(() => { document.documentElement.classList.add('dark'); }, []);

  const [view, setView] = useState('landing');
  const [tab, setTab] = useState(() => localStorage.getItem('mr.tab') || 'Swap');
  useEffect(() => { localStorage.setItem('mr.tab', tab); }, [tab]);

  const [balances, setBalances] = useState({ ...INITIAL_BALANCES });
  const [transactions, setTransactions] = useState([]);

  // Merge live on-chain balances over simulated ones
  const mergedBalances = {
    ...balances,
    ...(arcBalances.USDC != null && { USDC: arcBalances.USDC }),
    ...(arcBalances.EURC != null && { EURC: arcBalances.EURC }),
  };

  const [fromSym, setFromSym]     = useState('USDC');
  const [toSym, setToSym]         = useState('EURC');
  const [amount, setAmount]       = useState('');
  const [recipient, setRecipient] = useState('');
  const [pickerOpen, setPickerOpen] = useState(null);

  const [slippage, setSlippage]   = useState(0.5);
  const [autoSlip, setAutoSlip]   = useState(true);
  const [gas, setGas]             = useState('fast');
  const [advOpen, setAdvOpen]     = useState(true);
  const [routeOpen, setRouteOpen] = useState(true);

  const [swapState, setSwapState]     = useState('idle');
  const [successOpen, setSuccessOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [toast, setToast]             = useState(null);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  const logTx = (tx) => {
    setTransactions(prev => [{
      id: Date.now() + '-' + Math.random().toString(36).slice(2, 7),
      hash: randHash(),
      ts: Date.now(),
      ...tx,
    }, ...prev]);
  };

  const fromT     = getToken(fromSym);
  const toT       = getToken(toSym);
  const amountNum = parseFloat(amount) || 0;
  const amountOut = amountNum * (fromT.price / toT.price) * 0.999;

  const isLivePair = fromT.live && toT.live;
  const fastMode   = isLivePair && amountNum > 0;
  const savings    = amountNum > 0 ? 15.40 : 0;

  const handleSwap = () => {
    if (!isConnected || amountNum === 0) return;
    setConfirmOpen(true);
  };

  const executeSwap = async () => {
    setConfirmOpen(false);
    setSwapState('submitting');

    const runSimulation = (label = '') => {
      setTimeout(() => {
        setBalances(b => ({
          ...b,
          [fromSym]: Math.max(0, (b[fromSym] ?? 0) - amountNum),
          [toSym]:   (b[toSym]   ?? 0) + amountOut,
        }));
        logTx({ type: 'swap', fromSym, toSym, amountIn: amountNum, amountOut, fastMode });
        setSwapState('success');
        setSuccessOpen(true);
        showToast(`Swapped ${amount} ${fromSym} → ${fmt(amountOut, 4)} ${toSym}${label}`);
      }, 1800);
    };

    if (isLivePair && arcKit.isReady) {
      try {
        setSwapState('confirming');
        await arcKit.swap({
          tokenIn:    fromSym,
          tokenOut:   toSym,
          amountIn:   amount,
          slippageBps: Math.round((autoSlip ? 0.5 : slippage) * 100),
        });
        arcBalances.refetch();
        logTx({ type: 'swap', fromSym, toSym, amountIn: amountNum, amountOut, fastMode, live: true });
        setSwapState('success');
        setSuccessOpen(true);
        showToast(`Swapped ${amount} ${fromSym} → ${fmt(amountOut, 4)} ${toSym} on Arc`);
        return;
      } catch (err) {
        console.warn('[Arc swap fallback]', err?.message);
        // Circle API unavailable from localhost — fall through to simulation
        setSwapState('submitting');
      }
    }

    // Simulation (demo pairs, or live pair with API unavailable)
    runSimulation(isLivePair ? ' (simulated)' : '');
  };

  const handleEarnDeposit = (pool, amt, sym) => {
    setBalances(b => ({ ...b, [sym]: Math.max(0, (b[sym] ?? 0) - amt) }));
    logTx({ type: 'deposit', poolName: pool.name, sym, amount: amt, apy: pool.apy });
    showToast(`Deposited ${fmt(amt)} ${sym} into ${pool.name}`);
  };

  const handleBridge = ({ sym, amount: amt, fromChain, toChain }) => {
    setBalances(b => ({ ...b, [sym]: (b[sym] ?? 0) + amt * 0.998 }));
    logTx({ type: 'bridge', sym, amount: amt, fromChain, toChain });
  };

  const closeSuccess = () => { setSuccessOpen(false); setSwapState('idle'); setAmount(''); };
  const launchDapp   = () => { setView('dapp'); setTab('Swap'); };

  if (view === 'landing') {
    return <LandingPage onLaunch={launchDapp}/>;
  }

  return (
    <div className="min-h-screen flex flex-col relative">
      <ParallaxOcean/>

      <Navbar tab={tab} onTab={setTab} onHome={() => setView('landing')}/>

      {tab === 'Swap' && (
        <main className="flex-1 w-full flex flex-col items-center px-4 pt-8 pb-24">
          <div className="text-center mb-8 max-w-2xl anim-fadein">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] card-stroke mb-5">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-400 pulse-ring"/>
              <span className="text-[11.5px] mono uppercase tracking-[0.18em] text-white/60">Live on Arc Testnet · USDC native gas</span>
            </div>
            <h1 className="text-[40px] sm:text-[50px] font-light tracking-[-0.02em] leading-[1.05] hero-glow">
              Swap stablecoins <span className="grad-text font-medium">on Arc</span>
              <br className="hidden sm:block"/>
              <span className="sm:hidden"> </span>powered by Circle.
            </h1>
          </div>

          <div className="w-full max-w-5xl grid lg:grid-cols-[460px_1fr] gap-6 items-start">

            <SwapCard
              compact
              fromSym={fromSym} toSym={toSym}
              setFromSym={setFromSym} setToSym={setToSym}
              amount={amount} setAmount={setAmount}
              balances={mergedBalances}
              swapState={swapState}
              onSwap={handleSwap}
              onOpenPicker={setPickerOpen}
              fastMode={fastMode}
              showRefuel={false}
              onDismissRefuel={() => {}}
              onRefuel={() => {}}
              savings={savings}
              slippage={slippage} setSlippage={setSlippage}
              autoSlip={autoSlip} setAutoSlip={setAutoSlip}
              gas={gas} setGas={setGas}
              recipient={recipient} setRecipient={setRecipient}
              isConnected={isConnected}
              onConnect={openConnectModal}
            />

            <div className="space-y-3">
              <AdvancedSettings
                open={advOpen} onToggle={() => setAdvOpen(o => !o)}
                slippage={slippage} onSlippage={setSlippage}
                autoSlip={autoSlip} onAutoSlip={setAutoSlip}
                gas={gas} onGas={setGas}
              />

              {amountNum > 0 && (
                <RoutePreview
                  open={routeOpen} onToggle={() => setRouteOpen(o => !o)}
                  fromSym={fromSym} toSym={toSym}
                  amountIn={amountNum} amountOut={amountOut}
                  fastMode={fastMode} savings={savings}
                  slippage={autoSlip ? 0.5 : slippage} gas={gas}
                />
              )}

              <div className="flex flex-wrap gap-2 pt-1">
                {[
                  { l: 'USDC → EURC',  f: 'USDC',  t: 'EURC',  a: '100'  },
                  { l: 'EURC → USDC',  f: 'EURC',  t: 'USDC',  a: '100'  },
                  { l: 'QIE → QUSDT',  f: 'QIE',   t: 'QUSDT', a: '50'   },
                  { l: 'QETH → MIRA',  f: 'QETH',  t: 'MIRA',  a: '0.01' },
                ].map(c => (
                  <button key={c.l}
                          onClick={() => { setFromSym(c.f); setToSym(c.t); setAmount(c.a); }}
                          className="px-3 py-1.5 rounded-full bg-white/[0.03] hover:bg-white/[0.06] card-stroke text-[11.5px] mono text-white/65">
                    {c.l}
                  </button>
                ))}
                <button onClick={() => { setBalances({ ...INITIAL_BALANCES }); setTransactions([]); showToast('Reset to zero-state'); }}
                        className="px-3 py-1.5 rounded-full bg-white/[0.02] hover:bg-white/[0.05] card-stroke text-[11.5px] mono text-white/45">
                  ↺ Reset demo
                </button>
              </div>
            </div>
          </div>
        </main>
      )}

      {tab === 'Earn' && (
        <main className="flex-1 w-full flex flex-col px-4 pt-10 pb-24">
          <EarnView onDeposit={handleEarnDeposit} balances={mergedBalances}/>
        </main>
      )}
      {tab === 'Bridge' && (
        <main className="flex-1 w-full flex flex-col px-4 pt-10 pb-24">
          <BridgeView onToast={showToast} balances={mergedBalances} onBridge={handleBridge} arcKit={arcKit}/>
        </main>
      )}
      {tab === 'Portfolio' && (
        <main className="flex-1 w-full flex flex-col px-4 pt-10 pb-24">
          <PortfolioView address={address} balances={mergedBalances}
                         transactions={transactions} onGoSwap={() => setTab('Swap')}/>
        </main>
      )}

      <footer className="w-full px-8 py-5 flex items-center justify-between text-[11px] mono text-white/35 border-t border-white/5 relative z-10">
        <div className="flex items-center gap-4">
          <span>MiraRoute v2.1</span>
          <span className="hidden sm:inline">© 2026</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="hidden sm:flex items-center gap-1.5">
            <span className="w-1 h-1 rounded-full bg-teal-400"/> Arc Testnet · live
          </span>
          <span className="hover:text-white/70 cursor-pointer">Docs</span>
          <span className="hover:text-white/70 cursor-pointer">Audit</span>
          <span className="hover:text-white/70 cursor-pointer">Discord</span>
        </div>
      </footer>

      <TokenSelector open={pickerOpen === 'from'} exclude={toSym} balances={mergedBalances}
                     onClose={() => setPickerOpen(null)}
                     onPick={s => { setFromSym(s); setPickerOpen(null); }}/>
      <TokenSelector open={pickerOpen === 'to'} exclude={fromSym} balances={mergedBalances}
                     onClose={() => setPickerOpen(null)}
                     onPick={s => { setToSym(s); setPickerOpen(null); }}/>

      <ConfirmModal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={executeSwap}
        fromSym={fromSym} toSym={toSym}
        amountIn={amountNum} amountOut={amountOut}
        slippage={autoSlip ? 0.5 : slippage}
        gas={gas}
        isLive={isLivePair}
      />

      <SuccessOverlay open={successOpen} onClose={closeSuccess}
                      fromSym={fromSym} toSym={toSym}
                      amountIn={amountNum} amountOut={amountOut}
                      onGoEarn={() => { closeSuccess(); setTab('Earn'); showToast('Opening Earn…'); }}/>

      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[60] toast">
          <div className="px-4 py-2.5 rounded-full bg-[#0F1E2E] card-stroke shadow-card flex items-center gap-2 text-[12.5px]">
            <div className="w-5 h-5 rounded-full grad-teal flex items-center justify-center">
              <Icons.Check size={12} stroke="#07261F" sw={2.8}/>
            </div>
            {toast}
          </div>
        </div>
      )}
    </div>
  );
}
