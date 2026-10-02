'use client';

import { createContext, useContext, ReactNode } from 'react';

interface User {
  id: string;
  username: string;
  name: string;
  roles: string[];
}

interface UserContextValue {
  user: User | null;
  isLoading: boolean;
}

const UserContext = createContext<UserContextValue>({
  user: null,
  isLoading: true,
});

export function UserProvider({ children, user }: { children: ReactNode; user: User | null }) {
  return (
    <UserContext.Provider value={{ user, isLoading: false }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
