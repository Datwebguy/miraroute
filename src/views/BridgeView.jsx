import React, { useState, useEffect, useMemo } from 'react';
import { useAccount, useChainId, useReadContract, useWaitForTransactionReceipt } from 'wagmi';
import { erc20Abi, formatUnits, parseUnits } from 'viem';
import { sepolia } from 'wagmi/chains';
import { Icons, TokenLogo } from '../components/Icons';
import { CCTP, TOKENS, CHAIN, GATEWAY, arcTestnet } from '../utils/constants';
import { useArcKit } from '../hooks/useArcKit';
import { useArcBalances } from '../hooks/useArcBalances';

export default function BridgeView({ onBridge, onToast }) {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const arcKit = useArcKit();
  const arcBals = useArcBalances(address);

  const [amt, setAmt] = useState('');
  const [direction, setDirection] = useState('to-arc'); // 'to-arc' or 'to-sepolia'
  const [step, setStep] = useState(0); 
  const [bridgeErr, setBridgeErr] = useState(null);
  const [mintHash, setMintHash] = useState(null);
  const [burnHash, setBurnHash] = useState(null);
  const [needManualSwitch, setNeedManualSwitch] = useState(false);
  const [approveHash, setApproveHash] = useState(undefined);
  const [resumable, setResumable] = useState(null);

  useEffect(() => {
    try {
      const pending = JSON.parse(localStorage.getItem('miraPendingBridge'));
      if (pending && pending.address === address) {
        setResumable(pending);
      }
    } catch {}
  }, [address]);

  const clearPending = () => {
    localStorage.removeItem('miraPendingBridge');
    setResumable(null);
  };

  const amtNum = parseFloat(amt) || 0;
  const amtRaw = parseUnits(amt || '0', 6);

  const isToArc = direction === 'to-arc';
  const sourceChain = isToArc ? sepolia : arcTestnet;
  const destChain = isToArc ? arcTestnet : sepolia;
  const sourceToken = isToArc ? TOKENS.USDC_SEPOLIA : TOKENS.USDC_ARC;
  const spender = isToArc ? CCTP.TOKEN_MESSENGER : GATEWAY.WALLET;

  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address:      sourceToken.address,
    abi:          erc20Abi,
    functionName: "allowance",
    args:         address ? [address, spender] : undefined,
    chainId:      sourceChain.id,
    query:        { enabled: !!address, refetchInterval: 5000 },
  });

  const { isLoading: isApproving, isSuccess: approveSuccess } = useWaitForTransactionReceipt({
    hash: approveHash,
    query: { enabled: !!approveHash },
  });

  useEffect(() => {
    if (approveSuccess) {
      setApproveHash(undefined);
      refetchAllowance();
    }
  }, [approveSuccess, refetchAllowance]);

  const needsApproval = isConnected && amtNum > 0 && (allowance || 0n) < amtRaw;

  const handleBridge = async (resumeData = null) => {
    if (!isConnected) return;
    
    // Approval Step
    if (!resumeData && needsApproval) {
      try {
        const hash = await arcKit.approve({
          token: sourceToken.address,
          spender: spender,
          amount: amtRaw,
          cid: sourceChain.id
        });
        setApproveHash(hash);
      } catch (err) {
        setBridgeErr(err?.message || "Approval failed");
      }
      return;
    }

    setBridgeErr(null);
    setMintHash(null);
    setBurnHash(resumeData ? resumeData.burnHash : null);
    setStep(resumeData ? 3 : 1);

    try {
      if (isToArc || resumeData) {
        // Standard CCTP Bridge (Sepolia -> Arc)
        const result = await arcKit.bridge({
          amount: resumeData ? resumeData.amount : amt,
          burnHash: resumeData ? resumeData.burnHash : undefined,
          onBurnHash: (hash) => {
            localStorage.setItem('miraPendingBridge', JSON.stringify({
              address, amount: amt, burnHash: hash, date: Date.now()
            }));
          },
          onProgress: setStep,
        });
        setMintHash(result.txHash);
        setBurnHash(result.burnTxHash);
      } else {
        // Gateway Bridge (Arc -> Sepolia)
        const result = await arcKit.gatewayBridge({
          amount: amt,
          destinationDomain: CHAIN.SEPOLIA_DOMAIN,
          onProgress: setStep,
        });
        setMintHash(result.txHash);
      }

      setStep(4);
      clearPending();
      
      const resHash = result.txHash;
      onBridge?.({ 
        sym: 'USDC', 
        amount: amtNum, 
        fromChain: isToArc ? 'ETH' : 'ARC', 
        toChain: isToArc ? 'ARC' : 'ETH', 
        hash: resHash 
      });
      
      onToast?.(`Successfully bridged ${amt} USDC to ${destChain.name}`);
      setTimeout(() => { setStep(0); setAmt(''); }, 4000);
    } catch (err) {
      console.error('[Bridge] Error:', err);
      setBridgeErr(err.message || "Bridge failed");
      setStep(0);
    }
  };

  const toggleDirection = () => {
    if (step > 0) return;
    setDirection(prev => prev === 'to-arc' ? 'to-sepolia' : 'to-arc');
    setAmt('');
    setBridgeErr(null);
  };

  return (
    <div className="max-w-[480px] mx-auto pt-10 pb-20 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-white mb-2">Bridge</h1>
        <p className="text-white/45 text-[14.5px]">Move USDC via {isToArc ? 'Circle CCTP' : 'Circle Gateway'}.</p>
      </div>

      <div className="space-y-4">
        {/* Source */}
        <div className="rounded-2xl card-stroke bg-white/[0.02] p-5 input-glass">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/[0.05] border border-white/5">
              <div className="w-4 h-4 rounded-full" style={{ background: isToArc ? '#627EEA' : '#2DD4BF' }}/>
              <span className="text-[11px] mono uppercase tracking-wider text-white/70">{sourceChain.name}</span>
            </div>
            <div className="text-[11.5px] mono text-white/40">
              Balance: <span className="text-white/70">{(isToArc ? 0 : (arcBals.USDC || 0)).toFixed(2)} USDC</span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <input type="number" value={amt} onChange={(e) => setAmt(e.target.value)} placeholder="0.00" className="bg-transparent text-3xl outline-none placeholder-white/10 mono w-full" />
            <div className="flex items-center gap-2 bg-white/[0.05] p-2 rounded-xl border border-white/5">
              <TokenLogo sym="USDC" size={24}/>
              <span className="font-medium text-[15px]">USDC</span>
            </div>
          </div>
        </div>

        {/* Switch Button */}
        <div className="flex justify-center -my-2 relative z-10">
          <button onClick={toggleDirection} className="w-10 h-10 rounded-xl bg-[#0D0D0D] border border-white/10 flex items-center justify-center text-white/40 shadow-xl hover:text-teal-400 transition">
            <Icons.Refresh size={20} className={step > 0 ? 'opacity-20' : ''}/>
          </button>
        </div>

        {/* Destination */}
        <div className="rounded-2xl card-stroke bg-white/[0.02] p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/[0.05] border border-white/5">
              <div className="w-4 h-4 rounded-full" style={{ background: isToArc ? '#2DD4BF' : '#627EEA' }}/>
              <span className="text-[11px] mono uppercase tracking-wider text-white/70">{destChain.name}</span>
            </div>
          </div>
          <div className="flex items-center justify-between opacity-50">
            <div className="text-3xl mono text-white/30">{amt || '0.00'}</div>
            <div className="flex items-center gap-2 bg-white/[0.05] p-2 rounded-xl border border-white/5">
              <TokenLogo sym="USDC" size={24}/>
              <span className="font-medium text-[15px]">USDC</span>
            </div>
          </div>
        </div>

        {bridgeErr && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-[13px] text-rose-200/80 flex gap-3">
            <Icons.Info size={16} className="text-rose-400 shrink-0"/> {bridgeErr}
          </div>
        )}

        <button onClick={handleBridge} disabled={step > 0 && step < 4} className="w-full py-4 rounded-2xl font-semibold text-[14.5px] grad-btn">
          {step > 0 && step < 4 ? 'Processing...' : needsApproval ? `Approve USDC` : `Bridge to ${isToArc ? 'Arc' : 'Sepolia'}`}
        </button>

        {step > 0 && (
          <div className="pt-2 px-2">
            <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
              <div className="h-full grad-teal transition-all duration-500" style={{ width: `${(step/4)*100}%` }}/>
            </div>
          </div>
        )}

        {mintHash && (
          <div className="p-4 rounded-2xl bg-teal-500/5 border border-teal-500/10">
            <div className="text-white font-medium">Bridge successful!</div>
            <a href={isToArc ? `https://testnet.arcscan.app/tx/${mintHash}` : `https://sepolia.etherscan.io/tx/${mintHash}`} target="_blank" rel="noreferrer" className="text-[12px] text-teal-400 mt-1 block">View Transaction</a>
          </div>
        )}
      </div>
    </div>
  );
}
