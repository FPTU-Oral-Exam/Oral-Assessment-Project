'use client';

import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import ItemBankHeader from './ItemBankHeader';
import QuestionTypeGrid from './QuestionTypeGrid';
import QuestionCard from './QuestionCard';
import QuestionDetailModal from './QuestionDetailModal';
import QuestionEditorModal from './QuestionEditorModal';
import { useAcademic } from '@/context/AcademicContext';
import { AcademicQuestionItem } from '@/types/academic';

export default function ItemBankManager() {
  const { filteredQuestions, resetFilters } = useAcademic();

  const [previewQuestion, setPreviewQuestion] = useState<AcademicQuestionItem | null>(null);
  const [editingQuestion, setEditingQuestion] = useState<AcademicQuestionItem | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const handleOpenEdit = (q: AcademicQuestionItem) => {
    setEditingQuestion(q);
    setIsCreateOpen(true);
  };

  const handleOpenCreate = () => {
    setEditingQuestion(null);
    setIsCreateOpen(true);
  };

  return (
    <div className="w-full space-y-4">
      <ItemBankHeader onOpenCreate={handleOpenCreate} />

      <QuestionTypeGrid />

      <div>
        {filteredQuestions.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-slate-200 rounded-2xl bg-white">
            <p className="text-sm text-slate-500 mb-3">
              Không có câu hỏi nào
            </p>
            <button
              onClick={resetFilters}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700"
            >
              Xem tất cả câu hỏi
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
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

      <QuestionDetailModal
        question={previewQuestion}
        onClose={() => setPreviewQuestion(null)}
      />

      <QuestionEditorModal
        initialQuestion={editingQuestion}
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
      />
    </div>
  );
}
