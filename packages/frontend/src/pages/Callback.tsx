import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { authService } from '../services/authService';
import api from '../services/api';

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
        // Temporarily set token to make API call
        localStorage.setItem('token', token);

        const response = await authService.getCurrentUser();

        // Eğer profileId yoksa otomatik oluştur
        if (!response.user.profileId) {
          try {
            const profileResponse = await api.post('/api/profiles/create-sponsored');
            if (profileResponse.data.success && profileResponse.data.profileId) {
              // ProfileId'yi localStorage'a kaydet
              localStorage.setItem('userProfileId', profileResponse.data.profileId);
              // User objesini güncelle
              response.user.profileId = profileResponse.data.profileId;
            }
          } catch (profileError) {
            console.error('Failed to create profile:', profileError);
            // Profil oluşturulamasa bile devam et, kullanıcı daha sonra oluşturabilir
          }
        } else {
          // ProfileId varsa localStorage'a kaydet
          localStorage.setItem('userProfileId', response.user.profileId);
        }

        setAuth(response.user, token);
        navigate('/');
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
        <p className="text-white text-xl">Giriş yapılıyor...</p>
      </div>
    </div>
  );
}
