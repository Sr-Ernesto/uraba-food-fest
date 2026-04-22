// src/app/api/admin/auth/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();
    const adminPassword = process.env.ADMIN_PASSWORD || 'burgerparty2026';

    if (password !== adminPassword) {
      return NextResponse.json({ error: 'Contraseña incorrecta' }, { status: 401 });
    }

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
