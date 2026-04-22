// src/app/api/vote/route.ts
import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { nombre, whatsapp, fingerprint, restaurantId, rating } = body;

    // Get IP
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || request.headers.get('x-real-ip')
      || 'unknown';

    // Validation
    if (!nombre || !whatsapp || !fingerprint || !restaurantId || !rating) {
      return NextResponse.json(
        { error: 'Todos los campos son obligatorios' },
        { status: 400 }
      );
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'La calificación debe ser entre 1 y 5 estrellas' },
        { status: 400 }
      );
    }

    // Normalize WhatsApp
    const normalizedWhatsapp = whatsapp.replace(/\D/g, '');
    if (normalizedWhatsapp.length < 10) {
      return NextResponse.json(
        { error: 'Número de WhatsApp inválido' },
        { status: 400 }
      );
    }

    // Check if WhatsApp already voted FOR THIS RESTAURANT
    const existingVote = db.prepare(
      'SELECT id, rating FROM votes WHERE whatsapp = ? AND restaurant_id = ?'
    ).get(normalizedWhatsapp, restaurantId) as { id: number; rating: number } | undefined;

    if (existingVote) {
      return NextResponse.json(
        {
          error: 'Ya calificaste este restaurante',
          code: 'ALREADY_VOTED',
          existingRating: existingVote.rating,
        },
        { status: 409 }
      );
    }

    // Check if fingerprint already voted FOR THIS RESTAURANT
    const existingFingerprint = db.prepare(
      'SELECT id, rating FROM votes WHERE fingerprint = ? AND restaurant_id = ?'
    ).get(fingerprint, restaurantId) as { id: number; rating: number } | undefined;

    if (existingFingerprint) {
      return NextResponse.json(
        {
          error: 'Este dispositivo ya calificó este restaurante',
          code: 'DEVICE_DUPLICATE',
          existingRating: existingFingerprint.rating,
        },
        { status: 409 }
      );
    }

    // Rate limit by IP: max 3 votes per 10 min
    const recentVotes = db.prepare(
      `SELECT COUNT(*) as count FROM votes WHERE ip = ? AND voted_at > datetime('now', '-10 minutes')`
    ).get(ip) as { count: number };

    if (recentVotes.count >= 3) {
      return NextResponse.json(
        { error: 'Demasiados votos desde tu red. Intenta más tarde.', code: 'RATE_LIMIT' },
        { status: 429 }
      );
    }

    // Verify restaurant exists
    const restaurant = db.prepare('SELECT id FROM restaurants WHERE id = ?').get(restaurantId);
    if (!restaurant) {
      return NextResponse.json(
        { error: 'Restaurante no encontrado' },
        { status: 404 }
      );
    }

    // Insert vote
    const result = db.prepare(`
      INSERT INTO votes (nombre, whatsapp, ip, fingerprint, restaurant_id, rating)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(nombre, normalizedWhatsapp, ip, fingerprint, restaurantId, rating);

    return NextResponse.json({
      success: true,
      message: '¡Gracias por votar! 🍔',
      voteId: result.lastInsertRowid,
    });
  } catch (error) {
    console.error('Error registering vote:', error);
    return NextResponse.json(
      { error: 'Error del servidor. Intenta nuevamente.' },
      { status: 500 }
    );
  }
}
