'use client';

import React, { useState } from 'react';
import {
  X,
  PlusCircle,
  Clock,
  FileCheck2,
  Image as ImageIcon,
  Volume2,
  FileText,
  KeyRound,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { useAcademic } from '@/context/AcademicContext';

interface CreateQuestionTypeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newTypeCode: string) => void;
}

export default function CreateQuestionTypeModal({
  isOpen,
  onClose,
  onSuccess,
}: CreateQuestionTypeModalProps) {
  const { questionTypeConfigs, addQuestionType } = useAcademic();

  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [vietnameseName, setVietnameseName] = useState('');
  const [description, setDescription] = useState('');
  const [prepTime, setPrepTime] = useState<number>(30);
  const [responseTime, setResponseTime] = useState<number>(45);
  const [recommendedCount, setRecommendedCount] = useState<number>(2);

  // Data specification flags
  const [requiresImage, setRequiresImage] = useState(false);
  const [requiresAudioPrompt, setRequiresAudioPrompt] = useState(false);
  const [requiresAudioScript, setRequiresAudioScript] = useState(false);
  const [requiresKeyPoints, setRequiresKeyPoints] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode || cleanCode.length < 2 || cleanCode.length > 10) {
      setError('Mã dạng bài phải từ 2 đến 10 ký tự viết hoa (ví dụ: OP, INT, SIT).');
      return;
    }

    if (!/^[A-Z0-9_-]+$/.test(cleanCode)) {
      setError('Mã dạng bài chỉ được chứa chữ cái, số, gạch nối (-) hoặc gạch dưới (_).');
      return;
    }

    if (questionTypeConfigs[cleanCode]) {
      setError(`Mã dạng bài "${cleanCode}" đã tồn tại trong hệ thống. Vui lòng chọn mã khác.`);
      return;
    }

    if (!name.trim()) {
      setError('Vui lòng nhập tên dạng bài (tiếng Anh).');
      return;
    }

    try {
      setIsSubmitting(true);
      await addQuestionType({
        type: cleanCode,
        name: name.trim(),
        vietnamese_name: vietnameseName.trim() || name.trim(),
        description: description.trim(),
        default_prep_time: Number(prepTime),
        default_response_time: Number(responseTime),
        is_active: true,
        requires_image: requiresImage,
        requires_audio_prompt: requiresAudioPrompt,
        requires_audio_script: requiresAudioScript,
        requires_key_points: requiresKeyPoints,
        recommended_question_count: Number(recommendedCount),
      });

      onSuccess(cleanCode);
      onClose();
    } catch (err: any) {
      console.error('[CreateQuestionTypeModal] Error:', err);
      setError(err?.message || 'Không thể tạo mới dạng bài. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
              <PlusCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Thêm Loại Đề thi Speaking Mới
              </h2>
              <p className="text-xs text-slate-500">
                Định nghĩa quy chuẩn dữ liệu và thời lượng thi chuẩn ban đầu
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-5">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Basic Info */}
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mã Dạng bài (Code) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="VD: OP, INT"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white"
                  maxLength={10}
                  required
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tên tiếng Anh (English Name) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="VD: Open Presentation"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tên tiếng Việt (Vietnamese Name)
              </label>
              <input
                type="text"
                placeholder="VD: Thuyết trình chủ đề mở"
                value={vietnameseName}
                onChange={(e) => setVietnameseName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Mô tả sư phạm / Hướng dẫn thí sinh
              </label>
              <textarea
                rows={2}
                placeholder="Mô tả tóm tắt yêu cầu của đề thi để thí sinh nắm được..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white resize-none"
              />
            </div>
          </div>

          {/* Timing & Quota */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 uppercase tracking-wider">
              <Clock className="w-3.5 h-3.5 text-blue-600" />
              <span>Thời lượng Chuẩn ban đầu</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Chuẩn bị (Prep):
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min={0}
                    max={120}
                    value={prepTime}
                    onChange={(e) => setPrepTime(Number(e.target.value))}
                    className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-mono font-bold text-blue-700 text-center focus:outline-none focus:border-blue-500"
                  />
                  <span className="text-[11px] text-slate-500">giây</span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Trả lời (Resp):
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min={5}
                    max={180}
                    value={responseTime}
                    onChange={(e) => setResponseTime(Number(e.target.value))}
                    className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-mono font-bold text-blue-700 text-center focus:outline-none focus:border-blue-500"
                  />
                  <span className="text-[11px] text-slate-500">giây</span>
                </div>
              </div>
            </div>
          </div>

          {/* Data Validation Checkboxes */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <FileCheck2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Quy chuẩn Bắt buộc khi Tạo câu hỏi</span>
              </label>
              <span className="text-[10px] text-slate-400">
                🔒 Sẽ đóng băng sau khi tạo
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <label className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-xl hover:border-slate-300 transition-colors cursor-pointer">
                <div className="flex items-center gap-2 text-xs font-medium text-slate-800">
                  <ImageIcon className="w-3.5 h-3.5 text-amber-600" />
                  <span>Có Hình ảnh / Biểu đồ</span>
                </div>
                <input
                  type="checkbox"
                  checked={requiresImage}
                  onChange={(e) => setRequiresImage(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-0 w-4 h-4 cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-xl hover:border-slate-300 transition-colors cursor-pointer">
                <div className="flex items-center gap-2 text-xs font-medium text-slate-800">
                  <Volume2 className="w-3.5 h-3.5 text-blue-600" />
                  <span>Có Audio Prompt</span>
                </div>
                <input
                  type="checkbox"
                  checked={requiresAudioPrompt}
                  onChange={(e) => setRequiresAudioPrompt(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-0 w-4 h-4 cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-xl hover:border-slate-300 transition-colors cursor-pointer">
                <div className="flex items-center gap-2 text-xs font-medium text-slate-800">
                  <FileText className="w-3.5 h-3.5 text-purple-600" />
                  <span>Có Kịch bản Script</span>
                </div>
                <input
                  type="checkbox"
                  checked={requiresAudioScript}
                  onChange={(e) => setRequiresAudioScript(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-0 w-4 h-4 cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-xl hover:border-slate-300 transition-colors cursor-pointer">
                <div className="flex items-center gap-2 text-xs font-medium text-slate-800">
                  <KeyRound className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Có Luận điểm Key Points</span>
                </div>
                <input
                  type="checkbox"
                  checked={requiresKeyPoints}
                  onChange={(e) => setRequiresKeyPoints(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-0 w-4 h-4 cursor-pointer"
                />
              </label>
            </div>
          </div>

          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-800 leading-relaxed flex items-start gap-2">
            <HelpCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>
              <strong>Lưu ý khảo thí:</strong> Sau khi tạo, quy chuẩn cấu trúc dữ liệu của dạng bài sẽ được đóng băng vĩnh viễn nhằm bảo toàn tính toàn vẹn của ngân hàng câu hỏi.
            </span>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{isSubmitting ? 'Đang tạo...' : 'Tạo Dạng bài mới'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
