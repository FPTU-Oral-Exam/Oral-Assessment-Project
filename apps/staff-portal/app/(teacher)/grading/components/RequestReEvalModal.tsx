'use client';

import { useState, useEffect } from 'react';
import { X, UserCheck, Loader2, AlertCircle, EyeOff } from 'lucide-react';
import { examinerService } from '@/services';
import { teacherService } from '@/services';

interface TeacherUser {
  id: string;
  name: string;
  username: string;
  role: string;
}

interface RequestReEvalModalProps {
  isOpen: boolean;
  onClose: () => void;
  attemptId: string;
  sequence: number;
  questionText: string;
  onSuccess: () => void;
}

export function RequestReEvalModal({
  isOpen,
  onClose,
  attemptId,
  sequence,
  questionText,
  onSuccess,
}: RequestReEvalModalProps) {
  const [teachers, setTeachers] = useState<TeacherUser[]>([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [reason, setReason] = useState<'RECONTROLL' | 'GRADE_DISPUTE' | 'EXAMINER_REQUEST'>('GRADE_DISPUTE');
  const [reasonDetail, setReasonDetail] = useState('');
  const [blindMarking, setBlindMarking] = useState(true);
  const [loadingTeachers, setLoadingTeachers] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    async function loadTeachers() {
      try {
        setLoadingTeachers(true);
        const data = await examinerService.getTeachers();
        const teacherList = Array.isArray(data) ? data : [];
        setTeachers(teacherList);
        if (teacherList.length > 0) {
          setSelectedTeacherId(teacherList[0].id);
        }
      } catch {
        // Non-critical, fallback will handle empty
      } finally {
        setLoadingTeachers(false);
      }
    }

    loadTeachers();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeacherId) {
      setError('Vui lòng chọn giảng viên chấm thẩm định.');
      return;
    }
    if (!reasonDetail.trim() || reasonDetail.trim().length < 5) {
      setError('Vui lòng nhập mô tả lý do phúc khảo/thẩm định (tối thiểu 5 ký tự).');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      await teacherService.requestReEvaluation(attemptId, {
        teacher_id_2: selectedTeacherId,
        reason,
        reason_detail: reasonDetail.trim(),
        blind_marking: blindMarking,
      });

      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi khi gửi yêu cầu thẩm định');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 flex flex-col max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b pb-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <UserCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Yêu cầu Chấm Thẩm định (Chấm chéo)</h3>
              <p className="text-xs text-slate-500">Câu hỏi số {sequence}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Question context */}
        <div className="bg-slate-50 rounded-xl p-3 mb-4 border border-slate-200/80 text-xs">
          <span className="font-bold text-slate-500 uppercase text-[10px]">Câu hỏi:</span>
          <p className="text-slate-800 font-medium mt-0.5">{questionText}</p>
        </div>

        {error && (
          <div className="p-3 mb-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Select Teacher 2 */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Chọn Giảng viên chấm lần 2 <span className="text-rose-500">*</span>
            </label>
            {loadingTeachers ? (
              <div className="flex items-center gap-2 py-2 text-xs text-slate-500">
                <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                <span>Đang tải danh sách giảng viên...</span>
              </div>
            ) : teachers.length > 0 ? (
              <select
                value={selectedTeacherId}
                onChange={(e) => setSelectedTeacherId(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.username})
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                placeholder="Nhập ID giảng viên chấm lần 2..."
                value={selectedTeacherId}
                onChange={(e) => setSelectedTeacherId(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl"
              />
            )}
          </div>

          {/* Reason Select */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Phân loại lý do thẩm định <span className="text-rose-500">*</span>
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value as any)}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="GRADE_DISPUTE">Khiếu nại / Bất đồng đánh giá (GRADE_DISPUTE)</option>
              <option value="RECONTROLL">Hậu kiểm ngẫu nhiên / Tái kiểm (RECONTROLL)</option>
              <option value="EXAMINER_REQUEST">Yêu cầu từ Phòng Khảo thí (EXAMINER_REQUEST)</option>
            </select>
          </div>

          {/* Reason detail */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Chi tiết lý do thẩm định <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              value={reasonDetail}
              onChange={(e) => setReasonDetail(e.target.value)}
              placeholder="Nhập mô tả cụ thể về lý do cần chấm lại độc lập..."
              className="w-full p-3 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          {/* Blind marking toggle */}
          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
            <input
              type="checkbox"
              id="blindMarking"
              checked={blindMarking}
              onChange={(e) => setBlindMarking(e.target.checked)}
              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
            <label htmlFor="blindMarking" className="text-xs text-slate-700 flex items-center gap-1.5 cursor-pointer">
              <EyeOff className="w-4 h-4 text-indigo-500" />
              <span>
                <strong>Chấm độc lập ẩn danh (Blind Marking)</strong>: Giảng viên 2 sẽ không thấy điểm số ban đầu của câu trả lời.
              </span>
            </label>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-all"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-500/20 flex items-center gap-1.5 transition-all"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Đang gửi yêu cầu...</span>
                </>
              ) : (
                <span>Gửi yêu cầu Thẩm định</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
