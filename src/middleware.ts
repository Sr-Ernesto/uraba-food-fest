// src/middleware.ts
import { NextRequest, NextResponse } from 'next/server';

const ADMIN_PATH = '/admin';
const ADMIN_API_PATH = '/api/admin';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow login page without auth
  if (pathname === '/admin/login') {
    return NextResponse.next();
  }

  // Only protect /admin and /api/admin routes
  if (!pathname.startsWith(ADMIN_PATH) && !pathname.startsWith(ADMIN_API_PATH)) {
    return NextResponse.next();
  }

  // Check for admin token in cookie
  const token = request.cookies.get('bp_admin')?.value;
  const adminPassword = process.env.ADMIN_PASSWORD || 'burgerparty2026';

  // If authenticated, allow
  if (token === adminPassword) {
    return NextResponse.next();
  }

  // For API routes, return 401
  if (pathname.startsWith(ADMIN_API_PATH)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  // For page routes, redirect to login
  return NextResponse.redirect(new URL('/admin/login', request.url));
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};
