import { ConnectButton, useCurrentAccount } from '@mysten/dapp-kit';
import { useEffect, useState } from 'react';
import api from '../services/api';
import { SuiClient, getFullnodeUrl } from '@mysten/sui.js/client';
import { useAuthStore } from '../stores/authStore';

const client = new SuiClient({ url: getFullnodeUrl('testnet') });

export function WalletConnect() {
  const currentAccount = useCurrentAccount();
  const [balance, setBalance] = useState<number | null>(null);
  const { user } = useAuthStore();

  const realWalletAddress = currentAccount?.address;

  // Save real wallet address to backend (separate from virtual wallet)
  useEffect(() => {
    if (realWalletAddress) {
      api.post('/api/user/wallet', { walletAddress: realWalletAddress })
        .then(() => {
          console.log('✅ Real wallet saved:', realWalletAddress);
        })
        .catch((error) => {
          console.error('Failed to save real wallet address:', error);
        });
    }
  }, [realWalletAddress]);

  // Fetch SUI balance from real wallet
  useEffect(() => {
    const fetchBalance = async () => {
      if (!realWalletAddress) return;
      try {
        const result = await client.getBalance({ owner: realWalletAddress });
        const sui = Number(result.totalBalance) / 1_000_000_000; // mist → SUI
        setBalance(sui);
      } catch (err) {
        console.error('Failed to fetch balance:', err);
      }
    };

    fetchBalance();
  }, [realWalletAddress]);

  return (
    <div className="flex items-center gap-4">
      {/* Virtual Wallet Info - Always shown when logged in */}
      {user && (
        <div className="flex flex-col items-end mr-2">
          <span className="text-xs text-gray-400">Virtual Wallet</span>
          <span className="text-xs text-purple-300 font-mono">
            {user.suiWalletAddress ? `${user.suiWalletAddress.slice(0, 6)}...${user.suiWalletAddress.slice(-4)}` : 'N/A'}
          </span>
        </div>
      )}

      {/* Real Wallet Info - Only shown when wallet is connected */}
      {realWalletAddress && (
        <div className="flex flex-col items-end">
          <span className="text-xs text-green-400">Real Wallet 💎</span>
          <span className="text-sm text-purple-400 font-semibold">
            {balance !== null ? `${balance.toFixed(2)} SUI` : 'Yükleniyor...'}
          </span>
        </div>
      )}

      {/* Connect Button */}
      <ConnectButton className="!bg-gradient-to-r !from-purple-600 !to-pink-600 !text-white !px-6 !py-2 !rounded-lg !font-medium hover:!opacity-90 !transition-opacity" />
    </div>
  );
}
