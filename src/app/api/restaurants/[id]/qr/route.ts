// src/app/api/restaurants/[id]/qr/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = getSupabase();
    // Use COOLIFY_URL env or fall back to request host header
    const baseUrl = process.env.COOLIFY_URL
      || `https://${request.headers.get('host') || 'urabafoodfest.com'}`;

    let query = supabase.from('restaurants').select('*');
    
    if (isNaN(Number(id))) {
      query = query.eq('slug', id);
    } else {
      query = query.eq('id', Number(id));
    }

    const { data: restaurant, error } = await query.single();

    if (error || !restaurant) {
      return NextResponse.json({ error: 'Restaurante no encontrado' }, { status: 404 });
    }

    const qrUrl = `${baseUrl}/restaurante/${restaurant.slug}`;
    return NextResponse.json({
      data: {
        restaurant: restaurant.name,
        qr_url: qrUrl,
        slug: restaurant.slug
      }
    });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}
