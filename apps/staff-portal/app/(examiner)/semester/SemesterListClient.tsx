'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Calendar, Check, Loader2, X, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface Semester {
  id: string;
  name: string;
  year: number;
  term: 'SPRING' | 'SUMMER' | 'FALL';
  status: 'DRAFT' | 'ACTIVE' | 'COMPLETED';
  start_date: number;
  end_date: number;
  course_count: number;
  created_at?: number;
}

interface SemesterIn {
  name: string;
  year: number;
  term: 'SPRING' | 'SUMMER' | 'FALL';
  start_date: number;
  end_date: number;
}

export default function SemesterListClient() {
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<SemesterIn>({
    name: '',
    year: new Date().getFullYear(),
    term: 'SPRING',
    start_date: 0,
    end_date: 0,
  });

  const fetchSemesters = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/examiner/semesters', { credentials: 'include' });
      if (!res.ok) throw new Error(`Lỗi server: ${res.status}`);
      const data = await res.json();
      setSemesters(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải danh sách học kỳ');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSemesters(); }, [fetchSemesters]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/examiner/semesters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: 'Lỗi không xác định' }));
        throw new Error(err.message || err.detail || 'Tạo học kỳ thất bại');
      }
      setIsModalOpen(false);
      setFormData({ name: '', year: new Date().getFullYear(), term: 'SPRING', start_date: 0, end_date: 0 });
      toast.success('Tạo học kỳ thành công');
      fetchSemesters();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Tạo học kỳ thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  const handleActivate = async (id: string) => {
    try {
      const res = await fetch(`/api/examiner/semesters/${id}/activate`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Kích hoạt thất bại');
      toast.success('Đã kích hoạt học kỳ');
      fetchSemesters();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Kích hoạt thất bại');
    }
  };

  const handleComplete = async (id: string) => {
    try {
      const res = await fetch(`/api/examiner/semesters/${id}/complete`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Hoàn thành thất bại');
      toast.success('Đã đánh dấu hoàn thành');
      fetchSemesters();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Thao tác thất bại');
    }
  };

  const formatDate = (timestamp: number) => {
    if (!timestamp) return '—';
    return new Date(timestamp * 1000).toLocaleDateString('vi-VN');
  };

  const termLabel: Record<string, string> = {
    SPRING: 'Xuân',
    SUMMER: 'Hè',
    FALL: 'Thu',
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-3">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        <div className="text-slate-500 font-medium text-sm">Đang tải danh sách học kỳ...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Quản lý Học kỳ</h1>
          <p className="text-sm text-slate-500 mt-1">Quản lý học kỳ, kích hoạt và theo dõi tiến độ</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm px-4 py-2.5 rounded-xl shadow-xs transition"
        >
          <Plus className="w-4 h-4" />
          Tạo Học kỳ mới
        </button>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-900">{error}</p>
          </div>
          <button
            onClick={fetchSemesters}
            className="text-xs text-red-600 hover:text-red-800 font-semibold whitespace-nowrap"
          >
            Thử lại
          </button>
        </div>
      )}

      {/* Empty State */}
      {!error && semesters.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Calendar className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-bold text-slate-700">Chưa có học kỳ nào</h3>
          <p className="text-sm text-slate-500 mt-2">Bắt đầu bằng cách tạo học kỳ đầu tiên của bạn.</p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="mt-6 inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm px-5 py-2.5 rounded-xl transition"
          >
            <Plus className="w-4 h-4" />
            Tạo Học kỳ đầu tiên
          </button>
        </div>
      )}

      {/* Semester Grid */}
      {semesters.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {semesters.map((semester) => (
            <div
              key={semester.id}
              className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow"
            >
              {/* Card Header */}
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Calendar className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-slate-900 text-sm leading-snug">{semester.name}</h3>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">
                      {semester.year} — {termLabel[semester.term] || semester.term}
                    </p>
                  </div>
                </div>
                <span className={`flex-shrink-0 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                  semester.status === 'ACTIVE'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : semester.status === 'COMPLETED'
                    ? 'bg-slate-100 text-slate-600 border-slate-200'
                    : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}>
                  {semester.status === 'ACTIVE' && <Check className="w-3 h-3 inline mr-1" />}
                  {semester.status === 'DRAFT' ? 'Nháp' : semester.status === 'ACTIVE' ? 'Hoạt động' : 'Hoàn thành'}
                </span>
              </div>

              {/* Card Body */}
              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Bắt đầu</span>
                  <span className="font-semibold text-slate-700">{formatDate(semester.start_date)}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Kết thúc</span>
                  <span className="font-semibold text-slate-700">{formatDate(semester.end_date)}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Số môn học</span>
                  <span className="font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                    {semester.course_count ?? 0} môn
                  </span>
                </div>
              </div>

              {/* Card Actions */}
              <div className="flex gap-2 pt-3 border-t border-slate-100">
                {semester.status === 'DRAFT' && (
                  <button
                    onClick={() => handleActivate(semester.id)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold py-2 rounded-xl transition"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Kích hoạt
                  </button>
                )}
                {semester.status === 'ACTIVE' && (
                  <button
                    onClick={() => handleComplete(semester.id)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 bg-slate-700 hover:bg-slate-800 text-white text-xs font-semibold py-2 rounded-xl transition"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Hoàn thành
                  </button>
                )}
                {semester.status === 'COMPLETED' && (
                  <span className="flex-1 inline-flex items-center justify-center gap-1.5 bg-slate-100 text-slate-400 text-xs font-semibold py-2 rounded-xl cursor-not-allowed">
                    <Check className="w-3.5 h-3.5" />
                    Đã hoàn thành
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Semester Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setIsModalOpen(false)}
          />

          {/* Modal */}
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Tạo Học kỳ mới</h2>
                <p className="text-xs text-slate-500 mt-0.5">Khai báo thông tin học kỳ mới cho hệ thống</p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleCreate} className="p-4 space-y-4">
              {/* Name */}
              <div>
                <label htmlFor="name" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Tên học kỳ <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder="Ví dụ: Học kỳ 1 năm học 2025-2026"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Year */}
              <div>
                <label htmlFor="year" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Năm học <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  id="year"
                  value={formData.year}
                  onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value, 10) })}
                  required
                  min={2020}
                  max={2100}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Term */}
              <div>
                <label htmlFor="term" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Học kỳ <span className="text-red-500">*</span>
                </label>
                <select
                  id="term"
                  value={formData.term}
                  onChange={(e) => setFormData({ ...formData, term: e.target.value as 'SPRING' | 'SUMMER' | 'FALL' })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="SPRING">Học kỳ Xuân (Spring)</option>
                  <option value="SUMMER">Học kỳ Hè (Summer)</option>
                  <option value="FALL">Học kỳ Thu (Fall)</option>
                </select>
              </div>

              {/* Date Range */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="start_date" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Ngày bắt đầu <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    id="start_date"
                    required
                    onChange={(e) => {
                      const d = new Date(e.target.value);
                      setFormData({ ...formData, start_date: Math.floor(d.getTime() / 1000) });
                    }}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label htmlFor="end_date" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Ngày kết thúc <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    id="end_date"
                    required
                    onChange={(e) => {
                      const d = new Date(e.target.value);
                      setFormData({ ...formData, end_date: Math.floor(d.getTime() / 1000) });
                    }}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting || !formData.name.trim()}
                  className="inline-flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-xs transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {submitting ? 'Đang tạo...' : 'Tạo Học kỳ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
