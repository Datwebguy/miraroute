import React, { useState, useEffect } from 'react';
import { useAccount, useChainId, useReadContract, useWaitForTransactionReceipt } from 'wagmi';
import { erc20Abi, formatUnits, parseUnits } from 'viem';
import { sepolia } from 'wagmi/chains';
import { Icons, TokenLogo } from '../components/Icons';
import { CCTP, TOKENS, CHAIN } from '../utils/constants';
import { useArcKit } from '../hooks/useArcKit';
import { useArcBalances } from '../hooks/useArcBalances';

const SEPOLIA_USDC     = TOKENS.USDC_SEPOLIA.address;
const SEPOLIA_CHAIN_ID = sepolia.id;

export default function BridgeView({ onBridge, onToast }) {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const arcKit = useArcKit();
  const arcBals = useArcBalances(address);

  const [amt, setAmt] = useState('');
  const [step, setStep] = useState(0); // 0=idle, 1=switching/locking, 2=locking, 3=attesting, 4=minting
  const [bridgeErr, setBridgeErr] = useState(null);
  const [mintHash, setMintHash] = useState(null);
  const [burnHash, setBurnHash] = useState(null);
  const [needManualSwitch, setNeedManualSwitch] = useState(false);
  const [approveHash, setApproveHash] = useState(undefined);

  // 1. Check Allowance
  const amtNum = parseFloat(amt) || 0;
  const amtRaw = parseUnits(amt || '0', 6);

  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address:      SEPOLIA_USDC,
    abi:          erc20Abi,
    functionName: "allowance",
    args:         address ? [address, CCTP.TOKEN_MESSENGER] : undefined,
    chainId:      SEPOLIA_CHAIN_ID,
    query:        { enabled: !!address, staleTime: 0, refetchInterval: 5000 },
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

  const { data: sepoliaBalance, refetch: refetchBridgeBal } = useReadContract({
    address: SEPOLIA_USDC,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    chainId: SEPOLIA_CHAIN_ID,
    query: { enabled: !!address, refetchInterval: 10000 },
  });

  const needsApproval = isConnected && amtNum > 0 && (allowance || 0n) < amtRaw;

  const handleBridge = async () => {
    if (!isConnected) return;
    if (needsApproval) {
      try {
        const hash = await arcKit.approve({
          token: SEPOLIA_USDC,
          spender: CCTP.TOKEN_MESSENGER,
          amount: amtRaw,
          cid: SEPOLIA_CHAIN_ID
        });
        setApproveHash(hash);
      } catch (err) {
        setBridgeErr(err?.message || "Approval failed");
      }
      return;
    }

    setBridgeErr(null);
    setMintHash(null);
    setBurnHash(null);
    setNeedManualSwitch(false);
    setStep(1);
    try {
      console.log('[MiraRoute] Truth Test: Initiating bridge...');
      const bridgeResult = await arcKit.bridge({
        amount:     amt,
        onProgress: (s) => {
          if (typeof s === 'number') setStep(s);
        },
      });

      const bridgeHash = bridgeResult?.txHash || null;
      console.log('[MiraRoute] bridge result:', bridgeResult);

      setMintHash(bridgeHash);
      setBurnHash(bridgeResult?.burnTxHash || null);
      setStep(4);
      
      try {
        const history = JSON.parse(localStorage.getItem('miraHistory') || '[]');
        history.unshift({ type: 'Bridge', amount: amtNum, sym: 'USDC', fromChain: 'ETH', toChain: 'ARC', hash: bridgeHash, date: Date.now() });
        localStorage.setItem('miraHistory', JSON.stringify(history.slice(0, 100)));
      } catch {}

      onBridge?.({ sym: 'USDC', amount: amtNum, fromChain: 'ETH', toChain: 'ARC', hash: bridgeHash });
      onToast?.(`Bridged ${amt} USDC → Arc Testnet via Circle CCTP`);
      refetchBridgeBal();
      setTimeout(() => { setStep(0); setAmt(''); }, 4000);
    } catch (err) {
      const msg = String(err?.message ?? '');
      if (err?.code === 'CHAIN_SWITCH_REQUIRED') {
        setNeedManualSwitch(true);
        setBridgeErr(null);
      } else {
        setBridgeErr(
          msg.toLowerCase().includes('rejected') || msg.toLowerCase().includes('denied')
            ? 'Transaction rejected by wallet'
            : msg || 'Bridge failed. Please try again.'
        );
      }
      setStep(0);
    }
  };

  const sepoliaBalFmt = sepoliaBalance != null ? parseFloat(formatUnits(sepoliaBalance, 6)).toFixed(2) : '0.00';

  return (
    <div className="max-w-[480px] mx-auto pt-10 pb-20 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-white mb-2">Bridge</h1>
        <p className="text-white/45 text-[14.5px]">Move USDC between Ethereum Sepolia and Arc Testnet via Circle CCTP.</p>
      </div>

      <div className="space-y-4">
        {/* Source: Sepolia */}
        <div className="rounded-2xl card-stroke bg-white/[0.02] p-5 input-glass">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/[0.05] border border-white/5">
              <div className="w-4 h-4 rounded-full bg-[#627EEA] flex items-center justify-center">
                <span className="text-[8px] font-bold text-white">Ξ</span>
              </div>
              <span className="text-[11px] mono uppercase tracking-wider text-white/70">Ethereum Sepolia</span>
            </div>
            <div className="text-[11.5px] mono text-white/40">
              Balance: <span className="text-white/70">{sepoliaBalFmt} USDC</span>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <input 
              type="number"
              value={amt}
              onChange={(e) => setAmt(e.target.value)}
              placeholder="0.00"
              className="bg-transparent text-3xl outline-none placeholder-white/10 mono w-full"
            />
            <div className="flex items-center gap-2 bg-white/[0.05] p-2 rounded-xl border border-white/5">
              <TokenLogo sym="USDC" size={24}/>
              <span className="font-medium text-[15px]">USDC</span>
            </div>
          </div>
        </div>

        {/* Arrow Down */}
        <div className="flex justify-center -my-2 relative z-10">
          <div className="w-10 h-10 rounded-xl bg-[#0D0D0D] border border-white/10 flex items-center justify-center text-white/40 shadow-xl">
            <Icons.ChevronDown size={20}/>
          </div>
        </div>

        {/* Destination: Arc */}
        <div className="rounded-2xl card-stroke bg-white/[0.02] p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/[0.05] border border-white/5">
              <div className="w-4 h-4 rounded-full grad-teal shrink-0"/>
              <span className="text-[11px] mono uppercase tracking-wider text-white/70">Arc Testnet</span>
            </div>
            <div className="text-[11.5px] mono text-white/40">
              Balance: <span className="text-white/70">{(arcBals.USDC || 0).toFixed(2)} USDC</span>
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

        {/* Warning/Error */}
        {bridgeErr && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-start gap-3">
            <Icons.Info size={16} className="text-rose-400 mt-0.5 shrink-0"/>
            <span className="text-[13px] text-rose-200/80 leading-relaxed">{bridgeErr}</span>
          </div>
        )}

        {needManualSwitch && (
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex flex-col gap-2">
            <div className="flex items-start gap-3">
              <Icons.Info size={16} className="text-amber-400 mt-0.5 shrink-0"/>
              <span className="text-[13px] text-amber-200/80 leading-relaxed">
                Rabby Wallet detected. Please manually switch your wallet to <strong>{step >= 4 ? 'Arc Testnet' : 'Sepolia'}</strong> to continue.
              </span>
            </div>
            <button onClick={() => { setNeedManualSwitch(false); handleBridge(); }} 
                    className="text-[12px] font-semibold text-amber-400 hover:text-amber-300 w-fit ml-7">
              I've switched, continue →
            </button>
          </div>
        )}

        {/* Action Button */}
        {!isConnected ? (
          <button className="w-full py-4 rounded-2xl font-semibold text-[14.5px] grad-btn">
            Connect Wallet
          </button>
        ) : (isApproving || arcKit.isWritePending || (step > 0 && step < 4)) ? (
          <button disabled className="w-full py-4 rounded-2xl font-semibold text-[14.5px] relative overflow-hidden shimmer text-[#07261F]">
            <span className="relative z-10 flex items-center justify-center gap-2">
              <span className="inline-block w-4 h-4 border-2 border-[#07261F]/60 border-t-transparent rounded-full spin-slow"/>
              {isApproving || arcKit.isWritePending ? 'Confirm in Wallet…' : step === 1 ? 'Locking on Sepolia…' : step === 2 ? 'Waiting for confirmation…' : 'Minting on Arc…'}
            </span>
          </button>
        ) : (
          <button 
            onClick={handleBridge}
            className="w-full py-4 rounded-2xl font-semibold text-[14.5px] grad-btn active:scale-[0.98] transition-transform shadow-lg shadow-teal-500/10"
          >
            {needsApproval ? `Approve USDC` : `Bridge USDC → Arc`}
          </button>
        )}

        {/* Step Progress Visual */}
        {step > 0 && (
          <div className="pt-2 px-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] mono uppercase tracking-widest text-white/30">Progress</span>
              <span className="text-[10px] mono text-teal-400/80">{step === 4 ? '100%' : step === 3 ? '60%' : '20%'}</span>
            </div>
            <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
              <div className="h-full grad-teal transition-all duration-500" style={{ width: `${(step/4)*100}%` }}/>
            </div>
          </div>
        )}

        {/* Success States */}
        {mintHash && (
          <div className="mt-6 p-4 rounded-2xl bg-teal-500/5 border border-teal-500/10 anim-slidedown">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-teal-500/20 flex items-center justify-center text-teal-400">
                <Icons.Check size={18}/>
              </div>
              <div>
                <div className="text-[14px] font-medium text-white">Bridge successful!</div>
                <div className="text-[12px] text-white/40">Tokens are now available on Arc.</div>
              </div>
            </div>
            <div className="flex flex-col gap-1.5 ml-11">
              <a href={`https://testnet.arcscan.app/tx/${mintHash}`} target="_blank" rel="noreferrer"
                 className="text-[11.5px] text-teal-400/70 hover:text-teal-400 flex items-center gap-1.5 w-fit">
                View mint tx on ArcScan <Icons.ArrowRight size={10}/>
              </a>
              {burnHash && (
                <a href={`https://sepolia.etherscan.io/tx/${burnHash}`} target="_blank" rel="noreferrer"
                   className="text-[11.5px] text-white/30 hover:text-white/50 flex items-center gap-1.5 w-fit">
                  View burn tx on Etherscan <Icons.ArrowRight size={10}/>
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
