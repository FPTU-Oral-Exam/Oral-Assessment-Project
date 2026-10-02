import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const rolePermissions: Record<string, RegExp[]> = {
  SYSTEM_ADMIN: [
    /^\/users/,
    /^\/settings/,
    /^\/audit/,
    /^\/courses/,
    /^\/exams/,
  ],
  EXAMINER: [
    /^\/courses/,
    /^\/exams/,
    /^\/schedule/,
    /^\/students/,
    /^\/results/,
  ],
  TEACHER: [
    /^\/courses/,
    /^\/rubrics/,
    /^\/grading/,
  ],
};

export function middleware(request: NextRequest) {
  const userCookie = request.cookies.get('user');

  // Redirect to login if not authenticated
  if (!userCookie) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  let user: { roles: string[] };
  try {
    user = JSON.parse(decodeURIComponent(userCookie.value));
  } catch {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const path = request.nextUrl.pathname;

  // Skip RBAC for login page and static assets
  if (path === '/login' || path.startsWith('/_next') || path.startsWith('/api')) {
    return NextResponse.next();
  }

  // Check role permissions
  const hasAccess = user.roles.some((role: string) => {
    const patterns = rolePermissions[role] || [];
    return patterns.some(pattern => pattern.test(path));
  });

  if (!hasAccess && path !== '/dashboard') {
    return NextResponse.redirect(new URL('/unauthorized', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|login|unauthorized).*)',
  ],
};
