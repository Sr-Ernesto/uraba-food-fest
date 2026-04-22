// src/app/api/my-vote/route.ts
import { NextRequest, NextResponse } from 'next/server';
import db, { Vote, Restaurant } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const whatsapp = request.nextUrl.searchParams.get('whatsapp');

    if (!whatsapp) {
      return NextResponse.json({ error: 'WhatsApp es requerido' }, { status: 400 });
    }

    const normalizedWhatsapp = whatsapp.replace(/\D/g, '');

    // Get ALL votes from this person
    const votes = db.prepare(`
      SELECT v.id, v.restaurant_id, v.rating, v.voted_at,
             r.name as restaurant_name, r.slug as restaurant_slug
      FROM votes v
      JOIN restaurants r ON v.restaurant_id = r.id
      WHERE v.whatsapp = ?
      ORDER BY v.voted_at DESC
    `).all() as (Vote & { restaurant_name: string; restaurant_slug: string })[];

    if (votes.length === 0) {
      return NextResponse.json({ hasVoted: false, votes: [] });
    }

    return NextResponse.json({
      hasVoted: true,
      totalVotes: votes.length,
      votes: votes.map((v) => ({
        restaurantId: v.restaurant_id,
        restaurantName: v.restaurant_name,
        restaurantSlug: v.restaurant_slug,
        rating: v.rating,
        votedAt: v.voted_at,
      })),
    });
  } catch (error) {
    console.error('Error fetching votes:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}
