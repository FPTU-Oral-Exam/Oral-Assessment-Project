'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Upload, Users, FileSpreadsheet, X, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface Section {
  id: string;
  name: string;
  code: string;
  day_of_week: number;
  time_slot: 'MORNING' | 'AFTERNOON' | 'EVENING';
  max_students: number;
  status: string;
  teacher: { id: string; name: string } | null;
  student_count: number;
}

interface SectionIn {
  name: string;
  code: string;
  day_of_week: number;
  time_slot: 'MORNING' | 'AFTERNOON' | 'EVENING';
  max_students: number;
}

const DAY_NAMES = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
const TIME_LABELS: Record<string, string> = { MORNING: 'Sáng', AFTERNOON: 'Chiều', EVENING: 'Tối' };

export default function SectionsClient({ courseId }: { courseId: string }) {
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<{ created_enrollments?: number; created_sections?: number; skipped?: number } | null>(null);
  const [formData, setFormData] = useState<SectionIn>({
    name: '',
    code: '',
    day_of_week: 2,
    time_slot: 'MORNING',
    max_students: 40,
  });

  const fetchSections = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/examiner/courses/${courseId}/sections`, { credentials: 'include' });
      if (!res.ok) throw new Error(`Lỗi server: ${res.status}`);
      const data = await res.json();
      setSections(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải danh sách lớp học');
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => { fetchSections(); }, [fetchSections]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(`/api/examiner/courses/${courseId}/sections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ...formData, course_id: courseId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: 'Lỗi không xác định' }));
        throw new Error(err.message || err.detail || 'Tạo lớp học thất bại');
      }
      setShowCreateModal(false);
      setFormData({ name: '', code: '', day_of_week: 2, time_slot: 'MORNING', max_students: 40 });
      toast.success('Tạo lớp học thành công');
      fetchSections();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Tạo lớp học thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  const handleImport = async () => {
    if (!uploadFile) return;
    setImporting(true);
    setImportResult(null);
    try {
      const formData = new FormData();
      formData.append('course_id', courseId);
      formData.append('file', uploadFile);

      const res = await fetch('/api/examiner/enrollments/import', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      const result = await res.json();
      setImportResult(result);
      if (!res.ok) throw new Error(result.message || result.detail || 'Import thất bại');
      toast.success(`Import thành công: ${result.created_enrollments ?? 0} sinh viên`);
      fetchSections();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Import thất bại');
    } finally {
      setImporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-3">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        <div className="text-slate-500 font-medium text-sm">Đang tải danh sách lớp học...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Quản lý Lớp học</h1>
          <p className="text-sm text-slate-500 mt-1">Tạo lớp học và import sinh viên vào khóa học</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { setShowImportModal(true); setImportResult(null); }}
            className="inline-flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-sm px-4 py-2.5 rounded-xl shadow-xs transition"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Import SV
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm px-4 py-2.5 rounded-xl shadow-xs transition"
          >
            <Plus className="w-4 h-4" />
            Thêm lớp
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-900">{error}</p>
          </div>
          <button onClick={fetchSections} className="text-xs text-red-600 hover:text-red-800 font-semibold whitespace-nowrap">
            Thử lại
          </button>
        </div>
      )}

      {/* Empty State */}
      {!error && sections.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-bold text-slate-700">Chưa có lớp học nào</h3>
          <p className="text-sm text-slate-500 mt-2">Bắt đầu bằng cách tạo lớp học đầu tiên cho khóa học này.</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="mt-6 inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm px-5 py-2.5 rounded-xl transition"
          >
            <Plus className="w-4 h-4" />
            Thêm lớp đầu tiên
          </button>
        </div>
      )}

      {/* Section Grid */}
      {sections.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {sections.map((section) => (
            <div key={section.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow">
              {/* Card Header */}
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Users className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-slate-900 text-sm leading-snug">{section.name}</h3>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">{section.code}</p>
                  </div>
                </div>
                <span className={`flex-shrink-0 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                  section.status === 'ACTIVE'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-slate-100 text-slate-600 border-slate-200'
                }`}>
                  {section.status === 'ACTIVE' ? 'Hoạt động' : section.status}
                </span>
              </div>

              {/* Card Body */}
              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Ngày học</span>
                  <span className="font-semibold text-slate-700">{DAY_NAMES[section.day_of_week]}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Ca học</span>
                  <span className="font-semibold text-slate-700">{TIME_LABELS[section.time_slot] || section.time_slot}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Sinh viên</span>
                  <span className="font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                    {section.student_count}/{section.max_students}
                  </span>
                </div>
                {section.teacher && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Giảng viên</span>
                    <span className="font-semibold text-slate-700">{section.teacher.name}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowImportModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Import Sinh viên</h2>
                <p className="text-xs text-slate-500 mt-0.5">Tải lên file Excel để thêm sinh viên vào lớp</p>
              </div>
              <button onClick={() => setShowImportModal(false)} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 space-y-4">
              <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center bg-slate-50">
                <Upload className="w-10 h-10 mx-auto text-slate-400 mb-3" />
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload" className="cursor-pointer text-blue-600 hover:text-blue-700 font-semibold text-sm hover:underline">
                  Chọn file Excel
                </label>
                <p className="text-xs text-slate-400 mt-2">.xlsx, .xls</p>
                {uploadFile && (
                  <p className="mt-3 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg px-3 py-2 inline-block">
                    {uploadFile.name}
                  </p>
                )}
              </div>
              <a href="/template.xlsx" download className="block text-sm text-blue-600 hover:text-blue-700 font-semibold">
                Tải file mẫu
              </a>

              {/* Import Result */}
              {importResult && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-sm space-y-1">
                  <p className="font-bold text-emerald-800">Kết quả import:</p>
                  <p className="text-emerald-700">Tạo mới: <span className="font-semibold">{importResult.created_enrollments ?? 0}</span> sinh viên</p>
                  <p className="text-emerald-700">Lớp mới: <span className="font-semibold">{importResult.created_sections ?? 0}</span></p>
                  <p className="text-amber-700">Bỏ qua (trùng): <span className="font-semibold">{importResult.skipped ?? 0}</span></p>
                </div>
              )}

              {/* Modal Footer */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setShowImportModal(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Đóng
                </button>
                <button
                  onClick={handleImport}
                  disabled={!uploadFile || importing}
                  className="inline-flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-xs transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {importing && <Loader2 className="w-4 h-4 animate-spin" />}
                  {importing ? 'Đang import...' : 'Import'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Section Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowCreateModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Thêm Lớp học mới</h2>
                <p className="text-xs text-slate-500 mt-0.5">Tạo lớp học mới cho khóa học này</p>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleCreate} className="p-4 space-y-4">
              {/* Name */}
              <div>
                <label htmlFor="name" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Tên lớp học <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder="Ví dụ: Lớp A1"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Code */}
              <div>
                <label htmlFor="code" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Mã lớp <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="code"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  required
                  placeholder="Ví dụ: A1"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Day of Week */}
              <div>
                <label htmlFor="day_of_week" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Ngày trong tuần <span className="text-red-500">*</span>
                </label>
                <select
                  id="day_of_week"
                  value={formData.day_of_week}
                  onChange={(e) => setFormData({ ...formData, day_of_week: parseInt(e.target.value, 10) })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {DAY_NAMES.map((day, idx) => (
                    <option key={idx} value={idx}>{day}</option>
                  ))}
                </select>
              </div>

              {/* Time Slot */}
              <div>
                <label htmlFor="time_slot" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Ca học <span className="text-red-500">*</span>
                </label>
                <select
                  id="time_slot"
                  value={formData.time_slot}
                  onChange={(e) => setFormData({ ...formData, time_slot: e.target.value as 'MORNING' | 'AFTERNOON' | 'EVENING' })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="MORNING">Sáng</option>
                  <option value="AFTERNOON">Chiều</option>
                  <option value="EVENING">Tối</option>
                </select>
              </div>

              {/* Max Students */}
              <div>
                <label htmlFor="max_students" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Sĩ số tối đa <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  id="max_students"
                  value={formData.max_students}
                  onChange={(e) => setFormData({ ...formData, max_students: parseInt(e.target.value, 10) })}
                  required
                  min={1}
                  max={200}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Modal Footer */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting || !formData.name.trim() || !formData.code.trim()}
                  className="inline-flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-xs transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {submitting ? 'Đang tạo...' : 'Tạo Lớp học'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
