'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import Image from 'next/image';

interface Settings {
  logo_url?: string;
  event_name?: string;
}

// Floating particle component
function FloatingParticle({ delay, duration, x, emoji }: { delay: number; duration: number; x: number; emoji: string }) {
  return (
    <motion.div
      initial={{ y: '100vh', x, opacity: 0, rotate: 0 }}
      animate={{ y: '-20vh', opacity: [0, 1, 1, 0], rotate: 360 }}
      transition={{ duration, delay, repeat: Infinity, ease: 'linear' }}
      className="fixed text-2xl sm:text-3xl pointer-events-none z-0"
      style={{ left: `${x}%` }}
    >
      {emoji}
    </motion.div>
  );
}

// Confetti burst
function ConfettiBurst() {
  const colors = ['#FF6B35', '#FFD700', '#FF8F66', '#E55A2B', '#B8960F', '#fff'];
  const particles = Array.from({ length: 40 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    delay: Math.random() * 2,
    duration: 3 + Math.random() * 3,
    size: 4 + Math.random() * 8,
    color: colors[Math.floor(Math.random() * colors.length)],
    rotation: Math.random() * 720 - 360,
  }));

  return (
    <>
      {particles.map((p) => (
        <motion.div
          key={p.id}
          initial={{ y: -20, x: `${p.x}vw`, opacity: 1, rotate: 0 }}
          animate={{
            y: '100vh',
            opacity: [1, 1, 0],
            rotate: p.rotation,
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: 'linear',
          }}
          className="fixed pointer-events-none z-0"
          style={{
            width: p.size,
            height: p.size,
            borderRadius: Math.random() > 0.5 ? '50%' : '2px',
            backgroundColor: p.color,
          }}
        />
      ))}
    </>
  );
}

// Podium bars animation
function PodiumBar({ position, delay }: { position: number; delay: number }) {
  const heights = [160, 120, 90];
  const labels = ['🥇', '🥈', '🥉'];
  const positions = ['2nd', '1st', '3rd'];
  const orderIndex = position === 1 ? 0 : position === 0 ? 1 : 2; // center=1st, left=2nd, right=3rd

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: heights[orderIndex], opacity: 1 }}
      transition={{ delay: delay + 0.8, duration: 0.8, type: 'spring' as const, damping: 15 }}
      className="flex flex-col items-center justify-end"
    >
      <motion.span
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: delay + 1.4, type: 'spring' as const, damping: 8 }}
        className="text-3xl mb-2"
      >
        {labels[orderIndex]}
      </motion.span>
      <div
        className={`w-16 sm:w-20 rounded-t-xl ${
          orderIndex === 0 ? 'bg-gradient-to-t from-yellow-600 to-yellow-400' :
          orderIndex === 1 ? 'bg-gradient-to-t from-gray-400 to-gray-300' :
          'bg-gradient-to-t from-amber-800 to-amber-600'
        }`}
        style={{ height: '100%' }}
      />
    </motion.div>
  );
}

