'use client';

import {
  Mic2,
  Volume2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  MinusCircle,
  PlusCircle,
  Hash
} from 'lucide-react';

interface PronunciationMetricsData {
  score: number;
  wer: number;
  is_valid: boolean;
  grade: string;
  grade_description: string;
  errors: {
    total: number;
    substitutions: number;
    deletions: number;
    insertions: number;
    details?: {
      substitutions?: Array<{reference: string; hypothesis: string}>;
      deletions?: string[];
      insertions?: string[];
    };
  };
  feedback: string;
}

interface PronunciationMetricsPanelProps {
  metrics: PronunciationMetricsData | null;
}

export function PronunciationMetricsPanel({ metrics }: PronunciationMetricsPanelProps) {
  if (!metrics) {
    return (
      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
        <div className="flex items-center gap-2 text-slate-400 text-xs">
          <Mic2 className="w-4 h-4" />
          <span>Chưa có dữ liệu phát âm (Part 2 Read Aloud)</span>
        </div>
      </div>
    );
  }

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'EXCELLENT':
        return { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700' };
      case 'GOOD':
        return { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700' };
      case 'FAIR':
        return { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700' };
      case 'POOR':
        return { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700' };
      case 'VERY_POOR':
        return { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700' };
      default:
        return { bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-700' };
    }
  };

  const getGradeIcon = (grade: string) => {
    switch (grade) {
      case 'EXCELLENT':
        return <CheckCircle2 className="w-4 h-4" />;
      case 'GOOD':
        return <CheckCircle2 className="w-4 h-4" />;
      case 'FAIR':
        return <MinusCircle className="w-4 h-4" />;
      case 'POOR':
        return <AlertTriangle className="w-4 h-4" />;
      case 'VERY_POOR':
        return <XCircle className="w-4 h-4" />;
      default:
        return <MinusCircle className="w-4 h-4" />;
    }
  };

  const gradeStyle = getGradeColor(metrics.grade);

  const getWERStyle = (wer: number) => {
    if (wer <= 0.05) return { text: 'text-emerald-600', bg: 'bg-emerald-500' };
    if (wer <= 0.15) return { text: 'text-blue-600', bg: 'bg-blue-500' };
    if (wer <= 0.30) return { text: 'text-amber-600', bg: 'bg-amber-500' };
    return { text: 'text-red-600', bg: 'bg-red-500' };
  };
  const werStyle = getWERStyle(metrics.wer);

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wide">
        <Mic2 className="w-4 h-4 text-purple-600" />
        <span>Đánh giá Phát âm (WER)</span>
        <span className="ml-auto text-[10px] text-slate-400 normal-case">Part 2: Read Aloud</span>
      </div>

      {/* Overall Score & Grade */}
      <div className={`p-3 rounded-xl border ${gradeStyle.bg} ${gradeStyle.border}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`${gradeStyle.text}`}>
              {getGradeIcon(metrics.grade)}
            </div>
            <div>
              <span className={`text-xs font-bold ${gradeStyle.text}`}>
                {metrics.grade === 'EXCELLENT' ? 'Xuất sắc' :
                 metrics.grade === 'GOOD' ? 'Tốt' :
                 metrics.grade === 'FAIR' ? 'Khá' :
                 metrics.grade === 'POOR' ? 'Yếu' : 'Rất yếu'}
              </span>
              <p className="text-[10px] text-slate-500">{metrics.grade_description}</p>
            </div>
          </div>
          <div className="text-right">
            <div className={`text-2xl font-black ${gradeStyle.text}`}>
              {metrics.score.toFixed(0)}
              <span className="text-xs font-normal">/100</span>
            </div>
          </div>
        </div>
      </div>

      {/* WER Analysis */}
      <div className="p-3 rounded-xl bg-white border border-slate-200 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
            <Hash className="w-3.5 h-3.5 text-slate-400" />
            Word Error Rate (WER)
          </span>
          <span className={`text-lg font-black ${werStyle.text}`}>
            {(metrics.wer * 100).toFixed(1)}%
          </span>
        </div>

        {/* WER Progress Bar */}
        <div className="space-y-1">
          <div className="relative h-2 bg-slate-100 rounded-full overflow-hidden">
            {/* Optimal zone (<=5%) */}
            <div className="absolute left-0 top-0 bottom-0 w-[10%] bg-emerald-300 opacity-50" />
            {/* Good zone (<=15%) */}
            <div className="absolute left-[10%] top-0 bottom-0 w-[20%] bg-blue-300 opacity-50" />
            {/* Fair zone (<=30%) */}
            <div className="absolute left-[30%] top-0 bottom-0 w-[30%] bg-amber-300 opacity-50" />
            {/* Current position */}
            <div
              className={`absolute top-0 bottom-0 w-1.5 rounded-full ${werStyle.bg}`}
              style={{ left: `${Math.min(95, metrics.wer * 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-[9px] text-slate-400">
            <span>0%</span>
            <span className="text-emerald-600">5%</span>
            <span className="text-blue-600">15%</span>
            <span className="text-amber-600">30%</span>
            <span>100%</span>
          </div>
        </div>
      </div>

      {/* Error Breakdown */}
      <div className="grid grid-cols-3 gap-2">
        {/* Substitutions */}
        <div className="p-2.5 rounded-xl bg-white border border-slate-200 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <MinusCircle className="w-3 h-3 text-amber-500" />
            <span className="text-[10px] font-semibold text-slate-500 uppercase">Sai</span>
          </div>
          <div className="text-lg font-black text-amber-600">
            {metrics.errors.substitutions}
          </div>
          <div className="text-[9px] text-slate-400">từ</div>
        </div>

        {/* Deletions */}
        <div className="p-2.5 rounded-xl bg-white border border-slate-200 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <XCircle className="w-3 h-3 text-red-400" />
            <span className="text-[10px] font-semibold text-slate-500 uppercase">Thiếu</span>
          </div>
          <div className="text-lg font-black text-red-500">
            {metrics.errors.deletions}
          </div>
          <div className="text-[9px] text-slate-400">từ</div>
        </div>

        {/* Insertions */}
        <div className="p-2.5 rounded-xl bg-white border border-slate-200 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <PlusCircle className="w-3 h-3 text-blue-400" />
            <span className="text-[10px] font-semibold text-slate-500 uppercase">Thừa</span>
          </div>
          <div className="text-lg font-black text-blue-500">
            {metrics.errors.insertions}
          </div>
          <div className="text-[9px] text-slate-400">từ</div>
        </div>
      </div>

      {/* Error Details */}
      {metrics.errors.details && (
        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
          <span className="text-[10px] font-bold text-slate-500 uppercase">Chi tiết lỗi</span>

          {metrics.errors.details.substitutions && metrics.errors.details.substitutions.length > 0 && (
            <div>
              <span className="text-[9px] text-amber-600 font-semibold">Sai (thay thế):</span>
              <div className="flex flex-wrap gap-1 mt-0.5">
                {metrics.errors.details.substitutions.slice(0, 5).map((s, i) => (
                  <span key={i} className="px-1.5 py-0.5 bg-amber-50 border border-amber-200 rounded text-[10px]">
                    <span className="text-amber-700 line-through">{s.reference}</span>
                    {' → '}
                    <span className="text-amber-900">{s.hypothesis}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {metrics.errors.details.deletions && metrics.errors.details.deletions.length > 0 && (
            <div>
              <span className="text-[9px] text-red-600 font-semibold">Thiếu (bị xóa):</span>
              <div className="flex flex-wrap gap-1 mt-0.5">
                {metrics.errors.details.deletions.slice(0, 5).map((d, i) => (
                  <span key={i} className="px-1.5 py-0.5 bg-red-50 border border-red-200 rounded text-[10px] text-red-700 line-through">
                    {d}
                  </span>
                ))}
              </div>
            </div>
          )}

          {metrics.errors.details.insertions && metrics.errors.details.insertions.length > 0 && (
            <div>
              <span className="text-[9px] text-blue-600 font-semibold">Thừa (chèn vào):</span>
              <div className="flex flex-wrap gap-1 mt-0.5">
                {metrics.errors.details.insertions.slice(0, 5).map((ins, i) => (
                  <span key={i} className="px-1.5 py-0.5 bg-blue-50 border border-blue-200 rounded text-[10px] text-blue-700">
                    {ins}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Feedback */}
      {metrics.feedback && (
        <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200">
          <p className="text-[11px] text-blue-800 leading-relaxed">
            <span className="font-bold">Nhận xét: </span>
            {metrics.feedback}
          </p>
        </div>
      )}

      {/* Invalid Response */}
      {!metrics.is_valid && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-200">
          <div className="flex items-center gap-2 text-red-700">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-xs font-semibold">Phản hồi không hợp lệ</span>
          </div>
          <p className="text-[11px] text-red-600 mt-1">
            {metrics.feedback || 'Bài phản hồi quá ngắn hoặc trống. Vui lòng kiểm tra lại.'}
          </p>
        </div>
      )}
    </div>
  );
}
