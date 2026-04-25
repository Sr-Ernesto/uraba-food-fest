// src/app/api/admin/auth/route.ts — Admin auth with brute-force protection
import { NextRequest, NextResponse } from 'next/server';
import { isDatacenterIP } from '@/lib/antibot';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// In-memory login attempt tracker (resets on deploy, fine for protection)
const loginAttempts = new Map<string, { count: number; firstAttempt: number; lockedUntil: number }>();

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const LOCKOUT_MS = 30 * 60 * 1000; // 30 minutes lockout

function getClientIP(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown';
}

export async function POST(request: NextRequest) {
  const ip = getClientIP(request);

  // Block datacenter IPs from admin access
  if (isDatacenterIP(ip)) {
    return NextResponse.json({ error: `Acceso no permitido (IP: ${ip})` }, { status: 403 });
  }

  // Check if locked out
  const entry = loginAttempts.get(ip);
  if (entry) {
    if (Date.now() < entry.lockedUntil) {
      const minutesLeft = Math.ceil((entry.lockedUntil - Date.now()) / 60000);
      return NextResponse.json(
        { error: `Cuenta bloqueada. Intenta en ${minutesLeft} minutos.` },
        { status: 429 }
      );
    }
    // Reset if lockout expired
    if (Date.now() - entry.firstAttempt > WINDOW_MS) {
      loginAttempts.delete(ip);
    }
  }

  try {
    const { password } = await request.json();
    const adminPassword = process.env.ADMIN_PASSWORD || 'burgerparty2026';

    if (password !== adminPassword) {
      // Record failed attempt
      const now = Date.now();
      const current = loginAttempts.get(ip);

      if (!current || (now - current.firstAttempt) > WINDOW_MS) {
        loginAttempts.set(ip, { count: 1, firstAttempt: now, lockedUntil: 0 });
      } else {
        current.count++;
        if (current.count >= MAX_ATTEMPTS) {
          current.lockedUntil = now + LOCKOUT_MS;
          loginAttempts.set(ip, current);
          // Cleanup old entries
          if (loginAttempts.size > 1000) {
            for (const [k, v] of loginAttempts) {
              if (now > v.lockedUntil && (now - v.firstAttempt) > WINDOW_MS) {
                loginAttempts.delete(k);
              }
            }
          }
          return NextResponse.json(
            { error: `Demasiados intentos. Cuenta bloqueada por 30 minutos.` },
            { status: 429 }
          );
        }
        loginAttempts.set(ip, current);
      }

      const remaining = MAX_ATTEMPTS - (current?.count || 1);
      return NextResponse.json(
        { error: `Contraseña incorrecta. ${remaining} intentos restantes.` },
        { status: 401 }
      );
    }

    // Success — clear attempts
    loginAttempts.delete(ip);

    const response = NextResponse.json({ success: true });
    response.cookies.set('bp_admin', adminPassword, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    return response;
  } catch (error) {
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}

// Logout
export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.set('bp_admin', '', { maxAge: 0, path: '/' });
  return response;
}