export default function VotingClosed({ settings }: { settings: Settings }) {
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowContent(true), 300);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden px-4">
      {/* Background effects */}
      <div className="fixed inset-0 z-0">
        {/* Radial glow */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(255,107,53,0.15)_0%,_transparent_70%)]" />
        {/* Top glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-[radial-gradient(ellipse,_rgba(255,215,0,0.1)_0%,_transparent_70%)]" />
      </div>

      {/* Confetti */}
      <ConfettiBurst />

      {/* Floating food emojis */}
      {['🍔', '🍟', '🥤', '🏆', '⭐', '🔥', '🎉', '👑'].map((emoji, i) => (
        <FloatingParticle
          key={i}
          delay={i * 0.7}
          duration={6 + Math.random() * 4}
          x={5 + (i * 12)}
          emoji={emoji}
        />
      ))}

      {/* Main content */}
      <div className="relative z-10 max-w-lg w-full text-center">
        {/* Logo */}
        {settings.logo_url && (
          <motion.div
            initial={{ scale: 0, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring' as const, damping: 12, stiffness: 100 }}
            className="mb-6 flex justify-center"
          >
            <div className="relative">
              <div className="absolute inset-0 bg-brand/30 rounded-3xl blur-2xl scale-110" />
              <Image
                src={settings.logo_url}
                alt="Logo"
                width={100}
                height={100}
                className="rounded-3xl relative z-10 shadow-2xl"
              />
            </div>
          </motion.div>
        )}

        {/* Lock icon */}
        <motion.div
          initial={{ scale: 0, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          transition={{ delay: 0.2, type: 'spring' as const, damping: 10 }}
          className="mb-6"
        >
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-brand/20 to-gold/20 border border-brand/30 shadow-lg shadow-brand/20">
            <motion.span
              animate={{ rotate: [0, -10, 10, 0] }}
              transition={{ delay: 1.5, duration: 0.5 }}
              className="text-4xl"
            >
              🔒
            </motion.span>
          </div>
        </motion.div>

        {/* Title */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, type: 'spring' as const, damping: 15 }}
          className="text-3xl sm:text-4xl font-extrabold mb-3"
        >
          <span className="gradient-text">¡Votaciones Cerradas!</span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="text-gray-400 text-lg mb-2"
        >
          Gracias por ser parte de{' '}
          <span className="text-white font-semibold">
            {settings.event_name || 'Uraba Food Fest'}
          </span>
        </motion.p>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.75, duration: 0.5 }}
          className="text-gray-500 text-sm mb-10"
        >
          Tu voz hizo la diferencia. Cada voto contó.
        </motion.p>

        {/* Podium animation */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="flex items-end justify-center gap-3 mb-8 h-48"
        >
          {[0, 1, 2].map((pos) => (
            <PodiumBar key={pos} position={pos} delay={pos * 0.15} />
          ))}
        </motion.div>

        {/* Building podium message */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 2, type: 'spring' as const, damping: 15 }}
          className="glass rounded-2xl p-5 mb-8 border border-brand/20"
        >
          <motion.div
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ delay: 2.5, duration: 2, repeat: Infinity }}
          >
            <p className="text-white font-bold text-lg mb-1">
              🏆 Estamos creando el podio
            </p>
            <p className="text-gray-400 text-sm">
              de las mejores hamburguesas de Urabá
            </p>
          </motion.div>
        </motion.div>

        {/* Winner announcement teaser */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2.5, duration: 0.5 }}
          className="flex flex-col items-center gap-3"
        >
          <motion.div
            animate={{
              boxShadow: [
                '0 0 20px rgba(255, 107, 53, 0.3)',
                '0 0 40px rgba(255, 107, 53, 0.6)',
                '0 0 20px rgba(255, 107, 53, 0.3)',
              ],
            }}
            transition={{ duration: 2, repeat: Infinity }}
            className="px-6 py-3 bg-gradient-to-r from-brand to-brand-dark rounded-xl"
          >
            <p className="text-white font-bold text-sm">
              ⏳ El ganador será anunciado en las próximas horas
            </p>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 3 }}
            className="text-gray-600 text-xs"
          >
            Mantente atento a nuestras redes sociales
          </motion.p>
        </motion.div>

        {/* Floating sparkles */}
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={`sparkle-${i}`}
            initial={{ opacity: 0, scale: 0 }}
            animate={{
              opacity: [0, 1, 0],
              scale: [0, 1, 0],
              y: [0, -30, -60],
            }}
            transition={{
              delay: 3 + i * 0.4,
              duration: 1.5,
              repeat: Infinity,
              repeatDelay: 2,
            }}
            className="absolute text-lg pointer-events-none"
            style={{
              left: `${20 + i * 12}%`,
              bottom: `${10 + (i % 3) * 15}%`,
            }}
          >
            ✨
          </motion.div>
        ))}
      </div>
    </div>
  );
}
