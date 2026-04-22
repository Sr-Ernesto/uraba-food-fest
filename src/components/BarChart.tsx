'use client';

import { motion } from 'framer-motion';

interface BarChartProps {
  data: { label: string; value: number; color?: string }[];
  max?: number;
  title?: string;
}

export default function BarChart({ data, max, title }: BarChartProps) {
  const maxValue = max || Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="bg-surface-1 border border-surface-3 rounded-2xl p-5">
      {title && <h3 className="text-sm font-semibold text-gray-300 mb-4">{title}</h3>}
      <div className="space-y-3">
        {data.map((item, i) => (
          <div key={item.label} className="flex items-center gap-3">
            <span className="text-xs text-gray-400 w-16 text-right truncate">{item.label}</span>
            <div className="flex-1 h-6 bg-surface-2 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(item.value / maxValue) * 100}%` }}
                transition={{ delay: i * 0.05, duration: 0.6, ease: 'easeOut' }}
                className={`h-full rounded-full ${item.color || 'bg-brand'}`}
              />
            </div>
            <span className="text-xs font-bold text-gray-300 w-8">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
