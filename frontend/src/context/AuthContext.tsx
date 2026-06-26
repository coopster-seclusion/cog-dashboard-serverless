import { createContext, useContext } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

export interface AuthUser {
  email: string;
  name: string | null;
  picture: string | null;
}

async function fetchMe(): Promise<AuthUser | null> {
  // Same-origin in dev (Vite proxies /api) and prod (SPA served by the API),
  // so the session cookie is sent automatically.
  const res = await fetch("/api/auth/me");
  if (res.status === 401) return null; // not signed in — expected, not an error
  if (!res.ok) throw new Error(`Auth check failed: ${res.status}`);
  return res.json();
}

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["auth-me"],
    queryFn: fetchMe,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    // Drop the dashboard's cached (now-unauthorized) data and re-check auth.
    queryClient.clear();
    await queryClient.invalidateQueries({ queryKey: ["auth-me"] });
  }

  return (
    <AuthContext.Provider
      value={{
        user: data ?? null,
        isLoading,
        isAuthenticated: !!data,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
