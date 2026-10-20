'use client';

import React from 'react';
import { Mic, Plus, Search } from 'lucide-react';
import { useAcademic } from '@/context/AcademicContext';

interface ItemBankHeaderProps {
  onOpenCreate: () => void;
}

export default function ItemBankHeader({ onOpenCreate }: ItemBankHeaderProps) {
  const { searchQuery, setSearchQuery, questions } = useAcademic();

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs mb-5">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Title */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center">
            <Mic className="w-4.5 h-4.5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900">
              Ngân hàng Đề thi
            </h1>
            <p className="text-xs text-slate-500">
              {questions.length} câu hỏi khảo thí Speaking
            </p>
          </div>
        </div>

        {/* Search + Add */}
        <div className="flex items-center gap-2">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm..."
              className="bg-slate-50 border border-slate-200 text-sm text-slate-900 pl-9 pr-10 py-2 rounded-xl focus:outline-none focus:border-blue-500 focus:bg-white transition-all w-48"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 text-[10px] font-bold text-slate-500 hover:text-slate-800 bg-slate-200 px-1.5 py-0.5 rounded uppercase"
              >
                Xóa
              </button>
            )}
          </div>

          <button
            onClick={onOpenCreate}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            Thêm câu hỏi
          </button>
        </div>
      </div>
    </div>
  );
}
