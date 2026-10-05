'use client';

import { useState, useEffect } from 'react';
import { Loader2, EyeOff, CheckCircle, Clock, Award, AlertCircle } from 'lucide-react';

interface ReEvalItem {
  id: string;
  attempt_id: string;
  session_id?: string;
  student_name: string;
  teacher_1_name: string;
  teacher_2_name: string;
  reason: string;
  reason_detail?: string;
  status: string;
  score_1?: number | null;
  score_2?: number | null;
  final_score?: number | null;
  blind_marking: boolean;
  created_at: number;
  completed_at?: number | null;
}

interface ReEvaluationsListProps {
  apiBaseUrl?: string;
}

export function ReEvaluationsList({ apiBaseUrl = '' }: ReEvaluationsListProps) {
  const [items, setItems] = useState<ReEvalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [scoresInput, setScoresInput] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);

  const fetchReEvaluations = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${apiBaseUrl}/api/admin/re-evaluations`, {
        credentials: 'include',
      });
      if (!res.ok) {
        throw new Error(`Lỗi tải danh sách thẩm định: ${res.status}`);
      }
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải danh sách thẩm định');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReEvaluations();
  }, []);

  const handleScoreChange = (id: string, val: number) => {
    setScoresInput((prev) => ({ ...prev, [id]: val }));
  };

  const handleSubmitScore = async (id: string) => {
    const scoreVal = scoresInput[id];
    if (scoreVal === undefined || scoreVal < 0 || scoreVal > 10) {
      alert('Vui lòng nhập điểm hợp lệ từ 0 đến 10.');
      return;
    }

    try {
      setSubmittingId(id);
      const res = await fetch(`${apiBaseUrl}/api/admin/re-evaluations/${id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ score_2: parseFloat(scoreVal.toString()) }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || `Lỗi khi lưu điểm (${res.status})`);
      }

      await fetchReEvaluations();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Lỗi khi gửi điểm');
    } finally {
      setSubmittingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 bg-white rounded-2xl border border-slate-200/80">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        <span className="ml-3 text-slate-600 font-medium text-sm">Đang tải danh sách bài thẩm định...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-sm">
        <p className="font-semibold">{error}</p>
        <button
          onClick={fetchReEvaluations}
          className="mt-2 text-xs font-bold text-rose-800 underline"
        >
          Tải lại
        </button>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="bg-white border border-slate-200/80 rounded-2xl p-12 text-center">
        <Award className="w-10 h-10 text-slate-300 mx-auto mb-2" />
        <h4 className="text-sm font-bold text-slate-700">Chưa có bài thi nào được yêu cầu thẩm định</h4>
        <p className="text-xs text-slate-400 mt-1">
          Khi có sinh viên phúc khảo hoặc Khảo thí yêu cầu chấm chéo độc lập, các bản ghi sẽ xuất hiện tại đây.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500">
          Danh sách các bài thi đang trong quy trình thẩm định độc lập 2 vòng (Blind Marking) theo quy chế khảo thí.
        </p>
        <button
          onClick={fetchReEvaluations}
          className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-all"
        >
          Làm mới
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-200 uppercase font-bold text-slate-500 text-[11px]">
                <th className="px-4 py-3.5">Thí sinh</th>
                <th className="px-4 py-3.5">Lý do thẩm định</th>
                <th className="px-4 py-3.5">Giảng viên chấm</th>
                <th className="px-4 py-3.5 text-center">Điểm vòng 1</th>
                <th className="px-4 py-3.5 text-center">Điểm thẩm định (Vòng 2)</th>
                <th className="px-4 py-3.5 text-center">Điểm chốt</th>
                <th className="px-4 py-3.5 text-center">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item) => {
                const isPending = item.status === 'PENDING';
                return (
                  <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3.5">
                      <p className="font-bold text-slate-900">{item.student_name}</p>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">Attempt: {item.attempt_id.slice(0, 8)}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                        {item.reason}
                      </span>
                      {item.reason_detail && (
                        <p className="text-[11px] text-slate-600 mt-1 line-clamp-1 max-w-xs">{item.reason_detail}</p>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="text-slate-800">GV1: {item.teacher_1_name}</p>
                      <p className="text-slate-500 mt-0.5">GV2: {item.teacher_2_name}</p>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      {item.score_1 !== null && item.score_1 !== undefined ? (
                        <span className="font-bold text-slate-700">{item.score_1} đ</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 italic">
                          <EyeOff className="w-3 h-3 text-slate-400" />
                          <span>Ẩn danh (Blind)</span>
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      {item.score_2 !== null && item.score_2 !== undefined ? (
                        <span className="font-bold text-indigo-600">{item.score_2} đ</span>
                      ) : (
                        <div className="flex items-center justify-center gap-1.5">
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            max="10"
                            placeholder="0-10"
                            value={scoresInput[item.id] ?? ''}
                            onChange={(e) => handleScoreChange(item.id, parseFloat(e.target.value) || 0)}
                            className="w-16 px-2 py-1 text-center font-bold bg-white border border-slate-300 rounded-lg text-xs"
                          />
                          <button
                            onClick={() => handleSubmitScore(item.id)}
                            disabled={submittingId === item.id}
                            className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white rounded-lg text-[11px] font-bold transition-all shadow-xs"
                          >
                            {submittingId === item.id ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Lưu'}
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      {item.final_score !== null && item.final_score !== undefined ? (
                        <span className="font-black text-emerald-600 text-sm">{item.final_score} đ</span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                          item.status === 'COMPLETED'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {item.status === 'COMPLETED' ? (
                          <>
                            <CheckCircle className="w-3 h-3 text-emerald-600" />
                            <span>Đã xong</span>
                          </>
                        ) : (
                          <>
                            <Clock className="w-3 h-3 text-amber-600" />
                            <span>Chờ chấm 2</span>
                          </>
                        )}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
