import { useState, useEffect, useCallback } from 'react';
import type { User } from '@oralai/shared';

interface AuthState {
  token: string | null;
  user: User | null;
}

// Module-level in-memory state shared across all components (never written to localStorage)
let globalAuthState: AuthState = {
  token: null,
  user: null,
};

const listeners = new Set<(state: AuthState) => void>();

function setGlobalAuthState(newState: AuthState) {
  globalAuthState = newState;
  listeners.forEach((listener) => listener(globalAuthState));
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>(globalAuthState);

  useEffect(() => {
    listeners.add(setAuthState);
    return () => {
      listeners.delete(setAuthState);
    };
  }, []);

  const login = useCallback((token: string, user: User) => {
    setGlobalAuthState({ token, user });
  }, []);

  const logout = useCallback(() => {
    setGlobalAuthState({ token: null, user: null });
  }, []);

  return {
    token: authState.token,
    user: authState.user,
    login,
    logout,
    isAuthenticated: !!authState.token,
  };
}
