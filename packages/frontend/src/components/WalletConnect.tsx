import { ConnectButton, useCurrentAccount } from '@mysten/dapp-kit';
import { useEffect, useState } from 'react';
import api from '../services/api';
import { SuiClient, getFullnodeUrl } from '@mysten/sui.js/client';
import { useAuthStore } from '../stores/authStore';
import { toast } from 'react-hot-toast';

const client = new SuiClient({ url: getFullnodeUrl('testnet') });

export function WalletConnect() {
  const currentAccount = useCurrentAccount();
  const [zkBalance, setZkBalance] = useState<number | null>(null);
  const [externalBalance, setExternalBalance] = useState<number | null>(null);
  const { user, setAuth } = useAuthStore();

  // zkLogin cüzdanı (backend'den)
  const zkLoginAddress = user?.realWalletAddress;
  
  // External wallet (dapp-kit'ten)
  const externalAddress = currentAccount?.address;

  // Sui adresi geçerli mi kontrol et
  const isValidSuiAddress = (addr: string | undefined): boolean => {
    if (!addr) return false;
    return /^0x[a-fA-F0-9]{64}$/.test(addr);
  };

  // External wallet bağlandığında backend'e kaydet
  useEffect(() => {
    const linkExternalWallet = async () => {
      if (!externalAddress || !isValidSuiAddress(externalAddress)) return;
      if (!user) return;
      
      // Zaten aynı external wallet kayıtlıysa tekrar kaydetme
      if (user.externalWalletAddress === externalAddress) return;

      try {
        const response = await api.post('/api/user/link-external-wallet', {
          externalWalletAddress: externalAddress
        });
        
        if (response.data.success) {
          // User state'i güncelle
          const token = localStorage.getItem('token') || '';
          setAuth({ ...user, externalWalletAddress: externalAddress }, token);
          toast.success('🔗 External wallet linked!');
        }
      } catch (err) {
        console.error('Failed to link external wallet:', err);
      }
    };

    linkExternalWallet();
  }, [externalAddress, user]);

  // Fetch zkLogin wallet balance
  useEffect(() => {
    const fetchBalance = async () => {
      if (!zkLoginAddress || !isValidSuiAddress(zkLoginAddress)) {
        setZkBalance(null);
        return;
      }
      try {
        const result = await client.getBalance({ owner: zkLoginAddress });
        const sui = Number(result.totalBalance) / 1_000_000_000;
        setZkBalance(sui);
      } catch (err) {
        console.error('Failed to fetch zkLogin balance:', err);
        setZkBalance(null);
      }
    };

    fetchBalance();
  }, [zkLoginAddress]);

  // Fetch external wallet balance
  useEffect(() => {
    const fetchBalance = async () => {
      if (!externalAddress || !isValidSuiAddress(externalAddress)) {
        setExternalBalance(null);
        return;
      }
      // Eğer zkLogin ile aynıysa tekrar fetch etme
      if (externalAddress === zkLoginAddress) {
        setExternalBalance(null);
        return;
      }
      try {
        const result = await client.getBalance({ owner: externalAddress });
        const sui = Number(result.totalBalance) / 1_000_000_000;
        setExternalBalance(sui);
      } catch (err) {
        console.error('Failed to fetch external balance:', err);
        setExternalBalance(null);
      }
    };

    fetchBalance();
  }, [externalAddress, zkLoginAddress]);

  return (
    <div className="flex items-center gap-4">
      {/* zkLogin Wallet */}
      {zkLoginAddress && (
        <div className="flex flex-col items-end">
          <span className="text-xs text-cyan-400">🪪 zkLogin</span>
          <span className="text-xs text-purple-300 font-mono">
            {zkLoginAddress.slice(0, 6)}...{zkLoginAddress.slice(-4)}
          </span>
          {zkBalance !== null && (
            <span className="text-sm text-purple-400 font-semibold">
              {zkBalance.toFixed(2)} SUI
            </span>
          )}
        </div>
      )}

      {/* External Wallet (farklıysa göster) */}
      {externalAddress && externalAddress !== zkLoginAddress && (
        <div className="flex flex-col items-end border-l border-gray-600 pl-4">
          <span className="text-xs text-green-400">💳 Wallet</span>
          <span className="text-xs text-green-300 font-mono">
            {externalAddress.slice(0, 6)}...{externalAddress.slice(-4)}
          </span>
          {externalBalance !== null && (
            <span className="text-sm text-green-400 font-semibold">
              {externalBalance.toFixed(2)} SUI
            </span>
          )}
        </div>
      )}

      {/* Connect Button */}
      <ConnectButton className="!bg-gradient-to-r !from-purple-600 !to-pink-600 !text-white !px-6 !py-2 !rounded-lg !font-medium hover:!opacity-90 !transition-opacity" />
    </div>
  );
}
