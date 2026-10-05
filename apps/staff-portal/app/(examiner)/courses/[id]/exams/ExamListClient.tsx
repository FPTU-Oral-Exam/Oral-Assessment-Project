'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, BookOpen, Clock, Loader2, ExternalLink, AlertCircle, X } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface Exam {
  id: string;
  name: string;
  description: string;
  status: 'DRAFT' | 'PUBLISHED';
  time_limit: number;
  question_count: number;
  slot_count: number;
}

interface ExamFormData {
  name: string;
  description: string;
  time_limit: number;
  question_count: number;
}

export default function ExamListClient({ courseId }: { courseId: string }) {
  const router = useRouter();
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState<ExamFormData>({
    name: '',
    description: '',
    time_limit: 30,
    question_count: 3,
  });

  const fetchExams = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/examiner/courses/${courseId}/exams`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error(`Lỗi server: ${res.status}`);
      const data = await res.json();
      setExams(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải danh sách đề thi');
      toast.error('Không thể tải danh sách đề thi');
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => { fetchExams(); }, [fetchExams]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await fetch(`/api/examiner/courses/${courseId}/exams`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: 'Tạo đề thi thất bại' }));
        throw new Error(err.detail || err.message || 'Tạo đề thi thất bại');
      }
      toast.success('Đã tạo đề thi');
      setShowModal(false);
      setFormData({ name: '', description: '', time_limit: 30, question_count: 3 });
      fetchExams();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Tạo đề thi thất bại');
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-3">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        <div className="text-slate-500 font-medium text-sm">Đang tải danh sách đề thi...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-red-900">{error}</p>
        </div>
        <button onClick={fetchExams} className="text-xs text-red-600 hover:text-red-800 font-semibold whitespace-nowrap">
          Thử lại
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Đề thi</h2>
          <p className="text-sm text-slate-500 mt-1">Quản lý đề thi cho môn học này</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl shadow-xs transition"
        >
          <Plus className="w-4 h-4" />
          Tạo đề thi
        </button>
      </div>

      {/* Empty State */}
      {exams.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-bold text-slate-700">Chưa có đề thi</h3>
          <p className="text-sm text-slate-500 mt-2">
            Tạo đề thi đầu tiên cho môn học này để bắt đầu.
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl transition"
          >
            <Plus className="w-4 h-4" />
            Tạo đề thi đầu tiên
          </button>
        </div>
      )}

      {/* Exam List */}
      {exams.length > 0 && (
        <div className="space-y-4">
          {exams.map((exam) => (
            <div key={exam.id} className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-base font-bold text-slate-900">{exam.name}</h3>
                    <span className={`flex-shrink-0 px-2.5 py-1 text-xs font-bold rounded-full border ${
                      exam.status === 'PUBLISHED'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}>
                      {exam.status === 'PUBLISHED' ? 'Đã công bố' : 'Bản nháp'}
                    </span>
                  </div>
                  {exam.description && (
                    <p className="text-sm text-slate-600 mb-3">{exam.description}</p>
                  )}
                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {exam.time_limit} phút
                    </span>
                    <span>{exam.question_count} câu hỏi</span>
                    <span>{exam.slot_count} ca thi</span>
                  </div>
                </div>
                <button
                  onClick={() => router.push(`/courses/${courseId}/exams?examId=${exam.id}`)}
                  className="inline-flex items-center gap-2 px-3.5 py-2 text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-xl text-xs font-semibold transition-colors flex-shrink-0"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  {exam.slot_count > 0 ? `Quản lý ca thi (${exam.slot_count})` : 'Tạo ca thi mới'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Tạo đề thi mới</h2>
                <p className="text-xs text-slate-500 mt-0.5">Khai báo thông tin đề thi</p>
              </div>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleCreate} className="p-4 space-y-4">
              {/* Name */}
              <div>
                <label htmlFor="exam-name" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Tên kỳ thi <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="exam-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="VD: Midterm Exam"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label htmlFor="exam-description" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Mô tả
                </label>
                <textarea
                  id="exam-description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Mô tả ngắn về kỳ thi..."
                />
              </div>

              {/* Time Limit & Question Count */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="exam-time" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Thời gian (phút)
                  </label>
                  <input
                    type="number"
                    id="exam-time"
                    value={formData.time_limit}
                    onChange={(e) => setFormData({ ...formData, time_limit: parseInt(e.target.value, 10) })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min={5}
                    max={180}
                  />
                </div>
                <div>
                  <label htmlFor="exam-questions" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Số câu hỏi
                  </label>
                  <input
                    type="number"
                    id="exam-questions"
                    value={formData.question_count}
                    onChange={(e) => setFormData({ ...formData, question_count: parseInt(e.target.value, 10) })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min={1}
                    max={10}
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={creating || !formData.name.trim()}
                  className="inline-flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-xs transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {creating && <Loader2 className="w-4 h-4 animate-spin" />}
                  {creating ? 'Đang tạo...' : 'Tạo đề thi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
