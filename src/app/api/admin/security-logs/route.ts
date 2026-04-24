// src/app/api/admin/security-logs/route.ts — Security logs for admin panel
import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  // Check admin auth
  const cookie = request.cookies.get('bp_admin')?.value;
  const adminPassword = process.env.ADMIN_PASSWORD || 'burgerparty2026';
  if (cookie !== adminPassword) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const supabase = getSupabase();
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '100', 10);
    const type = searchParams.get('type'); // filter by event_type

    let query = supabase
      .from('security_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (type) {
      query = query.eq('event_type', type);
    }

    const { data: logs, error } = await query;

    if (error) throw error;

    // Get summary counts
    const { data: counts } = await supabase
      .from('security_logs')
      .select('event_type')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    const summary: Record<string, number> = {};
    for (const row of (counts || [])) {
      summary[row.event_type] = (summary[row.event_type] || 0) + 1;
    }

    return NextResponse.json({
      data: logs || [],
      summary,
      total: logs?.length || 0,
    });
  } catch (error) {
    console.error('Security logs error:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}
