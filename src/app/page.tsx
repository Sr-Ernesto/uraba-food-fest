'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { UtensilsCrossed, ChevronUp } from 'lucide-react';
import RestaurantCard from '@/components/RestaurantCard';
import VoteModal from '@/components/VoteModal';
import Image from 'next/image';

interface Restaurant {
  id: number;
  name: string;
  slug: string;
  image_url: string | null;
  description: string;
  instagram: string;
  qr_code: string;
}

interface Settings {
  logo_url?: string;
  event_name?: string;
  event_tagline?: string;
}

export default function Home() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [settings, setSettings] = useState<Settings>({});
  const [selected, setSelected] = useState<Restaurant | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [userVotes, setUserVotes] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
  const [showScrollTop, setShowScrollTop] = useState(false);

  // Load restaurants and settings
  useEffect(() => {
    Promise.all([
      fetch('/api/restaurants').then((r) => r.json()),
      fetch('/api/settings').then((r) => r.json()),
    ])
      .then(([restData, settingsData]) => {
        setRestaurants(restData.data || []);
        setSettings(settingsData.data || {});
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Randomize order (seeded by session so it stays consistent)
  const shuffledRestaurants = useMemo(() => {
    if (restaurants.length === 0) return [];
    // Use session storage so order doesn't change on re-render
    const sessionKey = 'bp_shuffle_seed';
    let seed = sessionStorage.getItem(sessionKey);
    if (!seed) {
      seed = String(Math.random());
      sessionStorage.setItem(sessionKey, seed);
    }
    const seedNum = parseFloat(seed);
    return [...restaurants].sort((a, b) => {
      const hashA = (a.id * seedNum * 1000) % 1;
      const hashB = (b.id * seedNum * 1000) % 1;
      return hashA - hashB;
    });
  }, [restaurants]);

  // Load user votes from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('bp_votes_map');
    if (saved) setUserVotes(JSON.parse(saved));
  }, []);

  // Scroll listener
  useEffect(() => {
    const handleScroll = () => setShowScrollTop(window.scrollY > 600);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSelect = (restaurant: Restaurant) => {
    setSelected(restaurant);
    setModalOpen(true);
  };

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="text-5xl">
          🍔
        </motion.div>
      </div>
    );
  }

  return (
    <main className="min-h-screen">
      {/* Hero */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-brand/10 via-transparent to-transparent" />
        <div className="relative max-w-6xl mx-auto px-4 pt-12 pb-8 text-center">
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            {settings.logo_url ? (
              <div className="mb-4 flex justify-center">
                <Image src={settings.logo_url} alt="Logo" width={120} height={120} className="rounded-2xl" />
              </div>
            ) : (
              <span className="text-5xl mb-4 block">🍔</span>
            )}
            <h1 className="text-4xl sm:text-5xl font-extrabold mb-3">
              <span className="gradient-text">{settings.event_name || 'Uraba Food Fest'}</span>
            </h1>
            <p className="text-gray-400 text-lg max-w-md mx-auto">
              {settings.event_tagline || 'Vota por la mejor hamburguesa'}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex items-center justify-center gap-6 mt-8"
          >
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <UtensilsCrossed size={16} className="text-brand" />
              <span><span className="text-white font-bold">{restaurants.length}</span> restaurantes</span>
            </div>
            <div className="w-px h-4 bg-surface-3" />
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <span className="text-brand">⭐</span>
              <span>Califica <span className="text-white font-bold">1-5</span> estrellas</span>
            </div>
          </motion.div>
        </div>
      </header>

      {/* Restaurant Grid */}
      <section className="max-w-6xl mx-auto px-4 pb-20">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {shuffledRestaurants.map((restaurant, index) => (
            <RestaurantCard
              key={restaurant.id}
              id={restaurant.id}
              name={restaurant.name}
              description={restaurant.description}
              instagram={restaurant.instagram}
              imageUrl={restaurant.image_url}
              index={index}
              userRating={userVotes[restaurant.id] || null}
              onClick={() => handleSelect(restaurant)}
            />
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="text-center mt-12 text-sm text-gray-600"
        >
          Tu calificación es privada. Solo tú puedes verla. 🔒
        </motion.div>
      </section>

      {/* Vote Modal */}
      <VoteModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          const saved = localStorage.getItem('bp_votes_map');
          if (saved) setUserVotes(JSON.parse(saved));
        }}
        restaurant={selected}
      />

      {/* Scroll to top */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: showScrollTop ? 1 : 0 }}
        onClick={scrollToTop}
        className="fixed bottom-6 right-6 p-3 bg-brand rounded-full shadow-lg shadow-brand/30 z-40"
      >
        <ChevronUp size={20} />
      </motion.button>
    </main>
  );
}
