'use client';

import { useState } from 'react';
import { X, Sparkles, Loader2, AlertCircle, FileEdit, CheckCircle2 } from 'lucide-react';
import { teacherService } from '@/services';

interface EditTranscriptModalProps {
  isOpen: boolean;
  onClose: () => void;
  attemptId: string;
  sequence: number;
  questionText: string;
  initialTranscript: string;
  sttConfidence?: number | null;
  onSuccess: (updatedAttempt: any) => void;
}

export function EditTranscriptModal({
  isOpen,
  onClose,
  attemptId,
  sequence,
  questionText,
  initialTranscript,
  sttConfidence,
  onSuccess,
}: EditTranscriptModalProps) {
  const [transcript, setTranscript] = useState(initialTranscript || '');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transcript.trim()) {
      setError('Văn bản transcript không được để trống.');
      return;
    }
    if (!reason.trim() || reason.trim().length < 3) {
      setError('Vui lòng nhập lý do điều chỉnh transcript (tối thiểu 3 ký tự).');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      await teacherService.regradeTranscript(attemptId, {
        corrected_transcript: transcript.trim(),
        reason: reason.trim(),
      });

      onSuccess({ id: attemptId });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi khi gửi yêu cầu chấm lại');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 flex flex-col max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b pb-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <FileEdit className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Điều chỉnh Transcript & AI Chấm lại</h3>
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
          {sttConfidence !== undefined && sttConfidence !== null && (
            <div className="mt-1.5 text-[11px] text-slate-500 flex items-center gap-1 font-mono">
              <span>Độ tin cậy STT ban đầu:</span>
              <strong className="text-blue-600">{(sttConfidence * 100).toFixed(1)}%</strong>
            </div>
          )}
        </div>

        {error && (
          <div className="p-3 mb-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Transcript textarea */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Văn bản trả lời đã hiệu đính <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={5}
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder="Nhập nội dung trả lời đúng của thí sinh sau khi nghe lại audio..."
              className="w-full p-3 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all leading-relaxed"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Chỉnh sửa các từ ngữ chuyên ngành, thuật ngữ tiếng Anh hoặc âm phát âm bị Whisper nhận diện sai.
            </p>
          </div>

          {/* Reason for correction */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Lý do hiệu đính <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="VD: STT nhận diện sai thuật ngữ 'binary search tree' thành 'binary search string'..."
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Lý do này sẽ được lưu vào lịch sử Audit Log phục vụ công tác thanh tra khảo thí.
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-all"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 flex items-center gap-1.5 transition-all"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>AI đang chấm lại...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Cập nhật & AI Chấm lại</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
