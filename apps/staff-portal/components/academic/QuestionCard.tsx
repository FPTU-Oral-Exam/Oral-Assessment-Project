'use client';

import React, { useState } from 'react';
import {
  Clock,
  Volume2,
  Image as ImageIcon,
  CheckCircle2,
  Eye,
  Edit2,
  Trash2,
  Play,
  Pause,
  Layers,
  Sparkles,
} from 'lucide-react';
import { AcademicQuestionItem, QuestionType, QUESTION_TYPES_META } from '@/types/academic';
import { useAcademic } from '@/context/AcademicContext';

interface QuestionCardProps {
  question: AcademicQuestionItem;
  onPreview: (q: AcademicQuestionItem) => void;
  onEdit: (q: AcademicQuestionItem) => void;
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

export default function QuestionCard({ question, onPreview, onEdit }: QuestionCardProps) {
  const { deleteQuestion, approveQuestion } = useAcademic();
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [showFullPrompt, setShowFullPrompt] = useState(false);

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

  const difficultyColors = {
    EASY: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    MEDIUM: 'bg-amber-50 text-amber-700 border-amber-200',
    HARD: 'bg-rose-50 text-rose-700 border-rose-200',
  };

  const handleToggleAudio = () => {
    setIsPlayingAudio(!isPlayingAudio);
  };

  const handleDelete = () => {
    if (confirm(`Bạn có chắc chắn muốn xóa câu hỏi [${question.code}] không?`)) {
      deleteQuestion(question.id);
    }
  };

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-5 hover:border-blue-300 hover:shadow-md transition-all flex flex-col justify-between group">
      <div>
        {/* Top Header Row */}
        <div className="flex items-center justify-between gap-2.5 mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Type Badge */}
            <span
              className={`px-2.5 py-1 rounded-lg text-xs font-bold border flex items-center gap-1.5 ${typeStyle.bg} ${typeStyle.text} ${typeStyle.border}`}
            >
              <span className={`w-2 h-2 rounded-full ${typeStyle.badgeBg}`} />
              <span>{question.type} · {meta?.name || question.type}</span>
            </span>

            {/* Code */}
            <span className="font-mono text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
              {question.code}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Difficulty Badge */}
            <span
              className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${
                difficultyColors[question.difficulty]
              }`}
            >
              {question.difficulty === 'EASY'
                ? 'Dễ'
                : question.difficulty === 'MEDIUM'
                ? 'Vừa'
                : 'Khó'}
            </span>

            {/* Status Badge */}
            {question.status === 'APPROVED' ? (
              <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                <span>Đã duyệt</span>
              </span>
            ) : (
              <button
                onClick={() => approveQuestion(question.id)}
                title="Bấm để phê duyệt câu hỏi này"
                className="flex items-center gap-1 text-[11px] font-semibold text-slate-600 bg-slate-50 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 border border-slate-200 px-2 py-0.5 rounded transition-all"
              >
                <Clock className="w-3 h-3" />
                <span>Duyệt nhanh</span>
              </button>
            )}
          </div>
        </div>

        {/* Title */}
        <h3 className="text-base font-bold text-slate-900 mb-2 group-hover:text-blue-600 transition-colors leading-snug">
          {question.title}
        </h3>

        {/* Media Preview Block (Image for DI) */}
        {question.type === 'DI' && question.media_url && (
          <div className="mb-3 relative rounded-xl overflow-hidden border border-slate-200 bg-slate-50 max-h-48 group/img">
            <img
              src={question.media_url}
              alt={question.title}
              className="w-full h-36 object-cover hover:scale-105 transition-transform duration-300"
            />
            <div className="absolute bottom-2 left-2 bg-slate-900/80 backdrop-blur text-[11px] text-amber-300 px-2 py-0.5 rounded flex items-center gap-1 border border-amber-500/30">
              <ImageIcon className="w-3 h-3" />
              <span>Biểu đồ / Hình ảnh mô tả</span>
            </div>
          </div>
        )}

        {/* Audio Player Prompt (for RS, RL, GD, SI) */}
        {(question.type === 'RS' ||
          question.type === 'RL' ||
          question.type === 'GD' ||
          question.type === 'SI') && (
          <div className="mb-3 p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <button
                onClick={handleToggleAudio}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                  isPlayingAudio
                    ? 'bg-amber-600 text-white'
                    : 'bg-blue-600 text-white hover:bg-blue-700 shadow-xs'
                }`}
              >
                {isPlayingAudio ? (
                  <Pause className="w-3.5 h-3.5" />
                ) : (
                  <Play className="w-3.5 h-3.5 ml-0.5" />
                )}
              </button>
              <div>
                <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Volume2 className="w-3.5 h-3.5 text-blue-600" />
                  <span>Audio Prompt ({question.type})</span>
                </p>
                <p className="text-[11px] text-slate-500">
                  {isPlayingAudio ? 'Đang phát âm thanh mẫu...' : 'Nhấn để nghe thử file âm thanh'}
                </p>
              </div>
            </div>

            {question.audio_script && (
              <span className="text-[10px] font-semibold text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded shadow-xs">
                Có kịch bản
              </span>
            )}
          </div>
        )}

        {/* Prompt Content */}
        <div className="text-sm text-slate-700 leading-relaxed mb-3">
          <p className={showFullPrompt ? '' : 'line-clamp-3'}>{question.prompt}</p>
          {question.prompt.length > 180 && (
            <button
              onClick={() => setShowFullPrompt(!showFullPrompt)}
              className="text-xs text-blue-600 hover:text-blue-700 mt-1 font-semibold"
            >
              {showFullPrompt ? 'Thu gọn' : 'Xem toàn bộ prompt...'}
            </button>
          )}
        </div>

        {/* Key Points Badges if any */}
        {question.key_points && question.key_points.length > 0 && (
          <div className="mb-3">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Luận điểm cốt lõi AI chấm:
            </p>
            <div className="flex flex-wrap gap-1.5">
              {question.key_points.slice(0, 3).map((kp, idx) => (
                <span
                  key={idx}
                  className="text-[11px] bg-slate-50 text-slate-700 border border-slate-200 px-2 py-0.5 rounded-md font-medium"
                >
                  • {kp}
                </span>
              ))}
              {question.key_points.length > 3 && (
                <span className="text-[10px] text-slate-500 self-center font-medium">
                  +{question.key_points.length - 3} ý nữa
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer Meta & Actions */}
      <div className="pt-3 border-t border-slate-100 mt-2">
        <div className="flex items-center justify-between text-xs text-slate-500 mb-3">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 font-mono text-slate-700 font-medium">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>Prep: {question.prep_time}s</span>
              <span className="text-slate-300">|</span>
              <span>Resp: {question.response_time}s</span>
            </span>
            <span className="text-slate-500">
              Dùng: <strong className="text-slate-700">{question.usage_count}</strong> lần
            </span>
          </div>

          <div className="flex items-center gap-1">
            {question.tags.slice(0, 2).map((t, idx) => (
              <span
                key={idx}
                className="text-[10px] bg-slate-100 text-slate-600 border border-slate-200 px-1.5 py-0.5 rounded font-medium"
              >
                #{t}
              </span>
            ))}
          </div>
        </div>

        {/* Buttons Row */}
        <div className="flex items-center justify-between gap-2">
          <button
            onClick={() => onPreview(question)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 hover:border-blue-300 transition-colors shadow-xs"
          >
            <Eye className="w-3.5 h-3.5 text-blue-600" />
            <span>Xem thử (Simulator)</span>
          </button>

          <button
            onClick={() => onEdit(question)}
            className="flex items-center justify-center gap-1 py-2 px-3 rounded-xl text-xs font-semibold bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 transition-colors shadow-xs"
          >
            <Edit2 className="w-3.5 h-3.5 text-amber-600" />
            <span>Sửa</span>
          </button>

          <button
            onClick={handleDelete}
            title="Xóa câu hỏi khỏi ngân hàng"
            className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
