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

  // zkLogin cüzdanı veya bağlı cüzdan
  const walletAddress = user?.realWalletAddress || currentAccount?.address;

  // Sui adresi geçerli mi kontrol et (0x ile başlamalı, 66 karakter olmalı)
  const isValidSuiAddress = (addr: string | undefined): boolean => {
    if (!addr) return false;
    return /^0x[a-fA-F0-9]{64}$/.test(addr);
  };

  // zkLogin cüzdanı sabit - harici cüzdan bağlansa bile değişmez
  // (Harici cüzdan backend'e kaydedilmez)

  // Fetch SUI balance
  useEffect(() => {
    const fetchBalance = async () => {
      if (!walletAddress || !isValidSuiAddress(walletAddress)) {
        setBalance(null);
        return;
      }
      try {
        const result = await client.getBalance({ owner: walletAddress });
        const sui = Number(result.totalBalance) / 1_000_000_000;
        setBalance(sui);
      } catch (err) {
        console.error('Failed to fetch balance:', err);
        setBalance(null);
      }
    };

    fetchBalance();
  }, [walletAddress]);

  return (
    <div className="flex items-center gap-4">
      {/* zkLogin Wallet - Tek cüzdan gösterimi */}
      {walletAddress && (
        <div className="flex flex-col items-end">
          <span className="text-xs text-cyan-400">🪪 zkLogin</span>
          <span className="text-xs text-purple-300 font-mono">
            {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
          </span>
          {balance !== null && (
            <span className="text-sm text-purple-400 font-semibold">
              {balance.toFixed(2)} SUI
            </span>
          )}
        </div>
      )}

      {/* Connect Button - dapp-kit ile harici cüzdan bağlama */}
      <ConnectButton className="!bg-gradient-to-r !from-purple-600 !to-pink-600 !text-white !px-6 !py-2 !rounded-lg !font-medium hover:!opacity-90 !transition-opacity" />
    </div>
  );
}
