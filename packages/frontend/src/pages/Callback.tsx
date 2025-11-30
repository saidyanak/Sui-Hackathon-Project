import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { authService } from '../services/authService';

export default function Callback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const setAuth = useAuthStore((state) => state.setAuth);

  useEffect(() => {
    const token = searchParams.get('token');
    const error = searchParams.get('error');

    if (error) {
      console.error('Auth error:', error);
      navigate('/login?error=' + error);
      return;
    }

    if (!token) {
      navigate('/login');
      return;
    }

    // Save token and fetch user data
    const fetchUser = async () => {
      try {
        // Store token for API requests
        localStorage.setItem('token', token);

        const response = await authService.getCurrentUser();
        const user = response.user;

        // Save profile ID if available
        if (user.profileId) {
          localStorage.setItem('userProfileId', user.profileId);
        }

        setAuth(user, token);

        // Check if zkLogin wallet is connected
        if (!user.realWalletAddress) {
          // Redirect to zkLogin setup
          navigate('/zklogin');
        } else {
          // Wallet exists → redirect to homepage
          navigate('/');
        }
      } catch (error) {
        console.error('Failed to fetch user:', error);
        localStorage.removeItem('token');
        navigate('/login?error=fetch_failed');
      }
    };

    fetchUser();
  }, [searchParams, navigate, setAuth]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-purple-500 mx-auto mb-4"></div>
        <p className="text-white text-xl">Signing you in...</p>
      </div>
    </div>
  );
}
