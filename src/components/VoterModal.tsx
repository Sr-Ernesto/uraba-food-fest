'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, Star, MessageSquare } from 'lucide-react';

interface VoteDetail {
  restaurant_name: string;
  rating: number;
  opinion: string | null;
  voted_at: string;
}

interface VoterModalProps {
  isOpen: boolean;
  onClose: () => void;
  nombre: string;
  whatsapp: string;
  votes: VoteDetail[];
  avgRating: number;
}

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

export default function VoterModal({ isOpen, onClose, nombre, whatsapp, votes, avgRating }: VoterModalProps) {
  return (
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
            className="relative w-full max-w-lg bg-surface-1 rounded-t-3xl sm:rounded-3xl overflow-hidden border border-surface-3 max-h-[80vh] flex flex-col"
          >
            {/* Header gradient */}
            <div className="h-2 bg-gradient-to-r from-brand via-gold to-brand-light" />

            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 z-10 p-2 rounded-full bg-surface-2 hover:bg-surface-3 transition-colors"
            >
              <X size={18} />
            </button>

            {/* User info */}
            <div className="p-5 border-b border-surface-3">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-brand/20 flex items-center justify-center text-xl font-bold text-brand">
                  {nombre.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-lg font-bold">{nombre}</h2>
                  <p className="text-sm text-gray-400">{whatsapp}</p>
                </div>
                <div className="ml-auto text-right">
                  <p className="text-2xl font-bold text-gold">{avgRating} ⭐</p>
                  <p className="text-xs text-gray-500">{votes.length} {votes.length === 1 ? 'voto' : 'votos'}</p>
                </div>
              </div>
            </div>

            {/* Votes list */}
            <div className="overflow-y-auto flex-1 p-4 space-y-3">
              {votes.map((v, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-surface-2 rounded-xl p-4"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-sm">{v.restaurant_name}</h3>
                    <div className="flex gap-0.5 shrink-0">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <span key={s} className={s <= v.rating ? 'text-gold' : 'text-gray-600'}>
                          <Star size={14} fill={s <= v.rating ? 'currentColor' : 'none'} />
                        </span>
                      ))}
                    </div>
                  </div>

                  {v.opinion && (
                    <div className="flex items-start gap-2 mt-2 p-2.5 bg-surface-1 rounded-lg">
                      <MessageSquare size={14} className="text-gray-500 shrink-0 mt-0.5" />
                      <p className="text-xs text-gray-300 italic">"{v.opinion}"</p>
                    </div>
                  )}

                  <p className="text-[10px] text-gray-600 mt-2">
                    {new Date(v.voted_at).toLocaleString('es-CO', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </motion.div>
              ))}

              {votes.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-gray-500">Sin votos registrados</p>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
