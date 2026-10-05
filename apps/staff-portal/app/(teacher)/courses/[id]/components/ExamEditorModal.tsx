'use client';

import { useState } from 'react';
import {
  ClipboardList,
  Sparkles,
  Send,
  X,
  AlertCircle,
  CheckCircle2,
  Lock,
  Layers,
  Award,
  Clock,
  BookOpen,
  HelpCircle,
  Loader2,
  ShieldCheck,
  Languages,
} from 'lucide-react';
import { api } from '@/lib/api';
import AssignExamModal from './AssignExamModal';

export interface ExamItem {
  id: string;
  name: string;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  time_limit: number;
  rubric_id: string;
  blueprint?: Array<{ topic_id: string; difficulty: string; count: number }>;
  questions?: Array<{
    text: string;
    english_terms?: Array<{ term: string; meaning: string }>;
    difficulty?: string;
    topic_id?: string;
  }>;
  snapshot?: any;
}

interface ExamEditorModalProps {
  courseId: string;
  exam: ExamItem;
  rubricName?: string;
  topicsMap: Record<string, string>;
  onClose: () => void;
  onRefresh: () => Promise<void>;
}

export default function ExamEditorModal({
  courseId,
  exam,
  rubricName,
  topicsMap,
  onClose,
  onRefresh,
}: ExamEditorModalProps) {
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [assignModalOpen, setAssignModalOpen] = useState(false);

  const isPublished = exam.status === 'PUBLISHED';
  const questions = exam.questions || [];

  const handlePublish = async () => {
    if (
      !confirm(
        'Bạn có chắc chắn muốn AI sinh câu hỏi và CÔNG BỐ đề thi này?\n\n' +
          'Lưu ý quan trọng theo quy định Khảo thí:\n' +
          '• Hệ thống sẽ truy xuất tài liệu giáo trình (RAG) và dùng Qwen 2.5 sinh câu hỏi.\n' +
          '• Đề sau khi công bố sẽ ĐÓNG BĂNG SNAPSHOT và KHÔNG THỂ CHỈNH SỬA.'
      )
    ) {
      return;
    }

    try {
      setPublishing(true);
      setError(null);

      await api(`/admin/exams/${exam.id}/publish`, {
        method: 'POST',
      });

      await onRefresh();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('KNOWLEDGE_NOT_READY')) {
        setError('Tài liệu giáo trình chưa sẵn sàng (READY) với mô hình embedding hiện tại. Vui lòng kiểm tra Tab Giáo trình.');
      } else if (msg.includes('NO_EVIDENCE')) {
        setError('Một số chủ đề trong đề thi chưa tìm thấy đoạn tài liệu tương ứng trong giáo trình.');
      } else {
        setError(msg || 'Lỗi khi kích hoạt AI sinh câu hỏi & công bố đề');
      }
    } finally {
      setPublishing(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200">
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
            <div className="flex items-center gap-2.5">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold ${
                  isPublished ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                }`}
              >
                {isPublished ? <Lock className="w-4 h-4" /> : <ClipboardList className="w-4 h-4" />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-slate-800 text-base">{exam.name}</h3>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      isPublished
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}
                  >
                    {isPublished ? 'ĐÃ CÔNG BỐ (BẤT BIẾN)' : 'BẢN NHÁP'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">ID: {exam.id}</p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/50"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {error && (
              <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-2xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Immutability Alert */}
            {isPublished ? (
              <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-4 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="text-xs text-emerald-900 leading-relaxed">
                  <strong>Nguyên tắc bất biến (BR-023a):</strong> Đề thi này đã được sinh câu hỏi bằng AI RAG và đóng băng snapshot vào ngân hàng đề thi. Theo quy chế khảo thí FPTU, giảng viên không được sửa câu hỏi sau khi công bố để bảo đảm an toàn dữ liệu và tính công bằng tuyệt đối.
                </div>
              </div>
            ) : (
              <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
                <HelpCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-900 leading-relaxed">
                  <strong>Đề thi ở trạng thái Bản nháp:</strong> Bạn đã thiết lập ma trận Blueprint. Hãy bấm nút <strong>"Kích hoạt AI sinh câu hỏi & Công bố"</strong> để mô hình Qwen 2.5 đọc giáo trình RAG, tạo câu hỏi vấn đáp và gợi ý thuật ngữ chuyên ngành tiếng Anh.
                </div>
              </div>
            )}

            {/* Parameters Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 space-y-1">
                <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  Thời gian làm bài
                </span>
                <p className="text-xs font-bold text-slate-800">
                  {exam.time_limit ? `${Math.round(exam.time_limit / 60)} phút (${exam.time_limit}s)` : 'Không giới hạn'}
                </p>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 space-y-1">
                <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5" />
                  Rubric áp dụng
                </span>
                <p className="text-xs font-bold text-slate-800 truncate" title={rubricName || '—'}>
                  {rubricName || 'Rubric tiêu chuẩn'}
                </p>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 space-y-1">
                <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5" />
                  Số câu hỏi
                </span>
                <p className="text-xs font-bold text-slate-800">
                  {questions.length > 0 ? `${questions.length} câu đã sinh` : `${exam.blueprint?.reduce((sum, r) => sum + r.count, 0) || 0} câu dự kiến`}
                </p>
              </div>
            </div>

            {/* Blueprint Matrix Breakdown */}
            {exam.blueprint && exam.blueprint.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-slate-400" />
                  Ma trận phân bổ câu hỏi (Exam Blueprint)
                </h4>
                <div className="bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100/70 text-slate-500 font-semibold border-b border-slate-200 text-[11px]">
                      <tr>
                        <th className="px-4 py-2.5">Chủ đề kiến thức (Topic)</th>
                        <th className="px-4 py-2.5 text-center">Độ khó</th>
                        <th className="px-4 py-2.5 text-right">Số câu hỏi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200/60">
                      {exam.blueprint.map((row, idx) => (
                        <tr key={idx}>
                          <td className="px-4 py-2 text-slate-800 font-medium">
                            {topicsMap[row.topic_id] || row.topic_id}
                          </td>
                          <td className="px-4 py-2 text-center">
                            <span
                              className={`px-2 py-0.5 rounded-md font-mono text-[10px] font-bold ${
                                row.difficulty === 'EASY'
                                  ? 'bg-blue-50 text-blue-700'
                                  : row.difficulty === 'MEDIUM'
                                  ? 'bg-amber-50 text-amber-700'
                                  : 'bg-red-50 text-red-700'
                              }`}
                            >
                              {row.difficulty}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-right font-mono font-bold text-slate-800">
                            {row.count}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Published Questions List */}
            {isPublished && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-emerald-600" />
                    Danh sách câu hỏi chính thức ({questions.length})
                  </h4>
                  <span className="text-[10px] text-slate-400 italic">Được sinh từ Qwen 2.5 RAG</span>
                </div>

                <div className="space-y-3">
                  {questions.map((q, idx) => (
                    <div
                      key={idx}
                      className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-sm space-y-3"
                    >
                      <div className="flex items-start gap-3">
                        <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 font-bold text-xs flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <div className="flex-1 space-y-1">
                          <p className="text-xs font-semibold text-slate-800 leading-relaxed">
                            {q.text}
                          </p>
                        </div>
                      </div>

                      {/* English Terms Suggested by AI */}
                      {q.english_terms && q.english_terms.length > 0 && (
                        <div className="bg-slate-50/90 p-3 rounded-xl border border-slate-100 space-y-1.5">
                          <div className="flex items-center gap-1 text-[11px] font-bold text-slate-600">
                            <Languages className="w-3.5 h-3.5 text-indigo-500" />
                            <span>Gợi ý thuật ngữ chuyên ngành tiếng Anh:</span>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {q.english_terms.map((item, tidx) => (
                              <span
                                key={tidx}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-indigo-50/80 text-indigo-800 text-[11px] font-mono border border-indigo-100"
                                title={item.meaning}
                              >
                                <strong>{item.term}</strong>
                                {item.meaning && (
                                  <span className="text-indigo-400 font-sans text-[10px]">
                                    ({item.meaning})
                                  </span>
                                )}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/60">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Đóng
            </button>

            <div className="flex items-center gap-2.5">
              {isPublished ? (
                <button
                  type="button"
                  onClick={() => setAssignModalOpen(true)}
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors shadow-sm flex items-center gap-1.5"
                >
                  <Send className="w-4 h-4" />
                  <span>Giao bài cho Thí sinh</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handlePublish}
                  disabled={publishing}
                  className="px-5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm flex items-center gap-2"
                >
                  {publishing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>AI đang đọc giáo trình & sinh đề...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Kích hoạt AI sinh câu hỏi & Công bố</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Assign Exam Modal */}
      {assignModalOpen && (
        <AssignExamModal
          courseId={courseId}
          examId={exam.id}
          examName={exam.name}
          onClose={() => setAssignModalOpen(false)}
        />
      )}
    </>
  );
}
