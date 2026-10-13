'use client';

import { useState, useEffect } from 'react';
import {
  X,
  PlusCircle,
  Clock,
  MapPin,
  Users,
  GraduationCap,
  Calendar,
  Loader2,
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

interface Teacher {
  id: string;
  username: string;
  name: string;
  email: string;
  role: string;
}

interface ManualSlotCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  semesters: Semester[];
  courses: Course[];
  exams: ExamInfo[];
  defaultCourseId?: string;
  defaultExamId?: string;
}

export default function ManualSlotCreateModal({
  isOpen,
  onClose,
  onSuccess,
  semesters,
  courses,
  exams,
  defaultCourseId,
  defaultExamId,
}: ManualSlotCreateModalProps) {
  const [selectedSemester, setSelectedSemester] = useState<string>('');
  const [selectedCourse, setSelectedCourse] = useState<string>(defaultCourseId || '');
  const [slotNumber, setSlotNumber] = useState<number>(1);
  const [dateStr, setDateStr] = useState<string>(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState<string>('08:00');
  const [endTime, setEndTime] = useState<string>('09:30');
  const [room, setRoom] = useState<string>('BE-301');
  const [maxStudents, setMaxStudents] = useState<number>(35);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('');
  const [studentRollsText, setStudentRollsText] = useState<string>('');

  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loadingTeachers, setLoadingTeachers] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Fetch available teachers
      setLoadingTeachers(true);
      fetch('/api/examiner/teachers', { credentials: 'include' })
        .then((res) => (res.ok ? res.json() : []))
        .then((data) => {
          if (Array.isArray(data)) setTeachers(data);
        })
        .catch(() => {})
        .finally(() => setLoadingTeachers(false));
    }
  }, [isOpen]);

  useEffect(() => {
    if (defaultCourseId) {
      setSelectedCourse(defaultCourseId);
    }
  }, [defaultCourseId, isOpen]);

  if (!isOpen) return null;

  const availableCourses = selectedSemester
    ? courses.filter((c) => !c.semester_id || c.semester_id === selectedSemester)
    : courses;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourse) {
      toast.error('Vui lòng chọn Môn thi');
      return;
    }
    if (!room.trim()) {
      toast.error('Vui lòng nhập Phòng thi');
      return;
    }

    try {
      setIsSubmitting(true);

      // Prioritize defaultExamId or find matching exam for this course
      let targetExam = defaultExamId
        ? exams.find((ex) => ex.id === defaultExamId)
        : exams.find((ex) => ex.course_id === selectedCourse);
      let examId = defaultExamId || targetExam?.id;

      if (!examId) {
        // Need to create or retrieve exam
        const course = courses.find((c) => c.id === selectedCourse);
        const examRes = await fetch('/api/examiner/exams', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            name: `Thi vấn đáp ${course?.name || ''}`,
            course_id: selectedCourse,
            time_limit: 15,
            question_count: 6,
          }),
        });
        if (examRes.ok) {
          const newExam = await examRes.json();
          examId = newExam.id;
        } else {
          // fallback to first available exam
          examId = exams[0]?.id;
        }
      }

      if (!examId) {
        throw new Error('Chưa có kỳ thi nào được gán cho môn học này');
      }

      const dateTs = new Date(dateStr).getTime() / 1000;

      // Parse student rolls
      const rolls = studentRollsText
        .split(/[\n,;]+/)
        .map((s) => s.trim().toUpperCase())
        .filter((s) => s.length > 0);

      const payload = {
        exam_id: examId,
        slot_number: Number(slotNumber),
        date: dateTs,
        start_time: startTime,
        end_time: endTime,
        room: room.trim(),
        max_students: Number(maxStudents),
        teacher_id: selectedTeacherId || null,
        student_rolls: rolls,
      };

      const res = await fetch('/api/examiner/slots/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || data.message || 'Lỗi khi tạo ca thi');
      }

      toast.success(
        `Đã tạo Ca thi #${data.slot_number} tại phòng ${data.room} thành công với ${data.student_count} thí sinh!`
      );
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Không thể tạo ca thi thủ công');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xl w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <PlusCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Tạo Ca Thi Thủ Công (Manual Entry)</h2>
              <p className="text-xs text-slate-500">
                Khai báo khung giờ, phòng thi, chọn giảng viên coi kiêm chấm thi & nạp thí sinh
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Note Info */}
          <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-slate-600 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
            <span>
              Một Ca thi có thể nhận sinh viên từ nhiều lớp học khác nhau (`SE1701`, `SE1702`...). Giảng viên được phân
              công sẽ vừa coi thi vừa chấm bài cho ca này.
            </span>
          </div>

          {/* Semester & Course */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Kỳ thi / Học kỳ</label>
              <select
                value={selectedSemester}
                onChange={(e) => {
                  setSelectedSemester(e.target.value);
                  setSelectedCourse('');
                }}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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

          {/* Slot Number & Room & Capacity */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Ca thi số</label>
              <input
                type="number"
                min={1}
                max={20}
                value={slotNumber}
                onChange={(e) => setSlotNumber(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Phòng thi <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Ví dụ: BE-301"
                value={room}
                onChange={(e) => setRoom(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Sức chứa tối đa</label>
              <input
                type="number"
                min={5}
                max={100}
                value={maxStudents}
                onChange={(e) => setMaxStudents(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Date, Start Time, End Time */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Ngày thi</label>
              <input
                type="date"
                required
                value={dateStr}
                onChange={(e) => setDateStr(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Giờ bắt đầu</label>
              <input
                type="time"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Giờ kết thúc</label>
              <input
                type="time"
                required
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Teacher (Proctor & Grader) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Giảng viên phụ trách (Coi thi kiêm Chấm thi)
            </label>
            <select
              value={selectedTeacherId}
              onChange={(e) => setSelectedTeacherId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Chưa phân công giảng viên (Gán sau) --</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.email || t.username}) [{t.role}]
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-400 mt-1">
              Giảng viên này sẽ giám sát phòng thi và trực tiếp nghe audio, duyệt điểm AI cho các thí sinh của ca.
            </p>
          </div>

          {/* Student Roll Numbers */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Danh sách Thí sinh phân vào ca (Tùy chọn)
            </label>
            <textarea
              rows={3}
              placeholder="Nhập danh sách MSSV (mỗi dòng một mã, ví dụ: SE170001, SE170002...)"
              value={studentRollsText}
              onChange={(e) => setStudentRollsText(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-[11px] text-slate-400 mt-0.5">
              Hệ thống sẽ tự động tạo hồ sơ thí sinh và liên kết vào ca thi này. Có thể thêm thí sinh sau nếu cần.
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !selectedCourse}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Đang lưu ca thi...</span>
                </>
              ) : (
                <>
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Tạo Ca Thi</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
