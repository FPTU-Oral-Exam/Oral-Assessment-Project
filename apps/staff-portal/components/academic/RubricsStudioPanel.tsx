'use client';

import React, { useState, useEffect } from 'react';
import {
  Award,
  Save,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertCircle,
  Sliders,
  Sparkles,
  BookOpen,
} from 'lucide-react';
import { useAcademic } from '@/context/AcademicContext';
import { RubricSchema, RubricCriterion } from '@/types/academic';
import RubricCriteriaEditorModal from './RubricCriteriaEditorModal';

export default function RubricsStudioPanel() {
  const { rubrics, activeRubric, setActiveRubricId, updateRubric, addRubric } = useAcademic();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [criteria, setCriteria] = useState<RubricCriterion[]>([]);
  const [editingCriterion, setEditingCriterion] = useState<RubricCriterion | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (activeRubric) {
      setName(activeRubric.name);
      setDescription(activeRubric.description || '');
      setCriteria([...activeRubric.criteria]);
    }
  }, [activeRubric]);

  const totalWeight = criteria.reduce((sum, c) => sum + (Number(c.weight) || 0), 0);
  const isWeightValid = totalWeight === 100;

  const handleWeightChange = (id: string | undefined, newWeight: number) => {
    if (!id) return;
    setCriteria((prev) =>
      prev.map((c) => (c.id === id ? { ...c, weight: newWeight } : c))
    );
  };

  const handleDeleteCriterion = (id: string | undefined) => {
    if (!id) return;
    setCriteria((prev) => prev.filter((c) => c.id !== id));
  };

  const handleSaveCriterion = (updated: RubricCriterion) => {
    setCriteria((prev) => {
      const exists = prev.some((c) => c.id === updated.id);
      if (exists) {
        return prev.map((c) => (c.id === updated.id ? updated : c));
      } else {
        return [...prev, updated];
      }
    });
  };

  const handleSaveRubric = () => {
    if (!activeRubric) return;
    updateRubric(activeRubric.id, {
      name,
      description,
      criteria,
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  return (
    <div className="w-full space-y-6">
      {/* Top Header & Switcher */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 shadow-xs">
                <Award className="w-5 h-5" />
              </span>
              <h1 className="text-xl font-bold text-slate-900">
                Tiêu chuẩn Chấm điểm Rubrics (Rubrics Studio)
              </h1>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Thiết lập thang đo đánh giá phát âm (Pronunciation), độ trôi chảy (Fluency), ngữ pháp và nội dung thi vấn đáp Speaking
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <select
              value={activeRubric?.id || ''}
              onChange={(e) => setActiveRubricId(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 px-3 py-2 rounded-xl focus:border-blue-500 focus:bg-white focus:outline-none cursor-pointer"
            >
              {rubrics.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} (v{r.version})
                </option>
              ))}
            </select>

            <button
              onClick={() => {
                setEditingCriterion(null);
                setIsModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm Tiêu chí</span>
            </button>
          </div>
        </div>

        {/* Rubric Metadata */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-5">
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Tên Bộ Rubric:
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-900 px-3 py-2 rounded-xl focus:border-blue-500 focus:bg-white focus:outline-none font-semibold"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Thang điểm chuẩn:
            </label>
            <div className="w-full bg-slate-50 border border-slate-200 text-xs font-mono text-emerald-700 px-3 py-2 rounded-xl font-bold">
              90 điểm chuẩn (PTE Scale)
            </div>
          </div>

          <div className="md:col-span-3">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Mô tả & Hướng dẫn Cán bộ Khảo thí:
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-700 px-3 py-2 rounded-xl focus:border-blue-500 focus:bg-white focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Real-time Weight Validation Bar */}
      <div
        className={`p-4 rounded-2xl border transition-all ${
          isWeightValid
            ? 'bg-emerald-50 border-emerald-200'
            : 'bg-rose-50 border-rose-200'
        }`}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {isWeightValid ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600" />
            )}
            <span
              className={`text-xs font-bold ${
                isWeightValid ? 'text-emerald-800' : 'text-rose-800'
              }`}
            >
              {isWeightValid
                ? 'Tổng trọng số đạt chuẩn 100% (Hợp lệ để xuất bản & chấm điểm AI)'
                : `Tổng trọng số hiện tại là ${totalWeight}%. Cần điều chỉnh để bằng đúng 100%!`}
            </span>
          </div>

          <span
            className={`font-mono text-sm font-black ${
              isWeightValid ? 'text-emerald-700' : 'text-rose-700'
            }`}
          >
            {totalWeight}% / 100%
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              isWeightValid
                ? 'bg-emerald-500'
                : totalWeight > 100
                ? 'bg-rose-500'
                : 'bg-amber-500'
            }`}
            style={{ width: `${Math.min(100, totalWeight)}%` }}
          />
        </div>
      </div>

      {/* Criteria Cards List */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <Sliders className="w-4 h-4 text-blue-600" />
          <span>Danh sách Tiêu chí Đo lường ({criteria.length} tiêu chí Speaking)</span>
        </h2>

        {criteria.map((crit) => (
          <div
            key={crit.id}
            className="bg-white border border-slate-200/90 rounded-2xl p-5 hover:border-slate-300 transition-all shadow-xs space-y-4"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">{crit.name}</h3>
                <p className="text-xs text-slate-500 mt-0.5">{crit.description}</p>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
                  <span className="text-xs text-slate-500">Trọng số:</span>
                  <span className="font-mono text-sm font-black text-blue-600">
                    {crit.weight}%
                  </span>
                </div>

                <button
                  onClick={() => {
                    if (!crit.id) return;
                    setEditingCriterion(crit);
                    setIsModalOpen(true);
                  }}
                  className="p-2 text-slate-400 hover:text-amber-600 hover:bg-slate-50 rounded-xl transition-colors"
                  title="Chỉnh sửa chi tiết tiêu chí"
                >
                  <Edit2 className="w-4 h-4" />
                </button>

                <button
                  onClick={() => handleDeleteCriterion(crit.id)}
                  disabled={!crit.id}
                  className="p-2 text-slate-400 hover:text-rose-600 hover:bg-slate-50 rounded-xl transition-colors disabled:opacity-40"
                  title="Xóa tiêu chí"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Quick Weight Input */}
            <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <span className="text-xs font-semibold text-slate-600">
                Trọng số:
              </span>
              <input
                type="number"
                min={0}
                max={100}
                value={crit.weight}
                onChange={(e) => handleWeightChange(crit.id, Number(e.target.value))}
                className="w-20 bg-white border border-slate-200 rounded-lg px-2 py-1 text-sm font-mono font-bold text-slate-900 text-center focus:outline-none focus:border-blue-500"
              />
              <span className="text-sm font-bold text-slate-700">%</span>
            </div>

            {/* Band Descriptors Grid */}
            {crit.descriptors && crit.descriptors.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-1">
                {crit.descriptors.map((desc, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-emerald-700 text-[11px]">
                        {desc.level}
                      </span>
                      <span className="font-mono text-[10px] text-slate-500 font-semibold">
                        {desc.score_range}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 line-clamp-3 leading-relaxed">
                      {desc.description}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Footer Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-200 flex-wrap gap-3">
        {savedSuccess ? (
          <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Đã lưu Tiêu chuẩn Rubrics thành công!</span>
          </span>
        ) : (
          <span className="text-xs text-slate-500">
            {isWeightValid
              ? 'Tất cả tiêu chí đã sẵn sàng áp dụng vào kỳ thi.'
              : 'Vui lòng điều chỉnh tổng trọng số đủ 100% trước khi lưu.'}
          </span>
        )}

        <button
          onClick={handleSaveRubric}
          disabled={!isWeightValid}
          className={`flex items-center gap-1.5 px-6 py-2.5 rounded-xl text-xs font-bold transition-all ${
            isWeightValid
              ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs cursor-pointer'
              : 'bg-slate-200 text-slate-400 cursor-not-allowed'
          }`}
        >
          <Save className="w-4 h-4" />
          <span>Lưu Bộ Tiêu Chuẩn Rubrics</span>
        </button>
      </div>

      {/* Criteria Editor Modal */}
      <RubricCriteriaEditorModal
        criterion={editingCriterion}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveCriterion}
      />
    </div>
  );
}
