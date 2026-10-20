'use client';

import React, { useState, useEffect } from 'react';
import { X, Save, Plus, Trash2, Award } from 'lucide-react';
import { RubricCriterion, BandDescriptor } from '@/types/academic';

interface RubricCriteriaEditorModalProps {
  criterion: RubricCriterion | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (crit: RubricCriterion) => void;
}

const DEFAULT_DESCRIPTORS: BandDescriptor[] = [
  { level: 'Exceeds standard', score_range: '1.6 - 2.0', description: 'Thể hiện xuất sắc, ngữ điệu và trọng âm tự nhiên, vốn từ phong phú, cấu trúc đa dạng và không có lỗi cản trở giao tiếp.' },
  { level: 'Meets standard', score_range: '1.0 - 1.55', description: 'Đạt chuẩn yêu cầu, nói rõ ràng, dễ hiểu dù đôi chỗ còn ngập ngừng hoặc có lỗi nhỏ về ngữ pháp, phát âm.' },
  { level: 'Attempt made', score_range: '0.6 - 0.95', description: 'Có nỗ lực trả lời nhưng diễn đạt hạn chế, ngập ngừng nhiều, mắc lỗi phát âm và ngữ pháp ảnh hưởng đến việc truyền tải ý.' },
  { level: 'Insufficient evidence', score_range: '0.0 - 0.55', description: 'Không đủ dữ liệu đánh giá, phát âm không thể hiểu được, nói lạc đề hoàn toàn hoặc im lặng không trả lời.' },
];

export default function RubricCriteriaEditorModal({
  criterion,
  isOpen,
  onClose,
  onSave,
}: RubricCriteriaEditorModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [guidingQuestion, setGuidingQuestion] = useState('');
  const [scoringMethod, setScoringMethod] = useState('');
  const [maxScore, setMaxScore] = useState<number>(2.0);
  const [weight, setWeight] = useState<number>(20);
  const [descriptors, setDescriptors] = useState<BandDescriptor[]>(DEFAULT_DESCRIPTORS);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (criterion) {
      setName(criterion.name);
      setDescription(criterion.description || '');
      setGuidingQuestion(criterion.guiding_question || '');
      setScoringMethod(criterion.scoring_method || '');
      setMaxScore(criterion.max_score ?? 2.0);
      setWeight(criterion.weight ?? 20);
      setDescriptors(criterion.descriptors?.length ? [...criterion.descriptors] : DEFAULT_DESCRIPTORS);
    } else {
      setName('');
      setDescription('');
      setGuidingQuestion('');
      setScoringMethod('');
      setMaxScore(2.0);
      setWeight(20);
      setDescriptors(DEFAULT_DESCRIPTORS);
    }
    setError(null);
  }, [criterion, isOpen]);

  if (!isOpen) return null;

  const handleDescriptorChange = (index: number, field: keyof BandDescriptor, value: string) => {
    setDescriptors((prev) =>
      prev.map((d, idx) => (idx === index ? { ...d, [field]: value } : d))
    );
  };

  const handleAddDescriptor = () => {
    setDescriptors((prev) => [
      ...prev,
      {
        level: `Mức ${prev.length + 1}`,
        score_range: '',
        description: '',
      },
    ]);
  };

  const handleRemoveDescriptor = (index: number) => {
    if (descriptors.length <= 1) return;
    setDescriptors((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Tên tiêu chí không được để trống');
      return;
    }

    onSave({
      id: criterion?.id || name.trim().toLowerCase().replace(/[^a-z0-9]/g, '_') || `crit-${Date.now().toString().slice(-4)}`,
      name: name.trim(),
      description: description.trim(),
      guiding_question: guidingQuestion.trim(),
      scoring_method: scoringMethod.trim(),
      max_score: Number(maxScore),
      weight: Number(weight),
      descriptors,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded bg-emerald-50 text-emerald-600 border border-emerald-200">
              <Award className="w-5 h-5" />
            </span>
            <h2 className="text-base font-bold text-slate-900">
              {criterion ? 'Chỉnh sửa Tiêu chí Chấm điểm Speaking' : 'Thêm mới Tiêu chí Chấm điểm Speaking'}
            </h2>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tên Tiêu chí (Ví dụ: Content, Pronunciation...) *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="VD: Oral Fluency"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white font-semibold transition-all"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Trọng số (%) *
              </label>
              <input
                type="number"
                min={1}
                max={100}
                value={weight}
                onChange={(e) => setWeight(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-blue-700 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Thang điểm *
              </label>
              <input
                type="number"
                min={0.1}
                max={100}
                step={0.1}
                value={maxScore}
                onChange={(e) => setMaxScore(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-emerald-700 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Câu hỏi định hướng chấm điểm (Guiding Question):
            </label>
            <input
              type="text"
              value={guidingQuestion}
              onChange={(e) => setGuidingQuestion(e.target.value)}
              placeholder="VD: Does your response demonstrate a smooth, effortless and natural rate of Speech?"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 italic focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Phương pháp tính điểm (Scoring Method):
            </label>
            <textarea
              rows={2}
              value={scoringMethod}
              onChange={(e) => setScoringMethod(e.target.value)}
              placeholder="VD: Oral fluency is scored by determining if your rhythm, phrasing and stress are smooth..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Mô tả chi tiết tiêu chí:
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Mô tả cách AI hoặc Giảng viên nhận diện và chấm tiêu chí này..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
            />
          </div>

          {/* Band Descriptors */}
          <div>
            <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Mô tả các mức thang điểm (Band Descriptors):
              </label>
              <button
                type="button"
                onClick={handleAddDescriptor}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-all shadow-xs cursor-pointer"
                title="Thêm mức thang điểm mới"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Thêm mức mới</span>
              </button>
            </div>

            <div className="space-y-2.5">
              {descriptors.map((desc, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <input
                      type="text"
                      value={desc.level}
                      onChange={(e) => handleDescriptorChange(idx, 'level', e.target.value)}
                      placeholder="Tên mức (VD: Xuất sắc, Khá...)"
                      className="flex-1 bg-white border border-slate-200 text-xs font-bold text-emerald-700 px-2 py-1 rounded-lg focus:outline-none focus:border-blue-500"
                    />
                    <input
                      type="text"
                      value={desc.score_range}
                      onChange={(e) =>
                        handleDescriptorChange(idx, 'score_range', e.target.value)
                      }
                      placeholder="Khoảng điểm"
                      className="bg-white border border-slate-200 text-xs font-mono text-slate-700 px-2 py-1 rounded-lg w-28 text-right focus:outline-none focus:border-blue-500 font-semibold"
                    />
                    {descriptors.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveDescriptor(idx)}
                        className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Xóa mức này"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <textarea
                    rows={2}
                    value={desc.description}
                    onChange={(e) =>
                      handleDescriptorChange(idx, 'description', e.target.value)
                    }
                    placeholder="Mô tả tiêu chuẩn đạt mức này..."
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs text-slate-700 focus:outline-none focus:border-blue-500 transition-all"
                  />
                </div>
              ))}
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50/80 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors shadow-xs"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors"
          >
            <Save className="w-4 h-4" />
            <span>Lưu Tiêu chí</span>
          </button>
        </div>
      </div>
    </div>
  );
}
