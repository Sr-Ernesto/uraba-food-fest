// src/app/api/admin/stats/route.ts
import { NextResponse } from 'next/server';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    // Total votes
    const totalVotes = (db.prepare('SELECT COUNT(*) as count FROM votes').get() as any).count;

    // Unique voters (by whatsapp)
    const uniqueVoters = (db.prepare('SELECT COUNT(DISTINCT whatsapp) as count FROM votes').get() as any).count;

    // Average rating
    const avgRating = (db.prepare('SELECT ROUND(AVG(rating), 1) as avg FROM votes').get() as any).avg || 0;

    // Votes by restaurant (with stats)
    const restaurantStats = db.prepare(`
      SELECT r.id, r.name, r.slug, r.instagram, r.image_url,
             COUNT(v.id) as total_votes,
             ROUND(AVG(v.rating), 1) as avg_rating,
             MIN(v.rating) as min_rating,
             MAX(v.rating) as max_rating
      FROM restaurants r
      LEFT JOIN votes v ON r.id = v.restaurant_id
      GROUP BY r.id
      ORDER BY avg_rating DESC, total_votes DESC
    `).all();

    // Votes by hour (last 24h)
    const votesByHour = db.prepare(`
      SELECT strftime('%H', voted_at) as hour, COUNT(*) as count
      FROM votes
      WHERE voted_at > datetime('now', '-24 hours')
      GROUP BY hour
      ORDER BY hour
    `).all();

    // Rating distribution (1-5 stars)
    const ratingDistribution = db.prepare(`
      SELECT rating, COUNT(*) as count
      FROM votes
      GROUP BY rating
      ORDER BY rating
    `).all();

    // Votes by day
    const votesByDay = db.prepare(`
      SELECT DATE(voted_at) as date, COUNT(*) as count
      FROM votes
      GROUP BY DATE(voted_at)
      ORDER BY date
    `).all();

    // Recent votes (last 10)
    const recentVotes = db.prepare(`
      SELECT v.id, v.nombre, v.whatsapp, v.rating, v.voted_at,
             r.name as restaurant_name
      FROM votes v
      JOIN restaurants r ON v.restaurant_id = r.id
      ORDER BY v.voted_at DESC
      LIMIT 10
    `).all();

    // Top voters (people who rated the most)
    const topVoters = db.prepare(`
      SELECT nombre, whatsapp, COUNT(*) as votes_count,
             ROUND(AVG(rating), 1) as avg_rating
      FROM votes
      GROUP BY whatsapp
      ORDER BY votes_count DESC
      LIMIT 10
    `).all();

    return NextResponse.json({
      summary: {
        totalVotes,
        uniqueVoters,
        avgRating,
        totalRestaurants: (db.prepare('SELECT COUNT(*) as count FROM restaurants').get() as any).count,
      },
      restaurantStats,
      votesByHour,
      ratingDistribution,
      votesByDay,
      recentVotes,
      topVoters,
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}
