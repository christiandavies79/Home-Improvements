import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';

interface User {
  id: string;
  username: string;
  displayName: string;
  avatarColor: string;
  isAdmin: boolean;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  needsSetup: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string, displayName: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(false);

  const refreshUser = useCallback(async () => {
    try {
      const me = await api.auth.me();
      setUser(me);
      setNeedsSetup(false);
    } catch {
      setUser(null);
      try {
        const status = await api.auth.setupStatus();
        setNeedsSetup(status.needsSetup);
      } catch {
        setNeedsSetup(false);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = async (username: string, password: string) => {
    const result = await api.auth.login({ username, password });
    setUser(result);
    setNeedsSetup(false);
  };

  const register = async (username: string, password: string, displayName: string) => {
    const result = await api.auth.register({ username, password, displayName });
    setUser(result);
    setNeedsSetup(false);
  };

  const logout = async () => {
    await api.auth.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, needsSetup, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
