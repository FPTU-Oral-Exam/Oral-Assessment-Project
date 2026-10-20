'use client';

import React from 'react';
import {
  Award,
  BookOpen,
  CheckCircle,
  HelpCircle,
  Mic,
  Sparkles,
  Volume2,
  X,
  AlertTriangle,
  Flame,
  Clock,
  Activity,
  Layers,
} from 'lucide-react';
import { AudioPlayer } from './AudioPlayer';

export interface ENTCriterionScore {
  name: string;
  score: number;
  max_score: number;
  weight?: number;
  band?: 'Exceeds standard' | 'Meets standard' | 'Attempt made' | 'Insufficient evidence' | string;
  comment?: string;
  description?: string;
}

export interface ENTEnhancedMetrics {
  fluency?: {
    score?: number;
    speech_rate_wps?: number;
    speech_rate_status?: string;
    pause_count?: number;
    pause_ratio?: number;
    filled_pause_count?: number;
    transcript_with_pauses?: string;
  } | null;
  pronunciation?: {
    acoustic_confidence?: number;
    score?: number;
    wer?: number;
    is_valid?: boolean;
    grade?: string;
    grade_description?: string;
    errors?: any;
    feedback?: string;
    details?: any;
  } | null;
  lexical?: {
    total_words?: number;
    unique_words?: number;
    ttr?: number;
    ttr_score?: number;
    vocabulary_level?: string;
    vocabulary_description?: string;
  } | null;
}

export interface ENTScoreAnalysisData {
  attempt_id?: string;
  sequence?: number;
  part_type?: string;
  question_title?: string;
  question_prompt?: string;
  image_url?: string;
  transcript: string;
  stt_confidence?: number | null;
  score: number; // / 10.0
  review_required?: boolean;
  criteria: ENTCriterionScore[];
  enhanced_metrics?: ENTEnhancedMetrics | null;
  feedback?: string;
  reasoning_summary?: string;
  audio_url?: string;
}

interface ENTScoreAnalysisModalProps {
  data: ENTScoreAnalysisData;
  onClose?: () => void;
  isModal?: boolean;
}

