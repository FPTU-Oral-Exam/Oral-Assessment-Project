'use client';

import React, { useState } from 'react';
import { Target, Plus, Edit2, Trash2, X, AlertCircle } from 'lucide-react';
import { teacherService } from '@/services';

export interface Outcome {
  id: string;
  code: string;
  description: string;
  weight: number;
}

interface OutcomesPanelProps {
  courseId: string;
  outcomes: Outcome[];
  editable?: boolean;
  onReload: () => Promise<void>;
}

export default function OutcomesPanel({
  courseId,
  outcomes,
  editable = true,
  onReload,
}: OutcomesPanelProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingLO, setEditingLO] = useState<Outcome | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    code: '',
    description: '',
    weight: 1,
  });

  const openAdd = () => {
    setEditingLO(null);
    setForm({
      code: `LO${outcomes.length + 1}`,
      description: '',
      weight: 1,
    });
    setModalOpen(true);
  };

  const openEdit = (lo: Outcome) => {
    setEditingLO(lo);
    setForm({
      code: lo.code,
      description: lo.description,
      weight: lo.weight || 1,
    });
    setModalOpen(true);
  };

  const handleDelete = async (loId: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa Chuẩn đầu ra (LO) này?')) return;
    try {
      await teacherService.deleteOutcome(loId);
      await onReload();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Xóa LO thất bại');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.code.trim() || !form.description.trim()) return;

    try {
      setSubmitting(true);
      const payload = {
        code: form.code.trim(),
        description: form.description.trim(),
        weight: Number(form.weight) || 1,
      };

      if (editingLO) {
        await teacherService.updateOutcome(editingLO.id, payload);
      } else {
        await teacherService.createOutcome(courseId, payload);
      }

      setModalOpen(false);
      await onReload();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Lưu LO thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Intro */}
      <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Target className="w-5 h-5 text-indigo-600" />
            Chuẩn đầu ra môn học (Learning Outcomes - LO)
          </h3>
          <p className="mt-1 text-xs text-slate-500 leading-relaxed">
            Các năng lực và chuẩn kiến thức mà sinh viên cần đạt được sau khi hoàn thành môn học. Chuẩn đầu ra sẽ được ánh xạ trực tiếp vào từng Chủ đề thi và câu hỏi vấn đáp.
          </p>
        </div>

        {editable && (
          <button
            onClick={openAdd}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 transition-colors flex-shrink-0 shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm Chuẩn đầu ra</span>
          </button>
        )}
      </div>

      {/* LO List */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h4 className="text-sm font-bold text-slate-900">Danh sách Chuẩn đầu ra ({outcomes.length})</h4>
          <span className="text-xs text-slate-500">Mã chuẩn & Mô tả chi tiết</span>
        </div>

        {outcomes.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            Chưa có chuẩn đầu ra nào được thiết lập. Bấm &quot;Thêm Chuẩn đầu ra&quot; để bắt đầu.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {outcomes.map((lo) => (
              <div key={lo.id} className="p-5 flex items-start justify-between gap-4 hover:bg-slate-50/60 transition-colors">
                <div className="space-y-1.5 max-w-3xl">
                  <div className="flex items-center gap-2.5">
                    <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 font-bold text-xs rounded-lg border border-indigo-100 font-mono">
                      {lo.code}
                    </span>
                    <span className="text-[11px] text-slate-400">Trọng số: {lo.weight}</span>
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed">{lo.description}</p>
                </div>

                {editable && (
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => openEdit(lo)}
                      className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Sửa"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(lo.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Xóa"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-xs" onClick={() => setModalOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden z-10 border border-slate-200">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">
                {editingLO ? 'Chỉnh sửa Chuẩn đầu ra' : 'Thêm Chuẩn đầu ra mới'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Mã LO <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: LO1, LO2..."
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value })}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Trọng số</label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={form.weight}
                    onChange={(e) => setForm({ ...form, weight: Number(e.target.value) })}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mô tả chuẩn năng lực <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Mô tả cụ thể sinh viên có khả năng giải thích, phân tích hoặc áp dụng kiến thức nào..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 resize-none leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-xs font-semibold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50"
                >
                  {submitting ? 'Đang lưu...' : 'Lưu chuẩn đầu ra'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
