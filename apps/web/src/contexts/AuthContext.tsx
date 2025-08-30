import api from '@/services/api';
import type { AuthResponse, User } from '@tactile/types';
import React, { useEffect, useState } from 'react';
import { AuthContext, type AuthContextType } from './context';

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const verifyToken = React.useCallback(async (token: string) => {
    try {
      const response = await api.get('/api/auth/me', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.data;
      setUser(data.user);
    } catch (error) {
      console.error('Token verification failed:', error);
      localStorage.removeItem('auth_token');
      setToken(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Check for stored token on mount
    const storedToken = localStorage.getItem('auth_token');
    if (storedToken) {
      setToken(storedToken);
      // Verify token and get user info
      verifyToken(storedToken);
    } else {
      setIsLoading(false);
    }
  }, [verifyToken]);

  const login = async (email: string, password: string) => {
    try {
      const response = await api.post('/api/auth/login', {
        data: { email, password },
      });

      const data: AuthResponse = await response.data;

      setUser(data.user);
      setToken(data.token);
      localStorage.setItem('auth_token', data.token);
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const register = React.useCallback(
    async (email: string, username: string, password: string) => {
      try {
        const response = await api.post('/api/auth/register', {
          data: { email, username, password },
        });

        const data: AuthResponse = await response.data;

        setUser(data.user);
        setToken(data.token);
        localStorage.setItem('auth_token', data.token);
      } catch (error) {
        console.error('Registration error:', error);
        throw error;
      }
    },
    []
  );

  const logout = React.useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('auth_token');
  }, []);

  const handleOAuthCallback = React.useCallback(
    async (token: string) => {
      try {
        setToken(token);
        localStorage.setItem('auth_token', token);

        // Verify token and get user info
        await verifyToken(token);
      } catch (error) {
        console.error('OAuth callback handling failed:', error);
        localStorage.removeItem('auth_token');
        setToken(null);
        throw error;
      }
    },
    [verifyToken]
  );

  const value: AuthContextType = {
    user,
    token,
    login,
    register,
    logout,
    handleOAuthCallback,
    isLoading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