export function ENTScoreAnalysisModal({
  data,
  onClose,
  isModal = false,
}: ENTScoreAnalysisModalProps) {
  const getBandBadgeClass = (band?: string) => {
    switch (band) {
      case 'Exceeds standard':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Meets standard':
        return 'bg-sky-50 text-sky-700 border-sky-200';
      case 'Attempt made':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Insufficient evidence':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const getBandLabelVi = (band?: string) => {
    switch (band) {
      case 'Exceeds standard':
        return 'Vượt chuẩn (1.6 - 2.0)';
      case 'Meets standard':
        return 'Đạt chuẩn (1.0 - 1.55)';
      case 'Attempt made':
        return 'Có nỗ lực (0.6 - 0.95)';
      case 'Insufficient evidence':
        return 'Chưa đạt / Không nói (< 0.6)';
      default:
        return band || 'Chưa phân band';
    }
  };

  const content = (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden max-w-3xl w-full text-slate-800 font-sans">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-indigo-50/40">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-indigo-600 text-white text-xs font-bold uppercase tracking-wider">
              {data.part_type || 'ENTs Speaking Task'}
            </span>
            {data.sequence && (
              <span className="text-xs font-semibold text-slate-500">
                Câu {data.sequence}
              </span>
            )}
            {data.review_required && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs font-semibold">
                <AlertTriangle className="w-3 h-3 text-amber-600" />
                Cần duyệt lại
              </span>
            )}
          </div>
          <h2 className="text-base font-bold text-slate-900 mt-1">
            {data.question_title || 'Đánh giá Chi tiết 5 Tiêu chí ENTs'}
          </h2>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-xs font-medium text-slate-500">Tổng điểm AI</div>
            <div className="text-xl font-extrabold text-indigo-600 leading-none">
              {data.score.toFixed(1)} <span className="text-xs font-normal text-slate-400">/ 10.0</span>
            </div>
          </div>
          {isModal && onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
        {/* Question Prompt & Guiding Image */}
        {data.question_prompt && (
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
              Nội dung câu hỏi đề thi
            </div>
            <p className="text-sm font-medium text-slate-800 leading-relaxed">
              {data.question_prompt}
            </p>
            {data.image_url && (
              <div className="mt-3 text-center">
                <img
                  src={data.image_url}
                  alt="Picture Prompt"
                  className="max-h-56 mx-auto rounded-lg shadow-sm border border-slate-200"
                />
              </div>
            )}
          </div>
        )}

        {/* 5 Tiêu chí Đánh giá Chi tiết */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Award className="w-4 h-4 text-indigo-600" />
              Bảng Đánh Giá 5 Tiêu Chí (Thang điểm 2.0 mỗi tiêu chí)
            </h3>
            <span className="text-xs text-slate-500">Trọng số 20% mỗi tiêu chí</span>
          </div>

          <div className="space-y-3">
            {data.criteria.map((c, idx) => (
              <div
                key={c.name || idx}
                className="p-4 rounded-xl border border-slate-200/90 bg-white hover:border-indigo-200 transition-all shadow-sm"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-slate-700 text-xs font-bold">
                      {idx + 1}
                    </span>
                    <span className="font-bold text-slate-900 text-sm">
                      {c.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${getBandBadgeClass(
                        c.band
                      )}`}
                    >
                      {getBandLabelVi(c.band)}
                    </span>
                    <span className="font-extrabold text-sm text-slate-900 min-w-[50px] text-right">
                      {c.score.toFixed(1)}{' '}
                      <span className="text-xs font-normal text-slate-400">/ {c.max_score || 2.0}</span>
                    </span>
                  </div>
                </div>

                {c.comment && (
                  <p className="mt-2 text-xs font-medium text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100 leading-relaxed">
                    💡 <strong className="text-slate-700">Nhận xét:</strong> {c.comment}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Enhanced Acoustic & Fluency Metrics */}
        {data.enhanced_metrics && (
          <div className="p-4 rounded-xl bg-gradient-to-r from-indigo-50/50 via-slate-50 to-purple-50/40 border border-indigo-100 space-y-3">
            <h4 className="text-xs font-bold text-indigo-900 uppercase tracking-wide flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-indigo-600" />
              Chỉ số Đo lường Âm học Thực nghiệm (Acoustic & Fluency Metrics)
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              {data.enhanced_metrics.fluency && (
                <>
                  <div className="p-3 bg-white rounded-lg border border-slate-200/80 shadow-xs">
                    <div className="text-xs text-slate-500 font-medium">Tốc độ nói (WPS)</div>
                    <div className="text-base font-extrabold text-indigo-600 mt-0.5">
                      {data.enhanced_metrics.fluency.speech_rate_wps ?? 0}{' '}
                      <span className="text-xs font-normal text-slate-400">từ/s</span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      {data.enhanced_metrics.fluency.speech_rate_status || 'OPTIMAL'}
                    </div>
                  </div>

                  <div className="p-3 bg-white rounded-lg border border-slate-200/80 shadow-xs">
                    <div className="text-xs text-slate-500 font-medium">Khoảng dừng (≥250ms)</div>
                    <div className="text-base font-extrabold text-amber-600 mt-0.5">
                      {data.enhanced_metrics.fluency.pause_count ?? 0}{' '}
                      <span className="text-xs font-normal text-slate-400">lần</span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      Tỷ lệ: {((data.enhanced_metrics.fluency.pause_ratio ?? 0) * 100).toFixed(0)}%
                    </div>
                  </div>
                </>
              )}

              {data.stt_confidence !== undefined && data.stt_confidence !== null && (
                <div className="p-3 bg-white rounded-lg border border-slate-200/80 shadow-xs">
                  <div className="text-xs text-slate-500 font-medium">Độ tin cậy ASR</div>
                  <div className="text-base font-extrabold text-emerald-600 mt-0.5">
                    {(data.stt_confidence * 100).toFixed(0)}%
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Acoustic Confidence</div>
                </div>
              )}

              {data.enhanced_metrics.lexical && (
                <div className="p-3 bg-white rounded-lg border border-slate-200/80 shadow-xs">
                  <div className="text-xs text-slate-500 font-medium">Độ đa dạng từ vựng</div>
                  <div className="text-base font-extrabold text-purple-600 mt-0.5">
                    TTR {(data.enhanced_metrics.lexical.ttr ?? 0).toFixed(2)}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {data.enhanced_metrics.lexical.vocabulary_level || 'RICH'}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Audio Player & Transcript */}
        <div className="space-y-2">
          <div className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
            <Volume2 className="w-3.5 h-3.5 text-slate-500" />
            File Ghi âm & Bóc tách Lời nói của Học viên
          </div>

          {data.audio_url && (
            <div className="mb-2">
              <AudioPlayer audioUrl={data.audio_url} />
            </div>
          )}

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div className="text-xs font-semibold text-slate-500 mb-1">Transcript từ Server:</div>
            <p className="text-sm font-normal text-slate-800 leading-relaxed italic">
              "{data.transcript || 'Không ghi nhận được transcript.'}"
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
        <span className="text-xs text-slate-500">
          Chấm điểm tự động theo tiêu chuẩn FPTU ENTs Speaking Test
        </span>
        {isModal && onClose && (
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors shadow-sm"
          >
            Đóng bảng điểm
          </button>
        )}
      </div>
    </div>
  );

  if (isModal) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
        {content}
      </div>
    );
  }

  return content;
}

export default ENTScoreAnalysisModal;
