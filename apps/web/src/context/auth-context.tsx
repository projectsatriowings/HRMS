'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { AuthUserResponse } from '@hrms/shared-types';
import { authApi, ApiError } from '../lib/api';

interface AuthContextType {
  user: AuthUserResponse | null;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string, companyId?: string) => Promise<void>;
  logout: () => Promise<void>;
  switchCompany: (companyId: string) => Promise<void>;
  refreshUser: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUserResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const refreshUser = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const profile = await authApi.getMe();
      setUser(profile);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setUser(null);
      } else {
        setUser(null);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = async (email: string, password: string, companyId?: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await authApi.login({ email, password, companyId });
      setUser(response.user);
    } catch (err: any) {
      const msg = err.message || 'Login failed. Please check your credentials.';
      setError(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      setIsLoading(true);
      await authApi.logout();
    } catch {
      // Continue clearing local state regardless of server logout error
    } finally {
      setUser(null);
      setIsLoading(false);
    }
  };

  const switchCompany = async (companyId: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await authApi.switchCompany(companyId);
      setUser(response.user);
    } catch (err: any) {
      const msg = err.message || 'Failed to switch company context.';
      setError(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const clearError = () => setError(null);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        error,
        login,
        logout,
        switchCompany,
        refreshUser,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
