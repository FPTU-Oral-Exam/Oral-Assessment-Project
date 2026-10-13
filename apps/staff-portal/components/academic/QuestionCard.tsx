'use client';

import React, { useState } from 'react';
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

const HAS_IMAGE: QuestionType[] = ['DI'];
const HAS_AUDIO: QuestionType[] = ['RS', 'GD', 'RL', 'SI'];
const HAS_TEXT_PROMPT: QuestionType[] = ['RA', 'ASQ', 'SI', 'DI'];

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

  const showImage = HAS_IMAGE.includes(question.type) && question.media_url;
  const showAudio = HAS_AUDIO.includes(question.type) && question.audio_script;
  const showText = HAS_TEXT_PROMPT.includes(question.type);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden hover:border-blue-300 hover:shadow-sm transition-all flex flex-col">
      {/* ===== MEDIA BLOCK (image for DI) ===== */}
      {showImage && (
        <div
          className="relative bg-slate-100 h-32 cursor-pointer group"
          onClick={() => setLightboxOpen(true)}
        >
          <img
            src={question.media_url}
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
              onClick={() => setIsPlayingAudio(!isPlayingAudio)}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all flex-shrink-0 ${
                isPlayingAudio
                  ? 'bg-rose-600 text-white'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {isPlayingAudio ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
            </button>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
                <Volume2 className="w-3 h-3 text-blue-600" />
                Audio
              </p>
              <p className="text-[10px] text-slate-500 truncate">
                {isPlayingAudio ? 'Đang phát...' : 'Nhấn play để nghe'}
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
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition-colors"
          >
            <Eye className="w-3.5 h-3.5" />
            Xem thử
          </button>
          <button
            onClick={() => onEdit(question)}
            className="flex-1 flex items-center justify-center gap-1 py-2 rounded-xl text-xs font-semibold bg-slate-50 hover:bg-amber-50 text-slate-700 hover:text-amber-700 border border-slate-200 hover:border-amber-300 transition-colors"
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
            className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Lightbox for DI image */}
      {lightboxOpen && question.media_url && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur flex items-center justify-center p-4"
          onClick={() => setLightboxOpen(false)}
        >
          <button
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white"
            onClick={() => setLightboxOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
          <img
            src={question.media_url}
            alt={question.title}
            className="max-w-full max-h-full rounded-lg"
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
