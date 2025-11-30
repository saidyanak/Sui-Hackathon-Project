import { useNavigate } from 'react-router-dom';

export default function Login() {
  const API_URL = (import.meta as any).env?.VITE_API_URL || "http://localhost:3000";
  const navigate = useNavigate();

  const loginWith42 = () => {
    window.location.href = `${API_URL}/api/auth/42/login`;
  };

  return (
    <div className="min-h-screen w-full grid grid-cols-1 md:grid-cols-2 text-white">

      {/* LEFT SIDE */}
      <div className="flex flex-col justify-center px-12 bg-gradient-to-br from-[#0A1A2F] via-[#0C2238] to-[#0A1A2F]">
        <h1 className="text-5xl font-bold mb-6 text-[#2AA5FE]">
          42 Community Platform
        </h1>

        <p className="text-lg text-gray-300 leading-relaxed max-w-md">
          A next-generation task, community and digital identity platform  
          built on the Sui Blockchain for the 42 community.
          <br /><br />
          On-chain verification, NFT badges, transparent task history and much more.
        </p>

        <div className="mt-8 text-sm text-gray-400">
          <span>Secure and decentralized infrastructure powered by Sui.</span>
        </div>

      </div>

      {/* RIGHT SIDE */}
      <div className="flex items-center justify-center bg-gradient-to-br from-[#071018] via-[#0A1A2F] to-[#071018] p-8">
        <div className="w-full max-w-md bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-10 shadow-2xl">

          <h2 className="text-3xl font-bold text-center text-[#8BD7FF] mb-4">
            Sign In
          </h2>

          {/* Info Box */}
          <div className="mb-6 p-4 bg-purple-900 bg-opacity-30 border border-purple-400 rounded-lg">
            <div className="flex items-start gap-3">
              <span className="text-2xl">🔐</span>
              <div className="flex-1">
                <p className="text-xs text-purple-200 font-semibold mb-1">How It Works</p>
                <p className="text-xs text-purple-300 leading-relaxed">
                  1. Sign in with 42 Intra<br/>
                  2. Connect your zkLogin wallet with Google<br/>
                  3. Create tasks on-chain and earn NFTs!
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <button 
              onClick={loginWith42} 
              className="w-full bg-gradient-to-r from-[#00BABC] to-[#2AA5FE] hover:opacity-90 text-white px-6 py-4 rounded-xl text-lg font-semibold shadow-lg flex items-center justify-center gap-3 transition-all"
            >
              <span className="text-2xl">🎓</span>
              Sign in with 42 Intra
            </button>
          </div>

          <p className="text-center text-gray-400 text-xs mt-6">
            By signing in, you agree to the terms of use.
          </p>
        </div>
      </div>
    </div>
  );
}
