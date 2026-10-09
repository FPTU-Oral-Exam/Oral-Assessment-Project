'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  BookOpen,
  Clock,
  Loader2,
  AlertCircle,
  X,
  Calendar,
  MapPin,
  Users,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  UserCheck,
  Building,
  GraduationCap,
  Sparkles,
  FileText,
} from 'lucide-react';
import { toast } from 'sonner';

import { examinerService, adminService } from '@/services';
import type { Exam, ExamBatch, BatchStudent } from '@oralai/shared';
import type { UserRecord } from '@/services/admin.service';
import type { CreateBatchRequest } from '@/services/examiner.service';
import { parseApiError } from '@/lib/api-helpers';

interface Teacher {
  id: string;
  name: string;
  username: string;
}

interface ExamFormData {
  name: string;
  description: string;
  time_limit: number;
  question_count: number;
}

interface BatchFormData {
  name: string;
  date: string;
  start_time: string;
  end_time: string;
  rooms: string;
  max_students_per_room: number;
  assigned_teacher_id: string;
}

export default function ExamListClient({ courseId }: { courseId: string }) {
  const [exams, setExams] = useState<Exam[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [batchesByExam, setBatchesByExam] = useState<Record<string, ExamBatch[]>>({});
  const [loadingBatches, setLoadingBatches] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Expanded batch students
  const [expandedBatchId, setExpandedBatchId] = useState<string | null>(null);
  const [studentsByBatch, setStudentsByBatch] = useState<Record<string, BatchStudent[]>>({});
  const [loadingStudents, setLoadingStudents] = useState<string | null>(null);
  const [generatingExamId, setGeneratingExamId] = useState<string | null>(null);

  // Modal: Create Exam
  const [showExamModal, setShowExamModal] = useState(false);
  const [creatingExam, setCreatingExam] = useState(false);
  const [examForm, setExamForm] = useState<ExamFormData>({
    name: 'Thi Vấn Đáp Cuối Kỳ',
    description: 'Kỳ thi vấn đáp AI tự động',
    time_limit: 30,
    question_count: 3,
  });

  // Modal: Create Batch for specific Exam
  const [batchModalExam, setBatchModalExam] = useState<Exam | null>(null);
  const [creatingBatch, setCreatingBatch] = useState(false);
  const [batchForm, setBatchForm] = useState<BatchFormData>({
    name: '',
    date: '',
    start_time: '08:00',
    end_time: '10:00',
    rooms: '',
    max_students_per_room: 15,
    assigned_teacher_id: '',
  });

  // Fetch batches for a single exam
  const fetchBatches = useCallback(async (examId: string) => {
    setLoadingBatches((prev) => ({ ...prev, [examId]: true }));
    try {
      const data = await examinerService.getBatches(examId);
      setBatchesByExam((prev) => ({
        ...prev,
        [examId]: Array.isArray(data) ? data : [],
      }));
    } catch {
      // Error fetching batches silently caught
    } finally {
      setLoadingBatches((prev) => ({ ...prev, [examId]: false }));
    }
  }, []);

  // Fetch all exams for this course
  const fetchExams = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await examinerService.getExamsByCourse(courseId);
      const examList = Array.isArray(data) ? data : [];
      setExams(examList);

      // Fetch batches for each exam
      examList.forEach((e) => {
        fetchBatches(e.id);
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải danh sách kỳ thi');
      toast.error('Không thể tải danh sách kỳ thi');
    } finally {
      setLoading(false);
    }
  }, [courseId, fetchBatches]);

  // Fetch teachers list (strictly filter role=TEACHER)
  const fetchTeachers = useCallback(async () => {
    try {
      const data = await adminService.getUsers({ role: 'TEACHER' });
      const teacherList = data.map((u: UserRecord) => ({
        id: u.id,
        name: u.name,
        username: u.username,
      }));
      setTeachers(teacherList);
    } catch {
      // Optional teachers list
    }
  }, []);

  useEffect(() => {
    fetchExams();
    fetchTeachers();
  }, [fetchExams, fetchTeachers]);

  // Toggle batch students accordion
  const toggleBatchStudents = async (batchId: string) => {
    if (expandedBatchId === batchId) {
      setExpandedBatchId(null);
      return;
    }
    setExpandedBatchId(batchId);

    if (!studentsByBatch[batchId]) {
      setLoadingStudents(batchId);
      try {
        const data = await examinerService.getBatchStudents(batchId);
        // Flatten students from all rooms
        const allStudents: BatchStudent[] = [];
        if (data.rooms) {
          data.rooms.forEach((room: any) => {
            if (room.students) {
              room.students.forEach((st: any) => {
                allStudents.push({
                  roll_number: st.roll_number,
                  full_name: st.full_name,
                  room: room.room,
                  eligibility_status: 'ELIGIBLE',
                });
              });
            }
          });
        }
        setStudentsByBatch((prev) => ({
          ...prev,
          [batchId]: allStudents,
        }));
      } catch {
        toast.error('Không thể tải danh sách thí sinh trong ca thi');
      } finally {
        setLoadingStudents(null);
      }
    }
  };

  // Handle Create Exam
  const handleCreateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingExam(true);
    try {
      await examinerService.createExam(courseId, {
        name: examForm.name,
        description: examForm.description,
        time_limit: examForm.time_limit,
        question_count: examForm.question_count,
      });
      toast.success('Đã tạo kỳ thi thành công');
      setShowExamModal(false);
      setExamForm({
        name: 'Thi Vấn Đáp Cuối Kỳ',
        description: 'Kỳ thi vấn đáp AI tự động',
        time_limit: 30,
        question_count: 3,
      });
      fetchExams();
    } catch (err) {
      const msg = parseApiError(err, {
        EXAM_NAME_EXISTS: `Tên kỳ thi "${examForm.name.trim()}" đã tồn tại trong môn học này! Vui lòng đặt tên khác.`,
        EXAM_EXISTS: 'Môn học này đã có kỳ thi!',
      });
      toast.error(msg, { duration: 5000 });
    } finally {
      setCreatingExam(false);
    }
  };

  // Handle Automated Test Assembly (ATA) Variant Generation
  const handleGenerateVariants = async (exam: Exam) => {
    try {
      setGeneratingExamId(exam.id);
      const data = await examinerService.generateVariants(exam.id);
      toast.success(
        `Đã sinh thành công ${data.variants_count || 'các'} mã đề song song từ Ngân hàng đề thi (ATA) cho các ca thi!`,
        { duration: 5000 }
      );
      fetchBatches(exam.id);
      fetchExams();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Sinh mã đề thất bại');
    } finally {
      setGeneratingExamId(null);
    }
  };

  // Open Create Batch Modal for an Exam
  const openBatchModal = (exam: Exam) => {
    const existingBatches = batchesByExam[exam.id] || [];
    setBatchModalExam(exam);
    // Find valid teacher with role TEACHER
    const validTeacher = teachers.find(
      (t) => (t as any).role === 'TEACHER' || (t as any).roles?.includes('TEACHER') || !t.username?.startsWith('SE')
    );
    setBatchForm({
      name: `Ca ${existingBatches.length + 1} - Sáng`,
      date: new Date().toISOString().split('T')[0],
      start_time: '08:00',
      end_time: '10:00',
      rooms: 'AL-L401, AL-L402',
      max_students_per_room: 15,
      assigned_teacher_id: validTeacher ? validTeacher.id : (teachers.length > 0 ? teachers[0].id : ''),
    });
  };

  // Handle Create Batch & Auto-allocate
  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchModalExam) return;

    setCreatingBatch(true);
    try {
      const roomList = batchForm.rooms
        .split(',')
        .map((r) => r.trim())
        .filter(Boolean);

      if (roomList.length === 0) {
        throw new Error('Danh sách phòng thi không được để trống');
      }

      if (!batchForm.assigned_teacher_id) {
        throw new Error('Vui lòng chọn giảng viên phụ trách ca thi (phải có vai trò TEACHER)');
      }

      const dateObj = new Date(batchForm.date);
      const dateTs = Math.floor(dateObj.getTime() / 1000);

      const batchData: CreateBatchRequest = {
        name: batchForm.name,
        date: dateTs,
        start_time: batchForm.start_time,
        end_time: batchForm.end_time,
        rooms: roomList,
        max_students_per_room: batchForm.max_students_per_room,
        assigned_teacher_id: batchForm.assigned_teacher_id,
      };

      const result = await examinerService.createBatch(batchModalExam.id, batchData);
      toast.success(
        `Đã tạo "${result.name}" và tự động phân bổ ${result.total_assigned} thí sinh vào ${result.rooms?.length || roomList.length} phòng!`
      );

      const currentExamId = batchModalExam.id;
      setBatchModalExam(null);
      fetchBatches(currentExamId);
    } catch (err) {
      const msg = parseApiError(err, {
        INVALID_TEACHER: 'Giảng viên phụ trách không hợp lệ: Tài khoản được chọn không có vai trò Giảng viên (TEACHER)!',
        NO_CANDIDATES: 'Không còn thí sinh đủ điều kiện nào chưa được phân bổ ca thi!',
        NO_ROOMS: 'Danh sách phòng thi không được để trống!',
        EXAM_NOT_FOUND: 'Không tìm thấy thông tin kỳ thi tương ứng!',
      });
      toast.error(msg, { duration: 6000 });
    } finally {
      setCreatingBatch(false);
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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-3">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        <div className="text-slate-500 font-medium text-sm">Đang tải thông tin kỳ thi & ca thi...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Kỳ thi & Ca thi môn học</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Tạo kỳ thi và thiết lập các ca thi phân bổ phòng tự động lồng trực tiếp bên dưới.
          </p>
        </div>
        <button
          onClick={() => setShowExamModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl shadow-xs transition"
        >
          <Plus className="w-4 h-4" />
          Tạo kỳ thi mới
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
            onClick={fetchExams}
            className="text-xs text-red-600 hover:text-red-800 font-semibold whitespace-nowrap"
          >
            Thử lại
          </button>
        </div>
      )}

      {/* Empty State: No Exams */}
      {exams.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-8 h-8 text-blue-600" />
          </div>
          <h3 className="text-lg font-bold text-slate-800">Chưa có kỳ thi nào</h3>
          <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto">
            Môn học này chưa có kỳ thi nào. Hãy tạo kỳ thi đầu tiên (ví dụ: Thi Cuối kỳ) để bắt đầu phân bổ các ca thi và phòng thi.
          </p>
          <button
            onClick={() => setShowExamModal(true)}
            className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl shadow-xs transition"
          >
            <Plus className="w-4 h-4" />
            Tạo kỳ thi đầu tiên
          </button>
        </div>
      )}

      {/* Exams & Nested Batches List */}
      {exams.length > 0 && (
        <div className="space-y-6">
          {exams.map((exam) => {
            const batches = batchesByExam[exam.id] || [];
            const isLoadingBatches = loadingBatches[exam.id];

            return (
              <div
                key={exam.id}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs hover:border-slate-300 transition-colors"
              >
                {/* Exam Header */}
                <div className="p-5 sm:p-6 bg-linear-to-r from-slate-50/70 to-white border-b border-slate-200">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2.5 mb-2">
                        <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-md bg-blue-100 text-blue-800">
                          {exam.exam_type || 'FINAL'}
                        </span>
                        <h3 className="text-xl font-bold text-slate-900">{exam.name}</h3>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                            exam.status === 'PUBLISHED'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}
                        >
                          {exam.status === 'PUBLISHED' ? 'Đã công bố' : 'Bản nháp'}
                        </span>
                      </div>

                      {exam.description && (
                        <p className="text-sm text-slate-600 mb-3">{exam.description}</p>
                      )}

                      <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-slate-500">
                        <span className="inline-flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          Thời lượng: <strong className="text-slate-700">{exam.time_limit} phút</strong>
                        </span>
                        <span>•</span>
                        <span>
                          Số câu hỏi: <strong className="text-slate-700">{exam.question_count} câu</strong>
                        </span>
                        <span>•</span>
                        <span>
                          Tổng số ca thi: <strong className="text-blue-700">{batches.length} ca</strong>
                        </span>
                      </div>
                    </div>

                    {/* Action Buttons: Generate Variants (ATA) & Create Batch */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleGenerateVariants(exam)}
                        disabled={generatingExamId === exam.id || batches.length === 0}
                        className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-semibold text-xs sm:text-sm rounded-xl shadow-xs transition"
                        title={
                          batches.length === 0
                            ? 'Cần tạo ít nhất 1 ca thi trước khi sinh mã đề'
                            : 'Sinh mã đề song song từ Ngân hàng đề thi (ATA) cho từng ca thi'
                        }
                      >
                        {generatingExamId === exam.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Sparkles className="w-4 h-4" />
                        )}
                        Sinh mã đề song song (ATA)
                      </button>

                      <button
                        onClick={() => openBatchModal(exam)}
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs sm:text-sm rounded-xl shadow-xs transition"
                      >
                        <Plus className="w-4 h-4" />
                        Thêm ca thi / đợt thi
                      </button>
                    </div>
                  </div>
                </div>

                {/* Nested Batches Section */}
                <div className="p-5 sm:p-6 bg-slate-50/40">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      Danh sách ca thi & phòng thi ({batches.length})
                    </h4>
                    {batches.length > 0 && (
                      <span className="text-xs text-slate-500">
                        Nhấp vào ca thi để xem chi tiết danh sách thí sinh từng phòng
                      </span>
                    )}
                  </div>

                  {isLoadingBatches && (
                    <div className="flex items-center justify-center py-8 gap-2 text-slate-400 text-xs">
                      <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                      Đang tải danh sách ca thi...
                    </div>
                  )}

                  {!isLoadingBatches && batches.length === 0 && (
                    <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center bg-white/60">
                      <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-sm font-semibold text-slate-700">Chưa có ca thi nào cho kỳ thi này</p>
                      <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                        Bấm nút &quot;Thêm ca thi / đợt thi&quot; ở trên để thiết lập phòng và phân bổ thí sinh tự động.
                      </p>
                      <button
                        onClick={() => openBatchModal(exam)}
                        className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-xs rounded-lg transition"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Tạo ca thi ngay
                      </button>
                    </div>
                  )}

                  {!isLoadingBatches && batches.length > 0 && (
                    <div className="space-y-3">
                      {batches.map((batch) => {
                        const isExpanded = expandedBatchId === batch.batch_id;
                        const students = studentsByBatch[batch.batch_id] || [];
                        const isLoadingThisStudents = loadingStudents === batch.batch_id;
                        const teacher = teachers.find((t) => t.id === batch.assigned_teacher_id);

                        return (
                          <div
                            key={batch.batch_id}
                            className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs hover:border-slate-300 transition-colors"
                          >
                            {/* Batch Header Item */}
                            <div
                              onClick={() => toggleBatchStudents(batch.batch_id)}
                              className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/70 transition-colors"
                            >
                              <div className="flex items-start gap-3">
                                <div className="mt-0.5 text-slate-400">
                                  {isExpanded ? (
                                    <ChevronDown className="w-4 h-4 text-blue-600" />
                                  ) : (
                                    <ChevronRight className="w-4 h-4" />
                                  )}
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <h5 className="font-bold text-sm text-slate-900">{batch.name}</h5>
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold border bg-blue-50 text-blue-700 border-blue-200">
                                      {batch.status === 'SCHEDULED' ? 'Đã lên lịch' : batch.status}
                                    </span>
                                  </div>
                                  <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-slate-500">
                                    <span className="flex items-center gap-1">
                                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                      {formatDate(batch.date)}
                                    </span>
                                    <span>•</span>
                                    <span className="flex items-center gap-1">
                                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                                      {batch.start_time} - {batch.end_time}
                                    </span>
                                    <span>•</span>
                                    <span className="flex items-center gap-1">
                                      <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
                                      Giám thị: {teacher ? teacher.name : 'Chưa gán'}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Rooms & Total Students */}
                              <div className="flex flex-wrap items-center gap-2">
                                {batch.rooms?.map((r: any) => (
                                  <span
                                    key={r.room}
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold"
                                  >
                                    <Building className="w-3 h-3 text-slate-400" />
                                    <span>{r.room}: <strong className="text-blue-700">{r.assigned_count}</strong> SV</span>
                                    {r.variant_name && (
                                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-purple-100 text-purple-700 border border-purple-200 font-bold ml-0.5">
                                        {r.variant_name}
                                      </span>
                                    )}
                                  </span>
                                ))}
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-bold ml-1">
                                  <Users className="w-3 h-3 text-emerald-600" />
                                  Tổng: {batch.total_assigned} SV
                                </span>
                              </div>
                            </div>

                            {/* Batch Students Accordion Content */}
                            {isExpanded && (
                              <div className="border-t border-slate-200 p-4 bg-slate-50/50">
                                {isLoadingThisStudents && (
                                  <div className="flex items-center justify-center py-6 gap-2 text-xs text-slate-400">
                                    <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                                    Đang tải danh sách thí sinh...
                                  </div>
                                )}

                                {!isLoadingThisStudents && students.length === 0 && (
                                  <p className="text-xs text-slate-400 text-center py-4">
                                    Chưa có dữ liệu thí sinh trong ca thi này.
                                  </p>
                                )}

                                {!isLoadingThisStudents && students.length > 0 && (
                                  <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                      <span className="text-xs font-bold text-slate-700">
                                        Danh sách phân bổ chi tiết ({students.length} thí sinh)
                                      </span>
                                    </div>
                                    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                                      <table className="w-full text-left text-xs">
                                        <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                                          <tr>
                                            <th className="px-3.5 py-2.5 font-bold uppercase tracking-wider text-[11px]">
                                              MSSV
                                            </th>
                                            <th className="px-3.5 py-2.5 font-bold uppercase tracking-wider text-[11px]">
                                              Họ và tên
                                            </th>
                                            <th className="px-3.5 py-2.5 font-bold uppercase tracking-wider text-[11px]">
                                              Phòng thi
                                            </th>
                                            <th className="px-3.5 py-2.5 font-bold uppercase tracking-wider text-[11px]">
                                              Trạng thái
                                            </th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                          {students.map((st) => (
                                            <tr key={st.roll_number} className="hover:bg-slate-50/60">
                                              <td className="px-3.5 py-2 font-mono font-bold text-slate-800">
                                                {st.roll_number}
                                              </td>
                                              <td className="px-3.5 py-2 font-semibold text-slate-900">
                                                {st.full_name}
                                              </td>
                                              <td className="px-3.5 py-2">
                                                <span className="inline-flex items-center gap-1 font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-800">
                                                  <Building className="w-3 h-3 text-blue-500" />
                                                  {st.room}
                                                </span>
                                              </td>
                                              <td className="px-3.5 py-2">
                                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700">
                                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                                  Đủ điều kiện
                                                </span>
                                              </td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal 1: Create Exam */}
      {showExamModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center text-blue-700">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Tạo kỳ thi mới</h3>
                  <p className="text-xs text-slate-500">Khai báo thông số bài thi vấn đáp</p>
                </div>
              </div>
              <button
                onClick={() => setShowExamModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateExam} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Tên kỳ thi <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={examForm.name}
                  onChange={(e) => setExamForm({ ...examForm, name: e.target.value })}
                  placeholder="VD: Thi Vấn Đáp Cuối Kỳ - Final Exam"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Mô tả bài thi
                </label>
                <textarea
                  value={examForm.description}
                  onChange={(e) => setExamForm({ ...examForm, description: e.target.value })}
                  rows={2}
                  placeholder="Mô tả nội dung, phạm vi kiến thức..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Thời lượng (phút) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={examForm.time_limit}
                    onChange={(e) =>
                      setExamForm({ ...examForm, time_limit: parseInt(e.target.value, 10) || 30 })
                    }
                    min={5}
                    max={180}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Số câu hỏi <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={examForm.question_count}
                    onChange={(e) =>
                      setExamForm({ ...examForm, question_count: parseInt(e.target.value, 10) || 3 })
                    }
                    min={1}
                    max={20}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowExamModal(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={creatingExam || !examForm.name.trim()}
                  className="inline-flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-xs transition disabled:opacity-50"
                >
                  {creatingExam && <Loader2 className="w-4 h-4 animate-spin" />}
                  {creatingExam ? 'Đang tạo...' : 'Tạo kỳ thi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Create Batch & Auto-Allocate for Selected Exam */}
      {batchModalExam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center text-blue-700">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Thêm ca thi & Phân bổ tự động
                  </h3>
                  <p className="text-xs text-slate-500">
                    Thuộc kỳ thi: <strong className="text-blue-700">{batchModalExam.name}</strong>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setBatchModalExam(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateBatch} className="p-6 space-y-4">
              {/* Batch Name */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Tên ca thi / đợt thi <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={batchForm.name}
                  onChange={(e) => setBatchForm({ ...batchForm, name: e.target.value })}
                  placeholder="VD: Ca 1 - Sáng"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Ngày thi <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={batchForm.date}
                    onChange={(e) => setBatchForm({ ...batchForm, date: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Bắt đầu <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="time"
                    value={batchForm.start_time}
                    onChange={(e) => setBatchForm({ ...batchForm, start_time: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Kết thúc <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="time"
                    value={batchForm.end_time}
                    onChange={(e) => setBatchForm({ ...batchForm, end_time: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              {/* Rooms */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Danh sách phòng thi <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={batchForm.rooms}
                  onChange={(e) => setBatchForm({ ...batchForm, rooms: e.target.value })}
                  placeholder="VD: AL-L401, AL-L402, AL-L403"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Nhập các phòng cách nhau bằng dấu phẩy. Thuật toán sẽ chia đều thí sinh vào các phòng này.
                </p>
              </div>

              {/* Capacity & Teacher */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Sĩ số tối đa / phòng
                  </label>
                  <input
                    type="number"
                    value={batchForm.max_students_per_room}
                    onChange={(e) =>
                      setBatchForm({
                        ...batchForm,
                        max_students_per_room: parseInt(e.target.value, 10) || 15,
                      })
                    }
                    min={1}
                    max={50}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Giảng viên phụ trách <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={batchForm.assigned_teacher_id}
                    onChange={(e) => setBatchForm({ ...batchForm, assigned_teacher_id: e.target.value })}
                    required
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- Chọn giảng viên phụ trách --</option>
                    {teachers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.username})
                      </option>
                    ))}
                  </select>
                  {teachers.length === 0 && (
                    <p className="text-[11px] text-amber-600 mt-1 font-semibold">
                      Chưa tìm thấy tài khoản Giảng viên (TEACHER) nào.
                    </p>
                  )}
                </div>
              </div>

              {/* Notice */}
              <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-xl p-3">
                <AlertCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-blue-800">
                  Hệ thống tự động lấy thí sinh <strong>ĐỦ ĐIỀU KIỆN</strong> và{' '}
                  <strong>CHƯA PHÂN BỔ</strong> để chia đều theo thuật toán Round-Robin. Thí sinh bị{' '}
                  <strong>CẤM THI</strong> sẽ bị loại trừ hoàn toàn.
                </p>
              </div>

              {/* Modal Footer */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setBatchModalExam(null)}
                  className="px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={
                    creatingBatch ||
                    !batchForm.name.trim() ||
                    !batchForm.date ||
                    !batchForm.rooms.trim() ||
                    !batchForm.assigned_teacher_id
                  }
                  className="inline-flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-xs transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {creatingBatch && <Loader2 className="w-4 h-4 animate-spin" />}
                  {creatingBatch ? 'Đang phân bổ...' : 'Tạo & Phân bổ tự động'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
