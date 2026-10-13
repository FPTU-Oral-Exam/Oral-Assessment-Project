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
  { level: 'Xuất sắc (80-90)', score_range: '80 - 90', description: 'Thể hiện hoàn hảo, ngữ điệu tự nhiên, từ vựng chuẩn mực.' },
  { level: 'Khá (65-79)', score_range: '65 - 79', description: 'Trình bày rõ ràng, đôi lúc có lỗi nhỏ không ảnh hưởng hiểu ý.' },
  { level: 'Đạt (50-64)', score_range: '50 - 64', description: 'Đáp ứng yêu cầu cơ bản, còn ngập ngừng hoặc thiếu ý phụ.' },
  { level: 'Cần cải thiện (<50)', score_range: '< 50', description: 'Nhiều sai sót, thiếu tự tin, ngắt quãng kéo dài.' },
];

export default function RubricCriteriaEditorModal({
  criterion,
  isOpen,
  onClose,
  onSave,
}: RubricCriteriaEditorModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [maxScore, setMaxScore] = useState(90);
  const [weight, setWeight] = useState(25);
  const [descriptors, setDescriptors] = useState<BandDescriptor[]>(DEFAULT_DESCRIPTORS);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (criterion) {
      setName(criterion.name);
      setDescription(criterion.description || '');
      setMaxScore(criterion.max_score);
      setWeight(criterion.weight);
      setDescriptors(criterion.descriptors?.length ? [...criterion.descriptors] : DEFAULT_DESCRIPTORS);
    } else {
      setName('');
      setDescription('');
      setMaxScore(90);
      setWeight(25);
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Tên tiêu chí không được để trống');
      return;
    }

    onSave({
      id: criterion ? criterion.id : `crit-${Date.now().toString().slice(-4)}`,
      name: name.trim(),
      description: description.trim(),
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

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tên Tiêu chí (Ví dụ: Pronunciation, Fluency...) *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="VD: Fluency and Coherence"
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
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Mô tả các mức thang điểm (Band Descriptors):
            </label>
            <div className="space-y-2.5">
              {descriptors.map((desc, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2"
                >
                  <div className="flex items-center justify-between gap-3">
                    <input
                      type="text"
                      value={desc.level}
                      onChange={(e) => handleDescriptorChange(idx, 'level', e.target.value)}
                      className="bg-white border border-slate-200 text-xs font-bold text-emerald-700 px-2 py-1 rounded-lg focus:outline-none focus:border-blue-500"
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
