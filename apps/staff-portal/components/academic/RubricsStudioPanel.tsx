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
  HelpCircle,
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
      const normalized = (activeRubric.criteria || []).map((crit, idx) => ({
        ...crit,
        id: crit.id || crit.name.toLowerCase().replace(/[^a-z0-9]/g, '_') || `crit_${idx + 1}`,
      }));
      setCriteria(normalized);
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
    const targetId = updated.id || updated.name.toLowerCase().replace(/[^a-z0-9]/g, '_') || `crit_${Date.now()}`;
    const criterionToSave = { ...updated, id: targetId };
    setCriteria((prev) => {
      const exists = prev.some((c) => c.id === targetId);
      if (exists) {
        return prev.map((c) => (c.id === targetId ? criterionToSave : c));
      } else {
        return [...prev, criterionToSave];
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

        {criteria.map((crit, critIdx) => {
          const criterionKey = crit.id || `crit_${critIdx + 1}`;
          return (
            <div
              key={criterionKey}
              className="bg-white border border-slate-200/90 rounded-2xl p-5 hover:border-slate-300 transition-all shadow-xs space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h3 className="text-base font-bold text-slate-900">{crit.name}</h3>
                    <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200/60">
                      Trọng số: {crit.weight}%
                    </span>
                  </div>
                  {crit.description && (
                    <p className="text-xs text-slate-500">{crit.description}</p>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <div className="bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
                    <span className="text-xs font-bold text-slate-700">
                      Thang điểm: {crit.max_score || 5} đ
                    </span>
                  </div>

                  <button
                    onClick={() => {
                      setEditingCriterion(crit);
                      setIsModalOpen(true);
                    }}
                    className="p-2 text-slate-400 hover:text-amber-600 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer"
                    title="Chỉnh sửa chi tiết tiêu chí"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleDeleteCriterion(crit.id)}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer"
                    title="Xóa tiêu chí"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Guiding Question Box */}
              {crit.guiding_question && (
                <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200/80 text-xs space-y-1">
                  <div className="flex items-center gap-1.5 text-blue-900 font-bold">
                    <HelpCircle className="w-4 h-4 text-blue-600 flex-shrink-0" />
                    <span>Câu hỏi định hướng chấm điểm:</span>
                  </div>
                  <p className="text-blue-800 italic pl-5.5 font-medium leading-relaxed">
                    &ldquo;{crit.guiding_question}&rdquo;
                  </p>
                </div>
              )}

              {/* Scoring Method Box */}
              {crit.scoring_method && (
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 leading-relaxed">
                  <strong className="text-slate-900 font-bold">Phương pháp tính điểm: </strong>
                  {crit.scoring_method}
                </div>
              )}

              {/* Quick Weight Adjustment */}
              <div className="flex items-center gap-3 bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
                <span className="text-xs font-semibold text-slate-600">
                  Điều chỉnh trọng số:
                </span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={crit.weight}
                  onChange={(e) => handleWeightChange(crit.id, Number(e.target.value))}
                  className="w-20 bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-mono font-bold text-slate-900 text-center focus:outline-none focus:border-blue-500"
                />
                <span className="text-xs font-bold text-slate-700">%</span>
              </div>

              {/* Band Descriptors List */}
              {crit.descriptors && crit.descriptors.length > 0 && (
                <div className="space-y-2 pt-1">
                  <div className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-slate-500" />
                    <span>Bảng thang điểm chi tiết (How Marks Are Awarded):</span>
                  </div>
                  <div className="space-y-1.5">
                    {crit.descriptors.map((desc, idx) => {
                      const badgeText = desc.level;
                      const isHigh = badgeText.includes('5') || badgeText.includes('Xuất sắc');
                      const isGood = badgeText.includes('4') || badgeText.includes('Khá');
                      const isMid = badgeText.includes('3') || badgeText.includes('Đạt');
                      const isLow = badgeText.includes('2');
                      const isPoor = badgeText.includes('1') || badgeText.includes('Cần');
                      const isZero = badgeText.includes('0');

                      const badgeClass = isHigh
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                        : isGood
                        ? 'bg-blue-50 text-blue-700 border-blue-300'
                        : isMid
                        ? 'bg-indigo-50 text-indigo-700 border-indigo-300'
                        : isLow
                        ? 'bg-amber-50 text-amber-700 border-amber-300'
                        : isPoor
                        ? 'bg-orange-50 text-orange-700 border-orange-300'
                        : isZero
                        ? 'bg-rose-50 text-rose-700 border-rose-300'
                        : 'bg-slate-100 text-slate-700 border-slate-300';

                      return (
                        <div
                          key={idx}
                          className="flex flex-col sm:flex-row sm:items-center gap-2 p-2.5 rounded-xl border border-slate-200/80 bg-white hover:bg-slate-50/50 transition-colors text-xs"
                        >
                          <span
                            className={`px-2.5 py-1 rounded-lg border font-mono font-bold text-xs whitespace-nowrap text-center sm:min-w-[70px] ${badgeClass}`}
                          >
                            {desc.level}
                          </span>
                          <p className="text-xs text-slate-700 leading-relaxed flex-1">
                            {desc.description}
                          </p>
                          {desc.score_range && desc.score_range !== desc.level && (
                            <span className="text-[11px] font-mono text-slate-400 font-medium whitespace-nowrap">
                              {desc.score_range}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
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
