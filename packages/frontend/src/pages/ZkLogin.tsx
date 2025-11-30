import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { authService } from '../services/authService';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { toast } from 'react-hot-toast';

// Google OAuth Config
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

export default function ZkLogin() {
  const navigate = useNavigate();
  const { user, setAuth } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'info' | 'connecting' | 'success'>('info');
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Wallet zaten bağlıysa popup göster, yoksa direkt yönlendir
  const hasExistingWallet = !!user?.realWalletAddress;

  // Google ID + salt'tan deterministik adres türet
  const deriveAddress = (googleId: string, salt: string): string => {
    // Basit hash ile seed oluştur
    const seed = `${googleId}:${salt}`;
    
    // Seed'den 32 byte array oluştur (basit hash)
    const encoder = new TextEncoder();
    const data = encoder.encode(seed);
    const seedArray = new Uint8Array(32);
    for (let i = 0; i < data.length && i < 32; i++) {
      seedArray[i] = data[i];
    }
    // Kalan bytes'ı doldur
    for (let i = data.length; i < 32; i++) {
      seedArray[i] = data[i % data.length] ^ (i * 7);
    }
    
    // Keypair oluştur
    const keypair = Ed25519Keypair.fromSecretKey(seedArray);
    return keypair.getPublicKey().toSuiAddress();
  };

  // JWT token'dan sub çıkar
  const parseJwt = (token: string) => {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch {
      return null;
    }
  };

  // Google'dan dönen callback'i işle (backend üzerinden)
  useEffect(() => {
    const processCallback = async () => {
      // URL'de google query param var mı kontrol et (backend'den dönen)
      const urlParams = new URLSearchParams(window.location.search);
      const googleData = urlParams.get('google');
      const error = urlParams.get('error');

      if (error) {
        toast.error('Google girişi başarısız');
        return;
      }

      if (!googleData) {
        return;
      }

      // URL'i temizle
      window.history.replaceState(null, '', window.location.pathname);

      setLoading(true);
      setStep('connecting');

      try {
        // Google verilerini parse et
        const google = JSON.parse(decodeURIComponent(googleData));
        const googleId = google.googleId;

        // Salt oluştur veya al
        const salt = localStorage.getItem('zklogin_salt') || generateSalt();

        // Adres türet (googleId + salt)
        const zkAddress = deriveAddress(googleId, salt);

        // Backend'e gönder (stub token ile - backend zaten Google'dan doğruladı)
        const response = await authService.finishZkLogin({
          idToken: 'google-verified', // Backend zaten doğruladı
          address: zkAddress,
        });

        if (response.user) {
          // Kullanıcıyı güncelle
          const token = localStorage.getItem('token') || '';
          setAuth(response.user, token);

          toast.success('🎉 zkLogin cüzdanı başarıyla bağlandı!');
          setStep('success');

          // LocalStorage temizle
          localStorage.removeItem('zklogin_salt');

          setTimeout(() => {
            navigate('/');
          }, 1500);
        }
      } catch (error: any) {
        console.error('zkLogin failed:', error);
        toast.error(error.response?.data?.error || 'zkLogin başarısız');
        setLoading(false);
        setStep('info');
      }
    };

    processCallback();
  }, [navigate, setAuth]);

  // Zaten cüzdanı varsa popup göster veya ana sayfaya yönlendir
  useEffect(() => {
    // Eğer callback'ten dönüyorsa (connecting veya success) devam et
    if (step === 'connecting' || step === 'success') return;
    
    // URL'de google data yoksa ve wallet varsa
    const urlParams = new URLSearchParams(window.location.search);
    const hasGoogleData = urlParams.get('google');
    
    if (hasGoogleData) {
      // Callback'ten dönüyor, işleme devam et
      return;
    }
    
    if (user?.realWalletAddress) {
      // Wallet var, popup göster
      setShowConfirmModal(true);
    } else {
      // Wallet yok, direkt Google'a yönlendir (popup yok)
      const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      window.location.href = `${backendUrl}/api/auth/google`;
    }
  }, [user, step]);

  // Salt oluştur (basit versiyon)
  const generateSalt = () => {
    return Math.floor(Math.random() * 2 ** 32).toString();
  };

  // Google OAuth başlat - Backend üzerinden
  const handleGoogleLogin = () => {
    // Eğer wallet varsa ve modal gösteriliyorsa, modal'dan geçti demektir
    // Direkt devam et
    setShowConfirmModal(false);
    
    // Backend'in Google OAuth endpoint'ine yönlendir
    const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    window.location.href = `${backendUrl}/api/auth/google`;
  };

  // Modal'dan vazgeç
  const handleCancelChange = () => {
    setShowConfirmModal(false);
    navigate('/');
  };

  // Dev mode: Test için stub kullan
  const handleDevMode = async () => {
    setLoading(true);
    try {
      // Rastgele bir adres oluştur
      const keypair = Ed25519Keypair.generate();
      const address = keypair.getPublicKey().toSuiAddress();

      // Backend'e stub token ile gönder
      const response = await authService.finishZkLogin({
        idToken: 'stub',
        address,
      });

      if (response.user) {
        const token = localStorage.getItem('token') || '';
        setAuth(response.user, token);

        toast.success('🎉 Test cüzdanı bağlandı!');
        setTimeout(() => navigate('/'), 1000);
      }
    } catch (error: any) {
      console.error('Dev zkLogin failed:', error);
      toast.error(error.response?.data?.error || 'Test modu başarısız');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
      
      {/* Confirm Modal - Wallet zaten varsa göster */}
      {showConfirmModal && hasExistingWallet && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 border border-purple-500/50 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div className="text-center mb-6">
              <div className="text-5xl mb-4">⚠️</div>
              <h2 className="text-xl font-bold text-white mb-2">Cüzdan Zaten Bağlı</h2>
              <p className="text-gray-400 text-sm">
                Hesabınızda zaten bir zkLogin cüzdanı bağlı:
              </p>
              <p className="text-purple-400 font-mono text-sm mt-2 bg-purple-900/30 py-2 px-3 rounded-lg">
                {user?.realWalletAddress?.slice(0, 12)}...{user?.realWalletAddress?.slice(-8)}
              </p>
            </div>
            
            <p className="text-yellow-400 text-xs text-center mb-6 p-3 bg-yellow-900/20 border border-yellow-500/30 rounded-lg">
              ⚠️ Yeni bir Google hesabı ile bağlanırsanız, mevcut cüzdanınız değiştirilecek ve eski cüzdandaki varlıklara erişemeyeceksiniz!
            </p>

            <div className="flex gap-3">
              <button
                onClick={handleCancelChange}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-medium py-3 px-4 rounded-xl transition"
              >
                Vazgeç
              </button>
              <button
                onClick={handleGoogleLogin}
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-medium py-3 px-4 rounded-xl transition"
              >
                Yine de Değiştir
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-md w-full mx-4">
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-8 shadow-2xl">

          {/* Header */}
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">🪪</div>
            <h1 className="text-2xl font-bold text-white mb-2">
              zkLogin Cüzdan Bağla
            </h1>
            <p className="text-gray-400 text-sm">
              Google hesabınız ile blockchain cüzdanı oluşturun
            </p>
          </div>

          {/* Steps */}
          <div className="mb-8 space-y-3">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-green-500/20 border border-green-500/50">
              <span className="text-xl">✅</span>
              <div>
                <p className="text-white font-medium text-sm">42 Intra ile giriş yapıldı</p>
                <p className="text-gray-400 text-xs">{user?.email}</p>
              </div>
            </div>

            <div className={`flex items-center gap-3 p-3 rounded-lg ${
              step === 'info' ? 'bg-white/5 border border-white/10' :
              step === 'connecting' ? 'bg-yellow-500/20 border border-yellow-500/50 animate-pulse' :
              'bg-green-500/20 border border-green-500/50'
            }`}>
              <span className="text-xl">{step === 'success' ? '✅' : '🔐'}</span>
              <div>
                <p className="text-white font-medium text-sm">
                  {step === 'connecting' ? 'Google ile bağlanıyor...' :
                   step === 'success' ? 'Cüzdan bağlandı!' :
                   'Google ile zkLogin cüzdanı bağla'}
                </p>
                {step === 'success' && user?.realWalletAddress && (
                  <p className="text-gray-400 text-xs font-mono">
                    {user.realWalletAddress.slice(0, 10)}...{user.realWalletAddress.slice(-6)}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          {step === 'info' && (
            <div className="space-y-3">
              <button
                onClick={handleGoogleLogin}
                disabled={loading || !GOOGLE_CLIENT_ID}
                className="w-full bg-white hover:bg-gray-100 text-gray-800 font-semibold py-3 px-6 rounded-xl flex items-center justify-center gap-3 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Google ile Bağlan
              </button>

              {!GOOGLE_CLIENT_ID && (
                <p className="text-yellow-400 text-xs text-center">
                  ⚠️ Google Client ID ayarlanmamış
                </p>
              )}

              {/* Dev mode button */}
              {import.meta.env.DEV && (
                <button
                  onClick={handleDevMode}
                  disabled={loading}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-xl text-sm transition disabled:opacity-50"
                >
                  🧪 Test Modu (Dev Only)
                </button>
              )}
            </div>
          )}

          {step === 'connecting' && (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-cyan-500 mx-auto mb-4"></div>
              <p className="text-gray-400 text-sm">Google hesabınızla bağlanılıyor...</p>
            </div>
          )}

          {step === 'success' && (
            <div className="text-center py-4">
              <div className="text-5xl mb-4">🎉</div>
              <p className="text-green-400 font-medium">Cüzdan başarıyla bağlandı!</p>
              <p className="text-gray-400 text-sm mt-2">Ana sayfaya yönlendiriliyorsunuz...</p>
            </div>
          )}

          {/* Info */}
          <div className="mt-6 p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg">
            <p className="text-blue-300 text-xs leading-relaxed">
              <strong>zkLogin Nedir?</strong><br/>
              Google hesabınızı kullanarak Sui blockchain'de cüzdan oluşturmanızı sağlar.
              Özel anahtar yönetimi gerektirmez, Google girişiniz cüzdanınızdır.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
