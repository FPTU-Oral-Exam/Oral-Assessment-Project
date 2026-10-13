'use client';

import React from 'react';
import { Layers } from 'lucide-react';
import { useAcademic } from '@/context/AcademicContext';
import { QuestionType } from '@/types/academic';

const QUESTION_TYPE_META: Record<QuestionType, {
  label: string;
  shortLabel: string;
  color: string;
  bg: string;
  text: string;
  border: string;
  dot: string;
}> = {
  RA: { label: 'Read Aloud', shortLabel: 'Đọc to', color: 'bg-blue-50 border-blue-200', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-500' },
  RS: { label: 'Repeat Sentence', shortLabel: 'Lặp câu', color: 'bg-purple-50 border-purple-200', bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', dot: 'bg-purple-500' },
  GD: { label: 'Graded Discussion', shortLabel: 'Thảo luận', color: 'bg-emerald-50 border-emerald-200', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' },
  DI: { label: 'Describe Image', shortLabel: 'Mô tả ảnh', color: 'bg-amber-50 border-amber-200', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500' },
  SI: { label: 'Study Instructions', shortLabel: 'Chỉ dẫn', color: 'bg-rose-50 border-rose-200', bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', dot: 'bg-rose-500' },
  RL: { label: 'Re-tell Lecture', shortLabel: 'Kể lại', color: 'bg-indigo-50 border-indigo-200', bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', dot: 'bg-indigo-500' },
  ASQ: { label: 'Answer Short Question', shortLabel: 'Trả lời ngắn', color: 'bg-cyan-50 border-cyan-200', bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200', dot: 'bg-cyan-500' },
};

const ALL_TYPES: QuestionType[] = ['RA', 'RS', 'GD', 'DI', 'SI', 'RL', 'ASQ'];

export default function QuestionTypeGrid() {
  const { questions, selectedType, setSelectedType } = useAcademic();

  const counts = React.useMemo(() => {
    const map: Record<QuestionType, { total: number; approved: number }> = {} as any;
    for (const t of ALL_TYPES) {
      const qs = questions.filter((q) => q.type === t);
      map[t] = {
        total: qs.length,
        approved: qs.filter((q) => q.status === 'APPROVED').length,
      };
    }
    return map;
  }, [questions]);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
      {ALL_TYPES.map((type) => {
        const meta = QUESTION_TYPE_META[type];
        const { total, approved } = counts[type];
        const isActive = selectedType === type;
        const isAll = selectedType === 'ALL';

        return (
          <button
            key={type}
            onClick={() => setSelectedType(isActive ? 'ALL' : type)}
            className={`p-4 rounded-2xl border text-left transition-all ${
              isActive
                ? `${meta.color} border-2 ring-2 ring-offset-1 ring-blue-300 shadow-sm`
                : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono font-black text-sm">{type}</span>
              <span className={`w-2 h-2 rounded-full ${meta.dot} ${isActive ? '' : 'opacity-50'}`} />
            </div>
            <div className="text-[11px] font-semibold text-slate-700 mb-1 leading-tight">
              {meta.shortLabel}
            </div>
            <div className="text-[10px] text-slate-500 font-mono">
              {total} câu{approved > 0 ? <span className="text-emerald-600"> · {approved} ✓</span> : ''}
            </div>
          </button>
        );
      })}
    </div>
  );
}
