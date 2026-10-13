'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Save,
  Image as ImageIcon,
  Volume2,
  Clock,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import {
  AcademicQuestionItem,
  QuestionType,
  DifficultyLevel,
  QUESTION_TYPES_META,
} from '@/types/academic';
import { useAcademic } from '@/context/AcademicContext';

interface QuestionEditorModalProps {
  initialQuestion?: AcademicQuestionItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function QuestionEditorModal({
  initialQuestion,
  isOpen,
  onClose,
}: QuestionEditorModalProps) {
  const { addQuestion, updateQuestion, questionTypeConfigs } = useAcademic();

  const [type, setType] = useState<QuestionType>('RA');
  const [code, setCode] = useState('');
  const [title, setTitle] = useState('');
  const [prompt, setPrompt] = useState('');
  const [prepTime, setPrepTime] = useState(35);
  const [responseTime, setResponseTime] = useState(40);
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('MEDIUM');
  const [mediaUrl, setMediaUrl] = useState('');
  const [audioScript, setAudioScript] = useState('');
  const [sampleAnswer, setSampleAnswer] = useState('');
  const [keyPointsText, setKeyPointsText] = useState('');
  const [tagsText, setTagsText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const currentConfig = questionTypeConfigs[type];

  useEffect(() => {
    if (initialQuestion) {
      setType(initialQuestion.type);
      setCode(initialQuestion.code);
      setTitle(initialQuestion.title);
      setPrompt(initialQuestion.prompt);
      setPrepTime(initialQuestion.prep_time);
      setResponseTime(initialQuestion.response_time);
      setDifficulty(initialQuestion.difficulty);
      setMediaUrl(initialQuestion.media_url || '');
      setAudioScript(initialQuestion.audio_script || '');
      setSampleAnswer(initialQuestion.sample_answer || '');
      setKeyPointsText((initialQuestion.key_points || []).join('\n'));
      setTagsText((initialQuestion.tags || []).join(', '));
    } else {
      setType('RA');
      setCode(`RA-${Math.floor(100 + Math.random() * 900)}`);
      setTitle('');
      setPrompt('');
      const raCfg = questionTypeConfigs?.RA;
      setPrepTime(raCfg?.default_prep_time ?? QUESTION_TYPES_META.RA.defaultPrepTime);
      setResponseTime(raCfg?.default_response_time ?? QUESTION_TYPES_META.RA.defaultResponseTime);
      setDifficulty('MEDIUM');
      setMediaUrl('');
      setAudioScript('');
      setSampleAnswer('');
      setKeyPointsText('');
      setTagsText('Speaking, Oral Exam');
    }
    setError(null);
  }, [initialQuestion, isOpen, questionTypeConfigs]);

  // Handle Type Change defaults from Config Master
  const handleTypeChange = (newType: QuestionType) => {
    setType(newType);
    const targetConfig = questionTypeConfigs?.[newType];
    setPrepTime(targetConfig?.default_prep_time ?? QUESTION_TYPES_META[newType].defaultPrepTime);
    setResponseTime(targetConfig?.default_response_time ?? QUESTION_TYPES_META[newType].defaultResponseTime);
    if (!initialQuestion) {
      setCode(`${newType}-${Math.floor(100 + Math.random() * 900)}`);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !title.trim() || !prompt.trim()) {
      setError('Vui lòng điền đầy đủ Mã câu hỏi, Tiêu đề và Nội dung Prompt');
      return;
    }

    const keyPoints = keyPointsText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);

    // Validation against Master Question Type Config
    if (currentConfig?.requires_image && !mediaUrl.trim()) {
      setError(`Dạng bài [${type} - ${currentConfig.name}] bắt buộc phải có URL Hình ảnh / Biểu đồ theo quy chuẩn khảo thí.`);
      return;
    }

    if (currentConfig?.requires_audio_script && !audioScript.trim()) {
      setError(`Dạng bài [${type} - ${currentConfig.name}] bắt buộc phải có Kịch bản âm thanh (Audio Script) để AI đối chiếu.`);
      return;
    }

    if (currentConfig?.requires_key_points && keyPoints.length === 0) {
      setError(`Dạng bài [${type} - ${currentConfig.name}] bắt buộc phải có ít nhất 1 luận điểm AI chấm (Key points).`);
      return;
    }

    const tags = tagsText
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    if (initialQuestion) {
      updateQuestion(initialQuestion.id, {
        code: code.trim(),
        type,
        title: title.trim(),
        prompt: prompt.trim(),
        prep_time: Number(prepTime),
        response_time: Number(responseTime),
        difficulty,
        is_predicted: false,
        media_url: mediaUrl.trim() || undefined,
        audio_script: audioScript.trim() || undefined,
        sample_answer: sampleAnswer.trim() || undefined,
        key_points: keyPoints,
        tags,
      });
    } else {
      addQuestion({
        code: code.trim(),
        skill: 'SPEAKING',
        type,
        title: title.trim(),
        prompt: prompt.trim(),
        prep_time: Number(prepTime),
        response_time: Number(responseTime),
        difficulty,
        status: 'DRAFT',
        is_predicted: false,
        media_url: mediaUrl.trim() || undefined,
        audio_script: audioScript.trim() || undefined,
        sample_answer: sampleAnswer.trim() || undefined,
        key_points: keyPoints,
        tags,
      });
    }

    onClose();
  };

  if (!isOpen) return null;

  const questionTypes: QuestionType[] = ['RA', 'RS', 'GD', 'DI', 'SI', 'RL'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {initialQuestion ? 'Chỉnh sửa câu hỏi khảo thí' : 'Thêm mới câu hỏi vào Ngân hàng đề'}
            </h2>
            <p className="text-xs text-slate-500">
              Quy chuẩn 6 dạng bài Vấn đáp học thuật PTE / Oral Assessment (Kỹ năng Speaking)
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
              {error}
            </div>
          )}

