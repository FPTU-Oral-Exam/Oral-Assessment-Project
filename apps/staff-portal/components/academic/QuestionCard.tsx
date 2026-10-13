'use client';

import React from 'react';
import { Eye, Edit2, Trash2 } from 'lucide-react';
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

interface QuestionCardProps {
  question: AcademicQuestionItem;
  onPreview: (q: AcademicQuestionItem) => void;
  onEdit: (q: AcademicQuestionItem) => void;
}

export default function QuestionCard({ question, onPreview, onEdit }: QuestionCardProps) {
  const { deleteQuestion } = useAcademic();
  const meta = TYPE_META[question.type] || TYPE_META.RA;
  const diff = DIFFICULTY_META[question.difficulty] || DIFFICULTY_META.MEDIUM;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 hover:border-blue-300 hover:shadow-sm transition-all">
      {/* Header: type badge + difficulty */}
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
      </div>

      {/* Title */}
      <h3 className="text-sm font-bold text-slate-900 mb-2 leading-snug">
        {question.title}
      </h3>

      {/* Preview prompt */}
      <p className="text-xs text-slate-600 leading-relaxed mb-4 line-clamp-3">
        {question.prompt}
      </p>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
        <button
          onClick={() => onPreview(question)}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 hover:border-blue-300 transition-colors"
        >
          <Eye className="w-3.5 h-3.5" />
          Xem
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
  );
}
