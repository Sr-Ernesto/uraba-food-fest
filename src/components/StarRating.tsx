'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star } from 'lucide-react';

interface StarRatingProps {
  rating: number;
  onRate: (rating: number) => void;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const sizeMap = {
  sm: 24,
  md: 36,
  lg: 48,
};

const labels = ['', 'Mala', 'Regular', 'Buena', 'Muy buena', '¡Excelente!'];

export default function StarRating({ rating, onRate, disabled = false, size = 'lg' }: StarRatingProps) {
  const [hovered, setHovered] = useState(0);
  const [animatingStar, setAnimatingStar] = useState(0);
  const px = sizeMap[size];

  const handleClick = (star: number) => {
    if (disabled) return;
    setAnimatingStar(star);
    onRate(star);
    setTimeout(() => setAnimatingStar(0), 300);
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((star) => {
          const isActive = star <= (hovered || rating);
          return (
            <motion.button
              key={star}
              type="button"
              whileHover={{ scale: 1.15 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => handleClick(star)}
              onMouseEnter={() => !disabled && setHovered(star)}
              onMouseLeave={() => setHovered(0)}
              disabled={disabled}
              className={`transition-colors duration-150 ${
                disabled ? 'cursor-default' : 'cursor-pointer'
              }`}
            >
              <Star
                size={px}
                className={
                  isActive
                    ? 'fill-gold text-gold drop-shadow-[0_0_8px_rgba(255,215,0,0.5)]'
                    : 'fill-star-empty text-star-empty'
                }
                style={
                  animatingStar === star
                    ? { animation: 'star-pop 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55)' }
                    : undefined
                }
              />
            </motion.button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        {(hovered > 0 || rating > 0) && (
          <motion.p
            key={hovered || rating}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.15 }}
            className="text-sm font-medium text-brand-light"
          >
            {labels[hovered || rating]}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
