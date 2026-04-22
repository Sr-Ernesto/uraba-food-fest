// src/app/api/vote/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { nombre, whatsapp, fingerprint, restaurantId, rating } = body;

    // Get IP
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || request.headers.get('x-real-ip')
      || 'unknown';

    // Validate required fields
    if (!nombre || !whatsapp || !fingerprint || !restaurantId || !rating) {
      return NextResponse.json({ error: 'Todos los campos son requeridos' }, { status: 400 });
    }

    // Validate WhatsApp (10 digits for Colombia)
    const cleanWhatsapp = whatsapp.replace(/\D/g, '');
    if (cleanWhatsapp.length < 10) {
      return NextResponse.json({ error: 'Número de WhatsApp inválido' }, { status: 400 });
    }

    // Validate rating
    if (rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Rating debe ser entre 1 y 5' }, { status: 400 });
    }

    const supabase = getSupabase();

    // Check if this WhatsApp already voted for this restaurant
    const { data: existingVote } = await supabase
      .from('votes')
      .select('id')
      .eq('whatsapp', cleanWhatsapp)
      .eq('restaurant_id', restaurantId)
      .single();

    if (existingVote) {
      return NextResponse.json({ error: 'Ya votaste por este restaurante', code: 'ALREADY_VOTED' }, { status: 409 });
    }

    // Rate limiting: check for too many votes from same IP in last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: recentVotes } = await supabase
      .from('votes')
      .select('id', { count: 'exact', head: true })
      .eq('ip', ip)
      .gte('voted_at', oneHourAgo);

    if (recentVotes && recentVotes >= 20) {
      return NextResponse.json({ error: 'Demasiados votos. Intenta más tarde.' }, { status: 429 });
    }

    // Insert vote
    const { data: vote, error } = await supabase
      .from('votes')
      .insert({
        nombre: nombre.trim(),
        whatsapp: cleanWhatsapp,
        ip,
        fingerprint,
        restaurant_id: restaurantId,
        rating,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') { // unique constraint
        return NextResponse.json({ error: 'Ya votaste por este restaurante', code: 'ALREADY_VOTED' }, { status: 409 });
      }
      throw error;
    }

    return NextResponse.json({ success: true, data: vote });
  } catch (error: any) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}
