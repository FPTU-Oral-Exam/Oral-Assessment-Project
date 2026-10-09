'use client';

import { FluencyMetricsPanel } from './FluencyMetricsPanel';
import { PronunciationMetricsPanel } from './PronunciationMetricsPanel';
import { LexicalMetricsPanel } from './LexicalMetricsPanel';
import {
  Activity,
  Mic2,
  BookOpen,
  BrainCircuit,
  ChevronDown,
  ChevronUp,
  Sparkles
} from 'lucide-react';
import { useState } from 'react';

interface EnhancedMetrics {
  fluency: {
    score: number;
    speech_rate_wps: number;
    speech_rate_status: string;
    pause_count: number;
    pause_ratio: number;
    filled_pause_count: number;
    transcript_with_pauses?: string;
  } | null;
  pronunciation: {
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
  } | null;
  lexical: {
    total_words: number;
    unique_words: number;
    ttr: number;
    ttr_score: number;
    vocabulary_level: string;
    vocabulary_description: string;
  } | null;
}

interface EnhancedMetricsPanelProps {
  metrics: EnhancedMetrics | null;
  overallScore?: number;
}

export function EnhancedMetricsPanel({ metrics, overallScore }: EnhancedMetricsPanelProps) {
  const [expandedSection, setExpandedSection] = useState<string | null>('all');

  if (!metrics) {
    return (
      <div className="p-4 rounded-xl bg-gradient-to-r from-slate-50 to-slate-100 border border-slate-200">
        <div className="flex items-center gap-2 text-slate-400 text-xs">
          <Sparkles className="w-4 h-4" />
          <span>Chưa có dữ liệu Enhanced Metrics (AI Analysis)</span>
        </div>
      </div>
    );
  }

  // Radar chart metrics
  const radarAxes = [
    { label: 'Fluency', score: Math.round(metrics.fluency?.score ?? 0), angle: -Math.PI / 2 },
    { label: 'Pronunciation', score: Math.round(metrics.pronunciation?.score ?? metrics.fluency?.score ?? 0), angle: 0 },
    { label: 'Vocabulary', score: Math.round(metrics.lexical?.ttr_score ?? 0), angle: Math.PI / 2 },
    { label: 'Content', score: Math.round(overallScore ?? 0), angle: Math.PI },
  ];

  const cx = 160;
  const cy = 105;
  const maxR = 68;

  // Build polygon points for the data
  const dataPoints = radarAxes.map(axis => {
    const r = (Math.max(0, Math.min(100, axis.score)) / 100) * maxR;
    return {
      x: cx + r * Math.cos(axis.angle),
      y: cy + r * Math.sin(axis.angle),
      ...axis,
    };
  });
  const dataPolygonString = dataPoints.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

  const toggleSection = (section: string) => {
    if (expandedSection === section) {
      setExpandedSection(null);
    } else {
      setExpandedSection(section);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header with Radar Chart */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-600" />
            <span className="text-sm font-bold text-indigo-800">Phân tích Nâng cao (AI Metrics)</span>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-semibold">
            v2.0
          </span>
        </div>

        {/* SVG Radar Chart */}
        <div className="w-full flex justify-center py-1">
          <svg viewBox="0 0 320 215" className="w-full max-w-[320px] h-48 select-none">
            {/* Concentric webs (25%, 50%, 75%, 100%) */}
            {[0.25, 0.5, 0.75, 1.0].map((level, idx) => {
              const r = maxR * level;
              const points = radarAxes
                .map(a => `${(cx + r * Math.cos(a.angle)).toFixed(1)},${(cy + r * Math.sin(a.angle)).toFixed(1)}`)
                .join(' ');
              return (
                <polygon
                  key={idx}
                  points={points}
                  fill="none"
                  stroke="#e2e8f0"
                  strokeWidth={idx === 3 ? 1.5 : 1}
                />
              );
            })}

            {/* Axis Spokes */}
            {radarAxes.map((axis, idx) => {
              const x2 = cx + maxR * Math.cos(axis.angle);
              const y2 = cy + maxR * Math.sin(axis.angle);
              return (
                <line
                  key={idx}
                  x1={cx}
                  y1={cy}
                  x2={x2}
                  y2={y2}
                  stroke="#cbd5e1"
                  strokeWidth="1"
                  strokeDasharray="3 3"
                />
              );
            })}

            {/* Data Polygon */}
            <polygon
              points={dataPolygonString}
              fill="rgba(99, 102, 241, 0.25)"
              stroke="#6366f1"
              strokeWidth="2.2"
            />

            {/* Vertex Dots */}
            {dataPoints.map((pt, idx) => (
              <circle
                key={idx}
                cx={pt.x}
                cy={pt.y}
                r="4"
                fill="#4f46e5"
                stroke="#ffffff"
                strokeWidth="1.5"
              />
            ))}

            {/* Labels and values */}
            {/* Top: Fluency */}
            <text x={cx} y={cy - maxR - 10} textAnchor="middle" className="text-[11px] font-semibold fill-slate-700">
              Fluency ({dataPoints[0].score})
            </text>

            {/* Right: Pronunciation */}
            <text x={cx + maxR + 10} y={cy + 4} textAnchor="start" className="text-[11px] font-semibold fill-slate-700">
              Pronun ({dataPoints[1].score})
            </text>

            {/* Bottom: Vocabulary */}
            <text x={cx} y={cy + maxR + 18} textAnchor="middle" className="text-[11px] font-semibold fill-slate-700">
              Vocab ({dataPoints[2].score})
            </text>

            {/* Left: Content */}
            <text x={cx - maxR - 10} y={cy + 4} textAnchor="end" className="text-[11px] font-semibold fill-slate-700">
              Content ({dataPoints[3].score})
            </text>
          </svg>
        </div>
      </div>

      {/* Quick Summary */}
      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={() => toggleSection('fluency')}
          className={`p-3 rounded-xl border text-left transition-all ${
            expandedSection === 'fluency' || expandedSection === 'all'
              ? 'bg-blue-50 border-blue-200'
              : 'bg-white border-slate-200 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center gap-1.5 mb-1">
            <Activity className="w-3.5 h-3.5 text-blue-600" />
            <span className="text-[10px] font-semibold text-slate-500 uppercase">Fluency</span>
          </div>
          <div className="text-lg font-black text-slate-800">
            {metrics.fluency?.score?.toFixed(0) ?? '-'}
            <span className="text-xs font-normal text-slate-400">/100</span>
          </div>
        </button>

        <button
          onClick={() => toggleSection('pronunciation')}
          className={`p-3 rounded-xl border text-left transition-all ${
            expandedSection === 'pronunciation' || expandedSection === 'all'
              ? 'bg-purple-50 border-purple-200'
              : 'bg-white border-slate-200 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center gap-1.5 mb-1">
            <Mic2 className="w-3.5 h-3.5 text-purple-600" />
            <span className="text-[10px] font-semibold text-slate-500 uppercase">Pronun.</span>
          </div>
          <div className="text-lg font-black text-slate-800">
            {metrics.pronunciation?.score?.toFixed(0) ?? metrics.fluency?.score?.toFixed(0) ?? '-'}
            <span className="text-xs font-normal text-slate-400">/100</span>
          </div>
        </button>

        <button
          onClick={() => toggleSection('lexical')}
          className={`p-3 rounded-xl border text-left transition-all ${
            expandedSection === 'lexical' || expandedSection === 'all'
              ? 'bg-green-50 border-green-200'
              : 'bg-white border-slate-200 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center gap-1.5 mb-1">
            <BookOpen className="w-3.5 h-3.5 text-green-600" />
            <span className="text-[10px] font-semibold text-slate-500 uppercase">Lexical</span>
          </div>
          <div className="text-lg font-black text-slate-800">
            {metrics.lexical?.ttr_score?.toFixed(0) ?? '-'}
            <span className="text-xs font-normal text-slate-400">/100</span>
          </div>
        </button>
      </div>

      {/* Expanded Sections */}
      {(expandedSection === 'all' || expandedSection === 'fluency') && (
        <FluencyMetricsPanel
          metrics={metrics.fluency ? {
            speech_rate_wps: metrics.fluency.speech_rate_wps,
            speech_rate_status: metrics.fluency.speech_rate_status,
            fluency_score: metrics.fluency.score,
            pause_count: metrics.fluency.pause_count,
            pause_ratio: metrics.fluency.pause_ratio,
            filled_pause_count: metrics.fluency.filled_pause_count,
            transcript_with_pauses: metrics.fluency.transcript_with_pauses,
          } : null}
        />
      )}

      {(expandedSection === 'all' || expandedSection === 'pronunciation') && (
        <PronunciationMetricsPanel
          metrics={metrics.pronunciation}
        />
      )}

      {(expandedSection === 'all' || expandedSection === 'lexical') && (
        <LexicalMetricsPanel
          metrics={metrics.lexical}
        />
      )}

      {/* Expand/Collapse All */}
      <button
        onClick={() => setExpandedSection(expandedSection === 'all' ? null : 'all')}
        className="w-full py-2 text-xs font-semibold text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition-all flex items-center justify-center gap-1"
      >
        {expandedSection === 'all' ? (
          <>
            <ChevronUp className="w-4 h-4" />
            Thu gọn
          </>
        ) : (
          <>
            <ChevronDown className="w-4 h-4" />
            Xem chi tiết
          </>
        )}
      </button>
    </div>
  );
}
