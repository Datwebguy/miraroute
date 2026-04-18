import { Icons } from "../components/Icons";

const SECTION = ({ title, children }) => (
  <div className="mb-10">
    <h2 className="text-[22px] font-semibold tracking-tight mb-4 flex items-center gap-2">
      <span className="w-1 h-5 rounded-full grad-teal inline-block"/>
      {title}
    </h2>
    <div className="space-y-3 text-[14px] text-white/70 leading-relaxed">{children}</div>
  </div>
);

const P = ({ children }) => <p>{children}</p>;

const Code = ({ children }) => (
  <code className="mono text-teal-300 bg-white/[0.06] px-1.5 py-0.5 rounded text-[12.5px]">{children}</code>
);

const InfoBox = ({ label, value, sub }) => (
  <div className="flex items-start gap-3 p-3.5 rounded-xl bg-white/[0.03] card-stroke">
    <div className="flex-1">
      <div className="text-[10.5px] mono uppercase tracking-[0.15em] text-white/40 mb-0.5">{label}</div>
      <div className="text-[14px] font-medium mono text-white/90">{value}</div>
      {sub && <div className="text-[12px] text-white/45 mt-0.5">{sub}</div>}
    </div>
  </div>
);

export default function DocsView({ onLaunchSwap }) {
  return (
    <div className="w-full max-w-3xl mx-auto px-4 anim-fadein">

      {/* Header */}
      <div className="mb-10">
        <div className="text-[11px] mono uppercase tracking-[0.18em] text-teal-400 mb-2">Documentation</div>
        <h1 className="text-[38px] font-light tracking-[-0.02em] mb-3">
          MiraRoute <span className="grad-text font-semibold">Docs</span>
        </h1>
        <p className="text-white/55 text-[15px] leading-relaxed max-w-xl">
          MiraRoute is a USDC-native DEX aggregator built on Arc Testnet for the QIE Blockchain Hackathon 2026.
          It uses Circle's App Kit to execute on-chain swaps and CCTP cross-chain transfers.
        </p>
      </div>

      <SECTION title="What is MiraRoute?">
        <P>
          MiraRoute is a decentralised swap aggregator running on <strong className="text-white/90">Arc Testnet</strong> — a
          blockchain where USDC is the native gas token. It enables users to swap USDC ↔ EURC, bridge USDC from
          Ethereum Sepolia via Circle's CCTP, and earn yield through Arc liquidity pools.
        </P>
        <P>
          The app is built without any simulated transactions — every swap and bridge requires a real wallet
          signature via Circle's App Kit, ensuring all activity is on-chain and verifiable on ArcScan.
        </P>
      </SECTION>

      <SECTION title="Arc Testnet">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          <InfoBox label="Chain ID"          value="5042002"                              sub="Add to MetaMask as 'Arc Testnet'" />
          <InfoBox label="RPC Endpoint"      value="rpc.testnet.arc.network"              sub="Use https:// prefix" />
          <InfoBox label="Native Gas Token"  value="USDC"                                 sub="No ETH needed — pay gas in USDC" />
          <InfoBox label="Block Explorer"    value="testnet.arcscan.app"                  sub="View transactions and contracts" />
          <InfoBox label="USDC Decimals"     value="6 (transfers) / 18 (gas)"             sub="Standard ERC-20 transfer uses 6dp" />
          <InfoBox label="Settlement Speed"  value="< 2 seconds"                          sub="Fast finality, ideal for stablecoins" />
        </div>
        <P>
          Arc is an EVM-compatible chain optimised for stablecoin use cases. USDC is the native gas asset,
          meaning wallets need USDC (not ETH) to pay transaction fees.
        </P>
      </SECTION>

      <SECTION title="Supported Tokens">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <InfoBox label="USDC — Live"  value="USD Coin"    sub="Native gas + transfer token. Circle-issued." />
          <InfoBox label="EURC — Live"  value="Euro Coin"   sub="Euro-pegged stablecoin. Circle-issued." />
          <InfoBox label="WETH — Demo"  value="Wrapped ETH" sub="Demo only. Real swap requires live pair." />
          <InfoBox label="WBTC — Demo"  value="Wrapped BTC" sub="Demo only. Real swap requires live pair." />
          <InfoBox label="wSOL — Demo"  value="Wrapped SOL" sub="Demo only. Real swap requires live pair." />
          <InfoBox label="MIRA — Demo"  value="MiraRoute"   sub="Protocol token. Not yet live on-chain." />
        </div>
        <P>
          Only <strong className="text-white/90">USDC and EURC</strong> are live on Arc Testnet. Swaps for demo tokens are
          disabled — the swap button shows "Demo — only USDC &amp; EURC on Arc" for non-live pairs.
        </P>
      </SECTION>

      <SECTION title="How Swaps Work">
        <P>
          Swaps use Circle's App Kit (<Code>@circle-fin/app-kit</Code>) via the <Code>arcKit.swap()</Code> method.
          The wallet must be connected to Arc Testnet (Chain ID <Code>5042002</Code>). When you click "Confirm Swap",
          your wallet prompts for a signature — no simulation fallback exists.
        </P>
        <P>
          After a successful swap, the transaction hash is stored and shown in a success overlay with a direct
          link to <Code>testnet.arcscan.app/tx/{'{'+'hash'+'}'}</Code>. Balances are refetched from the chain automatically
          after every confirmed transaction.
        </P>
        <div className="rounded-xl bg-white/[0.03] card-stroke p-4 mt-2">
          <div className="text-[11px] mono uppercase tracking-[0.15em] text-white/40 mb-2">Swap flow</div>
          <div className="flex flex-wrap gap-2 items-center text-[12.5px] mono text-white/70">
            <span className="px-2 py-1 rounded bg-white/[0.05]">Connect wallet</span>
            <Icons.ArrowDown size={12} className="-rotate-90 text-teal-400"/>
            <span className="px-2 py-1 rounded bg-white/[0.05]">Enter amount</span>
            <Icons.ArrowDown size={12} className="-rotate-90 text-teal-400"/>
            <span className="px-2 py-1 rounded bg-white/[0.05]">Review route</span>
            <Icons.ArrowDown size={12} className="-rotate-90 text-teal-400"/>
            <span className="px-2 py-1 rounded bg-white/[0.05]">Sign in wallet</span>
            <Icons.ArrowDown size={12} className="-rotate-90 text-teal-400"/>
            <span className="px-2 py-1 rounded bg-teal-400/15 text-teal-300">Settled on Arc</span>
          </div>
        </div>
      </SECTION>

      <SECTION title="CCTP Bridge">
        <P>
          The Bridge tab supports one live route: <strong className="text-white/90">Ethereum Sepolia → Arc Testnet</strong> for USDC,
          using Circle's Cross-Chain Transfer Protocol (CCTP). This is a canonical, trust-minimised burn-and-mint
          mechanism — USDC is burned on Sepolia and natively minted on Arc.
        </P>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-3">
          <InfoBox label="From"     value="Ethereum Sepolia" sub="Burn USDC — requires Sepolia ETH for gas" />
          <InfoBox label="Protocol" value="Circle CCTP"      sub="Canonical cross-chain standard" />
          <InfoBox label="To"       value="Arc Testnet"      sub="Receive native USDC on Arc" />
        </div>
        <P>
          Other chains (BNB, Arbitrum, Base, Solana) are shown as "Coming Soon" in the Bridge UI.
          The bridge fee is approximately $1.20 and takes ~4 minutes end-to-end.
        </P>
      </SECTION>

      <SECTION title="Earn">
        <P>
          The Earn tab lists curated yield opportunities on Arc — LP pools, stablecoin lending, and staking.
          All pools are non-custodial and settled on Arc Testnet. APYs range from 5.9% (USDC Lending) to
          42.6% (MIRA/USDC LP). Deposits require a wallet signature via the deposit modal.
        </P>
      </SECTION>

      <SECTION title="Tech Stack">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <InfoBox label="Frontend"         value="React + Vite"              sub="Tailwind CSS, DM Mono font" />
          <InfoBox label="Wallet"           value="RainbowKit + wagmi v2"     sub="EVM wallet connection" />
          <InfoBox label="Swap/Bridge"      value="Circle App Kit v1.3.0"     sub="@circle-fin/app-kit" />
          <InfoBox label="On-chain reads"   value="wagmi useBalance / useReadContract" sub="Live balance polling every 8s" />
          <InfoBox label="Chain"            value="Arc Testnet (5042002)"     sub="EVM-compatible, USDC gas" />
          <InfoBox label="Explorer"         value="ArcScan"                   sub="testnet.arcscan.app" />
        </div>
      </SECTION>

      <SECTION title="Links & Resources">
        <div className="flex flex-wrap gap-3">
          {[
            { label: 'Arc Testnet Explorer', href: 'https://testnet.arcscan.app' },
            { label: 'Circle App Kit',       href: 'https://developers.circle.com/w3s/docs/circle-app-kit' },
            { label: 'GitHub — MiraRoute',   href: 'https://github.com/Datwebguy/miraroute' },
            { label: '@Datweb3guy (Founder)', href: 'https://x.com/Datweb3guy' },
            { label: '@miraroute (Project)', href: 'https://x.com/miraroute' },
          ].map(l => (
            <a key={l.label} href={l.href} target="_blank" rel="noreferrer"
               className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.07] card-stroke text-[13px] text-white/70 hover:text-white transition">
              {l.label}
              <Icons.External size={11} className="text-white/35"/>
            </a>
          ))}
        </div>
      </SECTION>

      {onLaunchSwap && (
        <div className="mt-8 pt-8 border-t border-white/5 flex items-center justify-between">
          <span className="text-[13px] text-white/40 mono">MiraRoute v2.1 · © 2026 · Arc Testnet</span>
          <button onClick={onLaunchSwap}
                  className="grad-btn px-5 py-2.5 rounded-xl text-[13px] font-semibold flex items-center gap-2">
            <Icons.Zap size={13} fill="#07261F" stroke="#07261F"/>
            Open Swap
          </button>
        </div>
      )}
    </div>
  );
}
