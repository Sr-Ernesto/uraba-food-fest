// src/app/api/admin/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const BUCKET = 'uraba-uploads';
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
const MAX_SIZE = 20 * 1024 * 1024; // 20MB

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const type = (formData.get('type') as string) || 'restaurant'; // 'restaurant' | 'logo'

    if (!file) {
      return NextResponse.json({ error: 'No se envió archivo' }, { status: 400 });
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Solo se permiten imágenes JPG, PNG o WebP' }, { status: 400 });
    }

    // Validate size
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'Máximo 20MB por imagen' }, { status: 400 });
    }

    const supabase = getSupabase();

    // Generate path
    const ext = file.name.split('.').pop() || 'jpg';
    const timestamp = Date.now();
    const objectPath = type === 'logo'
      ? `logo.${ext}`
      : `restaurants/${formData.get('slug') || timestamp}.${ext}`;

    // Convert file to buffer for upload
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Upload to Supabase Storage (upsert: true overwrites existing)
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(objectPath, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      console.error('Supabase upload error:', uploadError);
      return NextResponse.json({ error: 'Error al subir imagen a storage' }, { status: 500 });
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(objectPath);

    const url = urlData.publicUrl;

    return NextResponse.json({ url, message: 'Imagen subida correctamente' });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Error al subir imagen' }, { status: 500 });
  }
}
