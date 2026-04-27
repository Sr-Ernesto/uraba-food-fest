'use client';

import { useState, useEffect, use } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Share2, Star, ExternalLink } from 'lucide-react';

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
import VotingClosed from '@/components/VotingClosed';


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
  const [votingClosed, setVotingClosed] = useState(false);
  const [eventSettings, setEventSettings] = useState<{ logo_url?: string; event_name?: string }>({});

  useEffect(() => {
    // Check voting status + fetch restaurant
    Promise.all([
      fetch(`/api/restaurants/${id}`).then((r) => r.json()),
      fetch('/api/settings').then((r) => r.json()),
    ])
      .then(([restData, settingsData]) => {
        if (restData.data) {
          setRestaurant(restData.data);
          if (settingsData.data?.voting_closed !== 'true') {
            setTimeout(() => setModalOpen(true), 800);
          }
        }
        if (settingsData.data?.voting_closed === 'true') setVotingClosed(true);
        setEventSettings(settingsData.data || {});
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
      <div className="min-h-screen flex items-center justify-center bg-black">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
          className="relative"
        >
          <div className="w-16 h-16 rounded-full border-2 border-brand/30 border-t-brand animate-spin" />
          <span className="absolute inset-0 flex items-center justify-center text-2xl">🍔</span>
        </motion.div>
      </div>
    );
  }

  // Voting closed screen
  if (votingClosed) {
    return <VotingClosed settings={eventSettings} />;
  }

  if (!restaurant) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center bg-black">
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring' as const, damping: 10 }}
          className="text-6xl mb-4"
        >😢</motion.span>
        <h1 className="text-2xl font-bold mb-2 text-white">Restaurante no encontrado</h1>
        <p className="text-gray-500 mb-6">Este lugar no existe o fue eliminado</p>
        <Link href="/" className="px-6 py-3 bg-brand hover:bg-brand-dark rounded-xl font-medium transition-all hover:scale-105">
          Ver todos
        </Link>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white overflow-x-hidden">
      {/* ── Hero Photo / Logo ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="relative h-[45vh] min-h-[320px] max-h-[460px] overflow-hidden"
      >
        {restaurant.image_url ? (
          <>
            {/* White background for transparent dark logos */}
            <div className="absolute inset-0 bg-white" />
            <div className="absolute inset-0 flex items-center justify-center p-8">
              <motion.div
                initial={{ scale: 0.85, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
                className="relative w-full h-full"
              >
                <Image
                  src={restaurant.image_url}
                  alt={restaurant.name}
                  fill
                  priority
                  className="object-contain"
                  sizes="100vw"
                />
              </motion.div>
            </div>
            {/* Bottom gradient to dark for text readability */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black to-transparent"
            />
            {/* Top bar gradient for nav buttons */}
            <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/30 to-transparent" />
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-brand/20 via-surface to-gold/10">
            <motion.span
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring' as const, damping: 12, stiffness: 100 }}
              className="text-9xl drop-shadow-2xl"
            >
              🍔
            </motion.span>
          </div>
        )}

        {/* Floating nav buttons — spring in */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, type: 'spring' as const, damping: 15 }}
          className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between z-10"
        >
          <Link
            href="/"
            className="p-2.5 bg-black/30 backdrop-blur-md rounded-full border border-white/20 hover:bg-black/50 transition-all hover:scale-110"
          >
            <ArrowLeft size={20} className="text-white" />
          </Link>
          <button
            onClick={handleShare}
            className="p-2.5 bg-black/30 backdrop-blur-md rounded-full border border-white/20 hover:bg-black/50 transition-all hover:scale-110"
          >
            <Share2 size={20} className="text-white" />
          </button>
        </motion.div>

        {/* Restaurant name — slides up from bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-6 z-10">
          <motion.h1
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, type: 'spring' as const, damping: 20, stiffness: 150 }}
            className="text-3xl sm:text-4xl font-extrabold text-white mb-2 drop-shadow-lg"
          >
            {restaurant.name}
          </motion.h1>
          {restaurant.instagram && (
            <motion.a
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.45, duration: 0.4 }}
              href={`https://instagram.com/${restaurant.instagram.replace('@', '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-pink-300 hover:text-pink-200 transition-colors"
            >
              <InstagramIcon size={14} />
              {restaurant.instagram}
              <ExternalLink size={12} className="opacity-60" />
            </motion.a>
          )}
        </div>
      </motion.div>

      {/* ── Content Card — rises with spring ── */}
      <div className="max-w-lg mx-auto px-4 -mt-8 relative z-20">
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.4, type: 'spring' as const, damping: 22, stiffness: 180 }}
          className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl shadow-black/40"
        >
          {/* Description */}
          {restaurant.description && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.55, duration: 0.4 }}
              className="text-gray-300 text-base leading-relaxed mb-5"
            >
              {restaurant.description}
            </motion.p>
          )}

          {/* User rating badge */}
          {userRating && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.6, type: 'spring' as const, damping: 12 }}
              className="flex items-center gap-3 mb-5 p-4 bg-gradient-to-r from-gold/10 to-gold/5 border border-gold/20 rounded-2xl"
            >
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((s) => (
                  <motion.div
                    key={s}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.6 + s * 0.06, type: 'spring' as const, damping: 8 }}
                  >
                    <Star
                      size={18}
                      className={s <= userRating ? 'text-gold fill-gold' : 'text-gray-600'}
                    />
                  </motion.div>
                ))}
              </div>
              <span className="text-sm text-gold/80 font-medium">Tu calificación</span>
            </motion.div>
          )}

          {/* CTA Button */}
          <motion.button
            onClick={() => setModalOpen(true)}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.65, duration: 0.3 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            className="w-full py-4 bg-gradient-to-r from-brand to-brand-dark hover:from-brand-dark hover:to-brand text-white font-bold rounded-2xl transition-all text-lg shadow-lg shadow-brand/20 flex items-center justify-center gap-2"
          >
            {userRating ? (
              <>
                <Star size={20} className="fill-white" />
                Ver mi calificación
              </>
            ) : (
              <>
                ¡Calificar! ⭐
              </>
            )}
          </motion.button>
        </motion.div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-center mt-8 mb-12"
        >
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-300 transition-colors group"
          >
            <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
            Ver todos los restaurantes
          </Link>
        </motion.div>
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
