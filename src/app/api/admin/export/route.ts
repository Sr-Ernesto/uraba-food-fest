// src/app/api/admin/export/route.ts
import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET() {
  try {
    const voters = db.prepare(`
      SELECT nombre, whatsapp, COUNT(*) as restaurantes_votados,
             ROUND(AVG(rating), 1) as avg_rating,
             MIN(voted_at) as primer_voto,
             MAX(voted_at) as ultimo_voto
      FROM votes
      GROUP BY whatsapp
      ORDER BY ultimo_voto DESC
    `).all() as any[];

    const csv = 'Nombre,WhatsApp,Restaurantes Votados,Rating Promedio,Primer Voto,Último Voto\n' +
      voters.map(v =>
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
