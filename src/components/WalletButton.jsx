// WalletButton.jsx — wallet connect / account display
// Uses RainbowKit's ConnectButton.Custom so we can style it to match MiraRoute.
// Shows "Connect Wallet" when disconnected, address + balance when connected.

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useBalance, useAccount } from "wagmi";

export default function WalletButton() {
  const { address } = useAccount();

  const { data: balance } = useBalance({ address });

  return (
    <ConnectButton.Custom>
      {({ account, chain, openAccountModal, openConnectModal, mounted }) => {
        const ready = mounted;
        const connected = ready && account && chain;

        return (
          <div
            {...(!ready && {
              "aria-hidden": true,
              style: { opacity: 0, pointerEvents: "none", userSelect: "none" },
            })}
          >
            {!connected ? (
              // ── Disconnected: show connect button ────────────────────────
              <button
                onClick={openConnectModal}
                className="btn-primary px-5 py-2.5 text-sm"
              >
                Connect Wallet
              </button>
            ) : (
              // ── Connected: show balance + address pill ───────────────────
              <div className="flex items-center gap-3">

                {balance && (
                  <span className="hidden sm:block text-white/50 text-sm font-medium">
                    {parseFloat(balance.formatted).toFixed(4)}{" "}
                    <span className="text-teal-400">USDC</span>
                  </span>
                )}

                <button
                  onClick={openAccountModal}
                  className="flex items-center gap-2
                             bg-surface hover:bg-surface-hover
                             border border-surface-border
                             rounded-2xl px-4 py-2 text-sm font-medium
                             text-white transition-colors duration-200"
                >
                  <span className="w-2 h-2 rounded-full bg-teal-400 flex-shrink-0" />
                  {account.displayName}
                </button>

              </div>
            )}
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
}
