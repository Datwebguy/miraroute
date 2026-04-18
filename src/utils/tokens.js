// Arc Testnet — live tokens: USDC (native gas) + EURC. All others are demo only.

export const TOKENS = [
  { sym: 'USDC', name: 'USD Coin',      price: 1.00,     color: '#2775CA', tag: 'Live',     live: true  },
  { sym: 'EURC', name: 'Euro Coin',     price: 1.08,     color: '#2DD4BF', tag: 'Live',     live: true  },
  { sym: 'WETH', name: 'Wrapped Ether', price: 3142.70,  color: '#93C5FD', tag: 'Demo',     live: false },
  { sym: 'WBTC', name: 'Wrapped BTC',   price: 63210.0,  color: '#F7931A', tag: 'Demo',     live: false },
  { sym: 'wSOL', name: 'Wrapped SOL',   price: 148.20,   color: '#9945FF', tag: 'Demo',     live: false },
  { sym: 'USDT', name: 'Tether USD',    price: 1.00,     color: '#26A17B', tag: 'Demo',     live: false },
  { sym: 'MIRA', name: 'MiraRoute',     price: 0.42,     color: '#E6EDF5', tag: 'Protocol', live: false },
];

// All balances start at 0 — live balances come from Arc on-chain via useArcBalances
export const INITIAL_BALANCES = {
  USDC: 0, EURC: 0, WETH: 0, WBTC: 0, wSOL: 0, USDT: 0, MIRA: 0,
};

export const getToken = (sym) => TOKENS.find(t => t.sym === sym) ?? TOKENS[0];

export const fmt = (n, max = 6) => {
  if (!n || n === 0) return '0';
  if (n < 0.0001) return n.toExponential(2);
  if (n < 1) return n.toLocaleString('en-US', { maximumFractionDigits: max });
  if (n < 1000) return n.toLocaleString('en-US', { maximumFractionDigits: 4 });
  return n.toLocaleString('en-US', { maximumFractionDigits: 2 });
};

export const fmtUSD = (n) =>
  '$' + (n >= 1
    ? n.toLocaleString('en-US', { maximumFractionDigits: 2 })
    : (n || 0).toFixed(4));
