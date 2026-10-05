'use client';

import { useState } from 'react';
import {
  Award,
  Plus,
  Trash2,
  Edit2,
  AlertCircle,
  CheckCircle2,
  X,
  HelpCircle,
  FileCheck2,
} from 'lucide-react';
import { api } from '@/lib/api';

export interface RubricCriterion {
  name: string;
  description: string;
  max_score: number;
  weight: number;
}

export interface RubricItem {
  id: string;
  name: string;
  version: number;
  criteria: RubricCriterion[];
}

interface RubricsPanelProps {
  courseId: string;
  rubrics: RubricItem[];
  onRefresh: () => Promise<void>;
}

export default function RubricsPanel({ courseId, rubrics, onRefresh }: RubricsPanelProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRubric, setEditingRubric] = useState<RubricItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [criteria, setCriteria] = useState<RubricCriterion[]>([
    {
      name: 'Kiến thức cốt lõi & Khái niệm',
      description: 'Nắm vững định nghĩa, cơ chế hoạt động và bản chất lý thuyết.',
      max_score: 10,
      weight: 40,
    },
    {
      name: 'Kỹ năng giải thích & Phân tích',
      description: 'Khả năng trình bày lưu loát, lập luận logic và liên hệ ứng dụng thực tế.',
      max_score: 10,
      weight: 40,
    },
    {
      name: 'Thuật ngữ chuyên ngành',
      description: 'Sử dụng chính xác thuật ngữ tiếng Anh chuyên môn theo chuẩn giáo trình.',
      max_score: 10,
      weight: 20,
    },
  ]);

  const totalWeight = criteria.reduce((sum, c) => sum + (Number(c.weight) || 0), 0);
  const isWeightValid = totalWeight === 100;

  const handleOpenCreate = () => {
    setEditingRubric(null);
    setName('');
    setCriteria([
      {
        name: 'Kiến thức cốt lõi & Khái niệm',
        description: 'Nắm vững định nghĩa, cơ chế hoạt động và bản chất lý thuyết.',
        max_score: 10,
        weight: 40,
      },
      {
        name: 'Kỹ năng giải thích & Phân tích',
        description: 'Khả năng trình bày lưu loát, lập luận logic và liên hệ ứng dụng thực tế.',
        max_score: 10,
        weight: 40,
      },
      {
        name: 'Thuật ngữ chuyên ngành',
        description: 'Sử dụng chính xác thuật ngữ tiếng Anh chuyên môn theo chuẩn giáo trình.',
        max_score: 10,
        weight: 20,
      },
    ]);
    setError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (rubric: RubricItem) => {
    setEditingRubric(rubric);
    setName(rubric.name);
    setCriteria(
      rubric.criteria && rubric.criteria.length > 0
        ? rubric.criteria.map((c) => ({
            name: c.name,
            description: c.description || 'Tiêu chí đánh giá',
            max_score: (c as any).max_score ?? (c as any).max_points ?? 10,
            weight: c.weight,
          }))
        : [
            {
              name: 'Tiêu chí đánh giá',
              description: 'Mô tả tiêu chí',
              max_score: 10,
              weight: 100,
            },
          ]
    );
    setError(null);
    setIsModalOpen(true);
  };

  const handleAddCriterion = () => {
    setCriteria([
      ...criteria,
      {
        name: '',
        description: '',
        max_score: 10,
        weight: 0,
      },
    ]);
  };

  const handleRemoveCriterion = (index: number) => {
    if (criteria.length <= 1) {
      alert('Rubric phải có ít nhất 1 tiêu chí đánh giá.');
      return;
    }
    setCriteria(criteria.filter((_, i) => i !== index));
  };

  const handleCriterionChange = (
    index: number,
    field: keyof RubricCriterion,
    value: string | number
  ) => {
    const updated = [...criteria];
    updated[index] = {
      ...updated[index],
      [field]: field === 'max_score' || field === 'weight' ? Number(value) : value,
    };
    setCriteria(updated);
  };

  const handleSaveRubric = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Vui lòng nhập tên tiêu chí Rubric');
      return;
    }
    if (!isWeightValid) {
      setError(`Tổng trọng số phải bằng 100% (Hiện tại: ${totalWeight}%)`);
      return;
    }
    for (const c of criteria) {
      if (!c.name.trim()) {
        setError('Tên của tất cả các tiêu chí không được để trống.');
        return;
      }
    }

    try {
      setSubmitting(true);
      setError(null);

      const payload = {
        name: name.trim(),
        criteria: criteria.map((c) => ({
          name: c.name.trim(),
          description: c.description.trim() || 'Tiêu chí đánh giá',
          max_score: Number(c.max_score) || 10,
          weight: Number(c.weight) || 0,
        })),
      };

      if (editingRubric) {
        await api(`/admin/rubrics/${editingRubric.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        await api(`/admin/courses/${courseId}/rubrics`, {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }

      setIsModalOpen(false);
      await onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi khi lưu Rubric');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRubric = async (rubricId: string, rubricName: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa rubric "${rubricName}"?`)) {
      return;
    }

    try {
      await api(`/admin/rubrics/${rubricId}`, {
        method: 'DELETE',
      });
      await onRefresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes('409') || message.includes('RUBRIC_IN_USE')) {
        alert(
          'Không thể xóa Rubric: Tiêu chuẩn này đang được tham chiếu trong đề thi của môn học. Bạn cần đổi đề thi sang rubric khác hoặc xóa đề nháp trước.'
        );
      } else {
        alert(`Lỗi khi xóa Rubric: ${message}`);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">
                Tiêu chuẩn chấm điểm Rubrics ({rubrics.length})
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Thiết lập các thang đo đánh giá vấn đáp đa tiêu chí kèm tỷ lệ trọng số (%) để AI và Giám khảo chấm điểm đồng bộ.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 text-white font-bold text-xs rounded-xl hover:bg-purple-700 transition-all shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Tạo Rubric mới</span>
        </button>
      </div>

      {/* List of Rubrics */}
      {rubrics.length === 0 ? (
        <div className="text-center py-16 px-4 bg-white rounded-2xl border border-dashed border-slate-300">
          <Award className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-700">Chưa có Rubric nào</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-4">
            Rubric là căn cứ bắt buộc để hệ thống tạo đề thi và cung cấp thang điểm chấm cho mô hình AI LLM Judge.
          </p>
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-xl border border-purple-200 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Tạo Rubric đầu tiên
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {rubrics.map((r) => (
            <div
              key={r.id}
              className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 space-y-4 hover:border-purple-300 transition-all"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-800 text-base">{r.name}</h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 font-mono">
                      v{r.version}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Gồm {r.criteria?.length || 0} tiêu chí thành phần
                  </p>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleOpenEdit(r)}
                    className="p-1.5 text-slate-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                    title="Chỉnh sửa Rubric"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteRubric(r.id, r.name)}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Xóa Rubric"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Criteria details */}
              <div className="space-y-2 bg-slate-50/70 p-3.5 rounded-xl border border-slate-100 text-xs">
                {r.criteria && r.criteria.length > 0 ? (
                  r.criteria.map((c, idx) => (
                    <div
                      key={idx}
                      className="flex items-start justify-between gap-2 py-1.5 border-b border-slate-200/60 last:border-b-0"
                    >
                      <div className="space-y-0.5 flex-1 pr-2">
                        <span className="font-semibold text-slate-800">{c.name}</span>
                        {c.description && (
                          <p className="text-[11px] text-slate-500 leading-snug">{c.description}</p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-mono font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-100">
                          {c.weight}%
                        </span>
                        <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
                          Tối đa: {(c as any).max_score ?? (c as any).max_points ?? 10}đ
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-slate-400 italic">Không có tiêu chí chi tiết</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Add/Edit Rubric */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center font-bold">
                  <Award className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-800 text-base">
                  {editingRubric ? 'Chỉnh sửa Rubric' : 'Tạo Rubric Tiêu chuẩn Mới'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveRubric} className="flex-1 overflow-y-auto p-6 space-y-5">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Rubric Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Tên Rubric (*)</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Thang điểm Vấn đáp Chuyên môn SE"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                />
              </div>

              {/* Weight total progress */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700">Tổng trọng số tiêu chí:</span>
                  <span
                    className={`font-mono font-bold px-2 py-0.5 rounded-lg ${
                      isWeightValid
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-red-100 text-red-800 animate-pulse'
                    }`}
                  >
                    {totalWeight}% / 100%
                  </span>
                </div>
                <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      totalWeight === 100
                        ? 'bg-emerald-500'
                        : totalWeight > 100
                        ? 'bg-red-500'
                        : 'bg-amber-500'
                    }`}
                    style={{ width: `${Math.min(totalWeight, 100)}%` }}
                  />
                </div>
                {!isWeightValid && (
                  <p className="text-[11px] text-amber-700 flex items-center gap-1.5">
                    <HelpCircle className="w-3.5 h-3.5" />
                    Tổng trọng số các tiêu chí phải đạt chính xác 100% để đảm bảo tính toán thang điểm 10.
                  </p>
                )}
              </div>

              {/* Criteria List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700">
                    Danh sách các tiêu chí ({criteria.length})
                  </label>
                  <button
                    type="button"
                    onClick={handleAddCriterion}
                    className="flex items-center gap-1 text-xs font-bold text-purple-600 hover:text-purple-700"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Thêm tiêu chí
                  </button>
                </div>

                <div className="space-y-3">
                  {criteria.map((c, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-slate-700">Tiêu chí {idx + 1}</span>
                        {criteria.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveCriterion(idx)}
                            className="p-1 text-slate-400 hover:text-red-500 rounded"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                        <div className="sm:col-span-2 space-y-1">
                          <label className="text-[11px] text-slate-500 font-medium">Tên tiêu chí (*)</label>
                          <input
                            type="text"
                            required
                            placeholder="Ví dụ: Hiểu khái niệm"
                            value={c.name}
                            onChange={(e) => handleCriterionChange(idx, 'name', e.target.value)}
                            className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:border-purple-500"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[11px] text-slate-500 font-medium">Điểm tối đa</label>
                          <input
                            type="number"
                            min="1"
                            max="100"
                            value={c.max_score}
                            onChange={(e) =>
                              handleCriterionChange(idx, 'max_score', Number(e.target.value))
                            }
                            className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 font-mono text-center focus:outline-none focus:border-purple-500"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[11px] text-slate-500 font-medium">Trọng số (%)</label>
                          <input
                            type="number"
                            min="1"
                            max="100"
                            value={c.weight}
                            onChange={(e) => handleCriterionChange(idx, 'weight', Number(e.target.value))}
                            className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 font-mono text-center font-bold text-purple-700 focus:outline-none focus:border-purple-500"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] text-slate-500 font-medium">Mô tả chi tiết</label>
                        <textarea
                          rows={2}
                          placeholder="Mô tả các yêu cầu cần đạt cho tiêu chí này..."
                          value={c.description}
                          onChange={(e) => handleCriterionChange(idx, 'description', e.target.value)}
                          className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:border-purple-500"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={submitting || !isWeightValid}
                  className="px-5 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm flex items-center gap-1.5"
                >
                  <FileCheck2 className="w-4 h-4" />
                  <span>{submitting ? 'Đang lưu...' : 'Lưu Rubric'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
