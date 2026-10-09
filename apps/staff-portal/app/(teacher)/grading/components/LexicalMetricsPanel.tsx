'use client';

import {
  BookOpen,
  Hash,
  Sparkles,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';

interface LexicalMetricsData {
  total_words: number;
  unique_words: number;
  ttr: number;
  ttr_score: number;
  vocabulary_level: string;
  vocabulary_description: string;
}

interface LexicalMetricsPanelProps {
  metrics: LexicalMetricsData | null;
}

export function LexicalMetricsPanel({ metrics }: LexicalMetricsPanelProps) {
  if (!metrics) {
    return (
      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
        <div className="flex items-center gap-2 text-slate-400 text-xs">
          <BookOpen className="w-4 h-4" />
          <span>Chưa có dữ liệu từ vựng</span>
        </div>
      </div>
    );
  }

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'RICH':
        return { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', icon: <CheckCircle2 className="w-4 h-4" /> };
      case 'GOOD':
        return { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', icon: <Sparkles className="w-4 h-4" /> };
      case 'AVERAGE':
        return { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', icon: <BookOpen className="w-4 h-4" /> };
      case 'LIMITED':
        return { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', icon: <AlertCircle className="w-4 h-4" /> };
      default:
        return { bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-700', icon: <BookOpen className="w-4 h-4" /> };
    }
  };

  const getLevelLabel = (level: string) => {
    switch (level) {
      case 'RICH': return 'Phong phú';
      case 'GOOD': return 'Tốt';
      case 'AVERAGE': return 'Trung bình';
      case 'LIMITED': return 'Hạn chế';
      default: return 'Không xác định';
    }
  };

  const levelStyle = getLevelColor(metrics.vocabulary_level);

  const getTTRColor = (ttr: number) => {
    if (ttr >= 0.60) return 'text-emerald-600';
    if (ttr >= 0.50) return 'text-blue-600';
    if (ttr >= 0.40) return 'text-amber-600';
    return 'text-red-600';
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-emerald-600';
    if (score >= 75) return 'text-blue-600';
    if (score >= 60) return 'text-amber-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wide">
        <BookOpen className="w-4 h-4 text-green-600" />
        <span>Phân tích Từ vựng (Lexical)</span>
      </div>

      {/* Vocabulary Level */}
      <div className={`p-3 rounded-xl border ${levelStyle.bg} ${levelStyle.border}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={levelStyle.text}>{levelStyle.icon}</div>
            <div>
              <span className={`text-xs font-bold ${levelStyle.text}`}>
                Vốn từ vựng: {getLevelLabel(metrics.vocabulary_level)}
              </span>
              <p className="text-[10px] text-slate-500">{metrics.vocabulary_description}</p>
            </div>
          </div>
          <div className="text-right">
            <span className={`text-xl font-black ${getScoreColor(metrics.ttr_score)}`}>
              {metrics.ttr_score.toFixed(0)}
              <span className="text-xs font-normal text-slate-500">/100</span>
            </span>
          </div>
        </div>
      </div>

      {/* TTR Progress Bar */}
      <div className="p-3 rounded-xl bg-white border border-slate-200 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
            <Hash className="w-3.5 h-3.5 text-slate-400" />
            Type-Token Ratio (TTR)
          </span>
          <span className={`text-lg font-black ${getTTRColor(metrics.ttr)}`}>
            {metrics.ttr.toFixed(2)}
          </span>
        </div>

        {/* TTR Progress Bar */}
        <div className="space-y-1">
          <div className="relative h-2 bg-slate-100 rounded-full overflow-hidden">
            {/* Good zone */}
            <div className="absolute left-[60%] top-0 bottom-0 w-[20%] bg-emerald-300 opacity-50" />
            {/* Acceptable zone */}
            <div className="absolute left-[40%] top-0 bottom-0 w-[20%] bg-blue-300 opacity-50" />
            {/* Current position */}
            <div
              className={`absolute top-0 bottom-0 w-1.5 rounded-full transition-all ${getTTRColor(metrics.ttr).replace('text-', 'bg-')}`}
              style={{ left: `${Math.min(95, metrics.ttr * 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-[9px] text-slate-400">
            <span>0.0</span>
            <span className="text-amber-600">0.40</span>
            <span className="text-blue-600">0.50</span>
            <span className="text-emerald-600">0.60+</span>
            <span>1.0</span>
          </div>
        </div>
      </div>

      {/* Word Stats */}
      <div className="grid grid-cols-2 gap-2">
        <div className="p-3 rounded-xl bg-white border border-slate-200">
          <div className="text-[10px] font-semibold text-slate-500 uppercase mb-1">
            Tổng số từ
          </div>
          <div className="text-lg font-black text-slate-800">
            {metrics.total_words}
            <span className="text-xs font-normal text-slate-400 ml-1">từ</span>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-white border border-slate-200">
          <div className="text-[10px] font-semibold text-slate-500 uppercase mb-1">
            Từ duy nhất
          </div>
          <div className="text-lg font-black text-slate-800">
            {metrics.unique_words}
            <span className="text-xs font-normal text-slate-400 ml-1">từ</span>
          </div>
        </div>
      </div>

      {/* TTR Explanation */}
      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
        <p className="text-[10px] text-slate-600 leading-relaxed">
          <strong>TTR (Type-Token Ratio)</strong> = Từ duy nhất / Tổng số từ.
          TTR cao ({'>'}0.60) = vốn từ phong phú, đa dạng.
          TTR thấp ({'<'}0.40) = lặp lại nhiều, vốn từ hạn chế.
        </p>
      </div>
    </div>
  );
}
