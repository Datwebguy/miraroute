// Icons.jsx — icon system, MiraRoute MR logo, token logos, social icons

const Icon = ({ d, size = 16, stroke = 'currentColor', fill = 'none', sw = 1.75, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={stroke}
       strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" className={className}>
    {typeof d === 'string' ? <path d={d} /> : d}
  </svg>
);

export const Icons = {
  ChevronDown:  (p) => <Icon {...p} d="M6 9l6 6 6-6" />,
  ChevronUp:    (p) => <Icon {...p} d="M6 15l6-6 6 6" />,
  ChevronRight: (p) => <Icon {...p} d="M9 6l6 6-6 6" />,
  ArrowDown:    (p) => <Icon {...p} d="M12 5v14M5 12l7 7 7-7" />,
  Swap:         (p) => <Icon {...p} d={<g><path d="M7 4v16M7 20l-3-3M7 20l3-3"/><path d="M17 20V4M17 4l-3 3M17 4l3 3"/></g>} />,
  Settings:     (p) => <Icon {...p} d={<g><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></g>} />,
  Zap:          (p) => <Icon {...p} d="M13 2L4.5 13.5h6L11 22l8.5-11.5h-6L13 2z" />,
  Check:        (p) => <Icon {...p} d="M5 12l5 5L20 7" />,
  Close:        (p) => <Icon {...p} d="M18 6L6 18M6 6l12 12" />,
  Info:         (p) => <Icon {...p} d={<g><circle cx="12" cy="12" r="9"/><path d="M12 8v.01M11 12h1v5h1"/></g>} />,
  Search:       (p) => <Icon {...p} d={<g><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></g>} />,
  Wallet:       (p) => <Icon {...p} d={<g><path d="M3 7a2 2 0 0 1 2-2h13v4"/><path d="M3 7v12a2 2 0 0 0 2 2h15v-5"/><path d="M20 12h-4a2 2 0 1 0 0 4h4v-4z"/></g>} />,
  Gas:          (p) => <Icon {...p} d={<g><path d="M4 20V5a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v15"/><path d="M3 20h13"/><path d="M6 10h7"/><path d="M15 8l3 3v7a2 2 0 1 0 4 0v-9l-3-3"/></g>} />,
  Refresh:      (p) => <Icon {...p} d={<g><path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M21 4v5h-5"/></g>} />,
  Copy:         (p) => <Icon {...p} d={<g><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></g>} />,
  Spark:        (p) => <Icon {...p} d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8" />,
  Shield:       (p) => <Icon {...p} d={<g><path d="M12 3l8 3v6c0 5-3.5 8.5-8 9-4.5-.5-8-4-8-9V6l8-3z"/><path d="M9 12l2 2 4-4"/></g>} />,
  TrendUp:      (p) => <Icon {...p} d={<g><path d="M3 17l6-6 4 4 7-8"/><path d="M14 7h6v6"/></g>} />,
  Lock:         (p) => <Icon {...p} d={<g><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></g>} />,
  External:     (p) => <Icon {...p} d={<g><path d="M14 4h6v6"/><path d="M20 4L10 14"/><path d="M19 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h6"/></g>} />,
  Plus:         (p) => <Icon {...p} d="M12 5v14M5 12h14" />,
  Dot:          (p) => <Icon {...p} d={<circle cx="12" cy="12" r="3" fill="currentColor" />} sw={0} />,
  Flag:         (p) => <Icon {...p} d={<g><path d="M4 21V4"/><path d="M4 4h13l-2 4 2 4H4"/></g>} />,
  Sparkle:      (p) => <Icon {...p} d={<g><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z"/></g>} />,
  // Theme toggle
  Sun:          (p) => <Icon {...p} d={<g><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></g>} />,
  Moon:         (p) => <Icon {...p} d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />,
  // Social
  Twitter:      (p) => <Icon {...p} d={<g><path d="M4 4l16 16M20 4 4 20"/></g>} />,
  Github:       (p) => <Icon {...p} d={<g><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/></g>} />,
  Telegram:     (p) => <Icon {...p} d={<g><path d="M21.5 4.5L2.5 11l7 2M21.5 4.5l-5.5 15-4-6M21.5 4.5L9.5 13m0 0l2 5.5"/></g>} />,
  Book:         (p) => <Icon {...p} d={<g><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></g>} />,
};

export const Logo = ({ size = 36 }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="lg" x1="21" y1="22" x2="79" y2="80" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#3AEAD6"/>
        <stop offset="100%" stopColor="#0EA5E9"/>
      </linearGradient>
    </defs>
    <rect width="100" height="100" rx="22" fill="#0D2035"/>
    <ellipse cx="50" cy="60" rx="38" ry="26" fill="#2DD4BF" opacity="0.09"/>
    <path d="M 21 80 L 21 22 L 50 52 L 79 22 L 79 80"
          stroke="url(#lg)" strokeWidth="13"
          strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="50" cy="52" r="4.5" fill="url(#lg)" opacity="0.65"/>
  </svg>
);

// Token logos — circle-based with symbol character
export const TokenLogo = ({ sym, size = 28 }) => {
  const MAP = {
    USDC:  { color: '#2775CA', label: '$',  bg: '#1A3A6B' },
    EURC:  { color: '#2DD4BF', label: '€',  bg: '#0D3B35' },
    USDT:  { color: '#26A17B', label: '₮',  bg: '#0D3527' },
    WETH:  { color: '#93C5FD', label: 'Ξ',  bg: '#1A2748' },
    WBTC:  { color: '#F7931A', label: '₿',  bg: '#3D2410' },
    wSOL:  { color: '#9945FF', label: '◎',  bg: '#23104A' },
    MIRA:  { color: '#E6EDF5', label: 'M',  bg: '#1A2535' },
    ETH:   { color: '#93C5FD', label: 'Ξ',  bg: '#1A2748' },
    SOL:   { color: '#9945FF', label: '◎',  bg: '#23104A' },
    ARB:   { color: '#5EEAD4', label: 'A',  bg: '#0D3535' },
    BNB:   { color: '#FCD34D', label: 'B',  bg: '#3D3510' },
  };
  const t = MAP[sym];
  const color = t?.color ?? 'rgba(255,255,255,0.4)';
  const bg    = t?.bg    ?? '#111B2A';
  const label = t?.label ?? (sym?.slice(0, 1) ?? '?');
  const fontSize = size * 0.38;
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: `radial-gradient(circle at 35% 35%, ${bg}, #0D1B2A 80%)`,
      boxShadow: `inset 0 0 0 1.5px ${color}55`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize, color, fontWeight: 700, fontFamily: 'DM Mono, monospace',
      userSelect: 'none',
    }}>
      {label}
    </div>
  );
};
