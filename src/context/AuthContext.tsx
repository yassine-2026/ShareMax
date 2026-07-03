import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';

type User = {
  id: string;
  email: string;
  name: string;
  picture: string;
};

type AuthState = {
  isConfigured: boolean;
  isAuthenticated: boolean;
  user: User | null;
  isLoading: boolean;
};

interface AuthContextType extends AuthState {
  checkAuth: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({
    isConfigured: false,
    isAuthenticated: false,
    user: null,
    isLoading: true,
  });

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/auth/status', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setAuthState({
          isConfigured: data.configured,
          isAuthenticated: data.authenticated,
          user: data.user,
          isLoading: false,
        });
      } else {
        setAuthState((prev) => ({ ...prev, isLoading: false }));
      }
    } catch (error) {
      console.error('Failed to check auth status', error);
      setAuthState((prev) => ({ ...prev, isLoading: false }));
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
      await checkAuth();
      window.location.href = '/';
    } catch (error) {
      console.error('Failed to logout', error);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  return (
    <AuthContext.Provider value={{ ...authState, checkAuth, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
