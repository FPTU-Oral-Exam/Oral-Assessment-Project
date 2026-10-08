import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

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
    const data = JSON.parse(decodeURIComponent(userCookie.value));
    if (data && !Array.isArray(data.roles) && data.role) {
      data.roles = [data.role];
    }
    return data;
  } catch {
    return null;
  }
}

export async function requireUser(): Promise<User> {
  const user = await getUser();
  if (!user) {
    redirect('/login');
  }
  return user;
}

export async function requireRole(roles: string[]): Promise<User> {
  const user = await requireUser();
  const userRoles = Array.isArray(user.roles)
    ? user.roles
    : (user as any).role
    ? [(user as any).role]
    : [];
  const hasRole = userRoles.some(r => roles.includes(r));

  if (!hasRole) {
    redirect('/unauthorized');
  }

  return user;
}
