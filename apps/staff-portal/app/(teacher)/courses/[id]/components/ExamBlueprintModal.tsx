'use client';

import { useState, useMemo } from 'react';
import {
  ClipboardList,
  Plus,
  Trash2,
  X,
  AlertCircle,
  Clock,
  Layers,
  Award,
  Sparkles,
  CheckCircle2,
  HelpCircle,
} from 'lucide-react';
import { api } from '@/lib/api';
import { RubricItem } from './RubricsPanel';
import { ExamItem } from './ExamEditorModal';

export interface BlueprintRow {
  topic_id: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  count: number;
}

interface ExamBlueprintModalProps {
  courseId: string;
  rubrics: RubricItem[];
  topics: Array<{ id: string; name: string }>;
  targetExam?: ExamItem | null;
  onClose: () => void;
  onSuccess: () => Promise<void>;
}

/**
 * Tự động chia đều số câu hỏi do Khảo thí quy định vào các chủ đề kiến thức môn học
 */
function createInitialBlueprint(
  topicsList: Array<{ id: string; name: string }>,
  targetCount: number
): BlueprintRow[] {
  if (topicsList.length === 0) {
    return [{ topic_id: '', difficulty: 'MEDIUM', count: Math.max(1, targetCount) }];
  }

  const count = Math.max(1, targetCount || 3);
  const nTopics = topicsList.length;

  if (count <= nTopics) {
    // Mỗi chủ đề được chọn 1 câu
    return topicsList.slice(0, count).map((t, idx) => ({
      topic_id: t.id,
      difficulty: (idx % 2 === 0 ? 'MEDIUM' : 'EASY') as 'EASY' | 'MEDIUM' | 'HARD',
      count: 1,
    }));
  }

  // Nếu số câu nhiều hơn số chủ đề: chia đều và dồn số dư vào các chủ đề đầu
  const base = Math.floor(count / nTopics);
  const remainder = count % nTopics;

  return topicsList.map((t, idx) => {
    const rowCount = base + (idx < remainder ? 1 : 0);
    const difficulty: 'EASY' | 'MEDIUM' | 'HARD' =
      idx === 0 ? 'MEDIUM' : idx % 2 === 1 ? 'EASY' : 'HARD';
    return {
      topic_id: t.id,
      difficulty,
      count: rowCount,
    };
  });
}

function getInitialTimeLimit(timeLimit?: number): number {
  if (!timeLimit) return 30;
  if (timeLimit <= 180) return timeLimit;
  return Math.round(timeLimit / 60);
}

