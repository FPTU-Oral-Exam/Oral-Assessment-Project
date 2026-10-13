'use client';

import React from 'react';
import { RotateCcw, Filter, Volume2, Mic, Layers } from 'lucide-react';
import { useAcademic } from '@/context/AcademicContext';
import { QuestionType, DifficultyLevel, QuestionStatus } from '@/types/academic';

interface PillConfig {
  key: QuestionType | 'ALL';
  badge: string;
  label: string;
  subLabel?: string;
}

const PILLS: PillConfig[] = [
  { key: 'ALL', badge: 'ALL', label: 'Tất cả dạng bài' },
  { key: 'RA', badge: 'RA', label: 'Read Aloud', subLabel: 'Đọc văn bản' },
  { key: 'RS', badge: 'RS', label: 'Repeat Sentence', subLabel: 'Lặp lại câu' },
  { key: 'GD', badge: 'GD', label: 'Group Discussion', subLabel: 'Thảo luận nhóm' },
  { key: 'DI', badge: 'DI', label: 'Describe Image', subLabel: 'Mô tả hình ảnh' },
  { key: 'SI', badge: 'SI', label: 'Situation', subLabel: 'Tình huống' },
  { key: 'RL', badge: 'RL', label: 'Re-tell Lecture', subLabel: 'Kể lại bài giảng' },
];

export default function QuestionTypePills() {
  const {
    selectedType,
    setSelectedType,
    typeCounts,
    selectedDifficulty,
    setSelectedDifficulty,
    selectedStatus,
    setSelectedStatus,
    resetFilters,
    filteredQuestions,
    questions,
  } = useAcademic();

  const isFiltered =
    selectedType !== 'ALL' ||
    selectedDifficulty !== 'ALL' ||
    selectedStatus !== 'ALL';

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs mb-6 space-y-4">
      {/* Top: 7 Speaking Type Pills */}
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider">
            <Layers className="w-3.5 h-3.5 text-blue-600" />
            <span>Phân loại dạng bài Speaking</span>
          </div>
          <span className="text-xs text-slate-400">
            Chọn dạng đề để lọc ngân hàng câu hỏi
          </span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
          {PILLS.map((pill) => {
            const isActive = selectedType === pill.key;
            const count = typeCounts[pill.key] ?? 0;

            return (
              <button
                key={pill.key}
                onClick={() => setSelectedType(pill.key)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border select-none ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 border-blue-400 shadow-xs ring-2 ring-blue-100 font-bold'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900 hover:border-slate-300'
                }`}
              >
                {/* Circular Badge */}
                <span
                  className={`px-1.5 py-0.5 rounded-md text-[10px] font-black uppercase font-mono ${
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {pill.badge}
                </span>

                {/* Pill Label */}
                <span>{pill.label}</span>

                {/* Count Badge */}
                <span
                  className={`text-[11px] px-1.5 py-0.5 rounded-full font-mono font-bold ${
                    isActive
                      ? 'bg-blue-200/70 text-blue-800'
                      : 'bg-slate-200/80 text-slate-600'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-slate-100" />

      {/* Bottom: Filter Dropdowns & Question Counts Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        {/* Left Count info */}
        <div className="text-slate-500 font-medium flex items-center gap-1.5">
          <span>Đang hiển thị</span>
          <strong className="text-slate-900 font-bold">{filteredQuestions.length}</strong>
          <span>/</span>
          <span className="text-slate-600 font-semibold">{questions.length}</span>
          <span>câu hỏi khảo thí</span>
          {isFiltered && (
            <span className="text-[11px] text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full font-semibold ml-1">
              Đang áp dụng bộ lọc
            </span>
          )}
        </div>

        {/* Right Dropdown Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Difficulty Dropdown */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 hover:border-slate-300 transition-colors">
            <span className="text-slate-500 font-medium">Độ khó:</span>
            <select
              value={selectedDifficulty}
              onChange={(e) => setSelectedDifficulty(e.target.value as DifficultyLevel | 'ALL')}
              className="bg-transparent text-slate-800 font-semibold focus:outline-none cursor-pointer text-xs"
            >
              <option value="ALL">Tất cả</option>
              <option value="EASY">Dễ (Easy)</option>
              <option value="MEDIUM">Trung bình (Medium)</option>
              <option value="HARD">Khó (Hard)</option>
            </select>
          </div>

          {/* Status Dropdown */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 hover:border-slate-300 transition-colors">
            <span className="text-slate-500 font-medium">Trạng thái:</span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as QuestionStatus | 'ALL')}
              className="bg-transparent text-slate-800 font-semibold focus:outline-none cursor-pointer text-xs"
            >
              <option value="ALL">Tất cả</option>
              <option value="APPROVED">Đã duyệt (Approved)</option>
              <option value="DRAFT">Bản nháp (Draft)</option>
            </select>
          </div>

          {/* Reset Filters Button */}
          {isFiltered && (
            <button
              onClick={resetFilters}
              title="Khôi phục toàn bộ bộ lọc"
              className="flex items-center gap-1 px-2.5 py-1.5 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors font-medium text-xs"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Đặt lại</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
