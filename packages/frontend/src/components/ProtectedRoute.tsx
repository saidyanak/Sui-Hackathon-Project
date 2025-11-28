import { useAuthStore } from "../stores/authStore";
import { useRouter } from "next/router";
import { useEffect } from "react";

export default function ProtectedRoute({ children }: any) {
  const { token } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!token) {
      router.push("/Login");
    }
  }, [token]);

  return token ? children : null;
}
