import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";

import ParallaxOcean from "./components/ParallaxOcean";
import Navbar from "./components/Navbar";
import SwapCard from "./components/SwapCard";
import TokenSelector from "./components/TokenSelector";
import SuccessOverlay from "./components/EarnCard";
import Footer from "./components/Footer";
import { Icons } from "./components/Icons";

import LandingPage from "./views/LandingPage";
import EarnView from "./views/EarnView";
import BridgeView from "./views/BridgeView";
import PortfolioView from "./views/PortfolioView";
import DocsView from "./views/DocsView";

import { INITIAL_BALANCES, getToken, fmt, fmtUSD } from "./utils/tokens";
import { useArcKit } from "./hooks/useArcKit";
import { useArcBalances } from "./hooks/useArcBalances";
import { useSwapLifecycle } from "./hooks/useSwapLifecycle";

function pushMiraHistory(entry) {
  try {
    const history = JSON.parse(localStorage.getItem('miraHistory') || '[]');
    history.unshift(entry);
    localStorage.setItem('miraHistory', JSON.stringify(history.slice(0, 100)));
  } catch {}
}

export default function App() {
  const { address, isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();
  const arcKit = useArcKit();
  const arcBalances = useArcBalances(address);

  // Theme
  const [theme, setTheme] = useState(() => localStorage.getItem('mr.theme') || 'dark');
  useEffect(() => {
    document.documentElement.className = theme === 'light' ? 'light-theme' : '';
    localStorage.setItem('mr.theme', theme);
  }, [theme]);
  const onThemeToggle = () => setTheme(t => t === 'light' ? 'dark' : 'light');

  const [view, setView] = useState('landing');
  const [tab,  setTab]  = useState(() => localStorage.getItem('mr.tab') || 'Swap');
  useEffect(() => { localStorage.setItem('mr.tab', tab); }, [tab]);

  const [balances] = useState({ ...INITIAL_BALANCES });

  const mergedBalances = {
    ...balances,
    ...(arcBalances.USDC != null && { USDC: arcBalances.USDC }),
    ...(arcBalances.EURC != null && { EURC: arcBalances.EURC }),
  };

  const [fromSym,    setFromSym]    = useState('USDC');
  const [toSym,      setToSym]      = useState('EURC');
  const [amount,     setAmount]     = useState('');
  const [recipient,  setRecipient]  = useState('');
  const [pickerOpen, setPickerOpen] = useState(null);

  const [slippage,  setSlippage]  = useState(0.5);
  const [autoSlip,  setAutoSlip]  = useState(true);
  const [gas,       setGas]       = useState('fast');

  const [successOpen,    setSuccessOpen]    = useState(false);
  const [successTxHash,  setSuccessTxHash]  = useState(null);
  const [toast,          setToast]          = useState(null);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3500); };

  // ── Swap lifecycle (4-step wagmi state machine) ──────────────────────────────
  const lifecycle = useSwapLifecycle({
    address:    isConnected ? address : null,
    fromSym,
    toSym,
    amount,
    slippageBps: Math.round((autoSlip ? 0.5 : slippage) * 100),
  });

  const fromT     = getToken(fromSym);
  const toT       = getToken(toSym);
  const amountNum = parseFloat(amount) || 0;
  const amountOut = amountNum * (fromT.price / toT.price) * 0.999;
  const isLivePair = fromT.live && toT.live;
  const fastMode   = isLivePair && amountNum > 0;

  // On swap success: save history, show overlay, refetch balances
  useEffect(() => {
    if (lifecycle.swapStatus === 'success' && lifecycle.txHash) {
      pushMiraHistory({
        type:      'Swap',
        amount:    amountNum,
        amountIn:  amountNum,
        amountOut,
        fromSym,
        toSym,
        hash:      lifecycle.txHash,
        date:      Date.now(),
      });
      arcBalances.refetch();
      setSuccessTxHash(lifecycle.txHash);
      setSuccessOpen(true);
      showToast(`Swapped ${amount} ${fromSym} → ${fmt(amountOut, 4)} ${toSym} on Arc`);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lifecycle.swapStatus, lifecycle.txHash]);

  const handleSwap = () => {
    if (!isConnected) { openConnectModal?.(); return; }
    if (lifecycle.swapStatus === 'needs_approval') lifecycle.approve();
    else lifecycle.executeSwap();
  };

  const closeSuccess = () => {
    setSuccessOpen(false);
    setSuccessTxHash(null);
    setAmount('');
    lifecycle.reset();
  };

  const handleEarnDeposit = (pool, amt, sym) => {
    pushMiraHistory({ type: 'Deposit', amount: amt, sym, poolName: pool.name, apy: pool.apy, date: Date.now() });
    showToast(`Deposit submitted for ${fmt(amt)} ${sym} into ${pool.name}`);
  };

  const handleBridge = ({ sym, amount: amt, fromChain, toChain, hash }) => {
    arcBalances.refetch();
    pushMiraHistory({ type: 'Bridge', amount: amt, sym, fromChain, toChain, hash, date: Date.now() });
  };

  const launchDapp = () => { setView('dapp'); setTab('Swap'); };

  if (view === 'landing') {
    return (
      <LandingPage
        onLaunch={launchDapp}
        onDocs={() => { setView('dapp'); setTab('Docs'); }}
        theme={theme}
        onThemeToggle={onThemeToggle}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col relative">
      <ParallaxOcean theme={theme}/>

      <Navbar tab={tab} onTab={setTab} onHome={() => setView('landing')} theme={theme} onThemeToggle={onThemeToggle}/>

      {tab === 'Swap' && (
        <main className="flex-1 w-full flex flex-col items-center px-4 pt-8 pb-24">
          <div className="text-center mb-8 max-w-2xl anim-fadein">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] card-stroke mb-5">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-400 pulse-ring"/>
              <span className="text-[11.5px] mono uppercase tracking-[0.18em] text-white/60">Live on Arc Testnet. USDC native gas.</span>
            </div>
            <h1 className="text-[40px] sm:text-[50px] font-light tracking-[-0.02em] leading-[1.05] hero-glow">
              Swap stablecoins <span className="grad-text font-medium">on Arc</span>
              <br className="hidden sm:block"/>
              <span className="sm:hidden"> </span>powered by Circle.
            </h1>
          </div>

          <div className="w-full max-w-[500px]">
            <SwapCard
              fromSym={fromSym} toSym={toSym}
              setFromSym={setFromSym} setToSym={setToSym}
              amount={amount} setAmount={setAmount}
              balances={mergedBalances}
              swapStatus={lifecycle.swapStatus}
              swapError={lifecycle.error}
              onSwap={handleSwap}
              onOpenPicker={setPickerOpen}
              fastMode={fastMode}
              slippage={slippage} setSlippage={setSlippage}
              autoSlip={autoSlip} setAutoSlip={setAutoSlip}
              gas={gas} setGas={setGas}
              recipient={recipient} setRecipient={setRecipient}
              isConnected={isConnected}
              onConnect={openConnectModal}
            />

            <div className="flex flex-wrap gap-2 pt-3">
              {[
                { l: 'USDC → EURC', f: 'USDC', t: 'EURC', a: '100' },
                { l: 'EURC → USDC', f: 'EURC', t: 'USDC', a: '100' },
              ].map(c => (
                <button key={c.l}
                        onClick={() => { setFromSym(c.f); setToSym(c.t); setAmount(c.a); }}
                        className="px-3 py-1.5 rounded-full bg-white/[0.03] hover:bg-white/[0.06] card-stroke text-[11.5px] mono text-white/65">
                  {c.l}
                </button>
              ))}
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
          <PortfolioView address={address} balances={mergedBalances} onGoSwap={() => setTab('Swap')}/>
        </main>
      )}

      {tab === 'Docs' && (
        <main className="flex-1 w-full flex flex-col px-4 pt-10 pb-24">
          <DocsView onLaunchSwap={() => setTab('Swap')}/>
        </main>
      )}

      <Footer onDocs={() => setTab('Docs')}/>

      <TokenSelector open={pickerOpen === 'from'} exclude={toSym} balances={mergedBalances}
                     onClose={() => setPickerOpen(null)}
                     onPick={s => { setFromSym(s); setPickerOpen(null); }}/>
      <TokenSelector open={pickerOpen === 'to'} exclude={fromSym} balances={mergedBalances}
                     onClose={() => setPickerOpen(null)}
                     onPick={s => { setToSym(s); setPickerOpen(null); }}/>

      <SuccessOverlay
        open={successOpen} onClose={closeSuccess}
        fromSym={fromSym} toSym={toSym}
        amountIn={amountNum} amountOut={amountOut}
        txHash={successTxHash}
        onGoEarn={() => { closeSuccess(); setTab('Earn'); }}
      />

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
