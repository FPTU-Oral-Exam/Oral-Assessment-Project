'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Eye,
  Edit2,
  Trash2,
  Image as ImageIcon,
  Play,
  Pause,
  Volume2,
  X,
  BookOpen,
} from 'lucide-react';
import { AcademicQuestionItem, QuestionType } from '@/types/academic';
import { useAcademic } from '@/context/AcademicContext';

const TYPE_META: Record<QuestionType, { label: string; bg: string; text: string; dot: string }> = {
  GENERAL_INTERVIEW: { label: 'Phỏng vấn chung', bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  PICTURE_DESCRIPTION: { label: 'Mô tả hình ảnh', bg: 'bg-amber-50', text: 'text-amber-800', dot: 'bg-amber-500' },
  TOPIC_MONOLOGUE: { label: 'Thuyết trình độc thoại', bg: 'bg-indigo-50', text: 'text-indigo-700', dot: 'bg-indigo-500' },
  DEEP_DISCUSSION: { label: 'Thảo luận chuyên sâu', bg: 'bg-purple-50', text: 'text-purple-700', dot: 'bg-purple-500' },
  RA: { label: 'Đọc to', bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
  RS: { label: 'Lặp câu', bg: 'bg-purple-50', text: 'text-purple-700', dot: 'bg-purple-500' },
  GD: { label: 'Thảo luận', bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  DI: { label: 'Mô tả ảnh', bg: 'bg-amber-50', text: 'text-amber-800', dot: 'bg-amber-500' },
  SI: { label: 'Chỉ dẫn', bg: 'bg-rose-50', text: 'text-rose-700', dot: 'bg-rose-500' },
  RL: { label: 'Kể lại', bg: 'bg-indigo-50', text: 'text-indigo-700', dot: 'bg-indigo-500' },
  ASQ: { label: 'Trả lời ngắn', bg: 'bg-cyan-50', text: 'text-cyan-700', dot: 'bg-cyan-500' },
};

const DIFFICULTY_META = {
  EASY: { label: 'Dễ', bg: 'bg-emerald-50 text-emerald-700' },
  MEDIUM: { label: 'Vừa', bg: 'bg-amber-50 text-amber-700' },
  HARD: { label: 'Khó', bg: 'bg-rose-50 text-rose-700' },
};

const HAS_IMAGE: QuestionType[] = ['DI', 'PICTURE_DESCRIPTION'];
const HAS_AUDIO: QuestionType[] = ['RS', 'GD', 'RL', 'SI', 'GENERAL_INTERVIEW', 'DEEP_DISCUSSION'];
const HAS_TEXT_PROMPT: QuestionType[] = [
  'RA',
  'ASQ',
  'SI',
  'DI',
  'GENERAL_INTERVIEW',
  'PICTURE_DESCRIPTION',
  'TOPIC_MONOLOGUE',
  'DEEP_DISCUSSION',
];

export function resolveMediaUrl(url?: string): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('/')) return url;
  return `/${url}`;
}

interface QuestionCardProps {
  question: AcademicQuestionItem;
  onPreview: (q: AcademicQuestionItem) => void;
  onEdit: (q: AcademicQuestionItem) => void;
}

export default function QuestionCard({ question, onPreview, onEdit }: QuestionCardProps) {
  const { deleteQuestion } = useAcademic();
  const meta = TYPE_META[question.type] || TYPE_META.RA;
  const diff = DIFFICULTY_META[question.difficulty] || DIFFICULTY_META.MEDIUM;

  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const showImage = HAS_IMAGE.includes(question.type) && question.media_url;
  const showAudio = HAS_AUDIO.includes(question.type) && (question.audio_script || question.media_url);
  const showText = HAS_TEXT_PROMPT.includes(question.type);

  // Dọn dẹp âm thanh khi component unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const playTTSFallback = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const textToSpeak = question.audio_script || question.prompt || '';
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
      if (audioRef.current) {
        audioRef.current.pause();
      }
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      setIsPlayingAudio(false);
      return;
    }

    const audioUrl = question.media_url ? resolveMediaUrl(question.media_url) : '';
    if (audioUrl && (audioUrl.endsWith('.mp3') || audioUrl.endsWith('.wav') || audioUrl.endsWith('.ogg'))) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      setIsPlayingAudio(true);

      audio.play().catch((err) => {
        console.warn('[QuestionCard] File audio failed, using Web Speech TTS fallback:', err);
        playTTSFallback();
      });

      audio.onended = () => {
        setIsPlayingAudio(false);
      };

      audio.onerror = () => {
        console.warn('[QuestionCard] Audio file error, using Web Speech TTS fallback');
        playTTSFallback();
      };
    } else {
      playTTSFallback();
    }
  };

  const resolvedImageUrl = resolveMediaUrl(question.media_url);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden hover:border-blue-300 hover:shadow-sm transition-all flex flex-col">
      {/* ===== MEDIA BLOCK (image for DI) ===== */}
      {showImage && resolvedImageUrl && (
        <div
          className="relative bg-slate-100 h-32 cursor-pointer group overflow-hidden"
          onClick={() => setLightboxOpen(true)}
        >
          <img
            src={resolvedImageUrl}
            alt={question.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          <div className="absolute bottom-2 left-2 bg-slate-900/80 backdrop-blur text-[10px] text-amber-300 px-2 py-0.5 rounded flex items-center gap-1 border border-amber-500/30 font-semibold">
            <ImageIcon className="w-3 h-3" />
            Biểu đồ / Hình ảnh
          </div>
        </div>
      )}

      <div className="p-5 flex-1 flex flex-col">
        {/* Header: type + difficulty */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${meta.bg} ${meta.text}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
              {question.type}
            </span>
            <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${diff.bg}`}>
              {diff.label}
            </span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">
            {question.prep_time}s | {question.response_time}s
          </span>
        </div>

        {/* Title (clean, no code suffix) */}
        <h3 className="text-sm font-bold text-slate-900 mb-2 leading-snug line-clamp-2">
          {cleanTitle(question.title, question.type)}
        </h3>

        {/* Audio Player for RS/RL/GD/SI */}
        {showAudio && (
          <div className="mb-3 p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleToggleAudio}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all flex-shrink-0 cursor-pointer shadow-xs ${
                isPlayingAudio
                  ? 'bg-rose-600 text-white animate-pulse'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
              title={isPlayingAudio ? 'Dừng phát âm thanh' : 'Nghe âm thanh câu hỏi'}
            >
              {isPlayingAudio ? (
                <Pause className="w-3.5 h-3.5" />
              ) : (
                <Play className="w-3.5 h-3.5 ml-0.5" />
              )}
            </button>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
                <Volume2 className="w-3 h-3 text-blue-600" />
                Audio Prompt
              </p>
              <p className="text-[10px] text-slate-500 truncate">
                {isPlayingAudio ? 'Đang phát âm thanh...' : (question.media_url ? 'Âm thanh mẫu' : 'Giọng đọc chuẩn AI')}
              </p>
            </div>
          </div>
        )}

        {/* Text prompt for RA/SI/DI/ASQ */}
        {showText && question.prompt && (
          <p className="text-xs text-slate-600 leading-relaxed mb-3 line-clamp-3">
            {question.prompt}
          </p>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-3 border-t border-slate-100 mt-auto">
          <button
            onClick={() => onPreview(question)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition-colors cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5" />
            Xem thử
          </button>
          <button
            onClick={() => onEdit(question)}
            className="flex-1 flex items-center justify-center gap-1 py-2 rounded-xl text-xs font-semibold bg-slate-50 hover:bg-amber-50 text-slate-700 hover:text-amber-700 border border-slate-200 hover:border-amber-300 transition-colors cursor-pointer"
          >
            <Edit2 className="w-3.5 h-3.5" />
            Sửa
          </button>
          <button
            onClick={() => {
              if (confirm(`Xóa câu hỏi "${question.title}"?`)) {
                deleteQuestion(question.id);
              }
            }}
            className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors cursor-pointer"
            title="Xóa câu hỏi"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Lightbox for DI image */}
      {lightboxOpen && resolvedImageUrl && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setLightboxOpen(false)}
        >
          <button
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white cursor-pointer"
            onClick={() => setLightboxOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
          <img
            src={resolvedImageUrl}
            alt={question.title}
            className="max-w-full max-h-[85vh] rounded-xl shadow-2xl object-contain bg-white p-2"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}

/**
 * Làm sạch tiêu đề đang lưu dạng "Answer Short Question #SSQ1733276770014"
 * → lấy phần trước dấu '#', hoặc dùng prompt ngắn
 */
function cleanTitle(rawTitle: string, type: QuestionType): string {
  if (!rawTitle) {
    const fallback = TYPE_META[type]?.label || type;
    return fallback;
  }
  const hashIndex = rawTitle.indexOf('#');
  const cleaned = hashIndex > 0 ? rawTitle.substring(0, hashIndex).trim() : rawTitle;
  return cleaned.length > 80 ? cleaned.substring(0, 80) + '...' : cleaned;
}
