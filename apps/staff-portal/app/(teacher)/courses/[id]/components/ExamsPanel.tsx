'use client';

import { useState } from 'react';
import {
  ClipboardList,
  Plus,
  Send,
  Eye,
  Trash2,
  Lock,
  Sparkles,
  Clock,
  Award,
  Layers,
  ShieldCheck,
  Languages,
} from 'lucide-react';
import { api } from '@/lib/api';
import { RubricItem } from './RubricsPanel';
import ExamBlueprintModal from './ExamBlueprintModal';
import ExamEditorModal, { ExamItem } from './ExamEditorModal';
import AssignExamModal from './AssignExamModal';

interface ExamsPanelProps {
  courseId: string;
  exams: ExamItem[];
  rubrics: RubricItem[];
  topics: Array<{ id: string; name: string }>;
  onRefresh: () => Promise<void>;
}

export default function ExamsPanel({
  courseId,
  exams,
  rubrics,
  topics,
  onRefresh,
}: ExamsPanelProps) {
  const [isBlueprintModalOpen, setIsBlueprintModalOpen] = useState(false);
  const [selectedExamForDetail, setSelectedExamForDetail] = useState<ExamItem | null>(null);
  const [selectedExamForAssign, setSelectedExamForAssign] = useState<ExamItem | null>(null);

  const topicsMap = topics.reduce((acc, t) => {
    acc[t.id] = t.name;
    return acc;
  }, {} as Record<string, string>);

  const rubricsMap = rubrics.reduce((acc, r) => {
    acc[r.id] = r.name;
    return acc;
  }, {} as Record<string, string>);

  const handleDeleteDraftExam = async (examId: string, examName: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa bài thi nháp "${examName}"?`)) {
      return;
    }
    try {
      await api(`/admin/exams/${examId}`, {
        method: 'DELETE',
      });
      await onRefresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      alert(`Không thể xóa bài thi: ${msg}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <ClipboardList className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">
                Bài thi vấn đáp & Giao bài ({exams.length})
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Thiết kế khung ma trận đề thi (Blueprint), kích hoạt AI RAG sinh câu hỏi, duyệt thuật ngữ và giao bài cho thí sinh.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => setIsBlueprintModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-amber-600 text-white font-bold text-xs rounded-xl hover:bg-amber-700 transition-all shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Thiết kế Đề thi mới</span>
        </button>
      </div>

      {/* Security Rule Notice */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
        <div className="text-xs text-slate-700 leading-relaxed">
          <strong>Nguyên tắc Khảo thí Thầy Phuonglhk (BR-023a & BR-023b):</strong> Giảng viên soạn đề thi nháp từ các chủ đề kiến thức. Khi bấm công bố, đề thi sẽ được AI sinh câu hỏi, đóng băng bất biến snapshot và chuyển vào ngân hàng đề thi. Giảng viên không được tự ý sửa câu hỏi đã công bố.
        </div>
      </div>

      {/* List of Exams */}
      {exams.length === 0 ? (
        <div className="text-center py-16 px-4 bg-white rounded-2xl border border-dashed border-slate-300">
          <ClipboardList className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-700">Chưa có bài thi nào</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-4">
            Sau khi hoàn tất kho kiến thức (Giáo trình & Chủ đề) và Rubric, bạn có thể tạo đề thi vấn đáp được AI hỗ trợ sinh câu hỏi.
          </p>
          <button
            onClick={() => setIsBlueprintModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-xl border border-amber-200 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Thiết kế Đề thi đầu tiên
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {exams.map((exam) => {
            const isPublished = exam.status === 'PUBLISHED';
            const questions = exam.questions || [];

            return (
              <div
                key={exam.id}
                className={`bg-white rounded-2xl border shadow-sm p-5 space-y-4 transition-all ${
                  isPublished
                    ? 'border-emerald-200/90 hover:border-emerald-400'
                    : 'border-amber-200/90 hover:border-amber-400'
                }`}
              >
                {/* Exam Title & Status Badge */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-slate-800 text-base">{exam.name}</h3>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Rubric: {rubricsMap[exam.rubric_id] || 'Rubric tiêu chuẩn'}
                    </p>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold shrink-0 ${
                      isPublished
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}
                  >
                    {isPublished ? (
                      <>
                        <Lock className="w-3 h-3 text-emerald-600" />
                        ĐÃ CÔNG BỐ
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3 h-3 text-amber-600" />
                        BẢN NHÁP
                      </>
                    )}
                  </span>
                </div>

                {/* Exam Metadata */}
                <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50/70 p-3 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-1.5 text-slate-600">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>
                      Thời lượng: {exam.time_limit ? `${Math.round(exam.time_limit / 60)} phút` : 'Không giới hạn'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-slate-600">
                    <Layers className="w-3.5 h-3.5 text-slate-400" />
                    <span>
                      {isPublished
                        ? `${questions.length} câu đã sinh`
                        : `${exam.blueprint?.reduce((sum, r) => sum + r.count, 0) || 0} câu Blueprint`}
                    </span>
                  </div>
                </div>

                {/* Question Preview or English terms hint */}
                {isPublished && questions.length > 0 && (
                  <div className="bg-emerald-50/40 p-3 rounded-xl border border-emerald-100/60 text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-emerald-900 text-[11px]">
                        Xem trước câu hỏi AI:
                      </span>
                      <span className="text-[10px] text-emerald-600 font-mono">
                        {questions.length} câu chính thức
                      </span>
                    </div>
                    <p className="text-slate-700 line-clamp-2 text-[11px] italic">
                      "{questions[0]?.text}"
                    </p>
                  </div>
                )}

                {/* Actions Bar */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    onClick={() => setSelectedExamForDetail(exam)}
                    className="flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-indigo-600 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>{isPublished ? 'Xem đề & thuật ngữ' : 'Xem & Kích hoạt AI'}</span>
                  </button>

                  <div className="flex items-center gap-1.5">
                    {isPublished ? (
                      <button
                        onClick={() => setSelectedExamForAssign(exam)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm"
                      >
                        <Send className="w-3 h-3" />
                        <span>Giao bài</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleDeleteDraftExam(exam.id, exam.name)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Xóa đề nháp"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Blueprint Modal */}
      {isBlueprintModalOpen && (
        <ExamBlueprintModal
          courseId={courseId}
          rubrics={rubrics}
          topics={topics}
          onClose={() => setIsBlueprintModalOpen(false)}
          onSuccess={onRefresh}
        />
      )}

      {/* Exam Detail / Activation Modal */}
      {selectedExamForDetail && (
        <ExamEditorModal
          courseId={courseId}
          exam={selectedExamForDetail}
          rubricName={rubricsMap[selectedExamForDetail.rubric_id]}
          topicsMap={topicsMap}
          onClose={() => setSelectedExamForDetail(null)}
          onRefresh={onRefresh}
        />
      )}

      {/* Quick Assign Modal */}
      {selectedExamForAssign && (
        <AssignExamModal
          courseId={courseId}
          examId={selectedExamForAssign.id}
          examName={selectedExamForAssign.name}
          onClose={() => setSelectedExamForAssign(null)}
          onSuccess={onRefresh}
        />
      )}
    </div>
  );
}
