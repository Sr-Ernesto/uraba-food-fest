// src/app/api/my-vote/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const whatsapp = request.nextUrl.searchParams.get('whatsapp');

    if (!whatsapp) {
      return NextResponse.json({ error: 'WhatsApp es requerido' }, { status: 400 });
    }

    const normalizedWhatsapp = whatsapp.replace(/\D/g, '');
    const supabase = getSupabase();

    const { data: votes, error } = await supabase
      .from('votes')
      .select(`
        id, rating, voted_at,
        restaurants ( name, slug )
      `)
      .eq('whatsapp', normalizedWhatsapp)
      .order('voted_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ data: votes || [] });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}
