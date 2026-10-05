'use client';

import { useState } from 'react';
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
} from 'lucide-react';
import { api } from '@/lib/api';
import { RubricItem } from './RubricsPanel';

export interface BlueprintRow {
  topic_id: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  count: number;
}

interface ExamBlueprintModalProps {
  courseId: string;
  rubrics: RubricItem[];
  topics: Array<{ id: string; name: string }>;
  onClose: () => void;
  onSuccess: () => Promise<void>;
}

export default function ExamBlueprintModal({
  courseId,
  rubrics,
  topics,
  onClose,
  onSuccess,
}: ExamBlueprintModalProps) {
  const [name, setName] = useState('');
  const [timeLimitMinutes, setTimeLimitMinutes] = useState(5);
  const [rubricId, setRubricId] = useState(rubrics[0]?.id || '');
  const [blueprint, setBlueprint] = useState<BlueprintRow[]>([
    {
      topic_id: topics[0]?.id || '',
      difficulty: 'MEDIUM',
      count: 2,
    },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalQuestions = blueprint.reduce((acc, row) => acc + (Number(row.count) || 0), 0);

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
        time_limit: Math.max(60, Number(timeLimitMinutes) * 60), // convert to seconds
        blueprint: blueprint.map((row) => ({
          topic_id: row.topic_id,
          difficulty: row.difficulty,
          count: Number(row.count) || 1,
        })),
        max_attempts: 1,
      };

      await api('/admin/exams', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      await onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi khi tạo khung đề thi');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center font-bold">
              <ClipboardList className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-base">Thiết kế Khung đề thi (Blueprint)</h3>
              <p className="text-[11px] text-slate-400">Tạo đề thi bản nháp theo ma trận phân bổ câu hỏi</p>
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

          {/* Exam Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Tên đề thi (*)</label>
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
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                Thời gian làm bài (Phút)
              </label>
              <input
                type="number"
                min="1"
                max="60"
                value={timeLimitMinutes}
                onChange={(e) => setTimeLimitMinutes(Number(e.target.value))}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-amber-500 font-mono"
              />
              <span className="text-[10px] text-slate-400">Tương đương {timeLimitMinutes * 60} giây</span>
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
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-amber-600" />
                  Ma trận phân bổ câu hỏi (Tổng: {totalQuestions} câu)
                </label>
                <p className="text-[11px] text-slate-400">
                  Chọn chủ đề kiến thức và độ khó để AI sinh câu hỏi từ giáo trình
                </p>
              </div>

              <button
                type="button"
                onClick={handleAddBlueprintRow}
                className="flex items-center gap-1 text-xs font-bold text-amber-600 hover:text-amber-700 bg-amber-50 hover:bg-amber-100 px-2.5 py-1.5 rounded-lg transition-colors"
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
              <span>{submitting ? 'Đang tạo đề nháp...' : 'Lưu khung đề nháp'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
