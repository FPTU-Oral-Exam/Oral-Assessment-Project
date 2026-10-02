import { useState, useCallback } from 'react';
import type { User } from '@oralai/shared';

interface AuthState {
  token: string | null;
  user: User | null;
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>(() => {
    // Token is stored in MEMORY only - NOT localStorage (security requirement)
    return { token: null, user: null };
  });

  const login = useCallback((token: string, user: User) => {
    setAuthState({ token, user });
  }, []);

  const logout = useCallback(() => {
    // Clear token from memory
    setAuthState({ token: null, user: null });
  }, []);

  return {
    token: authState.token,
    user: authState.user,
    login,
    logout,
    isAuthenticated: !!authState.token,
  };
}
