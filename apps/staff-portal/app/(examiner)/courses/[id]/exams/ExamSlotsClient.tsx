'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Clock,
  MapPin,
  Users,
  CheckCircle,
  AlertCircle,
  Lock,
  Unlock,
  X,
  Loader2,
  AlertTriangle,
  BookOpen,
  ArrowLeft,
  Download,
  BarChart3,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';

interface CourseInfo {
  id: string;
  name: string;
  code: string;
  description?: string;
  status: string;
}

interface ExamInfo {
  id: string;
  name: string;
  description?: string;
  status: 'DRAFT' | 'PUBLISHED';
  time_limit: number;
  question_count: number;
  slot_count?: number;
}

interface ExamVariant {
  id: string;
  name: string;
  status: string;
}

interface Slot {
  id: string;
  slot_number: number;
  date: number;
  start_time: string;
  end_time: string;
  room: string;
  status: 'PENDING' | 'READY' | 'IN_PROGRESS' | 'COMPLETED';
  grade_locked: boolean;
  student_count: number;
  exam_variant: ExamVariant | null;
}

interface CreateSlotItem {
  slot_number: number;
  date: number;
  start_time: string;
  end_time: string;
  room: string;
  max_students: number;
}

interface Teacher {
  id: string;
  name: string;
  username: string;
}

const STATUS_CONFIG: Record<string, { color: string; icon: React.ElementType; label: string }> = {
  PENDING: { color: 'bg-amber-50 text-amber-700 border-amber-200', icon: AlertCircle, label: 'Chưa thi' },
  READY: { color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle, label: 'Sẵn sàng' },
  IN_PROGRESS: { color: 'bg-blue-50 text-blue-700 border-blue-200', icon: Clock, label: 'Đang thi' },
  COMPLETED: { color: 'bg-slate-100 text-slate-600 border-slate-200', icon: CheckCircle, label: 'Hoàn thành' },
};

interface ExamSlotsClientProps {
  courseId: string;
  initialExamId?: string;
}