          {/* 1. Chọn Dạng bài Speaking */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Dạng bài Speaking:
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {questionTypes.map((t) => {
                const meta = QUESTION_TYPES_META[t];
                const isSelected = type === t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => handleTypeChange(t)}
                    className={`py-2 px-1 text-center rounded-xl text-xs font-bold border transition-all ${
                      isSelected
                        ? 'bg-blue-50 text-blue-700 border-blue-500 shadow-xs ring-2 ring-blue-100'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <div>{t}</div>
                    <div className="text-[10px] font-normal truncate mt-0.5 opacity-80">
                      {meta.badge}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Mã câu hỏi & Tiêu đề */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Mã câu hỏi (Code) *
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="VD: RA-105"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                required
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tiêu đề câu hỏi / Chủ đề *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="VD: Artificial Intelligence Ethics"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                required
              />
            </div>
          </div>

          {/* 3. Thời gian chuẩn bị & Trả lời */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Chuẩn bị (giây)
              </label>
              <input
                type="number"
                value={prepTime}
                onChange={(e) => setPrepTime(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                min={0}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Trả lời (giây)
              </label>
              <input
                type="number"
                value={responseTime}
                onChange={(e) => setResponseTime(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                min={5}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Độ khó
              </label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as DifficultyLevel)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition-all cursor-pointer"
              >
                <option value="EASY">Dễ (Easy)</option>
                <option value="MEDIUM">Vừa (Medium)</option>
                <option value="HARD">Khó (Hard)</option>
              </select>
            </div>
          </div>

          {/* 4. Nội dung Prompt (Đề bài) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nội dung câu hỏi / Đề bài (Prompt) *
            </label>
            <textarea
              rows={4}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Nhập đoạn văn bản để đọc (RA), yêu cầu tình huống (SI), hoặc prompt mô tả hình ảnh..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition-all leading-relaxed"
              required
            />
          </div>

          {/* 5. Dành cho DI: Image URL */}
          {type === 'DI' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <ImageIcon className="w-3.5 h-3.5 text-amber-600" />
                <span>URL Hình ảnh / Biểu đồ (Describe Image)</span>
              </label>
              <input
                type="text"
                value={mediaUrl}
                onChange={(e) => setMediaUrl(e.target.value)}
                placeholder="https://images.unsplash.com/..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition-all font-mono"
              />
            </div>
          )}

          {/* 6. Dành cho RS, RL, GD, SI: Audio Script */}
          {(type === 'RS' || type === 'RL' || type === 'GD' || type === 'SI') && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <Volume2 className="w-3.5 h-3.5 text-blue-600" />
                <span>Kịch bản âm thanh đầu vào (Audio Prompt Script)</span>
              </label>
              <textarea
                rows={2}
                value={audioScript}
                onChange={(e) => setAudioScript(e.target.value)}
                placeholder="Nhập nguyên văn câu nói hoặc bài giảng để sinh file âm thanh hoặc làm kịch bản..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition-all font-serif italic"
              />
            </div>
          )}

          {/* 7. Luận điểm AI chấm (Key points) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>Luận điểm chính để AI chấm điểm (Mỗi dòng 1 ý):</span>
            </label>
            <textarea
              rows={3}
              value={keyPointsText}
              onChange={(e) => setKeyPointsText(e.target.value)}
              placeholder="Luận điểm 1&#10;Luận điểm 2&#10;Từ khóa trọng tâm..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition-all leading-relaxed"
            />
          </div>

          {/* 8. Câu trả lời chuẩn (Sample answer) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Câu trả lời mẫu tham khảo (Sample Answer / Transcript):
            </label>
            <textarea
              rows={2}
              value={sampleAnswer}
              onChange={(e) => setSampleAnswer(e.target.value)}
              placeholder="Đoạn trả lời đạt điểm tối đa mẫu để giảng viên đối chiếu..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
            />
          </div>

          {/* 9. Tags */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nhãn phân loại (Tags, phân cách bằng dấu phẩy):
            </label>
            <input
              type="text"
              value={tagsText}
              onChange={(e) => setTagsText(e.target.value)}
              placeholder="VD: Speaking, Technology, Business..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
            />
          </div>
        </form>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50/80 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors shadow-xs"
          >
            Hủy bỏ
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors"
          >
            <Save className="w-4 h-4" />
            <span>{initialQuestion ? 'Lưu thay đổi' : 'Tạo câu hỏi'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
