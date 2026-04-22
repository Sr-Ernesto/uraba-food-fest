// src/app/api/admin/restaurants/route.ts
import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET all restaurants with vote counts
export async function GET() {
  try {
    const restaurants = db.prepare(`
      SELECT r.*,
             COUNT(v.id) as vote_count,
             ROUND(AVG(v.rating), 1) as avg_rating
      FROM restaurants r
      LEFT JOIN votes v ON r.id = v.restaurant_id
      GROUP BY r.id
      ORDER BY r.name ASC
    `).all();

    return NextResponse.json({ data: restaurants });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}

// PUT update restaurant
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, description, instagram, image_url } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID es requerido' }, { status: 400 });
    }

    // Build dynamic update
    const updates: string[] = [];
    const values: any[] = [];

    if (name !== undefined) { updates.push('name = ?'); values.push(name); }
    if (description !== undefined) { updates.push('description = ?'); values.push(description); }
    if (instagram !== undefined) { updates.push('instagram = ?'); values.push(instagram); }
    if (image_url !== undefined) { updates.push('image_url = ?'); values.push(image_url); }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'Nada que actualizar' }, { status: 400 });
    }

    values.push(id);
    db.prepare(`UPDATE restaurants SET ${updates.join(', ')} WHERE id = ?`).run(...values);

    const updated = db.prepare('SELECT * FROM restaurants WHERE id = ?').get(id);
    return NextResponse.json({ data: updated, message: 'Restaurante actualizado' });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}
