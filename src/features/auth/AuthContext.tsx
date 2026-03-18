import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import {
  apiClient,
  ApiClientError,
  setAuthTokenProvider,
  setUnauthorizedHandler,
} from "@/shared/api";

interface AuthUser {
  email: string;
  groups: string[];
}

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const TOKEN_KEY = "hw_admin_token";
const USER_KEY = "hw_admin_user";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem(USER_KEY);
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        localStorage.removeItem(USER_KEY);
        localStorage.removeItem(TOKEN_KEY);
      }
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    setAuthTokenProvider(async () => localStorage.getItem(TOKEN_KEY));
  }, []);

  const signOut = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setUser(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      // Expired/invalid token: drop local session so ProtectedRoute redirects to login.
      signOut();
    });
  }, [signOut]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      // In production, this calls Cognito via Amplify Auth.
      // For MVP dev, we accept a hardcoded admin credential or delegate to Cognito.
      // This stub simulates the flow structure.
      const data = await apiClient
        .post<{ token: string; user: AuthUser }>("/auth/login", {
          email,
          password,
        })
        .catch((err) => {
          if (err instanceof ApiClientError) {
            throw new Error("Invalid credentials");
          }
          throw err;
        });
      localStorage.setItem(TOKEN_KEY, data.token);
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      setUser(data.user);
    },
    [],
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
