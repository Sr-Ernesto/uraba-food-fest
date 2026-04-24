'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Check, AlertCircle } from 'lucide-react';
import StarRating from './StarRating';
import Image from 'next/image';

interface VoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  restaurant: {
    id: number;
    name: string;
    description: string;
    image_url?: string | null;
    instagram?: string;
  } | null;
}

type Step = 'rate' | 'form' | 'success' | 'already-voted';

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

const modalVariants = {
  hidden: { opacity: 0, scale: 0.9, y: 40 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: 'spring' as const, damping: 25, stiffness: 300 },
  },
  exit: {
    opacity: 0,
    scale: 0.9,
    y: 40,
    transition: { duration: 0.2 },
  },
};

function Confetti() {
  const particles = Array.from({ length: 30 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 2,
    color: ['#FF6B35', '#FFD700', '#FF8F66', '#E55A2B', '#FFA500'][Math.floor(Math.random() * 5)],
    size: 4 + Math.random() * 8,
  }));

  return (
    <div className="fixed inset-0 pointer-events-none z-[60] overflow-hidden">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          initial={{ y: -20, x: `${p.left}vw`, opacity: 1, rotate: 0 }}
          animate={{
            y: '110vh',
            rotate: 720,
            opacity: 0,
          }}
          transition={{
            duration: 2.5 + Math.random() * 2,
            delay: p.delay,
            ease: 'easeIn',
          }}
          style={{
            position: 'absolute',
            left: `${p.left}%`,
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            borderRadius: Math.random() > 0.5 ? '50%' : '2px',
          }}
        />
      ))}
    </div>
  );
}

