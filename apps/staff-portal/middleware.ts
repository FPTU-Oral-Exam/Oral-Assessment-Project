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
    /^\/proctor/,
  ],
  TEACHER: [
    /^\/courses/,
    /^\/rubrics/,
    /^\/grading/,
    /^\/proctor/,
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

  // Redirect root path to dashboard
  if (path === '/' || path === '') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Skip RBAC for login page, unauthorized page, and static assets
  if (path === '/login' || path === '/unauthorized' || path.startsWith('/_next') || path.startsWith('/api')) {
    return NextResponse.next();
  }

  // Check role permissions
  const roles = user.roles || (user.role ? [user.role] : []);
  const hasAccess = roles.some((role: string) => {
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
