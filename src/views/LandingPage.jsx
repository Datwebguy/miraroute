import { Icons, Logo, TokenLogo } from "../components/Icons";
import ParallaxOcean from "../components/ParallaxOcean";

const STATS = [
  { label: 'Native Gas Token',  value: 'USDC',    sub: 'no ETH needed on Arc'  },
  { label: 'Avg Settlement',    value: '<2s',      sub: 'via Circle CCTP'       },
  { label: 'Avg Gas Cost',      value: '~$0.001', sub: 'per swap on Arc'        },
  { label: 'Live Tokens',       value: '2',       sub: 'USDC + EURC on-chain'  },
];

const FEATURES = [
  {
    icon: <Icons.Spark size={20} stroke="#2DD4BF"/>,
    title: 'Smart Routing',
    desc:  'MiraRoute scans every liquidity source on Arc simultaneously to find the lowest-slippage, best-price path for your USDC and EURC swaps.',
  },
  {
    icon: <Icons.Zap size={20} stroke="#2DD4BF" fill="rgba(45,212,191,.2)"/>,
    title: 'Fast Mode',
    desc:  'Stable-pair routes settle directly via Arc\'s native USDC infrastructure in a single atomic transaction — no multi-hop needed.',
  },
  {
    icon: <Icons.Shield size={20} stroke="#2DD4BF"/>,
    title: 'MEV Protection',
    desc:  'Every swap is submitted through a private relay that prevents front-running and sandwich attacks — your price is the price you see.',
  },
  {
    icon: <Icons.ArrowDown size={20} stroke="#2DD4BF" className="-rotate-90"/>,
    title: 'CCTP Bridge',
    desc:  'Move USDC onto Arc from Ethereum Sepolia using Circle\'s Cross-Chain Transfer Protocol — canonical, trust-minimised and fast.',
  },
  {
    icon: <Icons.TrendUp size={20} stroke="#2DD4BF"/>,
    title: 'Earn & Yield',
    desc:  'Deposit USDC and EURC into curated liquidity pools and lending markets — APYs from 5.9% up to 42.6%.',
  },
  {
    icon: <Icons.Wallet size={20} stroke="#2DD4BF"/>,
    title: 'Portfolio View',
    desc:  'See all your Arc holdings, on-chain activity and yield positions in one place. Non-custodial. No signup required.',
  },
];

const STEPS = [
  { n: '01', title: 'Connect wallet',    desc: 'Any EVM wallet works — MetaMask, Rabby, WalletConnect and more. Switch to Arc Testnet.' },
  { n: '02', title: 'Pick your tokens',  desc: 'Choose USDC or EURC — both live on Arc — or explore demo assets like QETH and MIRA.' },
  { n: '03', title: 'Review the route',  desc: 'MiraRoute shows you the exact path, fee and minimum received before you confirm.' },
  { n: '04', title: 'Swap in ~1 second', desc: 'Arc settles in under 2 seconds. Powered by Circle\'s App Kit and CCTP protocol.' },
];

