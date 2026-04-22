// src/app/api/admin/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const type = (formData.get('type') as string) || 'restaurant'; // 'restaurant' | 'logo'

    if (!file) {
      return NextResponse.json({ error: 'No se envió archivo' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Solo se permiten imágenes JPG, PNG o WebP' }, { status: 400 });
    }

    // Validate size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'Máximo 5MB por imagen' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Create uploads directory
    const uploadDir = type === 'logo'
      ? path.join(process.cwd(), 'public', 'uploads')
      : path.join(process.cwd(), 'public', 'uploads', 'restaurants');
    await mkdir(uploadDir, { recursive: true });

    // Generate filename
    const ext = file.name.split('.').pop() || 'jpg';
    const filename = type === 'logo'
      ? `logo.${ext}`
      : `${formData.get('slug') || Date.now()}.${ext}`;

    const filepath = path.join(uploadDir, filename);
    await writeFile(filepath, buffer);

    const url = type === 'logo'
      ? `/uploads/${filename}`
      : `/uploads/restaurants/${filename}`;

    return NextResponse.json({ url, message: 'Imagen subida correctamente' });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Error al subir imagen' }, { status: 500 });
  }
}
