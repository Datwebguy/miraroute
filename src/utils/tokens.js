export const TOKENS = [
  { sym: 'USDC',  name: 'USD Coin',    price: 1.00,    color: '#2775CA', tag: 'Live',     live: true  },
  { sym: 'EURC',  name: 'Euro Coin',   price: 1.08,    color: '#5EEAD4', tag: 'Live',     live: true  },
  { sym: 'QIE',   name: 'QIE Token',      price: 1.84,    color: '#2DD4BF', tag: 'Demo',     live: false },
  { sym: 'QUSDT', name: 'Tether USD',    price: 1.00,    color: '#6EE7B7', tag: 'Demo',     live: false },
  { sym: 'QETH',  name: 'Wrapped Ether', price: 3142.70, color: '#93C5FD', tag: 'Demo',     live: false },
  { sym: 'QBTC',  name: 'Wrapped BTC',   price: 63210.0, color: '#FCD34D', tag: 'Demo',     live: false },
  { sym: 'qSOL',  name: 'Wrapped SOL',   price: 148.20,  color: '#C4B5FD', tag: 'Demo',     live: false },
  { sym: 'MIRA',  name: 'MiraRoute',   price: 0.42,    color: '#FFFFFF', tag: 'Protocol', live: false },
];

export const INITIAL_BALANCES = {
  USDC: 0, EURC: 0, QIE: 100, QUSDT: 0, QETH: 0, QBTC: 0, qSOL: 0, MIRA: 0,
};

export const getToken = (sym) => TOKENS.find(t => t.sym === sym) || TOKENS[0];

export const fmt = (n, max = 6) => {
  if (n === 0) return '0';
  if (n < 0.0001) return n.toExponential(2);
  if (n < 1) return n.toLocaleString('en-US', { maximumFractionDigits: max });
  if (n < 1000) return n.toLocaleString('en-US', { maximumFractionDigits: 4 });
  return n.toLocaleString('en-US', { maximumFractionDigits: 2 });
};

export const fmtUSD = (n) =>
  '$' + (n >= 1
    ? n.toLocaleString('en-US', { maximumFractionDigits: 2 })
    : n.toFixed(4));