export default function LandingPage({ onLaunch }) {
  return (
    <div className="min-h-screen flex flex-col relative overflow-x-hidden">
      <ParallaxOcean/>

      {/* ── Nav ── */}
      <header className="w-full px-6 sm:px-10 py-5 flex items-center justify-between relative z-20">
        <div className="flex items-center gap-2.5">
          <Logo size={32}/>
          <div className="leading-none text-left">
            <div className="text-[17px] font-semibold tracking-tight">MiraRoute</div>
            <div className="text-[10px] mono text-white/40 uppercase tracking-[0.18em] mt-0.5">On Arc</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.03] card-stroke text-[11.5px] mono">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-400 pulse-ring"/>
            <span className="text-white/60">Arc Testnet</span>
            <span className="text-teal-400">Live</span>
          </div>
          <button onClick={onLaunch}
                  className="grad-btn px-5 py-2 rounded-full text-[13px] font-semibold flex items-center gap-2">
            Launch App <Icons.ChevronRight size={14}/>
          </button>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative z-10 flex flex-col items-center justify-center text-center px-6 pt-20 pb-28">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] card-stroke mb-6 anim-fadein">
          <span className="w-1.5 h-1.5 rounded-full bg-teal-400 pulse-ring"/>
          <span className="text-[11.5px] mono uppercase tracking-[0.18em] text-white/60">Live on Arc Testnet · Powered by Circle</span>
        </div>

        <h1 className="text-[52px] sm:text-[72px] font-light tracking-[-0.03em] leading-[1.02] max-w-3xl anim-slideup hero-glow">
          Swap USDC &amp; EURC<br/>
          <span className="grad-text font-semibold">natively on Arc</span>
        </h1>

        <p className="text-white/55 text-[16px] mt-6 max-w-xl leading-relaxed anim-fadein" style={{ animationDelay: '.15s' }}>
          MiraRoute routes USDC and EURC swaps on Arc Testnet using Circle's App Kit.
          Best price. MEV-protected. One click. Under a second.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3 mt-10 anim-slideup" style={{ animationDelay: '.25s' }}>
          <button onClick={onLaunch}
                  className="grad-btn px-7 py-3.5 rounded-full text-[15px] font-semibold flex items-center gap-2.5">
            <Icons.Zap size={16} fill="#07261F" stroke="#07261F"/>
            Launch App
          </button>
          <a href="https://testnet.arcscan.app" target="_blank" rel="noreferrer"
             className="px-7 py-3.5 rounded-full text-[15px] font-medium card-stroke bg-white/[0.04] hover:bg-white/[0.08] transition flex items-center gap-2">
            Explorer <Icons.External size={14} className="text-white/50"/>
          </a>
        </div>

        {/* Token preview row */}
        <div className="flex items-center gap-2 mt-12 flex-wrap justify-center anim-fadein" style={{ animationDelay: '.35s' }}>
          {[
            { sym: 'USDC', label: 'USDC', live: true  },
            { sym: 'EURC', label: 'EURC', live: true  },
            { sym: 'QETH', label: 'WETH', live: false },
            { sym: 'QBTC', label: 'WBTC', live: false },
            { sym: 'qSOL', label: 'wSOL', live: false },
            { sym: 'MIRA', label: 'MIRA', live: false },
          ].map(t => (
            <div key={t.sym} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.04] card-stroke text-[12px] mono text-white/65">
              <TokenLogo sym={t.sym} size={16}/>
              {t.label}
              {t.live
                ? <span className="text-[8px] mono uppercase px-1 rounded" style={{ background: 'rgba(45,212,191,.2)', color: '#2DD4BF' }}>live</span>
                : <span className="text-[8px] mono uppercase px-1 rounded" style={{ background: 'rgba(255,255,255,.06)', color: 'rgba(255,255,255,.35)' }}>demo</span>
              }
            </div>
          ))}
        </div>
      </section>

      {/* ── Stats bar ── */}
      <section className="relative z-10 px-6 sm:px-10 pb-20">
        <div className="max-w-5xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-4">
          {STATS.map((s, i) => (
            <div key={i} className="rounded-2xl bg-white/[0.03] card-stroke p-5 text-center">
              <div className="text-[28px] sm:text-[32px] font-light tracking-tight grad-text">{s.value}</div>
              <div className="text-[11px] mono uppercase tracking-[0.15em] text-white/45 mt-1">{s.label}</div>
              <div className="text-[11px] text-white/35 mt-0.5">{s.sub}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section className="relative z-10 px-6 sm:px-10 pb-24">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <div className="text-[11px] mono uppercase tracking-[0.18em] text-teal-400 mb-3">Why MiraRoute</div>
            <h2 className="text-[36px] sm:text-[44px] font-light tracking-[-0.02em]">
              Built for <span className="grad-text font-medium">speed and precision</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((f, i) => (
              <div key={i} className="rounded-2xl bg-white/[0.025] card-stroke p-5 hover:bg-white/[0.04] transition group">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                     style={{ background: 'rgba(45,212,191,.10)', boxShadow: 'inset 0 0 0 1px rgba(45,212,191,.25)' }}>
                  {f.icon}
                </div>
                <div className="text-[15px] font-semibold mb-2">{f.title}</div>
                <div className="text-[13px] text-white/55 leading-relaxed">{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="relative z-10 px-6 sm:px-10 pb-24">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <div className="text-[11px] mono uppercase tracking-[0.18em] text-teal-400 mb-3">Getting started</div>
            <h2 className="text-[36px] font-light tracking-[-0.02em]">
              Swap in <span className="grad-text font-medium">four steps</span>
            </h2>
          </div>
          <div className="space-y-3">
            {STEPS.map((s, i) => (
              <div key={i} className="flex items-start gap-5 p-5 rounded-2xl bg-white/[0.02] card-stroke hover:bg-white/[0.04] transition">
                <div className="text-[13px] mono text-teal-400 w-8 shrink-0 pt-0.5">{s.n}</div>
                <div>
                  <div className="text-[15px] font-semibold mb-1">{s.title}</div>
                  <div className="text-[13px] text-white/55">{s.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="relative z-10 px-6 sm:px-10 pb-28">
        <div className="max-w-2xl mx-auto rounded-3xl bg-white/[0.03] card-stroke p-10 sm:p-14 text-center relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none"
               style={{ background: 'radial-gradient(ellipse at 50% -20%, rgba(45,212,191,.18), transparent 70%)' }}/>
          <div className="text-[11px] mono uppercase tracking-[0.18em] text-teal-400 mb-4">Ready to swap?</div>
          <h2 className="text-[36px] sm:text-[44px] font-light tracking-[-0.02em] mb-4">
            Ready to swap on <span className="grad-text font-medium">Arc Testnet?</span>
          </h2>
          <p className="text-white/55 text-[14px] mb-8 max-w-md mx-auto">
            Connect your wallet to Arc Testnet and make your first live USDC ↔ EURC swap powered by Circle's CCTP.
          </p>
          <button onClick={onLaunch}
                  className="grad-btn px-8 py-4 rounded-full text-[15px] font-semibold inline-flex items-center gap-2.5">
            <Icons.Zap size={16} fill="#07261F" stroke="#07261F"/>
            Launch dApp
          </button>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="relative z-10 w-full px-8 py-6 flex items-center justify-between text-[11px] mono text-white/35 border-t border-white/5">
        <div className="flex items-center gap-4">
          <span>MiraRoute v2.1</span>
          <span>© 2026</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="hidden sm:flex items-center gap-1.5">
            <span className="w-1 h-1 rounded-full bg-teal-400"/> Arc Testnet · live
          </span>
          <span className="cursor-pointer hover:text-white/60">Docs</span>
          <span className="cursor-pointer hover:text-white/60">Audit</span>
          <span className="cursor-pointer hover:text-white/60">Discord</span>
        </div>
      </footer>
    </div>
  );
}
