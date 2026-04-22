// src/app/api/admin/restaurants/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const supabase = getSupabase();

    const { data: restaurants, error } = await supabase
      .from('restaurants')
      .select(`
        *,
        votes ( id, rating )
      `)
      .order('name', { ascending: true });

    if (error) throw error;

    const result = (restaurants || []).map((r: any) => ({
      ...r,
      vote_count: r.votes?.length || 0,
      avg_rating: r.votes && r.votes.length > 0
        ? Math.round((r.votes.reduce((sum: number, v: any) => sum + v.rating, 0) / r.votes.length) * 10) / 10
        : null,
      votes: undefined,
    }));

    return NextResponse.json({ data: result });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, description, instagram, image_url } = body;
    const supabase = getSupabase();

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (instagram !== undefined) updateData.instagram = instagram;
    if (image_url !== undefined) updateData.image_url = image_url;

    const { data, error } = await supabase
      .from('restaurants')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}
