'use client';

import React, { useState } from 'react';
import {
  Layers,
  Plus,
  Edit2,
  Trash2,
  X,
  AlertCircle,
  BookOpen,
  Target,
  FileText,
  Check,
  Loader2,
  HelpCircle,
} from 'lucide-react';
import { teacherService } from '@/services';
import { Outcome } from './OutcomesPanel';

export interface Chapter {
  id: string;
  title: string;
  level: number;
  start_page: number;
  end_page: number;
}

export interface Doc {
  id: string;
  filename: string;
  kind?: string;
}

export interface Topic {
  id: string;
  name: string;
  description?: string;
  outcome_ids: string[];
  chapter_ids?: string[];
  document_ids?: string[];
  course_id?: string;
}

interface TopicsPanelProps {
  courseId: string;
  topics: Topic[];
  outcomes: Outcome[];
  chapters: Chapter[];
  documents: Doc[];
  editable?: boolean;
  onReload: () => Promise<void>;
}

export default function TopicsPanel({
  courseId,
  topics,
  outcomes,
  chapters,
  documents,
  editable = true,
  onReload,
}: TopicsPanelProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTopic, setEditingTopic] = useState<Topic | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedLOs, setSelectedLOs] = useState<string[]>([]);
  const [selectedChapters, setSelectedChapters] = useState<string[]>([]);
  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);

  // Filter supplementary documents
  const supplementDocs = documents.filter((d) => d.kind === 'SUPPLEMENT');

  // Sorted chapters
  const sortedChapters = [...chapters].sort(
    (a, b) => a.start_page - b.start_page || a.level - b.level
  );

  const openAddModal = () => {
    setEditingTopic(null);
    setName('');
    setDescription('');
    // Default to first LO and Chapter if available
    setSelectedLOs(outcomes.length > 0 ? [outcomes[0].id] : []);
    setSelectedChapters(sortedChapters.length > 0 ? [sortedChapters[0].id] : []);
    setSelectedDocs([]);
    setFormError(null);
    setModalOpen(true);
  };

  const openEditModal = (t: Topic) => {
    setEditingTopic(t);
    setName(t.name);
    setDescription(t.description || '');
    setSelectedLOs(t.outcome_ids?.length ? t.outcome_ids : []);
    setSelectedChapters(t.chapter_ids || []);
    setSelectedDocs(t.document_ids || []);
    setFormError(null);
    setModalOpen(true);
  };

  const toggleLO = (id: string) => {
    setSelectedLOs((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleChapter = (id: string) => {
    setSelectedChapters((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleDoc = (id: string) => {
    setSelectedDocs((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!name.trim()) {
      setFormError('Vui lòng nhập tên chủ đề');
      return;
    }
    if (selectedLOs.length === 0) {
      setFormError('Vui lòng chọn ít nhất một Chuẩn đầu ra (LO)');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        name: name.trim(),
        description: description.trim(),
        outcome_ids: selectedLOs,
        chapter_ids: selectedChapters,
      };

      if (editingTopic) {
        await teacherService.updateTopic(editingTopic.id, payload);
      } else {
        await teacherService.createTopic(courseId, payload);
      }

      await onReload();
      setModalOpen(false);
    } catch (err: unknown) {
      setFormError(
        (err as Error).message ||
          'Không thể lưu chủ đề. Vui lòng kiểm tra lại liên kết tài liệu.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (topicId: string, topicName: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa chủ đề "${topicName}"?`)) return;
    try {
      await teacherService.deleteTopic(topicId);
      await onReload();
    } catch (err: unknown) {
      alert((err as Error).message || 'Không thể xóa chủ đề này.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
              <Layers className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-slate-800">
              Chủ đề kiến thức ({topics.length})
            </h2>
          </div>
          <p className="text-sm text-slate-500 mt-1 max-w-2xl">
            Liên kết các chương mục giáo trình và tài liệu bổ sung với Chuẩn đầu ra (LO).
            AI sẽ truy xuất tài liệu theo từng chủ đề để sinh câu hỏi và ngữ cảnh kiểm tra.
          </p>
        </div>

        {editable && (
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-medium shadow-sm transition-colors whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            Tạo chủ đề mới
          </button>
        )}
      </div>

      {/* Warning if LOs or Chapters are missing */}
      {(outcomes.length === 0 || chapters.length === 0) && (
        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-amber-600 mt-0.5" />
          <div>
            <p className="font-semibold">Yêu cầu chuẩn bị trước khi tạo chủ đề:</p>
            <ul className="list-disc list-inside mt-1 space-y-0.5 text-amber-700">
              {outcomes.length === 0 && (
                <li>Cần tạo ít nhất 1 Chuẩn đầu ra (LO) ở tab &quot;Chuẩn đầu ra&quot;.</li>
              )}
              {chapters.length === 0 && (
                <li>
                  Cần tải lên Giáo trình và có ít nhất 1 chương/mục mục lục ở tab
                  &quot;Giáo trình&quot;.
                </li>
              )}
            </ul>
          </div>
        </div>
      )}

      {/* Topics List */}
      {topics.length === 0 ? (
        <div className="text-center py-12 px-4 bg-white rounded-2xl border border-dashed border-slate-300">
          <Layers className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-700">Chưa có chủ đề nào</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto mt-1 mb-4">
            Mỗi bài thi vấn đáp yêu cầu phân bổ câu hỏi theo từng chủ đề. Hãy thiết lập các chủ đề ngay để xây dựng khung đề thi.
          </p>
          {editable && (
            <button
              onClick={openAddModal}
              disabled={outcomes.length === 0 || chapters.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              Thêm chủ đề đầu tiên
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {topics.map((t) => {
            const mappedLOs = outcomes.filter((l) =>
              (t.outcome_ids || []).includes(l.id)
            );
            const mappedChapters = sortedChapters.filter((c) =>
              (t.chapter_ids || []).includes(c.id)
            );
            const mappedDocs = documents.filter((d) =>
              (t.document_ids || []).includes(d.id)
            );

            return (
              <div
                key={t.id}
                className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-purple-300 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h3 className="font-bold text-slate-800 text-base leading-snug">
                      {t.name}
                    </h3>
                    {editable && (
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => openEditModal(t)}
                          className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                          title="Sửa chủ đề"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(t.id, t.name)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Xóa chủ đề"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  {t.description && (
                    <p className="text-xs text-slate-500 mb-4 line-clamp-2">
                      {t.description}
                    </p>
                  )}

                  {/* Mapped LOs */}
                  <div className="mb-3">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 mb-1.5">
                      <Target className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Chuẩn đầu ra:</span>
                    </div>
                    {mappedLOs.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {mappedLOs.map((lo) => (
                          <span
                            key={lo.id}
                            className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100"
                            title={lo.description}
                          >
                            {lo.code}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-amber-600 italic">
                        Chưa liên kết LO
                      </span>
                    )}
                  </div>

                  {/* Mapped Chapters */}
                  <div className="mb-3">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 mb-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-blue-500" />
                      <span>Chương giáo trình ({mappedChapters.length}):</span>
                    </div>
                    {mappedChapters.length > 0 ? (
                      <div className="space-y-1">
                        {mappedChapters.slice(0, 3).map((ch) => (
                          <div
                            key={ch.id}
                            className="text-xs text-slate-600 bg-slate-50 px-2 py-1 rounded border border-slate-100 flex items-center justify-between"
                          >
                            <span className="truncate max-w-[220px]" title={ch.title}>
                              {ch.title}
                            </span>
                            <span className="text-[11px] text-slate-400 flex-shrink-0">
                              tr. {ch.start_page}–{ch.end_page}
                            </span>
                          </div>
                        ))}
                        {mappedChapters.length > 3 && (
                          <p className="text-[11px] text-slate-400 italic">
                            + {mappedChapters.length - 3} chương khác
                          </p>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-amber-600 italic">
                        Chưa gắn chương mục
                      </span>
                    )}
                  </div>

                  {/* Mapped Supplementary Documents */}
                  {mappedDocs.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 mb-1">
                        <FileText className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Tài liệu bổ sung ({mappedDocs.length}):</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {mappedDocs.map((doc) => (
                          <span
                            key={doc.id}
                            className="inline-block text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 truncate max-w-[180px]"
                            title={doc.filename}
                          >
                            {doc.filename}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                  <span>
                    {mappedChapters.length} chương · {mappedLOs.length} LO
                  </span>
                  <span className="font-mono text-[10px] text-slate-300">
                    ID: {t.id.slice(0, 8)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Add/Edit Topic */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl my-8 border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-lg">
                {editingTopic ? 'Chỉnh sửa chủ đề' : 'Thêm chủ đề kiến thức mới'}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Tên chủ đề */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Tên chủ đề <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Thiết kế cơ sở dữ liệu quan hệ, Lập trình bất đồng bộ..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Mô tả */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Mô tả chủ đề
                </label>
                <textarea
                  rows={2}
                  placeholder="Mô tả phạm vi hoặc các kỹ năng trọng tâm của chủ đề này..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                />
              </div>

              {/* Chuẩn đầu ra (LO) */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Target className="w-3.5 h-3.5 text-indigo-500" />
                    Chuẩn đầu ra (LO) <span className="text-red-500">*</span>
                  </label>
                  <span className="text-xs text-slate-400">
                    Đã chọn {selectedLOs.length} LO
                  </span>
                </div>
                {outcomes.length === 0 ? (
                  <p className="text-xs text-amber-600 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
                    Chưa có Chuẩn đầu ra nào. Hãy thêm LO ở tab Chuẩn đầu ra trước.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto p-2 bg-slate-50 border border-slate-200 rounded-xl">
                    {outcomes.map((lo) => {
                      const isChecked = selectedLOs.includes(lo.id);
                      return (
                        <div
                          key={lo.id}
                          onClick={() => toggleLO(lo.id)}
                          className={`flex items-start gap-3 p-2.5 rounded-lg cursor-pointer transition-colors border ${
                            isChecked
                              ? 'bg-indigo-50/80 border-indigo-200 text-indigo-950'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100/70'
                          }`}
                        >
                          <div
                            className={`w-4 h-4 rounded border flex items-center justify-center mt-0.5 transition-colors ${
                              isChecked
                                ? 'bg-indigo-600 border-indigo-600 text-white'
                                : 'border-slate-300 bg-white'
                            }`}
                          >
                            {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                          <div className="text-xs flex-1">
                            <span className="font-bold mr-1.5">{lo.code}:</span>
                            <span className="text-slate-600">{lo.description}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Guidance footer */}
              <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl flex items-start gap-2.5 text-xs text-indigo-900 leading-relaxed">
                <HelpCircle className="w-4 h-4 text-indigo-600 flex-shrink-0 mt-0.5" />
                <p>
                  Chủ đề kiến thức được liên kết trực tiếp với các Chuẩn đầu ra (LO). Hệ thống sẽ dùng cấu trúc này để xây dựng Ma trận đề thi chuẩn (Master Blueprint) và phân loại câu hỏi trong Ngân hàng đề thi (Item Bank).
                </p>
              </div>

              {/* Form Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-5 py-2 text-sm font-semibold bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-xl shadow-sm transition-colors"
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editingTopic ? 'Cập nhật chủ đề' : 'Lưu chủ đề'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
