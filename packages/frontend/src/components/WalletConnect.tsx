import { ConnectButton, useCurrentAccount } from '@mysten/dapp-kit';
import { useEffect, useState } from 'react';
import api from '../services/api';
import { SuiClient, getFullnodeUrl } from '@mysten/sui.js/client';

const client = new SuiClient({ url: getFullnodeUrl('testnet') });

export function WalletConnect() {
  const currentAccount = useCurrentAccount();
  const [balance, setBalance] = useState<number | null>(null);

  const address = currentAccount?.address;

  // Save wallet address to backend
  useEffect(() => {
    if (address) {
      api.post('/api/user/wallet', { walletAddress: address }).catch((error) => {
        console.error('Failed to save wallet address:', error);
      });
    }
  }, [address]);

  // Fetch SUI balance
  useEffect(() => {
    const fetchBalance = async () => {
      if (!address) return;
      try {
        const result = await client.getBalance({ owner: address });
        const sui = Number(result.totalBalance) / 1_000_000_000; // mist → SUI
        setBalance(sui);
      } catch (err) {
        console.error('Failed to fetch balance:', err);
      }
    };

    fetchBalance();
  }, [address]);

  return (
    <div className="flex items-center gap-4">
      {address && (
        <div className="flex flex-col items-end">
          {/* Bakiye gösterimi */}
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
