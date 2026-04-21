import { CONTRACTS } from './constants';

const KIT_KEY = import.meta.env.VITE_CIRCLE_KIT_KEY;

function toBigInt(v) {
  if (v === null || v === undefined || v === '' || v === '0x' || v === '0x0') return 0n;
  try { return BigInt(v); } catch { return 0n; }
}

export async function fetchSwapTx({ tokenIn, tokenOut, amount, fromAddress, slippageBps = 50 }) {
  const tokenInAddress  = CONTRACTS[tokenIn];
  const tokenOutAddress = CONTRACTS[tokenOut];

  const res = await fetch('/api/circle-proxy/v1/stablecoinKits/swap', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(KIT_KEY ? { 'Authorization': `Bearer ${KIT_KEY}` } : {}),
    },
    body: JSON.stringify({
      tokenInAddress,
      tokenInChain:  'Arc_Testnet',
      tokenOutAddress,
      tokenOutChain: 'Arc_Testnet',
      fromAddress,
      toAddress:     fromAddress,
      amount:        amount.toString(),
      slippageBps,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Circle API ${res.status}: ${text.slice(0, 150)}`);
  }

  const json = await res.json();

  // Circle standard envelope: { data: { transaction: { executionParams, signature, gasLimit } } }
  const tx  = json?.data?.transaction ?? json?.transaction ?? json;
  const raw = tx?.executionParams ?? tx;

  const executeParams = {
    instructions: (raw.instructions ?? []).map(i => ({
      target:          i.target,
      data:            i.data   ?? '0x',
      value:           toBigInt(i.value),
      tokenIn:         i.tokenIn,
      amountToApprove: toBigInt(i.amountToApprove),
      tokenOut:        i.tokenOut,
      minTokenOut:     toBigInt(i.minTokenOut),
    })),
    tokens: (raw.tokens ?? []).map(t => ({
      token:       t.token,
      beneficiary: t.beneficiary,
    })),
    execId:   toBigInt(raw.execId),
    deadline: toBigInt(raw.deadline),
    metadata: raw.metadata ?? '0x',
  };

  // Use allowance (permitType 0) — pre-approved via separate approve() call
  const tokenInputs = [{
    permitType:     0,
    token:          tokenInAddress,
    amount:         executeParams.instructions[0]?.amountToApprove ?? 0n,
    permitCalldata: '0x',
  }];

  // Sum native value across all instructions (usually 0 for ERC-20 swaps on Arc)
  const nativeValue = executeParams.instructions.reduce((sum, i) => sum + i.value, 0n);

  return {
    executeParams,
    tokenInputs,
    signature:          tx.signature ?? '0x',
    gasLimit:           tx.gasLimit ? toBigInt(tx.gasLimit) : undefined,
    nativeValue,
    estimatedAmountOut: json?.data?.estimatedAmountOut ?? null,
  };
}