export default function ExamSlotsClient({ courseId, initialExamId }: ExamSlotsClientProps) {
  const router = useRouter();

  const [course, setCourse] = useState<CourseInfo | null>(null);
  const [exams, setExams] = useState<ExamInfo[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<string>(initialExamId || '');
  const [slots, setSlots] = useState<Slot[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);

  const [loading, setLoading] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showCreateExamModal, setShowCreateExamModal] = useState(false);

  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [assigningTeacher, setAssigningTeacher] = useState(false);
  const [creatingExam, setCreatingExam] = useState(false);

  // Slot Form Data
  const [formData, setFormData] = useState({
    slot_count: 2,
    date: '',
    start_time: '08:00',
    duration_minutes: 120,
    rooms: '',
  });

  // Exam Form Data
  const [examFormData, setExamFormData] = useState({
    name: '',
    description: '',
    time_limit: 30,
    question_count: 3,
  });

  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [assignDescription, setAssignDescription] = useState('');

  // 1. Fetch Course and Exams
  const fetchCourseAndExams = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [courseRes, examsRes] = await Promise.all([
        fetch(`/api/examiner/courses/${courseId}`, { credentials: 'include' }),
        fetch(`/api/examiner/courses/${courseId}/exams`, { credentials: 'include' }),
      ]);

      if (courseRes.ok) {
        const courseData = await courseRes.json();
        setCourse(courseData);
      }

      if (!examsRes.ok) throw new Error(`Lỗi server: ${examsRes.status}`);
      const examsData = await examsRes.json();
      const examList = Array.isArray(examsData) ? examsData : [];
      setExams(examList);

      if (examList.length > 0) {
        // Match initialExamId if valid, otherwise pick the first exam
        const targetExam = examList.find((e: ExamInfo) => e.id === initialExamId) || examList[0];
        setSelectedExamId(targetExam.id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải dữ liệu môn học');
    } finally {
      setLoading(false);
    }
  }, [courseId, initialExamId]);

  // 2. Fetch Slots for selected Exam
  const fetchSlots = useCallback(async (examId: string) => {
    if (!examId) {
      setSlots([]);
      return;
    }
    try {
      setLoadingSlots(true);
      const res = await fetch(`/api/examiner/exams/${examId}/slots`, { credentials: 'include' });
      if (!res.ok) throw new Error(`Lỗi server: ${res.status}`);
      const data = await res.json();
      setSlots(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Không thể tải danh sách ca thi');
    } finally {
      setLoadingSlots(false);
    }
  }, []);

  const fetchTeachers = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/users?role=TEACHER', { credentials: 'include' });
      if (!res.ok) return;
      const data = await res.json();
      setTeachers(Array.isArray(data) ? data : []);
    } catch {
      // Teachers list is optional
    }
  }, []);

  useEffect(() => {
    fetchCourseAndExams();
    fetchTeachers();
  }, [fetchCourseAndExams, fetchTeachers]);

  useEffect(() => {
    if (selectedExamId) {
      fetchSlots(selectedExamId);
    }
  }, [selectedExamId, fetchSlots]);

  // Handler: Create Exam
  const handleCreateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingExam(true);
    try {
      const res = await fetch(`/api/examiner/courses/${courseId}/exams`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(examFormData),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: 'Tạo đề thi thất bại' }));
        throw new Error(err.message || err.detail || 'Tạo đề thi thất bại');
      }

      const created = await res.json();
      toast.success('Đã tạo đề thi thành công');
      setShowCreateExamModal(false);
      setExamFormData({ name: '', description: '', time_limit: 30, question_count: 3 });
      await fetchCourseAndExams();
      if (created.id) {
        setSelectedExamId(created.id);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Tạo đề thi thất bại');
    } finally {
      setCreatingExam(false);
    }
  };

  // Handler: Create Slots
  const handleCreateSlots = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExamId) {
      toast.error('Vui lòng chọn đề thi trước khi tạo ca thi');
      return;
    }
    setSubmitting(true);

    try {
      const roomList = formData.rooms
        .split(',')
        .map((r) => r.trim())
        .filter(Boolean);

      const startMinutes = formData.start_time
        .split(':')
        .reduce((acc, val, idx) => acc + (idx === 0 ? parseInt(val, 10) * 60 : parseInt(val, 10)), 0);

      const slotItems: CreateSlotItem[] = [];
      for (let i = 0; i < formData.slot_count; i++) {
        const endMinutes = startMinutes + parseInt(String(formData.duration_minutes), 10);
        const endTime = `${String(Math.floor(endMinutes / 60)).padStart(2, '0')}:${String(endMinutes % 60).padStart(2, '0')}`;
        const dateObj = new Date(formData.date);
        const dateTs = Math.floor(dateObj.getTime() / 1000);

        slotItems.push({
          slot_number: i + 1,
          date: dateTs,
          start_time: formData.start_time,
          end_time: endTime,
          room: roomList[i] || roomList[0] || `Phòng ${i + 1}`,
          max_students: 30,
        });
      }

      const res = await fetch(`/api/examiner/exams/${selectedExamId}/slots`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ slots: slotItems }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: 'Tạo ca thi thất bại' }));
        throw new Error(err.message || err.detail || 'Tạo ca thi thất bại');
      }

      toast.success(`Đã tạo ${slotItems.length} ca thi và tự động phân chia sinh viên thành công`);
      setShowCreateModal(false);
      setFormData({ slot_count: 2, date: '', start_time: '08:00', duration_minutes: 120, rooms: '' });
      fetchSlots(selectedExamId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Tạo ca thi thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  // Handler: Lock / Unlock Gradebook
  const handleLockToggle = async (slotId: string, lock: boolean) => {
    const endpoint = lock ? 'lock' : 'unlock';
    try {
      const res = await fetch(`/api/examiner/slots/${slotId}/${endpoint}`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) throw new Error(`${lock ? 'Khóa' : 'Mở khóa'} thất bại`);
      toast.success(lock ? 'Đã khóa sổ điểm ca thi' : 'Đã mở khóa sổ điểm');
      if (selectedExamId) fetchSlots(selectedExamId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Thao tác thất bại');
    }
  };

  // Handler: Assign Teacher
  const handleAssignTeacher = async () => {
    if (!selectedSlot || !selectedTeacherId) return;
    setAssigningTeacher(true);
    try {
      const form = new FormData();
      form.append('teacher_id', selectedTeacherId);
      if (assignDescription) form.append('description', assignDescription);

      const res = await fetch(`/api/examiner/slots/${selectedSlot.id}/assign-teacher`, {
        method: 'POST',
        credentials: 'include',
        body: form,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: 'Giao đề thất bại' }));
        throw new Error(err.message || err.detail || 'Giao đề thất bại');
      }

      toast.success('Giao đề cho giảng viên thành công, ca thi đã sẵn sàng');
      setShowAssignModal(false);
      setSelectedSlot(null);
      setSelectedTeacherId('');
      setAssignDescription('');
      if (selectedExamId) fetchSlots(selectedExamId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Giao đề thất bại');
    } finally {
      setAssigningTeacher(false);
    }
  };

  // Handler: Export FAP Excel
  const handleExportFAP = async (slotId: string, slotNumber: number) => {
    try {
      const res = await fetch(`/api/examiner/slots/${slotId}/export`, { credentials: 'include' });
      if (!res.ok) throw new Error('Xuất bảng điểm FAP thất bại');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `FAP_${course?.code || 'Course'}_Ca${slotNumber}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success(`Đã tải bảng điểm FAP Ca ${slotNumber}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Xuất FAP thất bại');
    }
  };

  const formatDate = (ts: number) => {
    if (!ts) return '—';
    return new Date(ts * 1000).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const openAssignModal = (slot: Slot) => {
    setSelectedSlot(slot);
    setSelectedTeacherId('');
    setAssignDescription('');
    setShowAssignModal(true);
  };

  const selectedExam = exams.find((e) => e.id === selectedExamId);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-3">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        <div className="text-slate-500 font-medium text-sm">Đang tải thông tin ca thi...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Navigation Breadcrumb */}
      <div className="flex items-center justify-between">
        <Link
          href={`/courses/${courseId}`}
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Quay lại Môn học {course?.code ? `(${course.code})` : ''}
        </Link>
        <Link
          href="/results"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg transition"
        >
          <BarChart3 className="w-3.5 h-3.5" />
          Bảng điều khiển kết quả
        </Link>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-xs font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
              {course?.code || 'COURSE'}
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs text-slate-600 font-medium">{course?.name}</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Quản lý Ca thi (Exam Slots)</h1>
          <p className="text-sm text-slate-500 mt-1">
            Tạo ca thi hàng loạt, tự động chia đều sinh viên theo MSSV, giao đề cho giảng viên và khóa sổ điểm.
          </p>

          {/* Exam Selector */}
          {exams.length > 0 && (
            <div className="mt-4 flex items-center gap-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Đề thi:</span>
              <div className="flex items-center gap-2">
                <select
                  value={selectedExamId}
                  onChange={(e) => setSelectedExamId(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {exams.map((exam) => (
                    <option key={exam.id} value={exam.id}>
                      {exam.name} ({exam.question_count} câu, {exam.time_limit}p)
                    </option>
                  ))}
                </select>
                {selectedExam && (
                  <span className={`px-2.5 py-0.5 text-[11px] font-bold rounded-full border ${
                    selectedExam.status === 'PUBLISHED'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}>
                    {selectedExam.status === 'PUBLISHED' ? 'Đã công bố' : 'Bản nháp'}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {exams.length > 0 ? (
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm px-4 py-2.5 rounded-xl shadow-xs transition"
            >
              <Plus className="w-4 h-4" />
              Tạo nhiều ca thi
            </button>
          ) : (
            <button
              onClick={() => setShowCreateExamModal(true)}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm px-4 py-2.5 rounded-xl shadow-xs transition"
            >
              <Plus className="w-4 h-4" />
              Tạo đề thi mới
            </button>
          )}
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-900">{error}</p>
          </div>
          <button
            onClick={fetchCourseAndExams}
            className="text-xs text-red-600 hover:text-red-800 font-semibold whitespace-nowrap"
          >
            Thử lại
          </button>
        </div>
      )}

      {/* Empty State 1: No Exams in Course */}
      {!error && exams.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-8 h-8 text-blue-600" />
          </div>
          <h3 className="text-lg font-bold text-slate-800">Môn học chưa có đề thi</h3>
          <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto">
            Trước khi tạo các ca thi và phân bổ sinh viên, bạn cần tạo ít nhất 1 kỳ thi/đề thi cho môn học này.
          </p>
          <button
            onClick={() => setShowCreateExamModal(true)}
            className="mt-6 inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm px-5 py-2.5 rounded-xl transition"
          >
            <Plus className="w-4 h-4" />
            Tạo đề thi đầu tiên
          </button>
        </div>
      )}

      {/* Empty State 2: Exam has no Slots */}
      {!error && exams.length > 0 && slots.length === 0 && !loadingSlots && (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Clock className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-bold text-slate-700">Chưa có ca thi nào</h3>
          <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto">
            Hệ thống sẽ tự động lấy toàn bộ sinh viên đã đăng ký trong môn học và phân chia đều vào các ca thi theo thứ tự MSSV.
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="mt-6 inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm px-5 py-2.5 rounded-xl transition"
          >
            <Plus className="w-4 h-4" />
            Tạo ca thi đầu tiên
          </button>
        </div>
      )}

      {/* Slots Loading Indicator */}
      {loadingSlots && (
        <div className="flex flex-col items-center justify-center py-16 space-y-3">
          <Loader2 className="w-7 h-7 text-blue-600 animate-spin" />
          <div className="text-slate-500 font-medium text-xs">Đang tải danh sách ca thi...</div>
        </div>
      )}

      {/* Slots Grid */}
      {!loadingSlots && slots.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {slots.map((slot) => {
            const statusCfg = STATUS_CONFIG[slot.status] ?? STATUS_CONFIG['PENDING'];
            const StatusIcon = statusCfg.icon;

            return (
              <div
                key={slot.id}
                className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-11 h-11 bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Clock className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-slate-900 text-base leading-snug">
                          Ca {slot.slot_number}
                        </h3>
                        <p className="text-xs text-slate-500 font-mono mt-0.5">
                          {formatDate(slot.date)}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                      <span
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border ${statusCfg.color}`}
                      >
                        <StatusIcon className="w-3 h-3" />
                        {statusCfg.label}
                      </span>
                      {slot.grade_locked && (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-600 border border-red-200">
                          <Lock className="w-3 h-3" />
                          Đã khóa sổ
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Card Body Info */}
                  <div className="space-y-2.5 py-3 border-y border-slate-100 mb-4">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        Giờ thi
                      </span>
                      <span className="font-semibold text-slate-800">
                        {slot.start_time} - {slot.end_time}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        Phòng thi
                      </span>
                      <span className="font-semibold text-slate-800 bg-slate-50 px-2 py-0.5 rounded">
                        {slot.room}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        Sĩ số ca thi
                      </span>
                      <span className="font-bold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-md">
                        {slot.student_count} SV
                      </span>
                    </div>
                    {slot.exam_variant && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500 flex items-center gap-1.5">
                          <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                          Mã đề
                        </span>
                        <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                          {slot.exam_variant.name}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Actions */}
                <div className="space-y-2">
                  <div className="flex gap-2">
                    {slot.status === 'PENDING' && (
                      <button
                        onClick={() => openAssignModal(slot)}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold py-2 rounded-xl transition shadow-xs"
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                        Giao đề
                      </button>
                    )}
                    <button
                      onClick={() => handleLockToggle(slot.id, !slot.grade_locked)}
                      className={`flex-1 inline-flex items-center justify-center gap-1.5 text-xs font-semibold py-2 rounded-xl transition ${
                        slot.grade_locked
                          ? 'bg-amber-100 text-amber-800 hover:bg-amber-200 border border-amber-300'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                      }`}
                    >
                      {slot.grade_locked ? (
                        <>
                          <Unlock className="w-3.5 h-3.5" />
                          Mở khóa
                        </>
                      ) : (
                        <>
                          <Lock className="w-3.5 h-3.5" />
                          Khóa sổ
                        </>
                      )}
                    </button>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => router.push(`/results/${slot.id}`)}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold py-2 rounded-xl transition"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Chi tiết & Phúc khảo
                    </button>
                    <button
                      onClick={() => handleExportFAP(slot.id, slot.slot_number)}
                      title="Tải bảng điểm Excel chuẩn FAP"
                      className="inline-flex items-center justify-center gap-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold px-3 py-2 rounded-xl transition"
                    >
                      <Download className="w-3.5 h-3.5" />
                      FAP
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal 1: Batch Slot Creation Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowCreateModal(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-200">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Tạo Ca thi hàng loạt</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tự động phân chia sinh viên môn {course?.code} vào các ca thi
                </p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleCreateSlots} className="p-5 space-y-4">
              {/* Slot Count */}
              <div>
                <label
                  htmlFor="slot_count"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5"
                >
                  Số lượng ca thi <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  id="slot_count"
                  min={1}
                  max={20}
                  value={formData.slot_count}
                  onChange={(e) =>
                    setFormData({ ...formData, slot_count: parseInt(e.target.value, 10) || 1 })
                  }
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Date */}
              <div>
                <label
                  htmlFor="date"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5"
                >
                  Ngày thi <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  id="date"
                  required
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Time & Duration */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="start_time"
                    className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5"
                  >
                    Giờ bắt đầu <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="time"
                    id="start_time"
                    required
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label
                    htmlFor="duration_minutes"
                    className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5"
                  >
                    Thời lượng (phút)
                  </label>
                  <input
                    type="number"
                    id="duration_minutes"
                    min={15}
                    max={480}
                    value={formData.duration_minutes}
                    onChange={(e) =>
                      setFormData({ ...formData, duration_minutes: parseInt(e.target.value, 10) || 60 })
                    }
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Rooms */}
              <div>
                <label
                  htmlFor="rooms"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5"
                >
                  Phòng thi <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="rooms"
                  required
                  placeholder="VD: P301, P302, P303"
                  value={formData.rooms}
                  onChange={(e) => setFormData({ ...formData, rooms: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Nhập danh sách phòng cách nhau bằng dấu phẩy. Nếu số phòng ít hơn số ca, phòng sẽ được phân bổ tuần tự.
                </p>
              </div>

              {/* Notice */}
              <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3">
                <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-800">
                  Toàn bộ sinh viên đã enroll vào môn học sẽ được tự động chia đều (Round-Robin) vào {formData.slot_count} ca thi theo thứ tự MSSV.
                </p>
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
                  disabled={submitting || !formData.date || !formData.rooms.trim()}
                  className="inline-flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-xs transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {submitting ? 'Đang tạo ca...' : `Tạo ${formData.slot_count} Ca thi`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Assign Teacher Modal */}
      {showAssignModal && selectedSlot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowAssignModal(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-200">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Phân công Giảng viên ra đề</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Giao ca thi số {selectedSlot.slot_number} cho giảng viên chuyên môn
                </p>
              </div>
              <button
                onClick={() => setShowAssignModal(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4">
              {/* Slot Info Summary */}
              <div className="bg-slate-50 rounded-xl p-3.5 space-y-2 border border-slate-200">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Ca thi</span>
                  <span className="font-bold text-slate-800">Ca {selectedSlot.slot_number}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Thời gian</span>
                  <span className="font-semibold text-slate-700">
                    {formatDate(selectedSlot.date)} ({selectedSlot.start_time} - {selectedSlot.end_time})
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Phòng</span>
                  <span className="font-semibold text-slate-700">{selectedSlot.room}</span>
                </div>
              </div>

              {/* Teacher Selection */}
              <div>
                <label
                  htmlFor="teacher"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5"
                >
                  Giảng viên đảm nhiệm <span className="text-red-500">*</span>
                </label>
                <select
                  id="teacher"
                  value={selectedTeacherId}
                  onChange={(e) => setSelectedTeacherId(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Chọn giảng viên từ danh sách --</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.username})
                    </option>
                  ))}
                </select>
                {teachers.length === 0 && (
                  <p className="text-[11px] text-slate-400 mt-1">Đang tải danh sách giảng viên...</p>
                )}
              </div>

              {/* Description / Instructions */}
              <div>
                <label
                  htmlFor="assign_desc"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5"
                >
                  Yêu cầu chuyên môn / Ghi chú
                </label>
                <textarea
                  id="assign_desc"
                  rows={2}
                  placeholder="Ghi chú cho giảng viên chuẩn bị đề..."
                  value={assignDescription}
                  onChange={(e) => setAssignDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              {/* Modal Footer */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setShowAssignModal(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Hủy
                </button>
                <button
                  onClick={handleAssignTeacher}
                  disabled={!selectedTeacherId || assigningTeacher}
                  className="inline-flex items-center gap-2 px-5 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-xl shadow-xs transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {assigningTeacher && <Loader2 className="w-4 h-4 animate-spin" />}
                  {assigningTeacher ? 'Đang phân công...' : 'Xác nhận giao đề'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal 3: Quick Create Exam Modal */}
      {showCreateExamModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowCreateExamModal(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-200">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Tạo Đề thi mới</h2>
                <p className="text-xs text-slate-500 mt-0.5">Khai báo thông số đề thi cho môn học</p>
              </div>
              <button
                onClick={() => setShowCreateExamModal(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleCreateExam} className="p-5 space-y-4">
              <div>
                <label htmlFor="exam_name" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Tên kỳ thi <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="exam_name"
                  required
                  placeholder="VD: Final Oral Exam"
                  value={examFormData.name}
                  onChange={(e) => setExamFormData({ ...examFormData, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label htmlFor="exam_desc" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Mô tả đề thi
                </label>
                <textarea
                  id="exam_desc"
                  rows={2}
                  placeholder="Mô tả mục tiêu kỳ thi..."
                  value={examFormData.description}
                  onChange={(e) => setExamFormData({ ...examFormData, description: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="time_limit" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Thời lượng (phút)
                  </label>
                  <input
                    type="number"
                    id="time_limit"
                    min={5}
                    max={180}
                    value={examFormData.time_limit}
                    onChange={(e) => setExamFormData({ ...examFormData, time_limit: parseInt(e.target.value, 10) || 30 })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label htmlFor="question_count" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Số câu hỏi
                  </label>
                  <input
                    type="number"
                    id="question_count"
                    min={1}
                    max={20}
                    value={examFormData.question_count}
                    onChange={(e) => setExamFormData({ ...examFormData, question_count: parseInt(e.target.value, 10) || 3 })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateExamModal(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={creatingExam || !examFormData.name.trim()}
                  className="inline-flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-xs transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {creatingExam && <Loader2 className="w-4 h-4 animate-spin" />}
                  {creatingExam ? 'Đang tạo...' : 'Tạo đề thi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
