'use client';

import { useState, useEffect, use } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Share2 } from 'lucide-react';

const InstagramIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <circle cx="12" cy="12" r="5" />
    <circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" stroke="none" />
  </svg>
);
import Image from 'next/image';
import Link from 'next/link';
import VoteModal from '@/components/VoteModal';

interface Restaurant {
  id: number;
  name: string;
  slug: string;
  image_url: string | null;
  description: string;
  instagram: string;
  qr_code: string;
}

export default function RestaurantPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [userRating, setUserRating] = useState<number | null>(null);

  useEffect(() => {
    fetch(`/api/restaurants/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.data) {
          setRestaurant(data.data);
          setTimeout(() => setModalOpen(true), 800);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (restaurant) {
      const saved = localStorage.getItem('bp_votes_map');
      if (saved) {
        const votesMap = JSON.parse(saved);
        if (votesMap[restaurant.id]) setUserRating(votesMap[restaurant.id]);
      }
    }
  }, [restaurant]);

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      await navigator.share({ title: `Vota por ${restaurant?.name}`, text: `Califica la hamburguesa de ${restaurant?.name}`, url });
    } else {
      await navigator.clipboard.writeText(url);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="text-5xl">🍔</motion.div>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center">
        <span className="text-5xl mb-4">😢</span>
        <h1 className="text-2xl font-bold mb-2">Restaurante no encontrado</h1>
        <Link href="/" className="px-6 py-3 bg-brand hover:bg-brand-dark rounded-xl font-medium transition-colors">Ver todos</Link>
      </div>
    );
  }

  return (
    <main className="min-h-screen">
      <div className="relative">
        {/* Hero image */}
        <div className="relative h-64 sm:h-80 bg-surface-2 overflow-hidden">
          {restaurant.image_url ? (
            <Image src={restaurant.image_url} alt={restaurant.name} fill className="object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-brand/20 to-gold/20">
              <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring' as const, damping: 10 }} className="text-8xl">🍔</motion.span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/50 to-transparent" />
          <Link href="/" className="absolute top-4 left-4 p-2 bg-black/40 backdrop-blur-sm rounded-full hover:bg-black/60 transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <button onClick={handleShare} className="absolute top-4 right-4 p-2 bg-black/40 backdrop-blur-sm rounded-full hover:bg-black/60 transition-colors">
            <Share2 size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="max-w-lg mx-auto px-4 -mt-16 relative z-10">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-2xl p-6">
            <h1 className="text-2xl font-bold mb-2">{restaurant.name}</h1>
            <p className="text-gray-400 mb-4">{restaurant.description}</p>

            {restaurant.instagram && (
              <a
                href={`https://instagram.com/${restaurant.instagram.replace('@', '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-pink-400 hover:text-pink-300 transition-colors mb-6"
              >
                <InstagramIcon size={16} />
                {restaurant.instagram}
              </a>
            )}

            {userRating && (
              <div className="flex items-center gap-2 mb-4 p-3 bg-gold/10 border border-gold/30 rounded-xl">
                <span className="text-gold font-bold">Tu calificación:</span>
                <span className="text-gold">{'⭐'.repeat(userRating)}</span>
              </div>
            )}

            <motion.button onClick={() => setModalOpen(true)} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              className="w-full py-4 bg-brand hover:bg-brand-dark text-white font-bold rounded-xl transition-colors text-lg">
              {userRating ? 'Ver mi calificación' : '¡Calificar! ⭐'}
            </motion.button>
          </motion.div>

          <div className="text-center mt-8 mb-12">
            <Link href="/" className="text-sm text-gray-500 hover:text-gray-300 transition-colors">← Ver todos los restaurantes</Link>
          </div>
        </div>
      </div>

      <VoteModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          const saved = localStorage.getItem('bp_votes_map');
          if (saved && restaurant) {
            const votesMap = JSON.parse(saved);
            if (votesMap[restaurant.id]) setUserRating(votesMap[restaurant.id]);
          }
        }}
        restaurant={restaurant}
      />
    </main>
  );
}
