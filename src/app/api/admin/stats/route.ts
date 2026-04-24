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

    // Restaurant stats with votes
    const { data: restaurants } = await supabase
      .from('restaurants')
      .select(`
        id, name, slug, instagram, image_url,
        votes ( id, rating, whatsapp, nombre, voted_at )
      `);

    const restaurantStats = (restaurants || []).map((r: any) => {
      const votes = r.votes || [];
      const avg = votes.length > 0
        ? Math.round((votes.reduce((s: number, v: any) => s + v.rating, 0) / votes.length) * 10) / 10
        : null;
      return {
        id: r.id,
        name: r.name,
        slug: r.slug,
        instagram: r.instagram,
        image_url: r.image_url,
        total_votes: votes.length,
        avg_rating: avg,
        min_rating: votes.length > 0 ? Math.min(...votes.map((v: any) => v.rating)) : 0,
        max_rating: votes.length > 0 ? Math.max(...votes.map((v: any) => v.rating)) : 0,
      };
    }).sort((a: any, b: any) => b.total_votes - a.total_votes || (b.avg_rating || 0) - (a.avg_rating || 0));

    // All votes for recent and charts
    const { data: allVotes } = await supabase
      .from('votes')
      .select('id, nombre, whatsapp, rating, voted_at, restaurant_id, opinion')
      .order('voted_at', { ascending: false });

    // Recent votes (last 50)
    const recentVotes = (allVotes || []).slice(0, 50).map((v: any) => {
      const restaurant = restaurants?.find((r: any) => r.id === v.restaurant_id);
      return {
        id: v.id,
        nombre: v.nombre,
        whatsapp: v.whatsapp,
        rating: v.rating,
        voted_at: v.voted_at,
        restaurant_name: restaurant?.name || 'Desconocido',
        opinion: v.opinion || null,
      };
    });

    // Top voters
    const voterMap: Record<string, { nombre: string; whatsapp: string; votes: number; totalRating: number }> = {};
    (allVotes || []).forEach((v: any) => {
      const key = v.whatsapp;
      if (!voterMap[key]) {
        voterMap[key] = { nombre: v.nombre, whatsapp: v.whatsapp, votes: 0, totalRating: 0 };
      }
      voterMap[key].votes++;
      voterMap[key].totalRating += v.rating;
    });
    const topVoters = Object.values(voterMap)
      .map(v => ({
        nombre: v.nombre,
        whatsapp: v.whatsapp,
        votes_count: v.votes,
        avg_rating: Math.round((v.totalRating / v.votes) * 10) / 10,
      }))
      .sort((a, b) => b.votes_count - a.votes_count);

    // Rating distribution
    const ratingDist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    (allVotes || []).forEach((v: any) => {
      ratingDist[v.rating] = (ratingDist[v.rating] || 0) + 1;
    });
    const ratingDistribution = Object.entries(ratingDist)
      .map(([rating, count]) => ({ rating: Number(rating), count }))
      .sort((a, b) => a.rating - b.rating);

    // Votes by day (last 30 days)
    const dayMap: Record<string, number> = {};
    (allVotes || []).forEach((v: any) => {
      const date = v.voted_at?.split('T')[0] || 'unknown';
      dayMap[date] = (dayMap[date] || 0) + 1;
    });
    const votesByDay = Object.entries(dayMap)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Votes by hour
    const hourMap: Record<string, number> = {};
    (allVotes || []).forEach((v: any) => {
      if (v.voted_at) {
        const hour = new Date(v.voted_at).toLocaleTimeString('es-CO', { hour: '2-digit', hour12: false });
        hourMap[hour] = (hourMap[hour] || 0) + 1;
      }
    });
    const votesByHour = Object.entries(hourMap)
      .map(([hour, count]) => ({ hour, count }))
      .sort((a, b) => a.hour.localeCompare(b.hour));

    return NextResponse.json({
      summary: {
        totalVotes: totalVotes || 0,
        uniqueVoters,
        avgRating,
        totalRestaurants: restaurants?.length || 0,
      },
      restaurantStats,
      votesByHour,
      ratingDistribution,
      votesByDay,
      recentVotes,
      topVoters,
    });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}
