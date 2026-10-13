'use client';

import { useState, useEffect } from 'react';
import {
  X,
  UploadCloud,
  FileSpreadsheet,
  Download,
  AlertCircle,
  CheckCircle,
  Loader2,
  Calendar,
  BookOpen,
  Info,
} from 'lucide-react';
import { toast } from 'sonner';

interface Semester {
  id: string;
  name: string;
}

interface Course {
  id: string;
  name: string;
  code: string;
  semester_id?: string;
}

interface ExamInfo {
  id: string;
  name: string;
  course_id: string;
}

interface FapImportScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  semesters: Semester[];
  courses: Course[];
  exams: ExamInfo[];
  defaultCourseId?: string;
  defaultExamId?: string;
}

export default function FapImportScheduleModal({
  isOpen,
  onClose,
  onSuccess,
  semesters,
  courses,
  exams,
  defaultCourseId,
  defaultExamId,
}: FapImportScheduleModalProps) {
  const [selectedSemester, setSelectedSemester] = useState<string>('');
  const [selectedCourse, setSelectedCourse] = useState<string>(defaultCourseId || '');
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [importResult, setImportResult] = useState<{
    created_slots: number;
    updated_slots: number;
    assigned_students: number;
    assigned_teachers_count: number;
  } | null>(null);

  // Synchronize defaultCourseId when provided
  useEffect(() => {
    if (defaultCourseId) {
      setSelectedCourse(defaultCourseId);
    }
  }, [defaultCourseId, isOpen]);

  // Filter courses by selected semester if any
  const availableCourses = selectedSemester
    ? courses.filter((c) => !c.semester_id || c.semester_id === selectedSemester)
    : courses;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      const ext = selected.name.toLowerCase();
      if (!ext.endsWith('.xlsx') && !ext.endsWith('.xls') && !ext.endsWith('.csv')) {
        toast.error('Vui lòng chọn file Excel (.xlsx, .xls) hoặc file .csv');
        return;
      }
      setFile(selected);
    }
  };

  const handleDownloadTemplate = () => {
    window.open('/api/examiner/fap-sample-template', '_blank');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourse) {
      toast.error('Vui lòng chọn Môn thi');
      return;
    }
    if (!file) {
      toast.error('Vui lòng chọn file Excel / CSV từ FAP');
      return;
    }

    try {
      setIsSubmitting(true);
      const formData = new FormData();
      formData.append('semester_id', selectedSemester || (semesters[0]?.id ?? ''));
      formData.append('course_id', selectedCourse);

      // Prioritize defaultExamId or find matching exam for this course
      const targetExamId = defaultExamId || exams.find((ex) => ex.course_id === selectedCourse)?.id;
      if (targetExamId) {
        formData.append('exam_id', targetExamId);
      }

      formData.append('file', file);

      const res = await fetch('/api/examiner/fap-import-schedule', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || data.message || 'Lỗi khi import file FAP');
      }

      setImportResult({
        created_slots: data.created_slots || 0,
        updated_slots: data.updated_slots || 0,
        assigned_students: data.assigned_students || 0,
        assigned_teachers_count: data.assigned_teachers_count || 0,
      });

      toast.success(
        `Đã import thành công: ${data.created_slots} ca thi, ${data.assigned_students} thí sinh, ${data.assigned_teachers_count} giảng viên`
      );
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || 'Không thể import file phân ca từ FAP');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xl w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Import Lịch & Phân Ca Thi từ FAP</h2>
              <p className="text-xs text-slate-500">
                Tự động tạo ca thi, phòng thi, gán giảng viên coi kiêm chấm thi & nạp sinh viên
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Note Info */}
          <div className="p-3.5 bg-blue-50/80 border border-blue-200/80 rounded-xl text-xs text-blue-900 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-blue-950">Quy trình đồng bộ FAP:</p>
              <p className="text-slate-600 mt-0.5 leading-relaxed">
                FAP quản lý các lớp học phần (`SE1701`, `SE1702`...) và gom sinh viên chia theo từng ca thi, phòng thi
                và chỉ định Giảng viên (người coi thi kiêm chấm điểm).
              </p>
            </div>
          </div>

          {/* Select Semester & Course */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Kỳ thi / Học kỳ</label>
              <select
                value={selectedSemester}
                onChange={(e) => {
                  setSelectedSemester(e.target.value);
                  setSelectedCourse('');
                }}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">-- Chọn Kỳ thi (Tùy chọn) --</option>
                {semesters.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Môn thi <span className="text-rose-500">*</span>
              </label>
              <select
                required
                value={selectedCourse}
                onChange={(e) => setSelectedCourse(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">-- Chọn Môn thi tổ chức --</option>
                {availableCourses.map((c) => (
                  <option key={c.id} value={c.id}>
                    [{c.code}] {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Download Template Banner */}
          <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-slate-800">Chưa có file mẫu chuẩn FAP?</span>
              <p className="text-[11px] text-slate-500">Tải file Excel mẫu gồm đầy đủ 9 cột chuẩn của trường</p>
            </div>
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition shadow-2xs"
            >
              <Download className="w-3.5 h-3.5 text-blue-600" />
              <span>Tải file mẫu</span>
            </button>
          </div>

          {/* File Upload Box */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              File Excel / CSV phân ca FAP <span className="text-rose-500">*</span>
            </label>
            <label className="border-2 border-dashed border-slate-300 hover:border-emerald-500 hover:bg-emerald-50/30 rounded-xl p-5 flex flex-col items-center justify-center cursor-pointer transition text-center space-y-2 group">
              <div className="w-10 h-10 rounded-xl bg-slate-100 group-hover:bg-emerald-100 text-slate-500 group-hover:text-emerald-700 flex items-center justify-center transition">
                <UploadCloud className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800">
                  {file ? file.name : 'Bấm để chọn file hoặc kéo thả vào đây'}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">Hỗ trợ định dạng .xlsx, .xls, .csv (Tối đa 10MB)</p>
              </div>
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
                className="hidden"
                disabled={isSubmitting}
              />
            </label>
          </div>

          {/* Import Result Feedback */}
          {importResult && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>
                Đã xử lý: <strong>{importResult.created_slots} ca thi mới</strong>,{' '}
                <strong>{importResult.assigned_students} thí sinh</strong>,{' '}
                <strong>{importResult.assigned_teachers_count} giảng viên coi kiêm chấm thi</strong>.
              </span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
            >
              Đóng
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !selectedCourse || !file}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Đang bóc tách & nạp FAP...</span>
                </>
              ) : (
                <>
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>Xác nhận Import FAP</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
