// Icons.jsx — minimalist line-style SVG icon system + MiraRoute logo

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
};

// MiraRoute logo — "M" monogram with teal-to-white gradient and route dots
export const Logo = ({ size = 28 }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
    <defs>
      <linearGradient id="lgGrad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#2DD4BF" />
        <stop offset="1" stopColor="#FFFFFF" />
      </linearGradient>
    </defs>
    <rect x="1" y="1" width="38" height="38" rx="10" stroke="url(#lgGrad)" strokeWidth="1.5" opacity=".55"/>
    <path d="M9 28 L9 12 L15 12 L20 20 L25 12 L31 12 L31 28"
          stroke="url(#lgGrad)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    <circle cx="9"  cy="28" r="1.8" fill="#2DD4BF"/>
    <circle cx="31" cy="28" r="1.8" fill="#FFFFFF"/>
  </svg>
);

// Token logo — drawn with SVG (no external image assets)
export const TokenLogo = ({ sym, size = 28 }) => {
  const TOKENS_MAP = {
    QIE:   { color: '#2DD4BF' },
    QUSDC: { color: '#5EEAD4' },
    QUSDT: { color: '#6EE7B7' },
    QETH:  { color: '#93C5FD' },
    QBTC:  { color: '#FCD34D' },
    qSOL:  { color: '#C4B5FD' },
    MIRA:  { color: '#FFFFFF' },
  };
  const t = TOKENS_MAP[sym];
  if (!t) return null;
  const s = size;
  return (
    <div className="relative flex items-center justify-center rounded-full flex-shrink-0"
         style={{ width: s, height: s,
                  background: `radial-gradient(circle at 30% 30%, ${t.color}33, #0D1B2A 70%)`,
                  boxShadow: `inset 0 0 0 1px ${t.color}55` }}>
      <svg width={s} height={s} viewBox="0 0 32 32">
        <defs>
          <linearGradient id={`tg-${sym}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={t.color} />
            <stop offset="1" stopColor="#FFFFFF" stopOpacity=".7"/>
          </linearGradient>
        </defs>
        {sym === 'QIE' && <g>
          <circle cx="16" cy="16" r="9" stroke={`url(#tg-${sym})`} strokeWidth="2" fill="none"/>
          <path d="M20 20 L24 24" stroke={`url(#tg-${sym})`} strokeWidth="2" strokeLinecap="round"/>
        </g>}
        {sym === 'QUSDC' && <g>
          <circle cx="16" cy="16" r="10" fill="none" stroke={`url(#tg-${sym})`} strokeWidth="2"/>
          <text x="16" y="20" textAnchor="middle" fontSize="10" fontWeight="700" fill={`url(#tg-${sym})`} fontFamily="Inter">$</text>
        </g>}
        {sym === 'QUSDT' && <g>
          <circle cx="16" cy="16" r="10" fill="none" stroke={`url(#tg-${sym})`} strokeWidth="2"/>
          <path d="M11 12h10M16 12v10" stroke={`url(#tg-${sym})`} strokeWidth="2" strokeLinecap="round"/>
        </g>}
        {sym === 'QETH' && <g>
          <path d="M16 6 L22 16 L16 19 L10 16 Z" stroke={`url(#tg-${sym})`} strokeWidth="1.6" fill="none"/>
          <path d="M16 21 L22 17 L16 26 L10 17 Z" stroke={`url(#tg-${sym})`} strokeWidth="1.6" fill="none"/>
        </g>}
        {sym === 'QBTC' && <g>
          <circle cx="16" cy="16" r="10" fill="none" stroke={`url(#tg-${sym})`} strokeWidth="2"/>
          <text x="16" y="20" textAnchor="middle" fontSize="10" fontWeight="700" fill={`url(#tg-${sym})`} fontFamily="Inter">฿</text>
        </g>}
        {sym === 'qSOL' && <g>
          <path d="M8 11 L22 11 L19 14 L5 14 Z" fill={`url(#tg-${sym})`} opacity=".9"/>
          <path d="M5 16 L19 16 L22 19 L8 19 Z" fill={`url(#tg-${sym})`} opacity=".7"/>
          <path d="M8 21 L22 21 L19 24 L5 24 Z" fill={`url(#tg-${sym})`} opacity=".5"/>
        </g>}
        {sym === 'MIRA' && <g>
          <path d="M8 22 L8 10 L12 10 L16 16 L20 10 L24 10 L24 22"
                stroke={`url(#tg-${sym})`} strokeWidth="2" strokeLinejoin="round" fill="none"/>
        </g>}
      </svg>
    </div>
  );
};
