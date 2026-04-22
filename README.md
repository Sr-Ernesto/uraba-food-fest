# 🍔 Burger Party 2026

Sistema de votación por estrellas (1-5) para el festival Burger Party. Diseño moderno dark theme con motion effects.

## Características

- ⭐ Votación por estrellas 1-5 (privada — solo el usuario ve su voto)
- 📱 QR por restaurante — al escanear abre la ficha + popup de votación
- 🔒 Anti-fraude: WhatsApp único + Fingerprint + Rate limiting por IP
- 💾 Base de datos: nombre, WhatsApp, IP, fecha/hora, calificación
- 🎨 Diseño: dark theme, Framer Motion, mobile-first
- 📊 Datos para futuro festival (WhatsApp contacts exportables)

## Stack

- **Next.js 16** (App Router, TypeScript, Turbopack)
- **Tailwind CSS v4** (dark theme)
- **Framer Motion** (animaciones)
- **SQLite** (better-sqlite3, fácil migrar a Supabase/PostgreSQL)
- **FingerprintJS** (anti-fraude por dispositivo)

## Inicio rápido

```bash
cd burger-party
npm install
npm run dev
# Abrir http://localhost:3000
```

## Producción

```bash
npm run build
npm start
```

## Docker

```bash
docker build -t burger-party .
docker run -p 3000:3000 -v $(pwd)/data:/app/data burger-party
```

## Estructura

```
src/
├── app/
│   ├── page.tsx                    # Home — grid de 19 restaurantes
│   ├── restaurante/[id]/page.tsx   # Ficha individual + auto-popup
│   ├── api/
│   │   ├── restaurants/route.ts    # GET: lista de restaurantes
│   │   ├── restaurants/[id]/route.ts # GET: restaurante por slug/ID
│   │   ├── restaurants/[id]/qr/route.ts # GET: URL del QR
│   │   ├── vote/route.ts           # POST: registrar voto
│   │   └── my-vote/route.ts        # GET: ver mi voto
│   ├── layout.tsx                  # Root layout (dark theme)
│   └── globals.css                 # Estilos + animaciones
├── components/
│   ├── StarRating.tsx              # Selector 1-5 estrellas
│   ├── VoteModal.tsx               # Popup de votación (4 steps)
│   └── RestaurantCard.tsx          # Card del restaurante
└── lib/
    └── db.ts                       # SQLite + seed de 19 restaurantes
```

## Flujo QR

1. Cada restaurante tiene un QR con URL: `https://tusitio.com/restaurante/[slug]`
2. Al escanear → abre la ficha del restaurante
3. Después de 800ms → se abre automáticamente el popup de votación
4. Usuario califica 1-5 estrellas → ingresa nombre + WhatsApp → listo

## Flujo de votación

```
Toca restaurante → ⭐⭐⭐⭐⭐ (califica)
→ Nombre + WhatsApp (formulario)
→ Anti-fraude: WhatsApp único ✓, Fingerprint ✓, IP rate limit ✓
→ ✅ "¡Voto registrado!"
→ Confetti 🎊
```

## API Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/restaurants` | Lista todos los restaurantes |
| GET | `/api/restaurants/:id` | Restaurante por ID o slug |
| GET | `/api/restaurants/:id/qr` | URL del QR para el restaurante |
| POST | `/api/vote` | Registrar voto (nombre, whatsapp, fingerprint, restaurantId, rating) |
| GET | `/api/my-vote?whatsapp=...` | Ver voto propio |

## Personalización

### Cambiar restaurantes

Edita `src/lib/db.ts` en la sección `restaurants` del seed.

### Agregar imágenes

Sube fotos a `/public/restaurants/` con nombre `[slug].jpg` y actualiza `image_url` en la DB.

### Generar QRs

Llama a `/api/restaurants/[id]/qr` para obtener la URL de cada restaurante. Usa cualquier generador de QR (ej: `qrcode` npm package) para crear las imágenes.

## Migrar a Supabase/PostgreSQL

El esquema SQL está en `src/lib/db.ts`. Para migrar:
1. Ejecuta el SQL en Supabase/PostgreSQL
2. Reemplaza `better-sqlite3` por `@supabase/supabase-js`
3. Cambia las queries en las rutas API
