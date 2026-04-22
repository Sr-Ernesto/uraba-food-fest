// src/app/api/admin/stats/route.ts
import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const supabase = getSupabase();

    // Total votes
    const { count: totalVotes } = await supabase
      .from('votes')
      .select('id', { count: 'exact', head: true });

    // Unique voters
    const { data: votersData } = await supabase
      .from('votes')
      .select('whatsapp');
    const uniqueVoters = new Set(votersData?.map((v: any) => v.whatsapp) || []).size;

    // Average rating
    const { data: ratingsData } = await supabase
      .from('votes')
      .select('rating');
    const avgRating = ratingsData && ratingsData.length > 0
      ? Math.round((ratingsData.reduce((sum: number, v: any) => sum + v.rating, 0) / ratingsData.length) * 10) / 10
      : 0;

    // Votes by restaurant
    const { data: restaurantStats } = await supabase
      .from('restaurants')
      .select(`
        id, name, slug,
        votes ( id, rating )
      `);

    const ranking = (restaurantStats || [])
      .map((r: any) => ({
        id: r.id,
        name: r.name,
        slug: r.slug,
        vote_count: r.votes?.length || 0,
        avg_rating: r.votes && r.votes.length > 0
          ? Math.round((r.votes.reduce((sum: number, v: any) => sum + v.rating, 0) / r.votes.length) * 10) / 10
          : null,
      }))
      .sort((a: any, b: any) => b.vote_count - a.vote_count || (b.avg_rating || 0) - (a.avg_rating || 0));

    // Votes by hour (last 24h)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: recentVotes } = await supabase
      .from('votes')
      .select('voted_at')
      .gte('voted_at', twentyFourHoursAgo);

    const votesByHour: Record<string, number> = {};
    (recentVotes || []).forEach((v: any) => {
      const hour = new Date(v.voted_at).toLocaleTimeString('es-CO', { hour: '2-digit', hour12: false });
      votesByHour[hour] = (votesByHour[hour] || 0) + 1;
    });

    return NextResponse.json({
      data: {
        totalVotes: totalVotes || 0,
        uniqueVoters,
        avgRating,
        ranking,
        votesByHour,
      }
    });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}
