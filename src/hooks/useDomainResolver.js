import { useState, useEffect } from 'react';

const ETH_ADDRESS = /^0x[a-fA-F0-9]{40}$/;

// Arc Testnet does not support on-chain domain resolution.
// If input is a valid 0x address, pass it through.
// If it looks like a .arc name, simulate resolution (demo only).
// Anything else is invalid.
export function useDomainResolver(input) {
  const [resolved, setResolved] = useState(null);
  const [status,   setStatus]   = useState('idle'); // 'idle' | 'resolving' | 'resolved' | 'error'

  useEffect(() => {
    if (!input) { setResolved(null); setStatus('idle'); return; }

    if (ETH_ADDRESS.test(input)) {
      setResolved(input);
      setStatus('resolved');
      return;
    }

    if (input.endsWith('.arc') && input.length > 4) {
      setStatus('resolving');
      const timer = setTimeout(() => {
        // Deterministic demo address from the name (no real on-chain lookup)
        const hash = Array.from(input).reduce((a, c) => (a * 33 + c.charCodeAt(0)) >>> 0, 5381);
        const hex  = hash.toString(16).padStart(8, '0');
        const addr = ('0x' + (hex + 'e21f70c9b04a3cd5' + hex).slice(0, 40));
        setResolved(addr);
        setStatus('resolved');
      }, 800);
      return () => clearTimeout(timer);
    }

    setResolved(null);
    setStatus('error');
  }, [input]);

  return { resolved, status };
}
