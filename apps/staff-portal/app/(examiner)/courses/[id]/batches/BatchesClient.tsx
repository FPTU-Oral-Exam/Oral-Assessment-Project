'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Users,
  Clock,
  MapPin,
  Loader2,
  AlertCircle,
  X,
  BookOpen,
  ChevronDown,
  ChevronRight,
  CheckCircle,
} from 'lucide-react';
import { toast } from 'sonner';

interface Exam {
  id: string;
  name: string;
  description?: string;
  status: 'DRAFT' | 'PUBLISHED';
  time_limit: number;
  question_count: number;
}

interface RoomAllocation {
  room: string;
  assigned_count: number;
}

interface ExamBatch {
  batch_id: string;
  name: string;
  date: number;
  start_time: string;
  end_time: string;
  assigned_teacher_id: string;
  total_assigned: number;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED';
  rooms: RoomAllocation[];
}

interface BatchStudent {
  roll_number: string;
  full_name: string;
  room: string;
  eligibility_status: 'ELIGIBLE' | 'DISQUALIFIED';
}

interface Teacher {
  id: string;
  name: string;
  username: string;
}

interface BatchCreateForm {
  name: string;
  date: string;
  start_time: string;
  end_time: string;
  rooms: string;
  max_students_per_room: number;
  assigned_teacher_id: string;
}

