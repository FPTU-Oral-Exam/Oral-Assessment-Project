'use client';

import React from 'react';
import {
  X,
  Clock,
  Sparkles,
  CheckCircle2,
  Dice5,
  Layers,
  FileCheck2,
  Volume2,
  Image as ImageIcon,
} from 'lucide-react';
import { GeneratedSampleExam, QUESTION_TYPES_META, QuestionType } from '@/types/academic';

interface SampleExamPreviewModalProps {
  exam: GeneratedSampleExam | null;
  onClose: () => void;
  onReRoll: () => void;
}

const TYPE_LIGHT_THEME: Record<
  QuestionType,
  { bg: string; text: string; border: string; badgeBg: string }
> = {
  GENERAL_INTERVIEW: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', badgeBg: 'bg-emerald-600' },
  PICTURE_DESCRIPTION: { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200', badgeBg: 'bg-amber-600' },
  TOPIC_MONOLOGUE: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', badgeBg: 'bg-indigo-600' },
  DEEP_DISCUSSION: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', badgeBg: 'bg-purple-600' },
  RA: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', badgeBg: 'bg-blue-600' },
  RS: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', badgeBg: 'bg-purple-600' },
  GD: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', badgeBg: 'bg-emerald-600' },
  DI: { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200', badgeBg: 'bg-amber-600' },
  SI: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', badgeBg: 'bg-rose-600' },
  RL: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', badgeBg: 'bg-indigo-600' },
  ASQ: { bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200', badgeBg: 'bg-cyan-600' },
};

export default function SampleExamPreviewModal({
  exam,
  onClose,
  onReRoll,
}: SampleExamPreviewModalProps) {
  if (!exam) return null;

  const durationMinutes = Math.round(exam.total_duration_seconds / 60);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="p-1 rounded-lg bg-blue-50 text-blue-600 border border-blue-200">
                <FileCheck2 className="w-5 h-5" />
              </span>
              <h2 className="text-lg font-bold text-slate-900">
                Đề thi Mẫu Sinh Ngẫu nhiên theo Ma trận
              </h2>
              <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full font-mono font-bold">
                {exam.id}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Áp dụng ma trận: <strong className="text-slate-800">{exam.matrix_name}</strong>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onReRoll}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-xs transition-colors"
            >
              <Dice5 className="w-4 h-4 text-amber-500" />
              <span>Sinh lại (Re-roll)</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Stats Strip */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-3 flex items-center gap-6 text-xs text-slate-600 flex-wrap">
          <div className="flex items-center gap-1.5 font-semibold">
            <Layers className="w-4 h-4 text-blue-600" />
            <span>Tổng số câu hỏi: <strong className="text-slate-900">{exam.total_questions}</strong> câu</span>
          </div>

          <div className="flex items-center gap-1.5 font-semibold">
            <Clock className="w-4 h-4 text-amber-600" />
            <span>
              Thời lượng dự kiến: ~<strong className="text-slate-900">{durationMinutes}</strong> phút ({exam.total_duration_seconds}s)
            </span>
          </div>

          <div className="flex items-center gap-1.5 font-semibold">
            <Sparkles className="w-4 h-4 text-purple-600" />
            <span>Độ phủ cấu trúc: <strong className="text-emerald-700">100% Khảo thí Oral</strong></span>
          </div>
        </div>

        {/* Questions List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {(exam.items || []).map((item, index) => {
            const meta = QUESTION_TYPES_META[item.type] || {
              type: item.type,
              name: item.type,
              badge: item.type,
              description: '',
              color: 'text-slate-400',
              bgLight: 'bg-slate-500/10',
              borderColor: 'border-slate-500/30',
              defaultPrepTime: item.prep_time || 30,
              defaultResponseTime: item.response_time || 40,
            };
            const typeStyle = TYPE_LIGHT_THEME[item.type] || TYPE_LIGHT_THEME.RA;

            return (
              <div
                key={item.id}
                className="bg-white border border-slate-200 rounded-xl p-4 hover:border-slate-300 transition-colors shadow-xs"
              >
                <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center font-mono">
                      #{index + 1}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-md text-xs font-bold border flex items-center gap-1.5 ${typeStyle.bg} ${typeStyle.text} ${typeStyle.border}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${typeStyle.badgeBg}`} />
                      <span>{item.type} · {meta?.name || item.type}</span>
                    </span>
                    <span className="font-mono text-xs font-semibold text-slate-500">
                      {item.code}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
                    <span>Prep: {item.prep_time}s</span>
                    <span>|</span>
                    <span>Resp: {item.response_time}s</span>
                  </div>
                </div>

                <h4 className="text-sm font-bold text-slate-900 mb-1">{item.title}</h4>

                {item.type === 'DI' && item.media_url && (
                  <div className="my-2 max-w-sm rounded-lg overflow-hidden border border-slate-200">
                    <img src={item.media_url} alt={item.title} className="w-full h-28 object-cover" />
                  </div>
                )}

                {item.audio_script && (
                  <div className="my-1.5 p-2 rounded bg-slate-50 border border-slate-200 text-xs text-slate-600 font-serif italic">
                    ♫ "{item.audio_script}"
                  </div>
                )}

                <p className="text-xs text-slate-700 line-clamp-2 mt-1">{item.prompt}</p>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50/80 flex items-center justify-between">
          <p className="text-xs text-slate-500">
            Đề thi được xáo trộn ngẫu nhiên từ kho câu hỏi đã duyệt theo ma trận.
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors"
          >
            Đóng xem trước
          </button>
        </div>
      </div>
    </div>
  );
}
