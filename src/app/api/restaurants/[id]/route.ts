// src/app/api/restaurants/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSupabase, Restaurant } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = getSupabase();

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

    // Get vote stats
    const { data: stats } = await supabase
      .from('votes')
      .select('rating', { count: 'exact' })
      .eq('restaurant_id', restaurant.id);

    const voteCount = stats?.length || 0;
    const avgRating = stats && stats.length > 0
      ? Math.round((stats.reduce((sum: number, v: any) => sum + v.rating, 0) / stats.length) * 10) / 10
      : null;

    return NextResponse.json({
      data: { ...restaurant, vote_count: voteCount, avg_rating: avgRating }
    });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}
