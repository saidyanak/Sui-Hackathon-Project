export default function Login() {
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

  const loginWith42 = () => {
    window.location.href = `${API_URL}/api/auth/42/login`;
  };

  const loginWithGoogle = () => {
    window.location.href = `${API_URL}/api/auth/google/login`;
  };

  return (
    <div className="min-h-screen w-full grid grid-cols-1 md:grid-cols-2 text-white">

      {/* LEFT SIDE */}
      <div className="flex flex-col justify-center px-12 bg-gradient-to-br from-[#0A1A2F] via-[#0C2238] to-[#0A1A2F]">
        <h1 className="text-5xl font-bold mb-6 text-[#2AA5FE]">
          42 Community Platform
        </h1>

        <p className="text-lg text-gray-300 leading-relaxed max-w-md">
          42 topluluğu için Sui Blockchain üzerine kurulmuş yeni nesil görev,
          topluluk ve dijital kimlik platformu.
          <br /><br />
          Zincir üstü doğrulama, NFT rozetler, şeffaf görev kayıtları ve daha fazlası.
        </p>

        <div className="mt-8 text-sm text-gray-400">
          <span>Sui ile güvenli ve merkeziyetsiz altyapı.</span>
        </div>
        <div className="text-sm text-gray-400">
          <span>Powered by Sui.</span>
        </div>

      </div>

      {/* RIGHT SIDE */}
      <div className="flex items-center justify-center bg-gradient-to-br from-[#071018] via-[#0A1A2F] to-[#071018] p-8">
        <div className="w-full max-w-md bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-10 shadow-2xl">

          <h2 className="text-3xl font-bold text-center text-[#8BD7FF] mb-6">
            Giriş Yap
          </h2>

          <div className="space-y-4">

            <button
              onClick={loginWith42}
              className="w-full bg-black hover:bg-[#111] text-white px-6 py-4 rounded-xl text-lg font-semibold shadow-lg flex items-center justify-center gap-3 transition-all border border-gray-700"
            >
              <img 
                src="https://profile.intra.42.fr/assets/42_logo-7dfc9110a5319a308863b96bda33cea995046d1731cebb735e41b16255106c12.svg" 
                alt="42 Logo" 
                className="w-7 h-7"
              />
              Intra ile Giriş Yap
            </button>


            {/* GOOGLE LOGIN BUTTON */}
            <button
              onClick={loginWithGoogle}
              className="w-full bg-white hover:bg-gray-100 text-gray-800 px-6 py-4 rounded-xl text-lg font-semibold shadow-lg flex items-center justify-center gap-3 transition-all"
            >
              {/* Google Logo SVG */}
              <svg className="w-6 h-6" viewBox="0 0 533.5 544.3">
                <path fill="#4285F4" d="M533.5 278.4c0-17.4-1.6-34.1-4.7-50.3H272v95.1h147.3c-6.4 34.5-25.7 63.7-54.8 83.2v68.9h88.6c51.9-47.8 80.4-118.2 80.4-196.9z"/>
                <path fill="#34A853" d="M272 544.3c73.7 0 135.6-24.3 180.8-65.9l-88.6-68.9c-24.6 16.5-56.1 26.4-92.3 26.4-70.9 0-131-47.9-152.6-112.3H26.2v70.6C71 486.6 164.7 544.3 272 544.3z"/>
                <path fill="#FBBC05" d="M119.4 323.6c-5.8-17.4-9.1-36-9.1-55.6s3.3-38.3 9.1-55.6V141.8H26.2C9.4 176.6 0 217.1 0 268c0 50.9 9.4 91.4 26.2 126.2l93.2-70.6z"/>
                <path fill="#EA4335" d="M272 107.7c40.1 0 76.1 13.8 104.5 40.8l78.2-78.2C408 24.3 345.7 0 272 0 164.7 0 71 57.7 26.2 141.8l93.2 70.6C141 155.6 201.1 107.7 272 107.7z"/>
              </svg>

              Google ile Giriş Yap
            </button>

          </div>

          <p className="text-center text-gray-400 text-xs mt-6">
            Giriş yaparak kullanım şartlarını kabul etmiş olursunuz.
          </p>
        </div>
      </div>
    </div>
  );
}
