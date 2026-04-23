import { useState, useEffect } from 'react';
import { Icons } from './Icons';
import { GATEWAY } from '../utils/constants';

export default function GatewayBalances({ address }) {
  const [balances, setBalances] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchBalances = async () => {
    if (!address) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${GATEWAY.API_URL}/v1/balances`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: 'USDC',
          sources: Object.keys(GATEWAY.SUPPORTED_CHAINS).map(domainId => ({
            domain: parseInt(domainId),
            depositor: address
          }))
        })
      });

      if (!response.ok) throw new Error(`Gateway API error: ${response.status}`);
      
      const data = await response.json();
      // Filter out zero balances for cleaner UI, or keep all to show coverage
      setBalances(data.balances || []);
    } catch (err) {
      console.error('[GatewayBalances] fetch error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBalances();
    const interval = setInterval(fetchBalances, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [address]);

  const totalBalance = balances.reduce((sum, b) => sum + parseFloat(b.balance), 0);

  if (!address) return null;

  return (
    <div className="rounded-2xl card-stroke bg-white/[0.02] p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full grad-teal flex items-center justify-center">
            <Icons.Lock size={16} className="text-[#07261F]"/>
          </div>
          <div>
            <h3 className="text-[14px] font-semibold">Unified Vault</h3>
            <p className="text-[11px] text-white/40 mono uppercase tracking-wider">Powered by Circle Gateway</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[18px] font-medium leading-none">
            {loading && balances.length === 0 ? '...' : totalBalance.toFixed(2)} <span className="text-[12px] text-white/40">USDC</span>
          </div>
          <button onClick={fetchBalances} className="text-[10px] text-teal-400 hover:text-teal-300 mono mt-1 flex items-center gap-1 ml-auto">
            <Icons.Refresh size={10} className={loading ? 'spin' : ''}/> SYNCING
          </button>
        </div>
      </div>

      <div className="space-y-2 pt-2 border-t border-white/5">
        {balances.length === 0 && !loading && (
          <div className="py-4 text-center text-[12px] text-white/30 italic">
            No deposits found in the Gateway vault.
          </div>
        )}
        
        {balances.map((b) => {
          const chain = GATEWAY.SUPPORTED_CHAINS[b.domain] || { label: `Domain ${b.domain}`, symbol: '?', color: '#ccc' };
          const val = parseFloat(b.balance);
          if (val === 0) return null; // Hide zero balances

          return (
            <div key={b.domain} className="flex items-center justify-between py-2 px-3 rounded-xl hover:bg-white/[0.03] transition">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: chain.color }}/>
                <div>
                  <div className="text-[12.5px] font-medium text-white/80">{chain.label}</div>
                  <div className="text-[10px] text-white/30 mono">{chain.symbol} NETWORK</div>
                </div>
              </div>
              <div className="text-[13px] mono font-medium">
                {val.toFixed(2)} <span className="text-[10px] text-white/40">USDC</span>
              </div>
            </div>
          );
        })}

        {error && (
          <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400 text-[10px] mono flex items-center gap-2">
            <Icons.Info size={12}/> API Sync Error: {error}
          </div>
        )}
      </div>

      <div className="bg-white/[0.03] p-3 rounded-xl flex items-start gap-3">
        <Icons.Info size={14} className="text-teal-400 mt-0.5 shrink-0"/>
        <p className="text-[11px] text-white/50 leading-relaxed">
          Your Unified Vault balance is accessible across all supported chains instantly. 
          Deposits are non-custodial and secured by Circle.
        </p>
      </div>
    </div>
  );
}
