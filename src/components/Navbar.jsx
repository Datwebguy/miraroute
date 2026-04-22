import { useState } from "react";
import { useAccount, useDisconnect } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { Logo, Icons } from "./Icons";
import { fmt } from "../utils/tokens";

const TABS = ['Swap', 'Earn', 'Bridge', 'Portfolio', 'Docs'];

const MOBILE_TABS = [
  { key: 'Swap',      label: 'Swap',  icon: (p) => <Icons.Swap {...p}/> },
  { key: 'Earn',      label: 'Earn',  icon: (p) => <Icons.TrendUp {...p}/> },
  { key: 'Bridge',    label: 'Bridge', icon: (p) => <Icons.ArrowDown {...p} style={{ transform: 'rotate(-90deg)' }}/> },
  { key: 'Portfolio', label: 'Port.',  icon: (p) => <Icons.Wallet {...p}/> },
  { key: 'Docs',      label: 'Docs',  icon: (p) => <Icons.Book {...p}/> },
];

export default function Navbar({ tab, onTab, onHome, theme, onThemeToggle }) {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { openConnectModal } = useConnectModal();
  const [open, setOpen] = useState(false);

  const shortAddr = address ? `${address.slice(0, 6)}…${address.slice(-4)}` : '';
  const isLight   = theme === 'light';

  return (
    <>
      <header className="w-full px-4 sm:px-6 md:px-8 py-3 md:py-4 flex items-center justify-between relative z-20">

        {/* Logo + Tabs */}
        <div className="flex items-center gap-4 sm:gap-6 md:gap-8">
          <button onClick={() => onHome?.()} className="flex items-center gap-2 shrink-0">
            <Logo size={32}/>
            <div className="leading-none text-left">
              <div className="text-[15px] font-semibold tracking-tight">MiraRoute</div>
              <div className="text-[9px] mono text-white/40 uppercase tracking-[0.15em] mt-0.5 hidden sm:block">on Arc</div>
            </div>
          </button>

          <nav className="hidden md:flex items-center gap-0.5 text-[13.5px] text-white/65 relative">
            {TABS.map(t => {
              const active = tab === t;
              return (
                <button key={t} onClick={() => onTab(t)}
                  className={`relative px-3 py-1.5 rounded-md transition ${active ? 'text-white' : 'hover:text-white hover:bg-white/[0.04]'}`}>
                  {t}
                  {active && (
                    <span className="absolute left-3 right-3 -bottom-[13px] h-[2px] rounded-full"
                          style={{ background: 'linear-gradient(90deg,#2DD4BF,#fff)', boxShadow: '0 0 10px rgba(45,212,191,.6)' }}/>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Right: ticker + faucet + theme + wallet */}
        <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3">

          {/* Arc testnet live ticker — desktop only */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.03] card-stroke text-[11.5px] mono">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-400 pulse-ring"/>
            <span className="text-white/60 hidden md:inline">USDC</span>
            <span className="text-white/85 hidden md:inline">Arc Testnet</span>
            <span className="text-teal-400 font-medium">Live</span>
          </div>

          {/* Faucet — desktop only */}
          <a href="https://faucet.circle.com" target="_blank" rel="noreferrer"
             title="Get testnet USDC"
             className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-white/[0.03] card-stroke hover:bg-white/[0.07] transition text-[11.5px] mono text-teal-400">
            <Icons.Zap size={11} fill="#2DD4BF" stroke="#2DD4BF"/>
            Faucet
          </a>

          {/* Faucet icon-only on mobile */}
          <a href="https://faucet.circle.com" target="_blank" rel="noreferrer"
             title="Get testnet USDC"
             className="md:hidden flex items-center justify-center w-9 h-9 rounded-full bg-white/[0.03] card-stroke hover:bg-white/[0.06] transition text-teal-400">
            <Icons.Zap size={13} fill="#2DD4BF" stroke="#2DD4BF"/>
          </a>

          {/* Theme toggle */}
          <button
            onClick={onThemeToggle}
            title={isLight ? 'Switch to Dark' : 'Switch to Light'}
            className={`theme-toggle ${isLight ? 'active' : ''}`}>
            <span className="knob"/>
          </button>
          <div className="hidden sm:block" style={{ marginLeft: -6 }}>
            {isLight
              ? <Icons.Sun  size={13} className="text-teal-400"/>
              : <Icons.Moon size={13} className="text-white/40"/>}
          </div>

          {/* Wallet */}
          {isConnected ? (
            <div className="relative">
              <button onClick={() => setOpen(o => !o)}
                      className="flex items-center gap-1.5 sm:gap-2.5 px-2.5 sm:px-3.5 py-2 rounded-full bg-white/[0.04] card-stroke hover:bg-white/[0.07] transition">
                <div className="w-5 h-5 rounded-full grad-teal shrink-0"/>
                <span className="mono text-[12px] sm:text-[12.5px]">{shortAddr}</span>
                <Icons.ChevronDown size={13} className="text-white/50 hidden sm:block"/>
              </button>

              {open && (
                <div className="absolute right-0 top-full mt-2 w-60 sm:w-64 rounded-xl bg-[#0F1E2E] card-stroke p-2 dd z-50">
                  <div className="p-3 border-b border-white/5">
                    <div className="mono text-[12px] text-white/50 mb-1">Connected · Arc Testnet</div>
                    <div className="mono text-[13px] flex items-center justify-between">
                      {shortAddr}
                      <button onClick={() => navigator.clipboard.writeText(address)} className="text-white/60 hover:text-teal-400">
                        <Icons.Copy size={13}/>
                      </button>
                    </div>
                  </div>
                  <div className="p-1">
                    <div className="flex items-center justify-between px-2 py-2 text-[13px]">
                      <span className="text-white/60">Network</span>
                      <span className="mono text-teal-400 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-teal-400 pulse-ring"/>Arc Testnet
                      </span>
                    </div>
                    <a href={`https://testnet.arcscan.app/address/${address}`} target="_blank" rel="noreferrer"
                       className="w-full text-left px-2 py-2 text-[13px] text-white/80 hover:bg-white/5 rounded-md flex items-center gap-1.5">
                      View on ArcScan <Icons.External size={11} className="text-white/40"/>
                    </a>
                    <button onClick={() => { disconnect(); setOpen(false); }}
                            className="w-full text-left px-2 py-2 text-[13px] text-rose-400/80 hover:bg-white/5 rounded-md">
                      Disconnect
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Desktop: full button */}
              <button onClick={openConnectModal}
                      className="hidden sm:flex grad-btn px-4 py-2 rounded-full text-[13px] font-semibold items-center gap-2">
                <Icons.Wallet size={14}/> Connect Wallet
              </button>
              {/* Mobile: compact text button */}
              <button onClick={openConnectModal}
                      className="sm:hidden flex items-center gap-1.5 px-3 py-2 rounded-full grad-btn text-[12px] font-semibold touch-manipulation" style={{ minHeight: 40 }}>
                <Icons.Wallet size={13}/> Connect
              </button>
            </>
          )}
        </div>
      </header>

      {/* ── Mobile bottom navigation bar ─────────────────────────────── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50"
           style={{
             background: 'rgba(10,20,32,0.96)',
             backdropFilter: 'blur(20px)',
             borderTop: '1px solid rgba(255,255,255,0.08)',
             paddingBottom: 'env(safe-area-inset-bottom, 0px)',
           }}>
        <div className="flex items-stretch">
          {MOBILE_TABS.map(({ key, label, icon }) => {
            const active = tab === key;
            return (
              <button key={key} onClick={() => onTab(key)}
                      className="flex-1 flex flex-col items-center justify-center gap-1 py-2.5 transition-colors"
                      style={{ color: active ? '#2DD4BF' : 'rgba(255,255,255,0.42)' }}>
                {icon({ size: 20 })}
                <span className="text-[10px] mono" style={{ color: active ? '#2DD4BF' : 'rgba(255,255,255,0.42)' }}>
                  {label}
                </span>
                {active && (
                  <span className="absolute bottom-0 w-6 h-0.5 rounded-full bg-teal-400"
                        style={{ boxShadow: '0 0 8px rgba(45,212,191,.6)' }}/>
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
