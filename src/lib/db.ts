// src/lib/db.ts
import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'data', 'burger-party.db');

// Ensure data directory exists
import fs from 'fs';
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);

// Enable WAL mode for better concurrent performance
db.pragma('journal_mode = WAL');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS restaurants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    image_url TEXT,
    description TEXT,
    instagram TEXT DEFAULT '',
    qr_code TEXT UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS votes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    whatsapp TEXT NOT NULL,
    ip TEXT NOT NULL,
    fingerprint TEXT NOT NULL,
    restaurant_id INTEGER NOT NULL,
    rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
    voted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (restaurant_id) REFERENCES restaurants(id)
  );

  -- Índices para búsquedas rápidas de validación
  CREATE INDEX IF NOT EXISTS idx_votes_fingerprint ON votes(fingerprint);
  CREATE INDEX IF NOT EXISTS idx_votes_ip ON votes(ip);
  CREATE INDEX IF NOT EXISTS idx_votes_restaurant ON votes(restaurant_id);
  CREATE UNIQUE INDEX IF NOT EXISTS idx_votes_whatsapp_restaurant ON votes(whatsapp, restaurant_id);

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Seed restaurants if empty
const count = db.prepare('SELECT COUNT(*) as count FROM restaurants').get() as { count: number };
if (count.count === 0) {
  const insert = db.prepare(`
    INSERT INTO restaurants (name, slug, image_url, description, instagram, qr_code)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const restaurants = [
    { name: 'La Burger House', slug: 'la-burger-house', desc: 'Hamburguesa artesanal con carne angus y queso fundido', ig: '@laburgerhouse' },
    { name: 'Smoke & Grill', slug: 'smoke-grill', desc: 'Burger ahumada con brisket de 12 horas', ig: '@smokeandgrill' },
    { name: 'Patty Lab', slug: 'patty-lab', desc: 'Experimentos gastronómicos entre panes', ig: '@pattylab' },
    { name: 'El Corral Gourmet', slug: 'el-corral-gourmet', desc: 'La clásica colombiana reinventada', ig: '@elcorralgourmet' },
    { name: 'Burger Boss', slug: 'burger-boss', desc: 'Doble carne, triple sabor', ig: '@burgerboss' },
    { name: 'The Joint', slug: 'the-joint', desc: 'Fusión americana con toque latino', ig: '@thejoint' },
    { name: 'Madre Burguer', slug: 'madre-burguer', desc: 'Recetas de mamá entre dos panes', ig: '@madreburguer' },
    { name: 'Holy Cow', slug: 'holy-cow', desc: 'Burger premium con wagyu importado', ig: '@holycow' },
    { name: 'Grill Station', slug: 'grill-station', desc: 'Estación de sabor con papas trufadas', ig: '@grillstation' },
    { name: 'Nómada Burger', slug: 'nomada-burger', desc: 'Sabores del mundo en cada mordida', ig: '@nomadaburger' },
    { name: 'La Brava', slug: 'la-brava', desc: 'Hamburguesas con personalidad fuerte', ig: '@labrava' },
    { name: 'Don Burguer', slug: 'don-burguer', desc: 'Tradición desde 1998, sabor que perdura', ig: '@donburguer' },
    { name: 'Craft Burger', slug: 'craft-burger', desc: 'Cerveza artesanal y burgers a la parrilla', ig: '@craftburger' },
    { name: 'Wagyu Club', slug: 'wagyu-club', desc: 'Experiencia exclusiva de wagyu A5', ig: '@wagyuclub' },
    { name: 'Perra Hermosa', slug: 'perra-hermosa', desc: 'La más atrevida de la ciudad', ig: '@perrahermosa' },
    { name: 'Urban Meat', slug: 'urban-meat', desc: 'Street food elevado a otro nivel', ig: '@urbanmeat' },
    { name: 'La Despensa', slug: 'la-despensa', desc: 'Ingredientes locales, sabor global', ig: '@ladespensa' },
    { name: 'Melt Down', slug: 'melt-down', desc: 'Queso que no para de fluir', ig: '@meltdown' },
    { name: '180 Grados', slug: '180-grados', desc: 'Media vuelta de tuerca a la burger clásica', ig: '@180grados' },
  ];

  const insertMany = db.transaction((items: typeof restaurants) => {
    for (const r of items) {
      insert.run(r.name, r.slug, null, r.desc, r.ig, `vote-${r.slug}`);
    }
  });
  insertMany(restaurants);
}

export default db;

// Types
export interface Restaurant {
  id: number;
  name: string;
  slug: string;
  image_url: string | null;
  description: string;
  instagram: string;
  qr_code: string;
  created_at: string;
}

export interface Vote {
  id: number;
  nombre: string;
  whatsapp: string;
  ip: string;
  fingerprint: string;
  restaurant_id: number;
  rating: number;
  voted_at: string;
}