export default function BatchesClient({ courseId }: { courseId: string }) {
  const [exams, setExams] = useState<Exam[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<string>('');
  const [batches, setBatches] = useState<ExamBatch[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingBatches, setLoadingBatches] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Expanded batch state
  const [expandedBatchId, setExpandedBatchId] = useState<string | null>(null);
  const [batchStudents, setBatchStudents] = useState<Record<string, BatchStudent[]>>({});
  const [loadingStudents, setLoadingStudents] = useState<string | null>(null);

  // Create batch modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState<BatchCreateForm>({
    name: '',
    date: '',
    start_time: '08:00',
    end_time: '10:00',
    rooms: '',
    max_students_per_room: 15,
    assigned_teacher_id: '',
  });

  // Fetch exams
  const fetchExams = useCallback(async () => {
    try {
      const res = await fetch(`/api/examiner/courses/${courseId}/exams`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error(`Lỗi server: ${res.status}`);
      const data = await res.json();
      const examList = Array.isArray(data) ? data : [];
      setExams(examList);
      if (examList.length > 0 && !selectedExamId) {
        setSelectedExamId(examList[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải danh sách đề thi');
    }
  }, [courseId, selectedExamId]);

  // Fetch batches for selected exam
  const fetchBatches = useCallback(async (examId: string) => {
    if (!examId) return;
    setLoadingBatches(true);
    try {
      const res = await fetch(`/api/examiner/exams/${examId}/batches`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error(`Lỗi server: ${res.status}`);
      const data = await res.json();
      setBatches(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Không thể tải danh sách đợt thi');
    } finally {
      setLoadingBatches(false);
    }
  }, []);

  // Fetch teachers
  const fetchTeachers = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/users?role=TEACHER', {
        credentials: 'include',
      });
      if (!res.ok) return;
      const data = await res.json();
      setTeachers(Array.isArray(data) ? data : []);
    } catch {
      // Teachers list is optional
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchExams(), fetchTeachers()]);
      setLoading(false);
    };
    init();
  }, [fetchExams, fetchTeachers]);

  useEffect(() => {
    if (selectedExamId) {
      fetchBatches(selectedExamId);
    }
  }, [selectedExamId, fetchBatches]);

  // Toggle batch expansion and fetch students
  const toggleBatch = async (batchId: string) => {
    if (expandedBatchId === batchId) {
      setExpandedBatchId(null);
      return;
    }
    setExpandedBatchId(batchId);

    if (!batchStudents[batchId]) {
      setLoadingStudents(batchId);
      try {
        const res = await fetch(`/api/examiner/batches/${batchId}/students`, {
          credentials: 'include',
        });
        if (!res.ok) throw new Error('Lỗi server');
        const data = await res.json();
        setBatchStudents((prev) => ({ ...prev, [batchId]: Array.isArray(data) ? data : [] }));
      } catch {
        toast.error('Không thể tải danh sách thí sinh');
      } finally {
        setLoadingStudents(null);
      }
    }
  };

  // Create batch with auto-allocation
  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExamId) {
      toast.error('Vui lòng chọn đề thi trước');
      return;
    }
    setCreating(true);

    try {
      const roomList = formData.rooms
        .split(',')
        .map((r) => r.trim())
        .filter(Boolean);

      if (roomList.length === 0) {
        throw new Error('Danh sách phòng thi không được để trống');
      }

      if (!formData.assigned_teacher_id) {
        throw new Error('Vui lòng chọn giảng viên phụ trách');
      }

      const dateObj = new Date(formData.date);
      const dateTs = Math.floor(dateObj.getTime() / 1000);

      const res = await fetch(`/api/examiner/exams/${selectedExamId}/batches`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: formData.name,
          date: dateTs,
          start_time: formData.start_time,
          end_time: formData.end_time,
          rooms: roomList,
          max_students_per_room: formData.max_students_per_room,
          assigned_teacher_id: formData.assigned_teacher_id,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: 'Tạo đợt thi thất bại' }));
        throw new Error(err.detail || err.message || 'Tạo đợt thi thất bại');
      }

      const result = await res.json();
      toast.success(
        `Đã tạo đợt thi "${result.name}" và phân bổ ${result.total_assigned} thí sinh vào ${result.rooms.length} phòng`
      );

      setShowCreateModal(false);
      setFormData({
        name: '',
        date: '',
        start_time: '08:00',
        end_time: '10:00',
        rooms: '',
        max_students_per_room: 15,
        assigned_teacher_id: '',
      });
      fetchBatches(selectedExamId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Tạo đợt thi thất bại');
    } finally {
      setCreating(false);
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

  const selectedExam = exams.find((e) => e.id === selectedExamId);

  const statusConfig: Record<string, { color: string; label: string }> = {
    SCHEDULED: { color: 'bg-amber-50 text-amber-700 border-amber-200', label: 'Đã lên lịch' },
    IN_PROGRESS: { color: 'bg-blue-50 text-blue-700 border-blue-200', label: 'Đang thi' },
    COMPLETED: { color: 'bg-emerald-50 text-emerald-700 border-emerald-200', label: 'Hoàn thành' },
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-3">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        <div className="text-slate-500 font-medium text-sm">Đang tải thông tin đề thi...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Đợt thi & Phân bổ tự động</h2>
          <p className="text-sm text-slate-500 mt-1">
            Tạo đợt thi, chọn phòng và giảng viên. Hệ thống tự động phân bổ thí sinh đủ điều kiện vào các phòng.
          </p>

          {/* Exam Selector */}
          {exams.length > 0 && (
            <div className="mt-4 flex items-center gap-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Đề thi:</span>
              <select
                value={selectedExamId}
                onChange={(e) => setSelectedExamId(e.target.value)}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {exams.map((exam) => (
                  <option key={exam.id} value={exam.id}>
                    {exam.name} ({exam.question_count} câu, {exam.time_limit}p)
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="flex-shrink-0">
          {exams.length > 0 ? (
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl shadow-xs transition"
            >
              <Plus className="w-4 h-4" />
              Tạo đợt thi mới
            </button>
          ) : (
            <div className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2">
              Cần tạo đề thi trước khi tạo đợt thi
            </div>
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
          <button onClick={fetchExams} className="text-xs text-red-600 hover:text-red-800 font-semibold whitespace-nowrap">
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
          <h3 className="text-lg font-bold text-slate-800">Môn học chưa có đề thi</h3>
          <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto">
            Vui lòng tạo đề thi cho môn học trước khi thiết lập các đợt thi và phân bổ thí sinh.
          </p>
        </div>
      )}

      {/* Empty State: No Batches */}
      {exams.length > 0 && !loadingBatches && batches.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-bold text-slate-700">Chưa có đợt thi nào</h3>
          <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto">
            Tạo đợt thi đầu tiên để bắt đầu phân bổ thí sinh đủ điều kiện vào các phòng thi tự động.
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="mt-6 inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm px-5 py-2.5 rounded-xl transition"
          >
            <Plus className="w-4 h-4" />
            Tạo đợt thi đầu tiên
          </button>
        </div>
      )}

      {/* Batches List */}
      {loadingBatches ? (
        <div className="flex flex-col items-center justify-center py-16 space-y-3">
          <Loader2 className="w-7 h-7 text-blue-600 animate-spin" />
          <div className="text-slate-500 font-medium text-xs">Đang tải danh sách đợt thi...</div>
        </div>
      ) : (
        batches.length > 0 && (
          <div className="space-y-4">
            {batches.map((batch) => {
              const isExpanded = expandedBatchId === batch.batch_id;
              const students = batchStudents[batch.batch_id] || [];
              const statusCfg = statusConfig[batch.status] || statusConfig['SCHEDULED'];
              const totalCapacity = batch.rooms.reduce((sum, r) => sum + r.assigned_count, 0);

              return (
                <div
                  key={batch.batch_id}
                  className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs"
                >
                  {/* Batch Header */}
                  <div
                    className="flex items-start justify-between gap-4 p-5 cursor-pointer hover:bg-slate-50 transition-colors"
                    onClick={() => toggleBatch(batch.batch_id)}
                  >
                    <div className="flex items-start gap-4 flex-1 min-w-0">
                      <button className="mt-1 flex-shrink-0 text-slate-400 hover:text-slate-600 transition-colors">
                        {isExpanded ? (
                          <ChevronDown className="w-5 h-5" />
                        ) : (
                          <ChevronRight className="w-5 h-5" />
                        )}
                      </button>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-base font-bold text-slate-900">{batch.name}</h3>
                          <span
                            className={`flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-full border ${statusCfg.color}`}
                          >
                            {statusCfg.label}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                          <span className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            {formatDate(batch.date)}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            {batch.start_time} - {batch.end_time}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5 text-slate-400" />
                            {batch.total_assigned} thí sinh
                          </span>
                        </div>

                        {/* Room Chips */}
                        <div className="flex flex-wrap gap-2 mt-3">
                          {batch.rooms.map((room, idx) => (
                            <div
                              key={idx}
                              className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-100 rounded-lg"
                            >
                              <MapPin className="w-3.5 h-3.5 text-blue-500" />
                              <span className="text-xs font-semibold text-blue-700">{room.room}</span>
                              <span className="text-xs text-blue-500">({room.assigned_count})</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Expanded: Students by Room */}
                  {isExpanded && (
                    <div className="border-t border-slate-200 bg-slate-50 p-5">
                      {loadingStudents === batch.batch_id ? (
                        <div className="flex items-center justify-center py-8 gap-3">
                          <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                          <span className="text-sm text-slate-500">Đang tải danh sách thí sinh...</span>
                        </div>
                      ) : students.length === 0 ? (
                        <p className="text-sm text-slate-500 text-center py-4">Không có thí sinh nào trong đợt thi này</p>
                      ) : (
                        <div className="space-y-4">
                          {/* Group by room */}
                          {batch.rooms.map((room) => {
                            const roomStudents = students.filter((s) => s.room === room.room);
                            if (roomStudents.length === 0) return null;

                            return (
                              <div key={room.room} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                                <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 border-b border-blue-100">
                                  <MapPin className="w-4 h-4 text-blue-600" />
                                  <span className="text-sm font-bold text-blue-700">
                                    Phòng {room.room}
                                  </span>
                                  <span className="text-xs text-blue-500 ml-auto">
                                    {roomStudents.length} thí sinh
                                  </span>
                                </div>
                                <div className="divide-y divide-slate-100">
                                  {roomStudents.map((student, idx) => (
                                    <div
                                      key={idx}
                                      className="flex items-center justify-between px-4 py-2.5"
                                    >
                                      <div className="flex items-center gap-3">
                                        <span className="text-sm font-semibold text-slate-900 font-mono w-24">
                                          {student.roll_number}
                                        </span>
                                        <span className="text-sm text-slate-700">{student.full_name}</span>
                                      </div>
                                      <span
                                        className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-full border ${
                                          student.eligibility_status === 'ELIGIBLE'
                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                            : 'bg-red-50 text-red-700 border-red-200'
                                        }`}
                                      >
                                        <CheckCircle className="w-3 h-3" />
                                        {student.eligibility_status === 'ELIGIBLE' ? 'Đủ ĐK' : 'Cấm'}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )
      )}

      {/* Create Batch Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowCreateModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-200">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Tạo đợt thi mới</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tự động phân bổ thí sinh đủ điều kiện vào các phòng
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
            <form onSubmit={handleCreateBatch} className="p-5 space-y-4">
              {/* Batch Name */}
              <div>
                <label htmlFor="batch-name" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Tên đợt thi <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="batch-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="VD: Đợt 1 - Ca sáng"
                  required
                />
              </div>

              {/* Date */}
              <div>
                <label htmlFor="batch-date" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Ngày thi <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  id="batch-date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              {/* Time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="batch-start" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Giờ bắt đầu <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="time"
                    id="batch-start"
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="batch-end" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Giờ kết thúc <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="time"
                    id="batch-end"
                    value={formData.end_time}
                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              {/* Rooms */}
              <div>
                <label htmlFor="batch-rooms" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Danh sách phòng thi <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="batch-rooms"
                  value={formData.rooms}
                  onChange={(e) => setFormData({ ...formData, rooms: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="VD: AL-L401, AL-L402, AL-L403"
                  required
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Nhập các phòng thi cách nhau bằng dấu phẩy
                </p>
              </div>

              {/* Max per Room */}
              <div>
                <label htmlFor="batch-capacity" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Số thí sinh tối đa / phòng
                </label>
                <input
                  type="number"
                  id="batch-capacity"
                  value={formData.max_students_per_room}
                  onChange={(e) =>
                    setFormData({ ...formData, max_students_per_room: parseInt(e.target.value, 10) || 15 })
                  }
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min={1}
                  max={50}
                />
              </div>

              {/* Teacher */}
              <div>
                <label htmlFor="batch-teacher" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Giảng viên phụ trách <span className="text-red-500">*</span>
                </label>
                <select
                  id="batch-teacher"
                  value={formData.assigned_teacher_id}
                  onChange={(e) => setFormData({ ...formData, assigned_teacher_id: e.target.value })}
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Chọn giảng viên --</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.username})
                    </option>
                  ))}
                </select>
              </div>

              {/* Notice */}
              <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-xl p-3">
                <AlertCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-blue-800">
                  Hệ thống sẽ tự động lấy các thí sinh <strong>ĐỦ ĐIỀU KIỆN</strong> và{' '}
                  <strong>CHƯA ĐƯỢC PHÂN BỔ</strong> để phân bổ đều vào các phòng theo thứ tự MSSV.
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
                  disabled={creating || !formData.name.trim() || !formData.date || !formData.rooms.trim() || !formData.assigned_teacher_id}
                  className="inline-flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-xs transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {creating && <Loader2 className="w-4 h-4 animate-spin" />}
                  {creating ? 'Đang tạo...' : 'Tạo & Phân bổ tự động'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
