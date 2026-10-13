'use client';

import React from 'react';
import { AlertCircle, CheckCircle2, ShieldCheck, AlertTriangle } from 'lucide-react';
import { StockHealthStatus } from '@/types/academic';

interface StockHealthIndicatorProps {
  healthList: StockHealthStatus[];
}

export default function StockHealthIndicator({ healthList }: StockHealthIndicatorProps) {
  const criticalItems = healthList.filter((h) => h.status === 'CRITICAL');
  const warningItems = healthList.filter((h) => h.status === 'WARNING');
  const isHealthyAll = criticalItems.length === 0 && warningItems.length === 0;

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs mb-6">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          {isHealthyAll ? (
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
          ) : criticalItems.length > 0 ? (
            <AlertCircle className="w-5 h-5 text-rose-600" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-amber-600" />
          )}
          <h3 className="text-sm font-bold text-slate-900">
            Kiểm định Sức khỏe Kho Đề Speaking (Stock Health Validator)
          </h3>
        </div>

        <span
          className={`text-xs px-3 py-1 rounded-full font-bold border ${
            isHealthyAll
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : criticalItems.length > 0
              ? 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse'
              : 'bg-amber-50 text-amber-700 border-amber-200'
          }`}
        >
          {isHealthyAll
            ? 'Kho đề Dồi dào & Sẵn sàng'
            : criticalItems.length > 0
            ? `Thiếu hụt ${criticalItems.length} dạng câu hỏi`
            : 'Mức dự phòng mỏng'}
        </span>
      </div>

      {criticalItems.length > 0 && (
        <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600 mt-0.5" />
          <div>
            <strong className="font-bold">Cảnh báo thiếu hụt câu hỏi cho kỳ thi:</strong>
            <ul className="list-disc list-inside mt-1 space-y-0.5 text-rose-700">
              {criticalItems.map((c) => (
                <li key={c.type}>
                  Dạng <strong>{c.name} ({c.type})</strong>: Yêu cầu {c.required_count} câu nhưng kho chỉ có{' '}
                  {c.available_approved_count} câu đã duyệt (Thiếu {c.deficit} câu).
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Grid of 6 Question Types Health Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {healthList.map((item) => {
          const isCrit = item.status === 'CRITICAL';
          const isWarn = item.status === 'WARNING';
          const isGood = item.status === 'HEALTHY';

          return (
            <div
              key={item.type}
              className={`p-3 rounded-xl border transition-all ${
                isCrit
                  ? 'bg-rose-50/70 border-rose-200'
                  : isWarn
                  ? 'bg-amber-50/70 border-amber-200'
                  : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-mono text-xs font-bold text-slate-800 bg-white border border-slate-200 px-1.5 py-0.5 rounded">
                  {item.badge}
                </span>
                {isGood && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                {isWarn && <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />}
                {isCrit && <AlertCircle className="w-3.5 h-3.5 text-rose-600" />}
              </div>

              <div className="text-[11px] font-semibold text-slate-600 truncate mb-1">
                {item.name}
              </div>

              <div className="flex items-baseline justify-between text-xs">
                <span className="text-slate-400">Có sẵn:</span>
                <span
                  className={`font-mono font-bold ${
                    isCrit ? 'text-rose-700' : isWarn ? 'text-amber-700' : 'text-emerald-700'
                  }`}
                >
                  {item.available_approved_count} / {item.required_count}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