export default function ExamBlueprintModal({
  courseId,
  rubrics,
  topics,
  targetExam,
  onClose,
  onSuccess,
}: ExamBlueprintModalProps) {
  // Chỉ tiêu từ Khảo thí (nếu có)
  const targetQuestionCount = targetExam?.question_count || 3;
  const initialTimeMinutes = getInitialTimeLimit(targetExam?.time_limit);

  const [name, setName] = useState(targetExam?.name || '');
  const [timeLimitMinutes, setTimeLimitMinutes] = useState(initialTimeMinutes);
  const [rubricId, setRubricId] = useState(
    targetExam?.rubric_id || rubrics[0]?.id || ''
  );

  // Tự động nạp ma trận từ exam cũ nếu có, hoặc tự động phân bổ đều theo chủ đề môn học
  const [blueprint, setBlueprint] = useState<BlueprintRow[]>(() => {
    if (targetExam?.blueprint && targetExam.blueprint.length > 0) {
      return targetExam.blueprint.map((row) => ({
        topic_id: row.topic_id,
        difficulty: (row.difficulty as 'EASY' | 'MEDIUM' | 'HARD') || 'MEDIUM',
        count: row.count || 1,
      }));
    }
    return createInitialBlueprint(topics, targetQuestionCount);
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalQuestions = useMemo(
    () => blueprint.reduce((acc, row) => acc + (Number(row.count) || 0), 0),
    [blueprint]
  );

  const handleAddBlueprintRow = () => {
    setBlueprint([
      ...blueprint,
      {
        topic_id: topics[0]?.id || '',
        difficulty: 'MEDIUM',
        count: 1,
      },
    ]);
  };

  const handleRemoveBlueprintRow = (index: number) => {
    if (blueprint.length <= 1) {
      alert('Đề thi phải có ít nhất 1 chủ đề câu hỏi.');
      return;
    }
    setBlueprint(blueprint.filter((_, i) => i !== index));
  };

  const handleRowChange = (index: number, field: keyof BlueprintRow, value: any) => {
    const updated = [...blueprint];
    updated[index] = {
      ...updated[index],
      [field]: field === 'count' ? Math.max(1, Number(value)) : value,
    };
    setBlueprint(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Vui lòng nhập tên đề thi');
      return;
    }
    if (!rubricId) {
      setError('Vui lòng chọn Rubric tiêu chuẩn chấm điểm');
      return;
    }
    if (topics.length === 0) {
      setError('Môn học chưa có Chủ đề (Topic) nào. Vui lòng tạo Chủ đề ở Tab 1 trước.');
      return;
    }
    if (totalQuestions <= 0) {
      setError('Tổng số câu hỏi của đề thi phải lớn hơn 0');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const payload = {
        course_id: courseId,
        rubric_id: rubricId,
        name: name.trim(),
        time_limit: Math.max(60, Number(timeLimitMinutes) * 60), // chuyển sang giây cho backend
        question_count: totalQuestions,
        blueprint: blueprint.map((row) => ({
          topic_id: row.topic_id,
          difficulty: row.difficulty,
          count: Number(row.count) || 1,
        })),
        max_attempts: targetExam?.max_attempts || 1,
      };

      if (targetExam?.id) {
        // Cập nhật đề thi đã tạo bởi Khảo thí
        await api(`/admin/exams/${targetExam.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        // Tạo mới đề thi
        await api('/admin/exams', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }

      await onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi khi lưu khung đề thi');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center font-bold">
              <ClipboardList className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-base">
                {targetExam ? 'Thiết lập Ma trận Đề (Blueprint)' : 'Thiết kế Khung đề thi mới'}
              </h3>
              <p className="text-[11px] text-slate-400">
                {targetExam
                  ? 'Cấu hình ma trận câu hỏi cho kỳ thi Khảo thí đã giao'
                  : 'Tạo đề thi bản nháp theo ma trận phân bổ câu hỏi'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Examiner Requirement Banner */}
          {targetExam && (
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/90 rounded-2xl p-4 flex items-start gap-3 shadow-sm">
              <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-xs font-bold text-amber-950">
                    Quy định từ Khảo thí (Tự động điền)
                  </h4>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-200 text-amber-900 border border-amber-300">
                    {targetQuestionCount} câu hỏi • {initialTimeMinutes} phút
                  </span>
                </div>
                <p className="text-xs text-amber-800 leading-relaxed">
                  Đề thi này được Khảo thí quy định <strong>{targetQuestionCount} câu hỏi</strong> làm trong <strong>{initialTimeMinutes} phút</strong>. Hệ thống đã tự động chia đều số câu hỏi vào các chủ đề kiến thức môn học bên dưới. Giảng viên có thể điều chỉnh độ khó và số lượng từng dòng.
                </p>
              </div>
            </div>
          )}

          {/* Exam Name */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700">Tên đề thi (*)</label>
              {targetExam && (
                <span className="text-[10px] text-amber-600 font-medium">
                  Tên kỳ thi do Khảo thí giao
                </span>
              )}
            </div>
            <input
              type="text"
              required
              placeholder="Ví dụ: Đề Vấn đáp Kết thúc Học phần - Lần 1"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Time Limit */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  Thời gian làm bài (Phút)
                </label>
                {targetExam && (
                  <span className="text-[10px] text-emerald-600 font-semibold">
                    Khảo thí: {initialTimeMinutes}p
                  </span>
                )}
              </div>
              <input
                type="number"
                min="1"
                max="180"
                value={timeLimitMinutes}
                onChange={(e) => setTimeLimitMinutes(Number(e.target.value))}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-amber-500 font-mono font-semibold"
              />
              <span className="text-[10px] text-slate-400">
                Tương đương {timeLimitMinutes * 60} giây
              </span>
            </div>

            {/* Rubric Selection */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-slate-400" />
                Rubric chấm điểm (*)
              </label>
              <select
                value={rubricId}
                onChange={(e) => setRubricId(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-amber-500"
              >
                {rubrics.length === 0 ? (
                  <option value="">Chưa có Rubric (cần tạo ở Tab 2)</option>
                ) : (
                  rubrics.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} (v{r.version})
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          {/* Blueprint Matrix */}
          <div className="space-y-3 pt-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-amber-600" />
                  Ma trận phân bổ câu hỏi
                </label>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <span className="text-[11px] text-slate-400">
                    Tổng: <strong className="text-slate-700">{totalQuestions} câu</strong>
                  </span>
                  {targetExam && (
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                        totalQuestions === targetQuestionCount
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}
                    >
                      {totalQuestions === targetQuestionCount ? (
                        <>✓ Đã chuẩn {targetQuestionCount} câu Khảo thí</>
                      ) : (
                        <>
                          ⚠ Chỉ tiêu Khảo thí: {targetQuestionCount} câu (Lệch{' '}
                          {totalQuestions - targetQuestionCount > 0
                            ? `+${totalQuestions - targetQuestionCount}`
                            : totalQuestions - targetQuestionCount}
                          )
                        </>
                      )}
                    </span>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={handleAddBlueprintRow}
                className="flex items-center gap-1 text-xs font-bold text-amber-600 hover:text-amber-700 bg-amber-50 hover:bg-amber-100 px-2.5 py-1.5 rounded-lg transition-colors w-fit"
              >
                <Plus className="w-3.5 h-3.5" />
                Thêm dòng
              </button>
            </div>

            <div className="space-y-2.5">
              {blueprint.map((row, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-slate-50/80 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center gap-2.5"
                >
                  {/* Topic Select */}
                  <div className="flex-1 w-full">
                    <select
                      value={row.topic_id}
                      onChange={(e) => handleRowChange(idx, 'topic_id', e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-amber-500"
                    >
                      {topics.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Difficulty Select */}
                  <div className="w-full sm:w-32">
                    <select
                      value={row.difficulty}
                      onChange={(e) => handleRowChange(idx, 'difficulty', e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-amber-500 font-semibold"
                    >
                      <option value="EASY">Dễ (EASY)</option>
                      <option value="MEDIUM">Trung bình (MED)</option>
                      <option value="HARD">Khó (HARD)</option>
                    </select>
                  </div>

                  {/* Count */}
                  <div className="w-full sm:w-20 flex items-center gap-1">
                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={row.count}
                      onChange={(e) => handleRowChange(idx, 'count', e.target.value)}
                      className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-center font-mono font-bold text-slate-800 focus:outline-none focus:border-amber-500"
                    />
                    <span className="text-[11px] text-slate-400">câu</span>
                  </div>

                  {/* Delete row */}
                  {blueprint.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveBlueprintRow(idx)}
                      className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={submitting || rubrics.length === 0 || topics.length === 0}
              className="px-5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm flex items-center gap-1.5"
            >
              <Sparkles className="w-4 h-4" />
              <span>
                {submitting
                  ? 'Đang lưu ma trận...'
                  : targetExam
                  ? 'Lưu ma trận đề thi'
                  : 'Lưu khung đề nháp'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
