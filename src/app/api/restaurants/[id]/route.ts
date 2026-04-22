// src/app/api/restaurants/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import db, { Restaurant } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Try by ID or by slug
    let restaurant: Restaurant | undefined;
    if (isNaN(Number(id))) {
      restaurant = db.prepare('SELECT * FROM restaurants WHERE slug = ?').get(id) as Restaurant | undefined;
    } else {
      restaurant = db.prepare('SELECT * FROM restaurants WHERE id = ?').get(Number(id)) as Restaurant | undefined;
    }

    if (!restaurant) {
      return NextResponse.json({ error: 'Restaurante no encontrado' }, { status: 404 });
    }

    return NextResponse.json({ data: restaurant });
  } catch (error) {
    console.error('Error fetching restaurant:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}
