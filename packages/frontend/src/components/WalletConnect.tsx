import { ConnectButton, useCurrentAccount } from '@mysten/dapp-kit';
import { useEffect } from 'react';
import api from '../services/api';

export function WalletConnect() {
  const currentAccount = useCurrentAccount();

  useEffect(() => {
    // When wallet is connected, save address to backend
    if (currentAccount?.address) {
      api.post('/api/user/wallet', {
        walletAddress: currentAccount.address,
      }).catch((error) => {
        console.error('Failed to save wallet address:', error);
      });
    }
  }, [currentAccount?.address]);

  return (
    <div className="flex items-center gap-4">
      {currentAccount && (
        <div className="flex flex-col items-end">
          <span className="text-sm text-gray-400">Sui Wallet</span>
          <span className="text-xs text-purple-400 font-mono">
            {currentAccount.address.slice(0, 6)}...{currentAccount.address.slice(-4)}
          </span>
        </div>
      )}
      <ConnectButton className="!bg-gradient-to-r !from-purple-600 !to-pink-600 !text-white !px-6 !py-2 !rounded-lg !font-medium hover:!opacity-90 !transition-opacity" />
    </div>
  );
}
