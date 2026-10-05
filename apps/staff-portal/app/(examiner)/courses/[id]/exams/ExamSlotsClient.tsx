'use client';

import { useState, useEffect, useCallback } from 'react';
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
} from 'lucide-react';
import { toast } from 'sonner';

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

export default function ExamSlotsClient({ examId }: { examId: string }) {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [assigningTeacher, setAssigningTeacher] = useState(false);
  const [formData, setFormData] = useState({
    slot_count: 2,
    date: '',
    start_time: '08:00',
    duration_minutes: 120,
    rooms: '',
  });
  const [selectedTeacherId, setSelectedTeacherId] = useState('');

  const fetchSlots = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/examiner/exams/${examId}/slots`, { credentials: 'include' });
      if (!res.ok) throw new Error(`Lỗi server: ${res.status}`);
      const data = await res.json();
      setSlots(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải danh sách ca thi');
    } finally {
      setLoading(false);
    }
  }, [examId]);

  const fetchTeachers = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/users?role=TEACHER', { credentials: 'include' });
      if (!res.ok) return;
      const data = await res.json();
      setTeachers(Array.isArray(data) ? data : []);
    } catch {
      // Silently fail - teachers list is optional
    }
  }, []);

  useEffect(() => {
    fetchSlots();
  }, [fetchSlots]);

  const handleCreateSlots = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // Parse rooms (comma-separated)
      const roomList = formData.rooms
        .split(',')
        .map((r) => r.trim())
        .filter(Boolean);

      const startMinutes = formData.start_time
        .split(':')
        .reduce((acc, val, idx) => acc + (idx === 0 ? parseInt(val) * 60 : parseInt(val)), 0);

      const slotItems: CreateSlotItem[] = [];
      for (let i = 0; i < formData.slot_count; i++) {
        const endMinutes = startMinutes + parseInt(String(formData.duration_minutes));
        const endTime = `${String(Math.floor(endMinutes / 60)).padStart(2, '0')}:${String(endMinutes % 60).padStart(2, '0')}`;
        const dateObj = new Date(formData.date);
        const dateTs = Math.floor(dateObj.getTime() / 1000);

        slotItems.push({
          slot_number: i + 1,
          date: dateTs,
          start_time: formData.start_time,
          end_time: endTime,
          room: roomList[i] || `Phòng ${i + 1}`,
          max_students: 30,
        });
      }

      const res = await fetch(`/api/examiner/exams/${examId}/slots`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ slots: slotItems }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: 'Tạo ca thi thất bại' }));
        throw new Error(err.message || err.detail || 'Tạo ca thi thất bại');
      }

      toast.success(`Đã tạo ${slotItems.length} ca thi thành công`);
      setShowCreateModal(false);
      setFormData({ slot_count: 2, date: '', start_time: '08:00', duration_minutes: 120, rooms: '' });
      fetchSlots();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Tạo ca thi thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLockToggle = async (slotId: string, lock: boolean) => {
    const endpoint = lock ? 'lock' : 'unlock';
    try {
      const res = await fetch(`/api/examiner/slots/${slotId}/${endpoint}`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) throw new Error(`${lock ? 'Khóa' : 'Mở khóa'} thất bại`);
      toast.success(lock ? 'Đã khóa sổ điểm' : 'Đã mở khóa sổ điểm');
      fetchSlots();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Thao tác thất bại');
    }
  };

  const handleAssignTeacher = async () => {
    if (!selectedSlot || !selectedTeacherId) return;
    setAssigningTeacher(true);
    try {
      const form = new FormData();
      form.append('teacher_id', selectedTeacherId);

      const res = await fetch(`/api/examiner/slots/${selectedSlot.id}/assign-teacher`, {
        method: 'POST',
        credentials: 'include',
        body: form,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: 'Giao đề thất bại' }));
        throw new Error(err.message || err.detail || 'Giao đề thất bại');
      }

      toast.success('Giao đề cho giảng viên thành công');
      setShowAssignModal(false);
      setSelectedSlot(null);
      setSelectedTeacherId('');
      fetchSlots();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Giao đề thất bại');
    } finally {
      setAssigningTeacher(false);
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
    fetchTeachers();
    setShowAssignModal(true);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-3">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        <div className="text-slate-500 font-medium text-sm">Đang tải danh sách ca thi...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Quản lý Ca thi</h1>
          <p className="text-sm text-slate-500 mt-1">
            Tạo ca thi, giao đề cho giảng viên và khóa/mở khóa sổ điểm
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm px-4 py-2.5 rounded-xl shadow-xs transition"
        >
          <Plus className="w-4 h-4" />
          Tạo ca thi
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
            onClick={fetchSlots}
            className="text-xs text-red-600 hover:text-red-800 font-semibold whitespace-nowrap"
          >
            Thử lại
          </button>
        </div>
      )}

      {/* Empty State */}
      {!error && slots.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Clock className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-bold text-slate-700">Chưa có ca thi nào</h3>
          <p className="text-sm text-slate-500 mt-2">Bắt đầu bằng cách tạo ca thi đầu tiên cho kỳ thi này.</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="mt-6 inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm px-5 py-2.5 rounded-xl transition"
          >
            <Plus className="w-4 h-4" />
            Tạo ca thi đầu tiên
          </button>
        </div>
      )}

      {/* Slot Grid */}
      {slots.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {slots.map((slot) => {
            const statusCfg = STATUS_CONFIG[slot.status] ?? STATUS_CONFIG['PENDING'];
            const StatusIcon = statusCfg.icon;
            return (
              <div
                key={slot.id}
                className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow"
              >
                {/* Card Header */}
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-11 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Clock className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-slate-900 text-sm leading-snug">Ca {slot.slot_number}</h3>
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
                        Đã khóa
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Body */}
                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      Giờ thi
                    </span>
                    <span className="font-semibold text-slate-700">
                      {slot.start_time} - {slot.end_time}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" />
                      Phòng
                    </span>
                    <span className="font-semibold text-slate-700">{slot.room}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      Sinh viên
                    </span>
                    <span className="font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                      {slot.student_count} SV
                    </span>
                  </div>
                  {slot.exam_variant && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 flex items-center gap-1">
                        <BookOpen className="w-3.5 h-3.5" />
                        Đề thi
                      </span>
                      <span className="font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                        {slot.exam_variant.name}
                      </span>
                    </div>
                  )}
                </div>

                {/* Card Actions */}
                <div className="flex gap-2 pt-3 border-t border-slate-100">
                  {slot.status === 'PENDING' && (
                    <button
                      onClick={() => openAssignModal(slot)}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold py-2 rounded-xl transition"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      Giao đề
                    </button>
                  )}
                  <button
                    onClick={() => handleLockToggle(slot.id, !slot.grade_locked)}
                    className={`flex-1 inline-flex items-center justify-center gap-1.5 text-xs font-semibold py-2 rounded-xl transition ${
                      slot.grade_locked
                        ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
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
              </div>
            );
          })}
        </div>
      )}

      {/* Create Slots Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowCreateModal(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Tạo Ca thi</h2>
                <p className="text-xs text-slate-500 mt-0.5">Tạo nhiều ca thi cùng lúc cho kỳ thi</p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleCreateSlots} className="p-4 space-y-4">
              {/* Slot Count */}
              <div>
                <label
                  htmlFor="slot_count"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5"
                >
                  Số ca thi <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  id="slot_count"
                  min={1}
                  max={10}
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
                  placeholder="A101, A102, A103"
                  value={formData.rooms}
                  onChange={(e) => setFormData({ ...formData, rooms: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Nhiều phòng cách nhau bằng dấu phẩy. Nếu ít phòng hơn số ca, phòng sẽ được lặp lại.
                </p>
              </div>

              {/* Notice */}
              <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3">
                <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700">
                  Sinh viên đã đăng ký sẽ được phân chia đều vào các ca thi theo thứ tự đăng ký.
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
                  {submitting ? 'Đang tạo...' : `Tạo ${formData.slot_count} Ca thi`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Teacher Modal */}
      {showAssignModal && selectedSlot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowAssignModal(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Giao đề cho giảng viên</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Giao ca thi số {selectedSlot.slot_number} cho giảng viên tạo đề
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
            <div className="p-4 space-y-4">
              {/* Slot Info Summary */}
              <div className="bg-slate-50 rounded-xl p-3 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Ngày thi</span>
                  <span className="font-semibold text-slate-700">{formatDate(selectedSlot.date)}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Giờ thi</span>
                  <span className="font-semibold text-slate-700">
                    {selectedSlot.start_time} - {selectedSlot.end_time}
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
                  Giảng viên <span className="text-red-500">*</span>
                </label>
                <select
                  id="teacher"
                  value={selectedTeacherId}
                  onChange={(e) => setSelectedTeacherId(e.target.value)}
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
                {teachers.length === 0 && (
                  <p className="text-[11px] text-slate-400 mt-1">Không tìm thấy giảng viên nào.</p>
                )}
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
                  {assigningTeacher ? 'Đang giao...' : 'Giao đề'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
