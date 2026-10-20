'use client';

import React from 'react';
import { Layers } from 'lucide-react';
import { useAcademic } from '@/context/AcademicContext';
import { QuestionType } from '@/types/academic';

const QUESTION_TYPE_META: Record<string, {
  label: string;
  shortLabel: string;
  color: string;
  bg: string;
  text: string;
  border: string;
  dot: string;
}> = {
  GENERAL_INTERVIEW: {
    label: 'General Interview',
    shortLabel: 'Phỏng vấn mở đầu',
    color: 'bg-blue-50 border-blue-200',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
    dot: 'bg-blue-500',
  },
  PICTURE_DESCRIPTION: {
    label: 'Picture Description',
    shortLabel: 'Miêu tả tranh & bối cảnh',
    color: 'bg-amber-50 border-amber-200',
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    border: 'border-amber-200',
    dot: 'bg-amber-500',
  },
  TOPIC_MONOLOGUE: {
    label: 'Topic Monologue',
    shortLabel: 'Thuyết trình chủ đề',
    color: 'bg-purple-50 border-purple-200',
    bg: 'bg-purple-50',
    text: 'text-purple-700',
    border: 'border-purple-200',
    dot: 'bg-purple-500',
  },
  DEEP_DISCUSSION: {
    label: 'Deep Discussion',
    shortLabel: 'Thảo luận sâu phản biện',
    color: 'bg-emerald-50 border-emerald-200',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    dot: 'bg-emerald-500',
  },
};

const ENTS_TYPES: QuestionType[] = [
  'GENERAL_INTERVIEW',
  'PICTURE_DESCRIPTION',
  'TOPIC_MONOLOGUE',
  'DEEP_DISCUSSION',
];

export default function QuestionTypeGrid() {
  const { questions, selectedType, setSelectedType } = useAcademic();

  const counts = React.useMemo(() => {
    const map: Record<string, { total: number; approved: number }> = {};
    for (const t of ENTS_TYPES) {
      const qs = questions.filter((q) => q.type === t);
      map[t] = {
        total: qs.length,
        approved: qs.filter((q) => q.status === 'APPROVED').length,
      };
    }
    return map;
  }, [questions]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {ENTS_TYPES.map((type) => {
        const meta = QUESTION_TYPE_META[type];
        const { total, approved } = counts[type] || { total: 0, approved: 0 };
        const isActive = selectedType === type;

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
              <span className="font-mono font-bold text-xs uppercase tracking-wider text-slate-800">
                {type.replace('_', ' ')}
              </span>
              <span className={`w-2.5 h-2.5 rounded-full ${meta.dot} ${isActive ? '' : 'opacity-60'}`} />
            </div>
            <div className="text-xs font-semibold text-slate-700 mb-1 leading-tight">
              {meta.shortLabel}
            </div>
            <div className="text-[11px] text-slate-500 font-mono">
              {total} câu hỏi{approved > 0 ? <span className="text-emerald-600 font-semibold"> · {approved} ✓</span> : ''}
            </div>
          </button>
        );
      })}
    </div>
  );
}
