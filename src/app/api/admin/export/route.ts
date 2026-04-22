// src/app/api/admin/export/route.ts
import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const supabase = getSupabase();

    // Get aggregated voter data
    const { data: votes, error } = await supabase
      .from('votes')
      .select('nombre, whatsapp, rating, voted_at');

    if (error) throw error;

    // Group by whatsapp
    const voterMap: Record<string, any> = {};
    (votes || []).forEach((v: any) => {
      if (!voterMap[v.whatsapp]) {
        voterMap[v.whatsapp] = {
          nombre: v.nombre,
          whatsapp: v.whatsapp,
          ratings: [],
          firstVote: v.voted_at,
          lastVote: v.voted_at,
        };
      }
      voterMap[v.whatsapp].ratings.push(v.rating);
      if (v.voted_at < voterMap[v.whatsapp].firstVote) voterMap[v.whatsapp].firstVote = v.voted_at;
      if (v.voted_at > voterMap[v.whatsapp].lastVote) voterMap[v.whatsapp].lastVote = v.voted_at;
    });

    const voters = Object.values(voterMap).map((v: any) => ({
      nombre: v.nombre,
      whatsapp: v.whatsapp,
      restaurantes_votados: v.ratings.length,
      avg_rating: Math.round((v.ratings.reduce((s: number, r: number) => s + r, 0) / v.ratings.length) * 10) / 10,
      primer_voto: v.firstVote,
      ultimo_voto: v.lastVote,
    }));

    voters.sort((a: any, b: any) => b.ultimo_voto.localeCompare(a.ultimo_voto));

    const csv = 'Nombre,WhatsApp,Restaurantes Votados,Rating Promedio,Primer Voto,Último Voto\n' +
      voters.map((v: any) =>
        `"${v.nombre}","${v.whatsapp}",${v.restaurantes_votados},${v.avg_rating},"${v.primer_voto}","${v.ultimo_voto}"`
      ).join('\n');

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="contactos-burger-party.csv"',
      },
    });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}
