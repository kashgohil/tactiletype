import api, { testResultsApi } from '@/services/api';
import { mergeGuestResults } from '@/utils/guestResults';
import type { AuthResponse, User } from '@tactile/types';
import axios from 'axios';
import React, { useEffect, useState } from 'react';
import { AuthContext, type AuthContextType } from './context';

interface AuthProviderProps {
  children: React.ReactNode;
}

function getApiErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;
    if (
      data &&
      typeof data === 'object' &&
      'error' in data &&
      typeof (data as { error: unknown }).error === 'string'
    ) {
      return (data as { error: string }).error;
    }
  }
  if (error instanceof Error) return error.message;
  return fallback;
}

async function tryMergeGuestResults() {
  try {
    const result = await mergeGuestResults((data) =>
      testResultsApi.submit(data)
    );
    if (result.succeeded > 0) {
      console.log(
        `Merged ${result.succeeded}/${result.attempted} guest result(s)` +
          (result.remaining
            ? ` (${result.remaining} remaining for next login)`
            : '')
      );
    }
  } catch (err) {
    console.error('Guest result merge failed:', err);
  }
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  /** Resolves true when the session is live, false when it has genuinely ended. */
  const verifyToken = React.useCallback(async (token: string) => {
    try {
      const response = await api.get('/api/auth/me', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = response.data;
      setUser(data.user);

      // The API slides the session forward on every verify, so keeping the
      // returned token is what makes a returning user stay logged in
      // indefinitely. Dropping it here would reinstate a fixed expiry.
      if (data.token) {
        setToken(data.token);
        localStorage.setItem('auth_token', data.token);
      }
      return true;
    } catch (error) {
      // Only the server explicitly rejecting the token ends the session. This
      // used to discard the token on *any* failure, so an offline moment, a
      // 5xx, or an API restart mid-request destroyed a valid 30-day session and
      // read to the user as being logged out for no reason. Anything else is
      // treated as transient: keep the token and let the next load try again.
      const status = axios.isAxiosError(error)
        ? error.response?.status
        : undefined;

      if (status === 401 || status === 403) {
        localStorage.removeItem('auth_token');
        setToken(null);
        setUser(null);
        return false;
      }

      console.warn(
        'Could not reach the API to verify the session; keeping it for the next attempt.',
        error
      );
      return false;
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
      // Axios post(url, body) — send fields at top level, not under `data`
      const response = await api.post('/api/auth/login', { email, password });

      const data: AuthResponse = response.data;

      setUser(data.user);
      setToken(data.token);
      localStorage.setItem('auth_token', data.token);
      await tryMergeGuestResults();
    } catch (error) {
      console.error('Login error:', error);
      throw new Error(getApiErrorMessage(error, 'Login failed'));
    }
  };

  const register = React.useCallback(
    async (email: string, username: string, password: string) => {
      try {
        // Axios post(url, body) — send fields at top level, not under `data`
        const response = await api.post('/api/auth/register', {
          email,
          username,
          password,
        });

        const data: AuthResponse = response.data;

        setUser(data.user);
        setToken(data.token);
        localStorage.setItem('auth_token', data.token);
        await tryMergeGuestResults();
      } catch (error) {
        console.error('Registration error:', error);
        throw new Error(getApiErrorMessage(error, 'Registration failed'));
      }
    },
    []
  );

  const logout = React.useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('auth_token');
  }, []);

  // Bumps the user's token generation server-side, which invalidates every
  // token they hold — this device included.
  const logoutEverywhere = React.useCallback(async () => {
    try {
      await api.post('/api/auth/logout-all');
    } finally {
      logout();
    }
  }, [logout]);

  const handleOAuthCallback = React.useCallback(
    async (token: string) => {
      try {
        setToken(token);
        localStorage.setItem('auth_token', token);

        // verifyToken no longer throws, so its verdict has to be read from the
        // return value — otherwise a failed callback lands on the app looking
        // signed in, with no user.
        if (!(await verifyToken(token))) {
          throw new Error('Could not complete sign in. Please try again.');
        }
        await tryMergeGuestResults();
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
    logoutEverywhere,
    handleOAuthCallback,
    isLoading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
