import { useState } from "react";
import { useAccount, useBalance, useDisconnect } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { Logo, Icons } from "./Icons";
import { arcTestnet } from "../utils/constants";
import { fmt } from "../utils/tokens";

const TABS = ['Swap', 'Earn', 'Bridge', 'Portfolio', 'Docs'];

export default function Navbar({ tab, onTab, onHome, theme, onThemeToggle }) {
  const { address, isConnected } = useAccount();
  const { data: usdcBalance } = useBalance({ address, chainId: arcTestnet.id, query: { enabled: !!address } });
  const { disconnect } = useDisconnect();
  const { openConnectModal } = useConnectModal();
  const [open, setOpen] = useState(false);

  const shortAddr = address ? `${address.slice(0, 6)}…${address.slice(-4)}` : '';
  const usdcAmt   = usdcBalance ? parseFloat(usdcBalance.formatted) : null;
  const isLight   = theme === 'light';

  return (
    <header className="w-full px-6 sm:px-8 py-4 flex items-center justify-between relative z-20">

      {/* Logo + Tabs */}
      <div className="flex items-center gap-6 sm:gap-8">
        <button onClick={() => onHome?.()} className="flex items-center gap-2.5 shrink-0">
          <Logo size={36}/>
          <div className="leading-none text-left hidden sm:block">
            <div className="text-[16px] font-semibold tracking-tight">MiraRoute</div>
            <div className="text-[10px] mono text-white/40 uppercase tracking-[0.18em] mt-0.5">on Arc</div>
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

      {/* Right: balance ticker + theme toggle + wallet */}
      <div className="flex items-center gap-2 sm:gap-3">

        {/* Arc testnet live ticker */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.03] card-stroke text-[11.5px] mono">
          <span className="w-1.5 h-1.5 rounded-full bg-teal-400 pulse-ring"/>
          <span className="text-white/60">USDC</span>
          {isConnected && usdcAmt != null
            ? <span className="text-white/85">{fmt(usdcAmt, 4)}</span>
            : <span className="text-white/85">Arc Testnet</span>}
          <span className="text-teal-400 font-medium">Live</span>
        </div>

        {/* Dark / Light toggle */}
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
                    className="flex items-center gap-2.5 px-3.5 py-2 rounded-full bg-white/[0.04] card-stroke hover:bg-white/[0.07] transition">
              <div className="w-5 h-5 rounded-full grad-teal"/>
              <span className="mono text-[12.5px]">{shortAddr}</span>
              <Icons.ChevronDown size={14} className="text-white/50"/>
            </button>

            {open && (
              <div className="absolute right-0 top-full mt-2 w-64 rounded-xl bg-[#0F1E2E] card-stroke p-2 dd z-50">
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
                    <span className="text-white/60">USDC Balance</span>
                    <span className="mono">{usdcAmt != null ? fmt(usdcAmt, 4) : '—'} USDC</span>
                  </div>
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
          <button onClick={openConnectModal}
                  className="grad-btn px-4 py-2 rounded-full text-[13px] font-semibold flex items-center gap-2">
            <Icons.Wallet size={14}/> Connect Wallet
          </button>
        )}
      </div>
    </header>
  );
}
