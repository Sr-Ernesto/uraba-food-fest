'use client';

import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  color: string;
  delay?: number;
}

export default function StatsCard({ title, value, subtitle, icon: Icon, color, delay = 0 }: StatsCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="bg-surface-1 border border-surface-3 rounded-2xl p-5 hover:border-surface-3/80 transition-colors"
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2.5 rounded-xl ${color}`}>
          <Icon size={20} />
        </div>
      </div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-sm text-gray-400 mt-1">{title}</p>
      {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
    </motion.div>
  );
}
