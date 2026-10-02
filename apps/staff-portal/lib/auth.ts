import { cookies } from 'next/headers';

export interface User {
  id: string;
  username: string;
  name: string;
  roles: string[];
}

export async function getUser(): Promise<User | null> {
  const cookieStore = await cookies();
  const userCookie = cookieStore.get('user');

  if (!userCookie) return null;

  try {
    return JSON.parse(decodeURIComponent(userCookie.value));
  } catch {
    return null;
  }
}

export async function requireUser(): Promise<User> {
  const user = await getUser();
  if (!user) {
    throw new Error('Unauthorized');
  }
  return user;
}

export async function requireRole(roles: string[]): Promise<User> {
  const user = await requireUser();
  const hasRole = user.roles.some(r => roles.includes(r));

  if (!hasRole) {
    throw new Error('Forbidden');
  }

  return user;
}
