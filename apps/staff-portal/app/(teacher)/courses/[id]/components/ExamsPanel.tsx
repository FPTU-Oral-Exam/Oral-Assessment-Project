'use client';

import { useState } from 'react';
import {
  ClipboardList,
  Plus,
  Eye,
  Trash2,
  Lock,
  Sparkles,
  Clock,
  Award,
  Layers,
  ShieldCheck,
  CheckCircle,
} from 'lucide-react';
import { teacherService } from '@/services';
import { RubricItem } from './RubricsPanel';
import ExamBlueprintModal from './ExamBlueprintModal';
import ExamEditorModal, { ExamItem } from './ExamEditorModal';

interface ExamsPanelProps {
  courseId: string;
  exams: ExamItem[];
  rubrics: RubricItem[];
  topics: Array<{ id: string; name: string }>;
  onRefresh: () => Promise<void>;
}

export const formatTimeLimit = (limit?: number) => {
  if (!limit) return 'Không giới hạn';
  if (limit <= 180) return `${limit} phút`;
  return `${Math.round(limit / 60)} phút`;
};

export default function ExamsPanel({
  courseId,
  exams,
  rubrics,
  topics,
  onRefresh,
}: ExamsPanelProps) {
  const [isBlueprintModalOpen, setIsBlueprintModalOpen] = useState(false);
  const [selectedExamForBlueprint, setSelectedExamForBlueprint] = useState<ExamItem | null>(null);
  const [selectedExamForDetail, setSelectedExamForDetail] = useState<ExamItem | null>(null);

  const topicsMap = topics.reduce((acc, t) => {
    acc[t.id] = t.name;
    return acc;
  }, {} as Record<string, string>);

  const rubricsMap = rubrics.reduce((acc, r) => {
    acc[r.id] = r.name;
    return acc;
  }, {} as Record<string, string>);

  const handleOpenBlueprintModal = (target?: ExamItem | null) => {
    if (target) {
      setSelectedExamForBlueprint(target);
    } else {
      // Nếu có kỳ thi DRAFT chưa cấu hình ma trận từ Khảo thí, tự động gợi ý kỳ thi đó
      const unconfiguredDraft = exams.find(
        (e) => e.status === 'DRAFT' && (!e.blueprint || e.blueprint.length === 0)
      );
      setSelectedExamForBlueprint(unconfiguredDraft || null);
    }
    setIsBlueprintModalOpen(true);
  };

  const handleDeleteDraftExam = async (examId: string, examName: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa bài thi nháp "${examName}"?`)) {
      return;
    }
    try {
      await teacherService.deleteExam(examId);
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
                Đề thi & Lắp ráp theo Ma trận ({exams.length})
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Thiết kế khung ma trận chuẩn (Master Blueprint), tự động lắp ráp câu hỏi từ Ngân hàng đề thi và chuẩn bị bài thi cho Khảo thí.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => handleOpenBlueprintModal(null)}
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
          <strong>Nguyên tắc Khảo thí Thầy Phuonglhk (BR-023a & BR-023b):</strong> Giảng viên soạn đề thi nháp từ các chủ đề kiến thức theo số lượng câu hỏi và thời gian mà Khảo thí đã giao. Khi bấm công bố, đề thi sẽ được AI sinh câu hỏi, đóng băng bất biến snapshot và chuyển vào ngân hàng đề thi.
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
            onClick={() => handleOpenBlueprintModal(null)}
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
            const hasBlueprint = Boolean(exam.blueprint && exam.blueprint.length > 0);
            const blueprintTotal = hasBlueprint
              ? exam.blueprint!.reduce((sum, r) => sum + r.count, 0)
              : 0;

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
                      Thời lượng: {formatTimeLimit(exam.time_limit)}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-slate-600">
                    <Layers className="w-3.5 h-3.5 text-slate-400" />
                    <span>
                      {isPublished
                        ? `${questions.length} câu đã sinh`
                        : hasBlueprint
                        ? `${blueprintTotal} câu Blueprint (${exam.question_count || blueprintTotal} câu chỉ tiêu)`
                        : `Chưa lập ma trận (${exam.question_count || 3} câu Khảo thí)`}
                    </span>
                  </div>
                </div>

                {/* Unconfigured Blueprint Callout */}
                {!isPublished && !hasBlueprint && (
                  <div className="bg-amber-50/80 border border-amber-200/90 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
                    <div className="flex items-center gap-2 text-amber-900">
                      <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>
                        Khảo thí giao: <strong>{exam.question_count || 3} câu</strong> ({formatTimeLimit(exam.time_limit)}). Chưa soạn ma trận.
                      </span>
                    </div>
                    <button
                      onClick={() => handleOpenBlueprintModal(exam)}
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg transition-colors shrink-0 shadow-sm text-center"
                    >
                      Soạn ma trận ngay
                    </button>
                  </div>
                )}

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
                  <div className="flex items-center gap-2 flex-wrap">
                    {isPublished ? (
                      <button
                        onClick={() => setSelectedExamForDetail(exam)}
                        className="flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-indigo-600 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Xem đề & thuật ngữ</span>
                      </button>
                    ) : hasBlueprint ? (
                      <>
                        <button
                          onClick={() => setSelectedExamForDetail(exam)}
                          className="flex items-center gap-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-3 py-1.5 rounded-lg transition-colors shadow-sm"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Xem & Kích hoạt AI</span>
                        </button>
                        <button
                          onClick={() => handleOpenBlueprintModal(exam)}
                          className="flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 px-2.5 py-1.5 rounded-lg transition-colors"
                          title="Chỉnh sửa ma trận phân bổ câu hỏi"
                        >
                          <Layers className="w-3.5 h-3.5 text-slate-500" />
                          <span>Sửa ma trận</span>
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => handleOpenBlueprintModal(exam)}
                        className="flex items-center gap-1.5 text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-3 py-1.5 rounded-lg transition-colors shadow-sm"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                        <span>Thiết lập Ma trận Đề (Blueprint)</span>
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {isPublished ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 rounded-lg border border-emerald-200">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                        Sẵn sàng khảo thí
                      </span>
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
          targetExam={selectedExamForBlueprint}
          onClose={() => {
            setIsBlueprintModalOpen(false);
            setSelectedExamForBlueprint(null);
          }}
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
    </div>
  );
}
