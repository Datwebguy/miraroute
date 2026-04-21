import { useMemo } from 'react';
import { getToken } from '../utils/tokens';

// On Arc Testnet all swaps are direct single-hop (USDC ↔ EURC via Circle's adapter).
// This hook calculates estimated output and route metadata for display.
export function useRoute({ fromSym, toSym, amountIn, slippage = 0.5 }) {
  return useMemo(() => {
    const amountNum = parseFloat(amountIn) || 0;
    if (!fromSym || !toSym || amountNum <= 0) {
      return { fromSym, toSym, amountIn: 0, expectedOutput: 0, minOutput: 0, fee: 0, slippage, route: [] };
    }

    const fromT = getToken(fromSym);
    const toT   = getToken(toSym);

    const rate         = fromT.price / toT.price;
    const feeRate      = 0.001;                                // 0.1% Circle protocol fee
    const expectedOutput = amountNum * rate * (1 - feeRate);
    const minOutput    = expectedOutput * (1 - slippage / 100);
    const fee          = amountNum * rate * feeRate;

    return {
      fromSym,
      toSym,
      amountIn:       amountNum,
      expectedOutput,
      minOutput,
      fee,
      slippage,
      route:          [fromSym, toSym],   // direct swap — no intermediate hops
      priceImpact:    0.01,               // <0.01% on stablecoin pairs
    };
  }, [fromSym, toSym, amountIn, slippage]);
}
