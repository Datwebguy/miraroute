// Arc Testnet — live tokens only: USDC (native gas) + EURC.
// All other tokens (WETH, WBTC, wSOL, USDT, MIRA) have been removed
// as they do not exist on Arc Testnet.

export const TOKENS = [
  { sym: 'USDC', name: 'USD Coin',  price: 1.00, color: '#2775CA', tag: 'Live', live: true },
  { sym: 'EURC', name: 'Euro Coin', price: 1.08, color: '#2DD4BF', tag: 'Live', live: true },
];

export const INITIAL_BALANCES = { USDC: 0, EURC: 0 };

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
