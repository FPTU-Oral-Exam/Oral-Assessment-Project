'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Clock,
  Mic,
  Volume2,
  CheckCircle2,
  Image as ImageIcon,
  Play,
  RotateCcw,
  Sparkles,
  Award,
} from 'lucide-react';
import { AcademicQuestionItem, QuestionType, QUESTION_TYPES_META } from '@/types/academic';

interface QuestionDetailModalProps {
  question: AcademicQuestionItem | null;
  onClose: () => void;
}

const TYPE_LIGHT_THEME: Record<
  QuestionType,
  { bg: string; text: string; border: string; badgeBg: string }
> = {
  RA: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', badgeBg: 'bg-blue-600' },
  RS: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', badgeBg: 'bg-purple-600' },
  GD: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', badgeBg: 'bg-emerald-600' },
  DI: { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200', badgeBg: 'bg-amber-600' },
  SI: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', badgeBg: 'bg-rose-600' },
  RL: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', badgeBg: 'bg-indigo-600' },
};

export default function QuestionDetailModal({ question, onClose }: QuestionDetailModalProps) {
  const [phase, setPhase] = useState<'PREP' | 'RECORDING' | 'DONE'>('PREP');
  const [secondsLeft, setSecondsLeft] = useState<number>(question?.prep_time || 25);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);

  useEffect(() => {
    if (!question) return;
    setPhase('PREP');
    setSecondsLeft(question.prep_time);
    setIsTimerRunning(false);
  }, [question]);

  useEffect(() => {
    if (!isTimerRunning) return;

    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          if (phase === 'PREP') {
            setPhase('RECORDING');
            return question?.response_time || 40;
          } else {
            setPhase('DONE');
            setIsTimerRunning(false);
            return 0;
          }
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isTimerRunning, phase, question]);

  if (!question) return null;

  const meta = QUESTION_TYPES_META[question.type];
  const typeStyle = TYPE_LIGHT_THEME[question.type] || TYPE_LIGHT_THEME.RA;

  const handleResetTimer = () => {
    setPhase('PREP');
    setSecondsLeft(question.prep_time);
    setIsTimerRunning(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span
              className={`px-3 py-1 rounded-lg text-xs font-bold border flex items-center gap-1.5 ${typeStyle.bg} ${typeStyle.text} ${typeStyle.border}`}
            >
              <span className={`w-2 h-2 rounded-full ${typeStyle.badgeBg}`} />
              <span>{question.type} · {meta.name}</span>
            </span>
            <span className="font-mono text-xs font-bold text-slate-700 bg-slate-200/80 px-2 py-0.5 rounded-md">
              {question.code}
            </span>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Simulation Timer Bar */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div
                className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm shadow-xs ${
                  phase === 'PREP'
                    ? 'bg-amber-100 text-amber-700 border border-amber-300'
                    : phase === 'RECORDING'
                    ? 'bg-rose-100 text-rose-700 border border-rose-300 animate-pulse'
                    : 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                }`}
              >
                {phase === 'PREP' ? (
                  <Clock className="w-5 h-5" />
                ) : phase === 'RECORDING' ? (
                  <Mic className="w-5 h-5" />
                ) : (
                  <CheckCircle2 className="w-5 h-5" />
                )}
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider font-bold text-slate-500">
                  {phase === 'PREP'
                    ? 'Thời gian chuẩn bị (Prep Time)'
                    : phase === 'RECORDING'
                    ? 'Đang ghi âm câu trả lời'
                    : 'Đã hoàn thành'}
                </p>
                <p className="text-2xl font-mono font-black text-slate-900">
                  00:{secondsLeft < 10 ? `0${secondsLeft}` : secondsLeft}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsTimerRunning(!isTimerRunning)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  isTimerRunning
                    ? 'bg-amber-100 text-amber-800 border border-amber-300 hover:bg-amber-200'
                    : 'bg-blue-600 text-white hover:bg-blue-700 shadow-xs'
                }`}
              >
                {isTimerRunning ? (
                  <span>Tạm dừng</span>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5" />
                    <span>Mô phỏng thi</span>
                  </>
                )}
              </button>

              <button
                onClick={handleResetTimer}
                title="Đặt lại đồng hồ"
                className="p-2 text-slate-500 hover:text-slate-800 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-xs"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Title & Specs */}
          <div>
            <h2 className="text-lg font-bold text-slate-900 mb-1">{question.title}</h2>
            <p className="text-xs text-slate-500 flex items-center gap-4">
              <span>Chuẩn bị: <strong className="text-slate-700">{question.prep_time} giây</strong></span>
              <span>Trả lời: <strong className="text-slate-700">{question.response_time} giây</strong></span>
              <span>Đã xuất hiện: <strong className="text-slate-700">{question.usage_count} lần</strong></span>
            </p>
          </div>

          {/* Image Display if DI */}
          {question.type === 'DI' && question.media_url && (
            <div className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-50 p-2">
              <img
                src={question.media_url}
                alt={question.title}
                className="w-full max-h-72 object-contain rounded-xl mx-auto"
              />
            </div>
          )}

          {/* Audio Script / Simulation if needed */}
          {question.audio_script && (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                <Volume2 className="w-4 h-4 text-blue-600" />
                <span>Kịch bản âm thanh đầu vào (Audio Prompt Script):</span>
              </div>
              <p className="text-sm font-serif italic text-slate-700 leading-relaxed bg-white p-3 rounded-lg border border-slate-200/80">
                "{question.audio_script}"
              </p>
            </div>
          )}

          {/* Main Prompt Text */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              Nội dung câu hỏi / Đề bài:
            </h3>
            <p className="text-sm text-slate-800 leading-relaxed font-medium">
              {question.prompt}
            </p>
          </div>

          {/* Key Points for AI Grading */}
          {question.key_points && question.key_points.length > 0 && (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5">
                <Sparkles className="w-4 h-4 text-amber-600" />
                <span>Luận điểm trọng tâm để AI so khớp chấm điểm (RAG & Rubric):</span>
              </div>
              <ul className="space-y-1.5">
                {question.key_points.map((kp, idx) => (
                  <li
                    key={idx}
                    className="text-xs text-slate-700 flex items-start gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200/80"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-1.5 shrink-0" />
                    <span>{kp}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Sample Answer */}
          {question.sample_answer && (
            <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 uppercase tracking-wider mb-2">
                <Award className="w-4 h-4 text-emerald-600" />
                <span>Câu trả lời tham khảo chuẩn (Sample Response):</span>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed bg-white p-3 rounded-lg border border-emerald-200/70 font-sans">
                {question.sample_answer}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50/80 flex items-center justify-between">
          <div className="flex items-center gap-1.5 flex-wrap">
            {question.tags.map((t, idx) => (
              <span
                key={idx}
                className="text-[11px] bg-white text-slate-600 border border-slate-200 px-2 py-0.5 rounded-md font-medium"
              >
                #{t}
              </span>
            ))}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-200 hover:bg-slate-300 text-slate-800 transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
