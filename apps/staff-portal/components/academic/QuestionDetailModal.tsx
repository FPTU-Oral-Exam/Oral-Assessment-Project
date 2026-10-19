'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Clock,
  Mic,
  Volume2,
  CheckCircle2,
  Image as ImageIcon,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Award,
} from 'lucide-react';
import { AcademicQuestionItem, QuestionType, QUESTION_TYPES_META } from '@/types/academic';
import { resolveMediaUrl } from './QuestionCard';

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
  ASQ: { bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200', badgeBg: 'bg-cyan-600' },
};

export default function QuestionDetailModal({ question, onClose }: QuestionDetailModalProps) {
  const [phase, setPhase] = useState<'PREP' | 'RECORDING' | 'DONE'>('PREP');
  const [secondsLeft, setSecondsLeft] = useState<number>(question?.prep_time || 25);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const stopAllAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsPlayingAudio(false);
  };

  useEffect(() => {
    stopAllAudio();
    if (!question) return;
    setPhase('PREP');
    setSecondsLeft(question.prep_time);
    setIsTimerRunning(false);
  }, [question]);

  useEffect(() => {
    return () => {
      stopAllAudio();
    };
  }, []);

  const playTTSFallback = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const textToSpeak = question?.audio_script || question?.prompt || '';
      if (!textToSpeak) {
        setIsPlayingAudio(false);
        return;
      }
      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      utterance.lang = 'en-US';
      utterance.rate = 0.95;
      utterance.onstart = () => setIsPlayingAudio(true);
      utterance.onend = () => setIsPlayingAudio(false);
      utterance.onerror = () => setIsPlayingAudio(false);
      window.speechSynthesis.speak(utterance);
    } else {
      setIsPlayingAudio(false);
    }
  };

  const handleToggleAudio = () => {
    if (isPlayingAudio) {
      stopAllAudio();
      return;
    }

    const audioUrl = question?.media_url ? resolveMediaUrl(question.media_url) : '';
    if (audioUrl && (audioUrl.endsWith('.mp3') || audioUrl.endsWith('.wav') || audioUrl.endsWith('.ogg'))) {
      stopAllAudio();
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      setIsPlayingAudio(true);

      audio.play().catch((err) => {
        console.warn('[QuestionDetailModal] File audio failed, using Web Speech TTS fallback:', err);
        playTTSFallback();
      });

      audio.onended = () => {
        setIsPlayingAudio(false);
      };

      audio.onerror = () => {
        console.warn('[QuestionDetailModal] Audio error, using Web Speech TTS fallback');
        playTTSFallback();
      };
    } else {
      playTTSFallback();
    }
  };

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

  const meta = QUESTION_TYPES_META[question.type] || {
    type: question.type,
    name: question.type,
    badge: question.type,
    description: '',
    color: 'text-slate-400',
    bgLight: 'bg-slate-500/10',
    borderColor: 'border-slate-500/30',
    defaultPrepTime: question.prep_time || 30,
    defaultResponseTime: question.response_time || 40,
  };
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
            <h2 className="text-lg font-bold text-slate-900 mb-1">{cleanTitle(question.title, question.type)}</h2>
            <p className="text-xs text-slate-500 flex items-center gap-4">
              <span>Chuẩn bị: <strong className="text-slate-700">{question.prep_time} giây</strong></span>
              <span>Trả lời: <strong className="text-slate-700">{question.response_time} giây</strong></span>
            </p>
          </div>

          {/* Image Display if DI */}
          {question.type === 'DI' && question.media_url && (
            <div className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-50 p-2">
              <img
                src={resolveMediaUrl(question.media_url)}
                alt={question.title}
                className="w-full max-h-72 object-contain rounded-xl mx-auto"
              />
            </div>
          )}

          {/* Audio Script / Player if needed */}
          {(question.audio_script || question.media_url) && (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
                  <Volume2 className="w-4 h-4 text-blue-600" />
                  <span>Kịch bản âm thanh đầu vào (Audio Prompt Script):</span>
                </div>
                <button
                  type="button"
                  onClick={handleToggleAudio}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-xs ${
                    isPlayingAudio
                      ? 'bg-rose-600 text-white animate-pulse'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  {isPlayingAudio ? (
                    <>
                      <Pause className="w-3.5 h-3.5" />
                      <span>Dừng phát</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5" />
                      <span>Nghe Audio</span>
                    </>
                  )}
                </button>
              </div>
              {question.audio_script && (
                <p className="text-sm font-serif italic text-slate-700 leading-relaxed bg-white p-3 rounded-lg border border-slate-200/80">
                  "{question.audio_script}"
                </p>
              )}
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
        <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50/80 flex items-center justify-end">
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

/**
 * Làm sạch tiêu đề đang lưu dạng "Answer Short Question #SSQ1733276770014"
 * → lấy phần trước dấu '#'
 */
function cleanTitle(rawTitle: string, _type: string): string {
  if (!rawTitle) return '';
  const hashIndex = rawTitle.indexOf('#');
  const cleaned = hashIndex > 0 ? rawTitle.substring(0, hashIndex).trim() : rawTitle;
  return cleaned.length > 100 ? cleaned.substring(0, 100) + '...' : cleaned;
}
