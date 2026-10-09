'use client';

import {
  Activity,
  Mic,
  Pause,
  Zap,
  CheckCircle2,
  AlertCircle,
  MinusCircle,
  ArrowUp,
  ArrowDown,
  Equal
} from 'lucide-react';

interface FluencyMetricsData {
  speech_rate_wps: number;
  speech_rate_status: string;
  fluency_score: number;
  pause_count: number;
  pause_ratio: number;
  filled_pause_count: number;
  transcript_with_pauses?: string;
}

interface FluencyMetricsPanelProps {
  metrics: FluencyMetricsData | null;
}

export function FluencyMetricsPanel({ metrics }: FluencyMetricsPanelProps) {
  if (!metrics) {
    return (
      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
        <div className="flex items-center gap-2 text-slate-400 text-xs">
          <Activity className="w-4 h-4" />
          <span>Chưa có dữ liệu fluency</span>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPTIMAL':
        return 'text-emerald-600 bg-emerald-50 border-emerald-200';
      case 'SLOW':
        return 'text-amber-600 bg-amber-50 border-amber-200';
      case 'TOO_SLOW':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'PLATEAU_RAPID':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      default:
        return 'text-slate-600 bg-slate-50 border-slate-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'OPTIMAL':
        return <CheckCircle2 className="w-4 h-4" />;
      case 'SLOW':
        return <MinusCircle className="w-4 h-4" />;
      case 'TOO_SLOW':
        return <ArrowDown className="w-4 h-4" />;
      case 'PLATEAU_RAPID':
        return <ArrowUp className="w-4 h-4" />;
      default:
        return <Activity className="w-4 h-4" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'OPTIMAL':
        return 'Tối ưu';
      case 'SLOW':
        return 'Hơi chậm';
      case 'TOO_SLOW':
        return 'Quá chậm';
      case 'PLATEAU_RAPID':
        return 'Nhanh đều';
      default:
        return 'Không xác định';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-emerald-600';
    if (score >= 70) return 'text-blue-600';
    if (score >= 50) return 'text-amber-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wide">
        <Activity className="w-4 h-4 text-blue-600" />
        <span>Phân tích Độ trôi chảy (Fluency)</span>
      </div>

      {/* Speech Rate */}
      <div className="p-3 rounded-xl bg-white border border-slate-200 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-500" />
            <span className="text-xs font-semibold text-slate-700">Tốc độ nói</span>
          </div>
          <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-bold border ${getStatusColor(metrics.speech_rate_status)}`}>
            {getStatusIcon(metrics.speech_rate_status)}
            <span>{getStatusLabel(metrics.speech_rate_status)}</span>
          </div>
        </div>

        {/* Speed Meter */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[10px] text-slate-500">
            <span>1.0 wps</span>
            <span className="text-blue-600 font-bold">2.0-2.4 wps (Tối ưu)</span>
            <span>3.0 wps</span>
          </div>
          <div className="relative h-2 bg-slate-100 rounded-full overflow-hidden">
            {/* Optimal zone */}
            <div className="absolute left-[33%] right-[33%] top-0 bottom-0 bg-emerald-200 opacity-50" />
            {/* Current position */}
            <div
              className={`absolute top-0 bottom-0 w-1.5 rounded-full transition-all ${
                metrics.speech_rate_status === 'OPTIMAL' ? 'bg-emerald-500' :
                metrics.speech_rate_status === 'TOO_SLOW' ? 'bg-red-500' :
                'bg-amber-500'
              }`}
              style={{ left: `${Math.min(100, Math.max(0, (metrics.speech_rate_wps / 3.0) * 100))}%` }}
            />
          </div>
          <div className="text-right">
            <span className={`text-sm font-black ${getScoreColor(metrics.fluency_score)}`}>
              {metrics.speech_rate_wps.toFixed(1)}
            </span>
            <span className="text-xs text-slate-500 ml-1">từ/giây</span>
          </div>
        </div>
      </div>

      {/* Pause Analysis */}
      <div className="grid grid-cols-2 gap-2">
        <div className="p-3 rounded-xl bg-white border border-slate-200">
          <div className="flex items-center gap-1.5 mb-1">
            <Pause className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-[10px] font-semibold text-slate-500 uppercase">Số lần dừng</span>
          </div>
          <div className="text-lg font-black text-slate-800">
            {metrics.pause_count}
            <span className="text-xs font-normal text-slate-400 ml-1">lần</span>
          </div>
          {metrics.pause_ratio > 0.27 && (
            <div className="flex items-center gap-1 mt-1">
              <AlertCircle className="w-3 h-3 text-amber-500" />
              <span className="text-[10px] text-amber-600">Nhiều hơn chuẩn</span>
            </div>
          )}
        </div>

        <div className="p-3 rounded-xl bg-white border border-slate-200">
          <div className="flex items-center gap-1.5 mb-1">
            <Mic className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-[10px] font-semibold text-slate-500 uppercase">Từ đệm (uh/um)</span>
          </div>
          <div className="text-lg font-black text-slate-800">
            {metrics.filled_pause_count}
            <span className="text-xs font-normal text-slate-400 ml-1">lần</span>
          </div>
          {metrics.filled_pause_count > 3 && (
            <div className="flex items-center gap-1 mt-1">
              <span className="text-[10px] text-slate-400">Chấp nhận được</span>
            </div>
          )}
        </div>
      </div>

      {/* Overall Fluency Score */}
      <div className="p-3 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-blue-800">Điểm Fluency</span>
          <span className={`text-xl font-black ${getScoreColor(metrics.fluency_score)}`}>
            {metrics.fluency_score.toFixed(0)}
            <span className="text-xs font-normal text-blue-600">/100</span>
          </span>
        </div>
      </div>

      {/* Transcript with pauses */}
      {metrics.transcript_with_pauses && (
        <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
          <p className="text-[10px] text-slate-500 mb-1">Transcript với dấu nghỉ:</p>
          <p className="text-xs text-slate-600 italic leading-relaxed">
            {metrics.transcript_with_pauses}
          </p>
        </div>
      )}
    </div>
  );
}
