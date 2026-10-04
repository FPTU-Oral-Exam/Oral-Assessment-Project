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
import { api } from '@/lib/api';
import { Outcome } from './OutcomesPanel';
import { Chapter, Doc } from './TextbookPanel';

export interface Topic {
  id: string;
  name: string;
  description: string;
  learning_outcome_id: string;
  learning_outcome_ids: string[];
  chapter_ids: string[];
  document_ids: string[];
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
    setSelectedLOs(t.learning_outcome_ids?.length ? t.learning_outcome_ids : [t.learning_outcome_id]);
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
    if (selectedChapters.length === 0) {
      setFormError('Vui lòng chọn ít nhất một chương/mục giáo trình');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        name: name.trim(),
        description: description.trim(),
        learning_outcome_ids: selectedLOs,
        chapter_ids: selectedChapters,
        document_ids: selectedDocs,
      };

      if (editingTopic) {
        await api(`/admin/topics/${editingTopic.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        await api(`/admin/courses/${courseId}/topics`, {
          method: 'POST',
          body: JSON.stringify(payload),
        });
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
      await api(`/admin/topics/${topicId}`, { method: 'DELETE' });
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
              (t.learning_outcome_ids || [t.learning_outcome_id]).includes(l.id)
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

              {/* Chương / Mục giáo trình */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-blue-500" />
                    Chương/mục giáo trình <span className="text-red-500">*</span>
                  </label>
                  <span className="text-xs text-slate-400">
                    Đã chọn {selectedChapters.length} chương
                  </span>
                </div>
                {sortedChapters.length === 0 ? (
                  <p className="text-xs text-amber-600 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
                    Chưa có mục lục chương nào trong giáo trình. Vui lòng thêm chương ở tab Giáo trình.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto p-2 bg-slate-50 border border-slate-200 rounded-xl">
                    {sortedChapters.map((ch) => {
                      const isChecked = selectedChapters.includes(ch.id);
                      return (
                        <div
                          key={ch.id}
                          onClick={() => toggleChapter(ch.id)}
                          className={`flex items-center justify-between gap-3 p-2.5 rounded-lg cursor-pointer transition-colors border ${
                            isChecked
                              ? 'bg-blue-50/80 border-blue-200 text-blue-950'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100/70'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div
                              className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
                                isChecked
                                  ? 'bg-blue-600 border-blue-600 text-white'
                                  : 'border-slate-300 bg-white'
                              }`}
                            >
                              {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                            </div>
                            <span
                              className="text-xs font-medium truncate"
                              style={{ paddingLeft: `${(ch.level - 1) * 12}px` }}
                            >
                              {ch.title}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-400 font-mono flex-shrink-0">
                            tr. {ch.start_page}–{ch.end_page}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Tài liệu bổ sung (nếu có) */}
              {supplementDocs.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-emerald-500" />
                      Tài liệu bổ sung (tùy chọn)
                    </label>
                    <span className="text-xs text-slate-400">
                      Đã chọn {selectedDocs.length} tài liệu
                    </span>
                  </div>
                  <div className="grid grid-cols-1 gap-2 max-h-36 overflow-y-auto p-2 bg-slate-50 border border-slate-200 rounded-xl">
                    {supplementDocs.map((doc) => {
                      const isChecked = selectedDocs.includes(doc.id);
                      return (
                        <div
                          key={doc.id}
                          onClick={() => toggleDoc(doc.id)}
                          className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-colors border ${
                            isChecked
                              ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100/70'
                          }`}
                        >
                          <div
                            className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
                              isChecked
                                ? 'bg-emerald-600 border-emerald-600 text-white'
                                : 'border-slate-300 bg-white'
                            }`}
                          >
                            {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                          <span className="text-xs font-medium truncate">
                            {doc.filename}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Guidance footer */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-2 text-xs text-slate-500">
                <HelpCircle className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                <p>
                  Khi sinh đề thi bằng AI, hệ thống sẽ sử dụng các trang giáo trình và tài liệu đã chọn ở đây để truy xuất ngữ cảnh chính xác theo chuẩn RAG.
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
