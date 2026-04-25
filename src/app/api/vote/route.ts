// src/app/api/vote/route.ts — Voting API with 5-layer anti-bot defense
import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/db';
import {
  generateChallenge,
  verifyPoW,
  generateVoteToken,
  verifyVoteToken,
  checkVoteAnomaly,
  cleanupAntibotState,
} from '@/lib/antibot';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Helper: log security event to DB
async function logSecurityEvent(
  supabase: ReturnType<typeof getSupabase>,
  event_type: string,
  ip: string,
  details: string,
  whatsapp?: string,
  restaurant_id?: number
) {
  try {
    await supabase.from('security_logs').insert({
      event_type,
      ip,
      whatsapp: whatsapp || null,
      restaurant_id: restaurant_id || null,
      details,
    });
  } catch {
    // Don't break vote flow if logging fails
  }
}

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

    const ip = request.headers.get('cf-connecting-ip')
      || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || request.headers.get('x-real-ip')
      || 'unknown';

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
    const { nombre, whatsapp, fingerprint, restaurantId, rating, token, challenge, nonce, opinion } = body;

  // Get real client IP (prioritize CF-Connecting-IP for Cloudflare setups)
  const ip = request.headers.get('cf-connecting-ip')       // Cloudflare: true client IP
    || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown';

    // ========================================
    // LAYER 1: Datacenter IP blocking — DISABLED for event
    // Colombian residential ISPs share ranges with datacenters,
    // so this was blocking legitimate voters. Re-enable with
    // precise ranges based on actual attack logs after the event.
    // ========================================
    // LAYER 2: Subnet rate limiting — DISABLED for event
    // All attendees share the same WiFi/subnet, so this blocks legit votes.
    // ========================================
    // Subnet check removed — per-IP rate limit (8/24h) is sufficient.

    // Validate required fields
    if (!nombre || !whatsapp || !fingerprint || !restaurantId || !rating) {
      return NextResponse.json({ error: 'Todos los campos son requeridos' }, { status: 400 });
    }

    // Clean WhatsApp early (used in logging)
    const cleanWhatsapp = whatsapp.replace(/\D/g, '');

    // ========================================
    // LAYER 4: Verify HMAC token
    // ========================================
    if (!token) {
      const supabase = getSupabase();
      await logSecurityEvent(supabase, 'missing_token', ip, 'Voto sin token de seguridad', cleanWhatsapp, restaurantId);
      return NextResponse.json({ error: 'Token de seguridad requerido' }, { status: 401 });
    }
    const tokenResult = verifyVoteToken(token, restaurantId);
    if (!tokenResult.valid) {
      const supabase = getSupabase();
      await logSecurityEvent(supabase, 'invalid_token', ip, `Token inválido: ${tokenResult.error}`, cleanWhatsapp, restaurantId);
      return NextResponse.json(
        { error: `Token inválido: ${tokenResult.error}` },
        { status: 401 }
      );
    }

    // ========================================
    // LAYER 3: Verify Proof-of-Work
    // ========================================
    if (!challenge || nonce === undefined || nonce === null) {
      const supabase = getSupabase();
      await logSecurityEvent(supabase, 'missing_pow', ip, 'Voto sin prueba de trabajo', cleanWhatsapp, restaurantId);
      return NextResponse.json({ error: 'Prueba de trabajo requerida' }, { status: 401 });
    }
    if (!verifyPoW(challenge, nonce)) {
      const supabase = getSupabase();
      await logSecurityEvent(supabase, 'invalid_pow', ip, 'Prueba de trabajo inválida o expirada', cleanWhatsapp, restaurantId);
      return NextResponse.json({ error: 'Prueba de trabajo inválida o expirada' }, { status: 401 });
    }

    // Validate WhatsApp length
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

    // Per-IP rate limiting: 8 votes per 24 hours
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count: recentVotes } = await supabase
      .from('votes')
      .select('id', { count: 'exact', head: true })
      .eq('ip', ip)
      .gte('voted_at', twentyFourHoursAgo);

    if (recentVotes && recentVotes >= 8) {
      await logSecurityEvent(supabase, 'ip_rate_limit', ip, `${recentVotes} votos en 24h desde esta IP`, cleanWhatsapp, restaurantId);
      return NextResponse.json({
        error: 'Has alcanzado el límite de votos por hoy.',
        code: 'RATE_LIMIT_IP',
        message: 'Si crees que esto es un error, contacta al administrador del evento.',
      }, { status: 429 });
    }

    // ========================================
    // LAYER 5: Anomaly detection
    // ========================================
    const anomalyCheck = checkVoteAnomaly(nombre.trim(), cleanWhatsapp);

    if (!anomalyCheck.passed) {
      await logSecurityEvent(supabase, 'anomaly_detected', ip, `Razones: ${anomalyCheck.reasons.join('; ')}`, cleanWhatsapp, restaurantId);
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
        opinion: opinion?.trim() || null,
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