export default function VoteModal({ isOpen, onClose, restaurant }: VoteModalProps) {
  const [step, setStep] = useState<Step>('rate');
  const [rating, setRating] = useState(0);
  const [nombre, setNombre] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [fingerprint, setFingerprint] = useState('');
  const [opinion, setOpinion] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showConfetti, setShowConfetti] = useState(false);

  // Get fingerprint on mount
  useEffect(() => {
    if (isOpen) {
      const getFp = async () => {
        try {
          const FingerprintJS = (await import('@fingerprintjs/fingerprintjs')).default;
          const fp = await FingerprintJS.load();
          const result = await fp.get();
          setFingerprint(result.visitorId);
        } catch {
          setFingerprint('unknown-' + Math.random().toString(36).slice(2));
        }
      };
      getFp();

      // Check if already voted
      const saved = localStorage.getItem('bp_votes_map');
      if (saved && restaurant) {
        const votesMap = JSON.parse(saved);
        if (votesMap[restaurant.id]) {
          setRating(votesMap[restaurant.id]);
          setStep('already-voted');
        }
      }
    }
  }, [isOpen, restaurant]);

  const handleRate = useCallback((r: number) => {
    setRating(r);
    // After a brief delay, advance to form
    setTimeout(() => setStep('form'), 400);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurant || rating === 0) return;

    setLoading(true);
    setError('');

    try {
      // ── ANTI-BOT: Fetch token + PoW challenge ──
      const challengeRes = await fetch(`/api/vote?restaurantId=${restaurant.id}`);
      if (!challengeRes.ok) {
        const err = await challengeRes.json();
        setError(err.error || 'Error de seguridad');
        setLoading(false);
        return;
      }
      const { data: sec } = await challengeRes.json();
      const { token, challenge, difficulty } = sec;

      // ── ANTI-BOT: Solve PoW (find nonce where SHA-256 starts with N zeros) ──
      let nonce = 0;
      const prefix = '0'.repeat(difficulty);
      const encoder = new TextEncoder();
      const startTime = performance.now();

      while (true) {
        const data = encoder.encode(`${challenge}:${nonce}`);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

        if (hashHex.startsWith(prefix)) break;
        nonce++;

        // Safety: don't spin forever (>5s = something wrong)
        if (performance.now() - startTime > 5000) {
          setError('Error de verificación. Intenta de nuevo.');
          setLoading(false);
          return;
        }
      }

      // ── Submit vote with token + proof ──
      const res = await fetch('/api/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre,
          whatsapp,
          fingerprint,
          restaurantId: restaurant.id,
          rating,
          token,
          challenge,
          nonce,
          opinion,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.code === 'ALREADY_VOTED' || data.code === 'DEVICE_DUPLICATE') {
          setError(data.error);
          // Save to localStorage
          const existing = JSON.parse(localStorage.getItem('bp_votes_map') || '{}');
          existing[restaurant.id] = data.existingRating || rating;
          localStorage.setItem('bp_votes_map', JSON.stringify(existing));
          return;
        }
        if (data.code === 'RATE_LIMIT_IP') {
          setError(data.error + ' ' + (data.message || ''));
          return;
        }
        setError(data.error || 'Error al registrar tu voto');
        return;
      }

      // Save vote locally (map of restaurantId -> rating)
      const votesMap = JSON.parse(localStorage.getItem('bp_votes_map') || '{}');
      votesMap[restaurant.id] = rating;
      localStorage.setItem('bp_votes_map', JSON.stringify(votesMap));

      setShowConfetti(true);
      setStep('success');
      setTimeout(() => setShowConfetti(false), 3000);
    } catch (e) {
      setError('Error de conexión. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  if (!restaurant) return null;

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
            onClick={onClose}
          >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

            {/* Modal */}
            <motion.div
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-md bg-surface-1 rounded-t-3xl sm:rounded-3xl overflow-hidden border border-surface-3"
            >
              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 z-10 p-2 rounded-full bg-surface-2 hover:bg-surface-3 transition-colors"
              >
                <X size={20} />
              </button>

              {/* Gradient header */}
              <div className="h-2 bg-gradient-to-r from-brand via-gold to-brand-light" />

              {/* ── Restaurant photo hero ── */}
              <div className="relative h-48 bg-white flex items-center justify-center overflow-hidden">
                {restaurant.image_url ? (
                  <Image
                    src={restaurant.image_url}
                    alt={restaurant.name}
                    fill
                    className="object-contain p-4"
                  />
                ) : (
                  <span className="text-6xl">🍔</span>
                )}
                {/* Bottom fade for transition to content */}
                <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-surface-1 to-transparent" />
              </div>

              <div className="p-6">
                <AnimatePresence mode="wait">
                  {/* STEP: Rate */}
                  {step === 'rate' && (
                    <motion.div
                      key="rate"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="flex flex-col items-center text-center"
                    >
                      <h2 className="text-xl font-bold mb-1">{restaurant.name}</h2>
                      <p className="text-sm text-gray-400 mb-4">{restaurant.description}</p>

                      <p className="text-lg font-semibold mb-4">¿Qué tal te pareció?</p>

                      <StarRating rating={rating} onRate={handleRate} size="lg" />
                    </motion.div>
                  )}

                  {/* STEP: Form */}
                  {step === 'form' && (
                    <motion.div
                      key="form"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                    >
                      <div className="text-center mb-6">
                        <h2 className="text-xl font-bold mb-1">Confirma tu voto</h2>
                        <p className="text-sm text-gray-400">
                          Tu calificación: {rating} {rating === 1 ? 'estrella' : 'estrellas'} ⭐
                        </p>
                      </div>

                      <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-1.5">
                            Tu nombre
                          </label>
                          <input
                            type="text"
                            value={nombre}
                            onChange={(e) => setNombre(e.target.value)}
                            required
                            maxLength={100}
                            placeholder="Ej: Juan Pérez"
                            className="w-full px-4 py-3 bg-surface-2 border border-surface-3 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-brand transition-colors"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-1.5">
                            WhatsApp
                          </label>
                          <input
                            type="tel"
                            value={whatsapp}
                            onChange={(e) => {
                              // Only allow numbers, format as Colombian number
                              const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
                              setWhatsapp(digits);
                            }}
                            required
                            placeholder="3001234567"
                            inputMode="numeric"
                            pattern="[0-9]{10}"
                            maxLength={10}
                            className="w-full px-4 py-3 bg-surface-2 border border-surface-3 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-brand transition-colors"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            10 dígitos · Lo usamos para el próximo festival 🍟
                          </p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-1.5">
                            Opinión <span className="text-gray-500">(opcional)</span>
                          </label>
                          <textarea
                            value={opinion}
                            onChange={(e) => setOpinion(e.target.value.slice(0, 500))}
                            rows={3}
                            maxLength={500}
                            placeholder="¿Qué te gustó? ¿Qué mejorarías?"
                            className="w-full px-4 py-3 bg-surface-2 border border-surface-3 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-brand transition-colors resize-none"
                          />
                          <p className="text-xs text-gray-500 mt-1">{opinion.length}/500</p>
                        </div>

                        {error && (
                          <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm"
                          >
                            <AlertCircle size={16} className="shrink-0" />
                            {error}
                          </motion.div>
                        )}

                        <motion.button
                          type="submit"
                          disabled={loading || !nombre || !whatsapp}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          className="w-full py-4 bg-brand hover:bg-brand-dark disabled:bg-surface-3 disabled:text-gray-500 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
                        >
                          {loading ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          ) : (
                            <>
                              <Send size={18} />
                              Confirmar voto
                            </>
                          )}
                        </motion.button>
                      </form>
                    </motion.div>
                  )}

                  {/* STEP: Success */}
                  {step === 'success' && (
                    <motion.div
                      key="success"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex flex-col items-center text-center py-6"
                    >
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring' as const, damping: 10, stiffness: 200, delay: 0.1 }}
                        className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mb-4"
                      >
                        <Check size={36} className="text-green-400" />
                      </motion.div>
                      <h2 className="text-xl font-bold mb-2">¡Gracias!</h2>
                      <p className="text-gray-400 mb-2">
                        Gracias por participar, <span className="text-white font-medium">{nombre}</span>
                      </p>
                      <div className="flex gap-1 mb-6">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <motion.span
                            key={s}
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.3 + s * 0.08, type: 'spring' as const, damping: 8 }}
                            className={s <= rating ? 'text-gold' : 'text-gray-600'}
                          >
                            ⭐
                          </motion.span>
                        ))}
                      </div>
                      <button
                        onClick={onClose}
                        className="px-6 py-2 bg-surface-2 hover:bg-surface-3 rounded-xl text-sm transition-colors"
                      >
                        Cerrar
                      </button>
                    </motion.div>
                  )}

                  {/* STEP: Already voted */}
                  {step === 'already-voted' && (
                    <motion.div
                      key="already-voted"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex flex-col items-center text-center py-6"
                    >
                      <div className="w-16 h-16 rounded-full bg-gold/20 flex items-center justify-center mb-4">
                        <span className="text-3xl">⭐</span>
                      </div>
                      <h2 className="text-xl font-bold mb-2">Ya votaste</h2>
                      <p className="text-gray-400 mb-1">Tu calificación:</p>
                      <div className="flex gap-1 mb-2">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <span key={s} className={s <= rating ? 'text-gold text-2xl' : 'text-gray-600 text-2xl'}>
                            ★
                          </span>
                        ))}
                      </div>
                      <p className="text-xs text-gray-500 mb-6">
                        Solo puedes votar una vez por número de WhatsApp.
                      </p>
                      <button
                        onClick={onClose}
                        className="px-6 py-2 bg-surface-2 hover:bg-surface-3 rounded-xl text-sm transition-colors"
                      >
                        Cerrar
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {showConfetti && <Confetti />}
    </>
  );
}
