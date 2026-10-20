'use client';

import React from 'react';
import { ShieldCheck, AlertCircle, AlertTriangle } from 'lucide-react';
import { StockHealthStatus } from '@/types/academic';

interface StockHealthIndicatorProps {
  healthList: StockHealthStatus[];
}

export default function StockHealthIndicator({ healthList }: StockHealthIndicatorProps) {
  const criticalCount = healthList.filter((h) => h.status === 'CRITICAL').length;
  const warningCount = healthList.filter((h) => h.status === 'WARNING').length;
  const isHealthy = criticalCount === 0 && warningCount === 0;

  const Icon = isHealthy ? ShieldCheck : criticalCount > 0 ? AlertCircle : AlertTriangle;
  const colorClass = isHealthy
    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
    : criticalCount > 0
    ? 'bg-rose-50 text-rose-700 border-rose-200'
    : 'bg-amber-50 text-amber-700 border-amber-200';

  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${colorClass} text-xs font-semibold`}>
      <Icon className="w-4 h-4" />
      <span>
        {isHealthy
          ? 'Kho đề dồi dào'
          : criticalCount > 0
          ? `Thiếu hụt ${criticalCount} dạng câu hỏi`
          : `Mức dự phòng mỏng (${warningCount} dạng)`}
      </span>
    </div>
  );
}
