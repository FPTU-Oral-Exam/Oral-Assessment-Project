'use client';

import React from 'react';
import {
  Mic,
  Search,
  Plus,
  FileSpreadsheet,
  Sparkles,
} from 'lucide-react';
import { useAcademic } from '@/context/AcademicContext';

interface ItemBankHeaderProps {
  onOpenCreate: () => void;
  onOpenImport: () => void;
}

export default function ItemBankHeader({ onOpenCreate, onOpenImport }: ItemBankHeaderProps) {
  const {
    searchQuery,
    setSearchQuery,
    questions,
  } = useAcademic();

  const approvedCount = questions.filter((q) => q.status === 'APPROVED').length;

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs mb-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        {/* Left: Title & Description */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shadow-xs">
              <Mic className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                  Ngân hàng Đề thi & Câu hỏi Vấn đáp
                </h1>
                <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-200 text-xs px-2.5 py-0.5 rounded-full font-semibold">
                  <Sparkles className="w-3 h-3 text-blue-500" />
                  Kỹ năng Nói (Speaking)
                </span>
                <span className="bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded-full font-medium">
                  Ban Học thuật
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Quản lý kho câu hỏi khảo thí Oral Assessment —{' '}
                <strong className="text-slate-700 font-semibold">{questions.length}</strong> câu hỏi chuẩn hóa ({' '}
                <span className="text-emerald-600 font-semibold">{approvedCount}</span> đã duyệt).
              </p>
            </div>
          </div>
        </div>

        {/* Right: Search Bar & Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Search Input */}
          <div className="relative flex items-center min-w-[240px] sm:min-w-[280px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm theo mã, tiêu đề, từ khóa..."
              className="w-full bg-slate-50 hover:bg-slate-50/80 focus:bg-white border border-slate-200 text-sm text-slate-900 pl-9 pr-14 py-2 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all placeholder:text-slate-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 px-1.5 py-0.5 text-[11px] font-bold text-slate-500 hover:text-slate-800 bg-slate-200/70 hover:bg-slate-200 rounded-md transition-colors uppercase"
              >
                Xóa
              </button>
            )}
          </div>

          {/* Import Excel */}
          <button
            onClick={onOpenImport}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-xs"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Nhập Excel</span>
          </button>

          {/* Create Question Button */}
          <button
            onClick={onOpenCreate}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm câu hỏi</span>
          </button>
        </div>
      </div>
    </div>
  );
}
