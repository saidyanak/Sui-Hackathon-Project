import { useAuthStore } from "../stores/authStore";

export const useAuth = () => {
  const { token, setToken, logout } = useAuthStore();
  return { token, setToken, logout };
};
