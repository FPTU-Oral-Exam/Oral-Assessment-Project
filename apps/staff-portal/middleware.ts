import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const rolePermissions: Record<string, RegExp[]> = {
  SYSTEM_ADMIN: [
    /^\/users/,
    /^\/settings/,
    /^\/audit/,
    /^\/courses/,
    /^\/exams/,
    /^\/semester/,
    /^\/grading/,
    /^\/results/,
    /^\/schedule/,
    /^\/students/,
    /^\/proctor/,
    /^\/item-bank/,
    /^\/question-types/,
    /^\/exam-matrix/,
    /^\/rubrics/,
  ],
  ACADEMY: [
    /^\/rubrics/,
    /^\/item-bank/,
    /^\/question-types/,
    /^\/exam-matrix/,
    /^\/schedule/,
  ],
  EXAMINER: [
    /^\/semester/,
    /^\/courses/,
    /^\/exams/,
    /^\/schedule/,
    /^\/students/,
    /^\/results/,
    /^\/proctor/,
  ],
  TEACHER: [
    /^\/schedule/,
    /^\/grading/,
    /^\/proctor/,
  ],
};

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Skip RBAC for static assets, public images, icons, and API/demo endpoints
  if (
    path === '/login' ||
    path === '/unauthorized' ||
    path.startsWith('/demo') ||
    path.startsWith('/_next') ||
    path.startsWith('/api') ||
    path.startsWith('/images') ||
    path.includes('.')
  ) {
    return NextResponse.next();
  }

  const userCookie = request.cookies.get('user');

  // Redirect to login if not authenticated
  if (!userCookie) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  let user: { roles?: string[]; role?: string };
  try {
    user = JSON.parse(decodeURIComponent(userCookie.value));
  } catch {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const roles = user.roles || (user.role ? [user.role] : []);

  // Redirect root path to first accessible page by role
  if (path === '/' || path === '') {
    const redirectMap: Record<string, string> = {
      ACADEMY: '/item-bank',
      SYSTEM_ADMIN: '/users',
      EXAMINER: '/semester',
      TEACHER: '/schedule',
    };
    const firstRole = roles.find(r => redirectMap[r]);
    if (firstRole) {
      return NextResponse.redirect(new URL(redirectMap[firstRole], request.url));
    }
  }

  // Check role permissions
  const hasAccess = roles.some((role: string) => {
    const patterns = rolePermissions[role] || [];
    return patterns.some(pattern => pattern.test(path));
  });

  if (!hasAccess) {
    return NextResponse.redirect(new URL('/unauthorized', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|images|login|unauthorized|demo).*)',
  ],
};
