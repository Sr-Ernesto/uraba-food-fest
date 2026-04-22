// src/app/api/restaurants/route.ts
import { NextResponse } from 'next/server';
import { getSupabase, Restaurant } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const supabase = getSupabase();
    const { data: restaurants, error } = await supabase
      .from('restaurants')
      .select('id, name, slug, image_url, description, instagram, qr_code')
      .order('name', { ascending: true });

    if (error) throw error;
    return NextResponse.json({ data: restaurants });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}
