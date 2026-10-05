'use client';

import React, { useState } from 'react';
import { FileText, Upload, Plus, Edit2, Trash2, Download, AlertCircle, CheckCircle2, Clock, RefreshCw, Loader2, X } from 'lucide-react';
import { api } from '@/lib/api';

export interface Doc {
  id: string;
  filename: string;
  status: 'PENDING' | 'PROCESSING' | 'READY' | 'COMPLETED' | 'FAILED';
  error?: string | null;
  topic_id?: string | null;
  kind: 'TEXTBOOK' | 'SUPPLEMENT';
  page_count?: number | null;
}

export interface Chapter {
  id: string;
  document_id: string;
  title: string;
  level: number;
  start_page: number;
  end_page: number;
  source: string;
}

interface TextbookPanelProps {
  courseId: string;
  documents: Doc[];
  chapters: Chapter[];
  editable?: boolean;
  onReload: () => Promise<void>;
}

export default function TextbookPanel({
  courseId,
  documents,
  chapters,
  editable = true,
  onReload,
}: TextbookPanelProps) {
  const textbook = documents.find((d) => d.kind === 'TEXTBOOK');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Chapter modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingChapter, setEditingChapter] = useState<Chapter | null>(null);
  const [submittingChapter, setSubmittingChapter] = useState(false);
  const [chapterForm, setChapterForm] = useState({
    title: '',
    level: 1,
    start_page: 1,
    end_page: 1,
  });

  // Sorted chapters
  const sortedChapters = [...chapters].sort(
    (a, b) => a.start_page - b.start_page || a.level - b.level
  );

  const handleUploadTextbook = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const file = formData.get('file') as File;
    if (!file || file.size === 0) return;

    try {
      setIsUploading(true);
      setUploadError(null);
      formData.set('kind', 'TEXTBOOK');

      await api(`/admin/courses/${courseId}/documents`, {
        method: 'POST',
        body: formData,
      });

      await onReload();
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Tải giáo trình thất bại');
    } finally {
      setIsUploading(false);
    }
  };

  const handleReplaceFailedFile = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!textbook) return;
    const formData = new FormData(e.currentTarget);
    const file = formData.get('file') as File;
    if (!file || file.size === 0) return;

    try {
      setIsUploading(true);
      setUploadError(null);

      await api(`/admin/documents/${textbook.id}/file`, {
        method: 'PUT',
        body: formData,
      });

      await onReload();
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Thay file thất bại');
    } finally {
      setIsUploading(false);
    }
  };

  const openAddChapter = () => {
    setEditingChapter(null);
    setChapterForm({
      title: '',
      level: 1,
      start_page: 1,
      end_page: textbook?.page_count || 10,
    });
    setModalOpen(true);
  };

  const openEditChapter = (c: Chapter) => {
    setEditingChapter(c);
    setChapterForm({
      title: c.title,
      level: c.level,
      start_page: c.start_page,
      end_page: c.end_page,
    });
    setModalOpen(true);
  };

  const handleDeleteChapter = async (chapterId: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa mục này khỏi mục lục?')) return;
    try {
      await api(`/admin/chapters/${chapterId}`, {
        method: 'DELETE',
      });
      await onReload();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Xóa mục thất bại');
    }
  };

  const handleSubmitChapter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chapterForm.title.trim()) return;

    try {
      setSubmittingChapter(true);
      const payload = {
        title: chapterForm.title.trim(),
        level: Number(chapterForm.level),
        start_page: Number(chapterForm.start_page),
        end_page: Number(chapterForm.end_page),
      };

      if (editingChapter) {
        await api(`/admin/chapters/${editingChapter.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else if (textbook) {
        await api(`/admin/documents/${textbook.id}/chapters`, {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }

      setModalOpen(false);
      await onReload();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Lưu mục lục thất bại');
    } finally {
      setSubmittingChapter(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Intro Header */}
      <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5">
        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-600" />
          Giáo trình PDF & Mục lục sách
        </h3>
        <p className="mt-1 text-xs text-slate-500 leading-relaxed">
          Mỗi môn học sử dụng một giáo trình PDF chính. Các chương/mục được đánh dấu theo số trang thực tế của file PDF để làm ranh giới ngữ nghĩa khi hệ thống RAG trích xuất kiến thức và AI sinh đề thi.
        </p>
      </div>

      {uploadError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-sm text-red-700">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{uploadError}</span>
        </div>
      )}

      {/* Textbook status or upload form */}
      {!textbook ? (
        editable && (
          <div className="bg-white border-2 border-dashed border-slate-300 rounded-2xl p-8 text-center hover:border-blue-400 transition-colors">
            <Upload className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <h4 className="text-sm font-bold text-slate-800">Tải giáo trình PDF chính cho môn học</h4>
            <p className="text-xs text-slate-500 mt-1 mb-4">
              Định dạng .PDF, dung lượng tối đa 100 MB. Hệ thống sẽ tự động quét mục lục và tách đoạn.
            </p>
            <form onSubmit={handleUploadTextbook} className="max-w-md mx-auto flex items-center gap-2">
              <input
                type="file"
                name="file"
                accept=".pdf"
                required
                disabled={isUploading}
                className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              <button
                type="submit"
                disabled={isUploading}
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors flex-shrink-0"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Đang tải...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    <span>Tải lên</span>
                  </>
                )}
              </button>
            </form>
          </div>
        )
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 flex-shrink-0">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">{textbook.filename}</h4>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-slate-500">
                    {textbook.page_count ? `${textbook.page_count} trang` : 'Đang xử lý trang...'}
                  </span>
                  <span className="text-slate-300">•</span>
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                      textbook.status === 'READY' || textbook.status === 'COMPLETED'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : textbook.status === 'FAILED'
                        ? 'bg-red-50 text-red-700 border-red-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse'
                    }`}
                  >
                    {textbook.status === 'READY' || textbook.status === 'COMPLETED' ? (
                      <>
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Sẵn sàng</span>
                      </>
                    ) : textbook.status === 'FAILED' ? (
                      <>
                        <AlertCircle className="w-3 h-3" />
                        <span>Lỗi xử lý</span>
                      </>
                    ) : (
                      <>
                        <Clock className="w-3 h-3" />
                        <span>Đang trích xuất text & RAG...</span>
                      </>
                    )}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <a
                href={`/api/admin/documents/${textbook.id}/content`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>Tải PDF gốc</span>
              </a>

              {editable && (textbook.status === 'READY' || textbook.status === 'COMPLETED') && (
                <button
                  onClick={openAddChapter}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors shadow-xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>Thêm chương/mục</span>
                </button>
              )}
            </div>
          </div>

          {textbook.error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
              {textbook.error}
            </div>
          )}

          {/* Fallback to replace file if failed */}
          {editable && textbook.status === 'FAILED' && (
            <form onSubmit={handleReplaceFailedFile} className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3">
              <span className="text-xs font-medium text-amber-800">Tải lại PDF thay thế:</span>
              <input type="file" name="file" accept=".pdf" required className="text-xs text-slate-500" />
              <button
                type="submit"
                disabled={isUploading}
                className="px-3 py-1.5 bg-amber-600 text-white text-xs font-semibold rounded-lg hover:bg-amber-700"
              >
                Thay thế PDF
              </button>
            </form>
          )}
        </div>
      )}

      {/* Chapters list */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h4 className="text-sm font-bold text-slate-900">Danh mục Chương & Mục sách ({sortedChapters.length})</h4>
            <p className="text-xs text-slate-500">Phân vùng trang để liên kết vào các Chủ đề thi (Topics)</p>
          </div>
        </div>

        {sortedChapters.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            Chưa có chương/mục nào được phân tách. {textbook && 'Bấm "Thêm chương/mục" để phân chia trang sách.'}
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {sortedChapters.map((c) => (
              <div
                key={c.id}
                className="px-5 py-3.5 flex items-center justify-between hover:bg-slate-50/60 transition-colors"
                style={{ paddingLeft: `${Math.max(20, c.level * 24)}px` }}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900">{c.title}</span>
                    <span className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-600 font-mono rounded">
                      Cấp {c.level}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                    <span>
                      Trang PDF: <strong>{c.start_page} – {c.end_page}</strong>
                    </span>
                    <span>•</span>
                    <span className="text-[11px] text-slate-400">
                      {c.source === 'MANUAL' ? 'Chỉnh sửa thủ công' : 'Tự động quét'}
                    </span>
                  </div>
                </div>

                {editable && (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => openEditChapter(c)}
                      className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Sửa chương mục"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteChapter(c.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Xóa"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Chapter Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-xs" onClick={() => setModalOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden z-10 border border-slate-200">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">
                {editingChapter ? 'Sửa chương / mục lục' : 'Thêm chương / mục lục mới'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitChapter} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Tên chương / Tiêu đề mục <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Chương 1: Giới thiệu Kiến trúc Phần mềm"
                  value={chapterForm.title}
                  onChange={(e) => setChapterForm({ ...chapterForm, title: e.target.value })}
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Cấp (1=Chương)</label>
                  <input
                    type="number"
                    min={1}
                    max={6}
                    required
                    value={chapterForm.level}
                    onChange={(e) => setChapterForm({ ...chapterForm, level: Number(e.target.value) })}
                    className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Từ trang PDF</label>
                  <input
                    type="number"
                    min={1}
                    max={textbook?.page_count || 1000}
                    required
                    value={chapterForm.start_page}
                    onChange={(e) => setChapterForm({ ...chapterForm, start_page: Number(e.target.value) })}
                    className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Đến trang PDF</label>
                  <input
                    type="number"
                    min={chapterForm.start_page}
                    max={textbook?.page_count || 1000}
                    required
                    value={chapterForm.end_page}
                    onChange={(e) => setChapterForm({ ...chapterForm, end_page: Number(e.target.value) })}
                    className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submittingChapter}
                  className="px-4 py-2 text-xs font-semibold bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50"
                >
                  {submittingChapter ? 'Đang lưu...' : 'Lưu chương mục'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
