// src/app/api/vote/route.ts — Voting API with 5-layer anti-bot defense
import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/db';
import {
  isDatacenterIP,
  getSubnet,
  checkSubnetRateLimit,
  generateChallenge,
  verifyPoW,
  generateVoteToken,
  verifyVoteToken,
  checkVoteAnomaly,
  cleanupAntibotState,
} from '@/lib/antibot';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// ============================================================
// GET: Serve token OR PoW challenge depending on query param
// GET /api/vote?restaurantId=33&type=challenge  → PoW challenge
// GET /api/vote?restaurantId=33&type=token      → HMAC token
// GET /api/vote?restaurantId=33                  → both (default)
// ============================================================
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const restaurantId = parseInt(searchParams.get('restaurantId') || '0', 10);
    const type = searchParams.get('type') || 'both';

    if (!restaurantId || restaurantId < 1) {
      return NextResponse.json({ error: 'restaurantId requerido' }, { status: 400 });
    }

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || request.headers.get('x-real-ip')
      || 'unknown';

    // Layer 1: Block datacenter IPs on token/challenge requests too
    if (isDatacenterIP(ip)) {
      return NextResponse.json({ error: 'Acceso no permitido' }, { status: 403 });
    }

    const result: Record<string, unknown> = {};

    if (type === 'token' || type === 'both') {
      const tokenData = generateVoteToken(restaurantId);
      result.token = tokenData.token;
      result.tokenExpiresAt = tokenData.expiresAt;
    }

    if (type === 'challenge' || type === 'both') {
      const challengeData = generateChallenge(ip);
      result.challenge = challengeData.challenge;
      result.difficulty = challengeData.difficulty;
      result.challengeExpiresAt = challengeData.expiresAt;
    }

    return NextResponse.json({ data: result });
  } catch (error) {
    console.error('Token/Challenge error:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}

// ============================================================
// POST: Submit a vote (with 5-layer anti-bot check)
// ============================================================
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { nombre, whatsapp, fingerprint, restaurantId, rating, token, challenge, nonce } = body;

    // Get IP
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || request.headers.get('x-real-ip')
      || 'unknown';

    // ========================================
    // LAYER 1: Block datacenter/hosting IPs
    // ========================================
    if (isDatacenterIP(ip)) {
      return NextResponse.json(
        { error: 'No se permiten votos desde servidores o proxies' },
        { status: 403 }
      );
    }

    // ========================================
    // LAYER 2: Subnet rate limiting
    // ========================================
    const subnetCheck = checkSubnetRateLimit(ip);
    if (!subnetCheck.allowed) {
      return NextResponse.json(
        { error: 'Demasiados votos desde tu zona. Intenta más tarde.' },
        { status: 429 }
      );
    }

    // Validate required fields
    if (!nombre || !whatsapp || !fingerprint || !restaurantId || !rating) {
      return NextResponse.json({ error: 'Todos los campos son requeridos' }, { status: 400 });
    }

    // ========================================
    // LAYER 4: Verify HMAC token
    // ========================================
    if (!token) {
      return NextResponse.json({ error: 'Token de seguridad requerido' }, { status: 401 });
    }
    const tokenResult = verifyVoteToken(token, restaurantId);
    if (!tokenResult.valid) {
      return NextResponse.json(
        { error: `Token inválido: ${tokenResult.error}` },
        { status: 401 }
      );
    }

    // ========================================
    // LAYER 3: Verify Proof-of-Work
    // ========================================
    if (!challenge || nonce === undefined || nonce === null) {
      return NextResponse.json({ error: 'Prueba de trabajo requerida' }, { status: 401 });
    }
    if (!verifyPoW(challenge, nonce)) {
      return NextResponse.json({ error: 'Prueba de trabajo inválida o expirada' }, { status: 401 });
    }

    // Validate WhatsApp
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

    // Per-IP rate limiting (keep existing)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: recentVotes } = await supabase
      .from('votes')
      .select('id', { count: 'exact', head: true })
      .eq('ip', ip)
      .gte('voted_at', oneHourAgo);

    if (recentVotes && recentVotes >= 10) {
      return NextResponse.json({ error: 'Demasiados votos. Intenta más tarde.' }, { status: 429 });
    }

    // ========================================
    // LAYER 5: Anomaly detection
    // ========================================
    // Get recent ratings for this restaurant to detect bot patterns
    const { data: recentRestaurantVotes } = await supabase
      .from('votes')
      .select('rating')
      .eq('restaurant_id', restaurantId)
      .order('voted_at', { ascending: false })
      .limit(20);

    const recentRatings = (recentRestaurantVotes || []).map(v => v.rating);
    const anomalyCheck = checkVoteAnomaly(nombre.trim(), cleanWhatsapp, rating, recentRatings);

    if (!anomalyCheck.passed) {
      return NextResponse.json(
        { error: 'Voto rechazado por actividad sospechosa', reasons: anomalyCheck.reasons },
        { status: 403 }
      );
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
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Ya votaste por este restaurante', code: 'ALREADY_VOTED' }, { status: 409 });
      }
      throw error;
    }

    // Periodic cleanup of antibot state
    if (Math.random() < 0.01) cleanupAntibotState();

    return NextResponse.json({ success: true, data: vote });
  } catch (error: unknown) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}
