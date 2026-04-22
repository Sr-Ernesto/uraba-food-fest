// src/app/api/restaurants/[id]/qr/route.ts
import { NextRequest, NextResponse } from 'next/server';
import db, { Restaurant } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const baseUrl = request.nextUrl.origin;

    let restaurant: Restaurant | undefined;
    if (isNaN(Number(id))) {
      restaurant = db.prepare('SELECT * FROM restaurants WHERE slug = ?').get(id) as Restaurant | undefined;
    } else {
      restaurant = db.prepare('SELECT * FROM restaurants WHERE id = ?').get(Number(id)) as Restaurant | undefined;
    }

    if (!restaurant) {
      return NextResponse.json({ error: 'Restaurante no encontrado' }, { status: 404 });
    }

    const voteUrl = `${baseUrl}/restaurante/${restaurant.slug}`;

    return NextResponse.json({
      restaurant: restaurant.name,
      url: voteUrl,
      qr_data: voteUrl,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}
