// src/app/api/restaurants/route.ts
import { NextResponse } from 'next/server';
import db, { Restaurant } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const restaurants = db.prepare(`
      SELECT id, name, slug, image_url, description, instagram, qr_code
      FROM restaurants
      ORDER BY name ASC
    `).all() as Restaurant[];

    return NextResponse.json({ data: restaurants });
  } catch (error) {
    console.error('Error fetching restaurants:', error);
    return NextResponse.json({ error: 'Error al cargar restaurantes' }, { status: 500 });
  }
}
