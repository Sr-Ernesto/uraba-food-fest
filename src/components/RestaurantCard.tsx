'use client';

import { motion } from 'framer-motion';
import { Star } from 'lucide-react';
import Image from 'next/image';

// Custom Instagram icon
const InstagramIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <circle cx="12" cy="12" r="5" />
    <circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" stroke="none" />
  </svg>
);

interface RestaurantCardProps {
  id: number;
  name: string;
  description: string;
  instagram: string;
  imageUrl?: string | null;
  index: number;
  userRating?: number | null;
  onClick: () => void;
}

function getGradient(name: string): string {
  const gradients = [
    'from-brand/20 to-gold/20',
    'from-purple-500/20 to-pink-500/20',
    'from-blue-500/20 to-cyan-500/20',
    'from-green-500/20 to-emerald-500/20',
    'from-red-500/20 to-orange-500/20',
    'from-indigo-500/20 to-violet-500/20',
    'from-amber-500/20 to-yellow-500/20',
    'from-teal-500/20 to-lime-500/20',
  ];
  return gradients[name.charCodeAt(0) % gradients.length];
}

function getEmoji(name: string): string {
  const emojis = ['🍔', '🔥', '🥩', '🧀', '🥓', '🍳', '🌶️', '🍟', '🍺', '👨‍🍳'];
  return emojis[name.charCodeAt(0) % emojis.length];
}

export default function RestaurantCard({
  id,
  name,
  description,
  instagram,
  imageUrl,
  index,
  userRating,
  onClick,
}: RestaurantCardProps) {
  const handleInstagram = (e: React.MouseEvent) => {
    e.stopPropagation();
    const igHandle = instagram.replace('@', '');
    window.open(`https://instagram.com/${igHandle}`, '_blank');
  };

  return (
    <motion.button
      onClick={onClick}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.4 }}
      whileHover={{ scale: 1.03, y: -4 }}
      whileTap={{ scale: 0.98 }}
      className={`group relative w-full text-left rounded-2xl overflow-hidden bg-gradient-to-br ${getGradient(
        name
      )} border border-surface-3 hover:border-brand/50 transition-all duration-300`}
    >
      {/* Image area — light bg so transparent dark logos are visible */}
      <div className="relative h-40 bg-white flex items-center justify-center overflow-hidden">
        {imageUrl ? (
          <div className="relative w-full h-full p-3">
            <Image
              src={imageUrl}
              alt={name}
              fill
              className="object-contain p-4 group-hover:scale-105 transition-transform duration-500"
            />
          </div>
        ) : (
          <motion.span className="text-6xl select-none" whileHover={{ scale: 1.2, rotate: 10 }}>
            {getEmoji(name)}
          </motion.span>
        )}

        {/* User rating badge */}
        {userRating && (
          <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 bg-black/60 backdrop-blur-sm rounded-full text-xs">
            <Star size={12} className="fill-gold text-gold" />
            <span className="text-gold font-bold">{userRating}</span>
          </div>
        )}

        {/* Instagram button */}
        {instagram && (
          <button
            onClick={handleInstagram}
            className="absolute top-3 left-3 p-2 bg-black/40 backdrop-blur-sm rounded-full hover:bg-pink-500/80 transition-all"
            title={`Ver ${instagram} en Instagram`}
          >
            <InstagramIcon size={14} />
          </button>
        )}

        {/* Subtle gradient at bottom for name preview on hover */}
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </div>

      {/* Content */}
      <div className="p-4 bg-surface-1">
        <h3 className="font-bold text-base mb-1 group-hover:text-brand transition-colors line-clamp-1">
          {name}
        </h3>
        <p className="text-xs text-gray-400 line-clamp-2 mb-2">{description}</p>
        {instagram && (
          <button
            onClick={handleInstagram}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-pink-400 transition-colors"
          >
            <InstagramIcon size={10} />
            <span>{instagram}</span>
          </button>
        )}
      </div>
    </motion.button>
  );
}
