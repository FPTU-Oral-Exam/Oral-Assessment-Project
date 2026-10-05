'use client';

import { useState } from 'react';
import { X, Award, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

interface CriterionItem {
  name: string;
  score: number;
  max_score: number;
  weight?: number;
  feedback?: string;
}

interface ScoreOverrideModalProps {
  isOpen: boolean;
  onClose: () => void;
  attemptId: string;
  sequence: number;
  questionText: string;
  currentScore: number | null;
  initialCriteria?: CriterionItem[];
  apiBaseUrl?: string;
  onSuccess: (updatedAttempt: any) => void;
}

export function ScoreOverrideModal({
  isOpen,
  onClose,
  attemptId,
  sequence,
  questionText,
  currentScore,
  initialCriteria = [],
  apiBaseUrl = '',
  onSuccess,
}: ScoreOverrideModalProps) {
  const [score, setScore] = useState<number>(currentScore !== null ? currentScore : 5);
  const [reason, setReason] = useState('');
  const [criteria, setCriteria] = useState<CriterionItem[]>(
    initialCriteria.map((c) => ({ ...c }))
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCriterionScoreChange = (idx: number, newScore: number) => {
    setCriteria((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], score: newScore };

      // Optionally auto-calculate total score based on weights
      const totalWeight = next.reduce((sum, c) => sum + (c.weight || 1), 0);
      if (totalWeight > 0) {
        const weightedScore = next.reduce(
          (sum, c) => sum + (c.score / (c.max_score || 10)) * (c.weight || 1),
          0
        );
        const calculatedOverall = Math.round((weightedScore / totalWeight) * 100) / 10;
        setScore(calculatedOverall);
      }

      return next;
    });
  };

  const handleCriterionFeedbackChange = (idx: number, feedback: string) => {
    setCriteria((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], feedback };
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (score < 0 || score > 10) {
      setError('Điểm tổng phải nằm trong khoảng từ 0 đến 10.');
      return;
    }
    if (!reason.trim() || reason.trim().length < 3) {
      setError('Vui lòng nhập lý do can thiệp điểm (tối thiểu 3 ký tự).');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const payload = {
        score: parseFloat(score.toString()),
        reason: reason.trim(),
        criteria: criteria.map((c) => ({
          name: c.name,
          score: parseFloat(c.score.toString()),
          feedback: c.feedback || undefined,
        })),
      };

      const res = await fetch(`${apiBaseUrl}/api/admin/attempts/${attemptId}/override`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || `Lỗi khi can thiệp điểm (${res.status})`);
      }

      const updated = await res.json();
      onSuccess(updated);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi khi gửi can thiệp điểm');
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
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Can thiệp & Điều chỉnh Điểm</h3>
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
          <div className="mt-1.5 flex items-center gap-2">
            <span className="text-slate-500">Điểm AI hiện tại:</span>
            <span className="font-bold text-blue-600">
              {currentScore !== null ? `${currentScore} / 10` : 'Chưa có điểm'}
            </span>
          </div>
        </div>

        {error && (
          <div className="p-3 mb-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Overall score */}
          <div className="bg-blue-50/50 p-3.5 rounded-xl border border-blue-100">
            <label className="block text-xs font-bold text-blue-900 uppercase mb-1">
              Điểm tổng câu hỏi (Thang 10) <span className="text-rose-500">*</span>
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                step="0.1"
                min="0"
                max="10"
                value={score}
                onChange={(e) => setScore(parseFloat(e.target.value) || 0)}
                className="w-28 px-3 py-2 text-base font-bold text-blue-700 bg-white border border-blue-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              <span className="text-xs text-slate-500">
                (Điểm do giảng viên quyết định sẽ ghi đè đánh giá của AI)
              </span>
            </div>
          </div>

          {/* Criteria breakdown */}
          {criteria.length > 0 && (
            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-700 uppercase">
                Chi tiết từng tiêu chí Rubric:
              </label>
              <div className="space-y-2">
                {criteria.map((c, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800">{c.name}</span>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          max={c.max_score}
                          value={c.score}
                          onChange={(e) => handleCriterionScoreChange(idx, parseFloat(e.target.value) || 0)}
                          className="w-16 px-2 py-1 text-center font-bold bg-white border border-slate-300 rounded-lg text-xs"
                        />
                        <span className="text-slate-400">/ {c.max_score} đ</span>
                      </div>
                    </div>
                    <input
                      type="text"
                      placeholder="Nhận xét riêng cho tiêu chí này (tùy chọn)..."
                      value={c.feedback || ''}
                      onChange={(e) => handleCriterionFeedbackChange(idx, e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Reason for override */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Lý do can thiệp điểm <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="VD: Thí sinh giải thích đúng bản chất thuật toán và ví dụ thực tế dù diễn đạt tiếng Anh còn ngập ngừng..."
              className="w-full p-3 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Bắt buộc giải trình minh bạch để phục vụ lưu vết Audit Log.
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
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-300 text-white rounded-xl text-xs font-bold shadow-md shadow-amber-500/20 flex items-center gap-1.5 transition-all"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Đang lưu can thiệp...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Lưu điểm đã can thiệp</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
