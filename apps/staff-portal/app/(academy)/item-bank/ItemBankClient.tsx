'use client';

import React, { useState } from 'react';
import {
  HelpCircle,
  FileSpreadsheet,
  UploadCloud,
  CheckCircle2,
  X,
  RotateCcw,
} from 'lucide-react';
import ItemBankHeader from '@/components/academic/ItemBankHeader';
import QuestionTypePills from '@/components/academic/QuestionTypePills';
import QuestionCard from '@/components/academic/QuestionCard';
import QuestionDetailModal from '@/components/academic/QuestionDetailModal';
import QuestionEditorModal from '@/components/academic/QuestionEditorModal';
import { useAcademic } from '@/context/AcademicContext';
import { AcademicQuestionItem } from '@/types/academic';

export default function ItemBankClient() {
  const { filteredQuestions, resetFilters } = useAcademic();

  const [previewQuestion, setPreviewQuestion] = useState<AcademicQuestionItem | null>(null);
  const [editingQuestion, setEditingQuestion] = useState<AcademicQuestionItem | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importDone, setImportDone] = useState(false);

  const handleOpenEdit = (q: AcademicQuestionItem) => {
    setEditingQuestion(q);
    setIsCreateOpen(true);
  };

  const handleOpenCreate = () => {
    setEditingQuestion(null);
    setIsCreateOpen(true);
  };

  const handleSimulateImport = () => {
    setImportDone(true);
    setTimeout(() => {
      setImportDone(false);
      setIsImportOpen(false);
    }, 1500);
  };

  return (
    <div className="w-full">
      {/* Top Header */}
      <ItemBankHeader
        onOpenCreate={handleOpenCreate}
        onOpenImport={() => setIsImportOpen(true)}
      />

      {/* Speaking Sub-type Pills & Filters */}
      <QuestionTypePills />

      {/* Questions Grid */}
      <div className="w-full">
        {filteredQuestions.length === 0 ? (
          <div className="h-96 flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-slate-200 rounded-2xl bg-white shadow-xs">
            <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400 mb-4 shadow-xs">
              <HelpCircle className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-base font-bold text-slate-800">
              Không tìm thấy câu hỏi phù hợp
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mt-1 mb-4">
              Thử thay đổi từ khóa tìm kiếm hoặc bấm khôi phục bộ lọc để xem toàn bộ ngân hàng câu hỏi Speaking.
            </p>
            <button
              onClick={resetFilters}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors shadow-xs"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Khôi phục bộ lọc</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {filteredQuestions.map((q) => (
              <QuestionCard
                key={q.id}
                question={q}
                onPreview={setPreviewQuestion}
                onEdit={handleOpenEdit}
              />
            ))}
          </div>
        )}
      </div>

      {/* Detail / Simulator Modal */}
      <QuestionDetailModal
        question={previewQuestion}
        onClose={() => setPreviewQuestion(null)}
      />

      {/* Create / Edit Modal */}
      <QuestionEditorModal
        isOpen={isCreateOpen}
        initialQuestion={editingQuestion}
        onClose={() => {
          setIsCreateOpen(false);
          setEditingQuestion(null);
        }}
      />

      {/* Excel Import Simulation Modal */}
      {isImportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-base">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                <span>Nhập câu hỏi từ Excel/JSON</span>
              </div>
              <button
                onClick={() => setIsImportOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="border-2 border-dashed border-slate-200 hover:border-blue-500 rounded-xl p-8 text-center cursor-pointer transition-colors bg-slate-50 mb-4">
              <UploadCloud className="w-10 h-10 text-blue-600 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-800">Kéo thả file .xlsx hoặc .json vào đây</p>
              <p className="text-xs text-slate-500 mt-1">Hỗ trợ mẫu chuẩn 6 loại câu hỏi Speaking (RA, RS, GD, DI, SI, RL)</p>
            </div>

            {importDone ? (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Nhập thành công 12 câu hỏi Speaking vào ngân hàng!</span>
              </div>
            ) : (
              <div className="flex items-center justify-end gap-2.5">
                <button
                  onClick={() => setIsImportOpen(false)}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                >
                  Đóng
                </button>
                <button
                  onClick={handleSimulateImport}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors"
                >
                  Tải lên & Xử lý
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
