'use client';

import React, { useState } from 'react';
import {
  Sliders,
  Save,
  RotateCcw,
  Clock,
  FileCheck2,
  Sparkles,
  Layers,
  AlertCircle,
  CheckCircle2,
  Volume2,
  Image as ImageIcon,
  KeyRound,
  FileText,
  SlidersHorizontal,
  Info,
} from 'lucide-react';
import { useAcademic } from '@/context/AcademicContext';
import { QuestionType, QuestionTypeConfig, DEFAULT_QUESTION_TYPE_CONFIGS } from '@/types/academic';

const TYPE_LIGHT_THEME: Record<
  QuestionType,
  { bg: string; text: string; border: string; badgeBg: string; activeBorder: string }
> = {
  RA: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', badgeBg: 'bg-blue-600', activeBorder: 'border-blue-500' },
  RS: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', badgeBg: 'bg-purple-600', activeBorder: 'border-purple-500' },
  GD: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', badgeBg: 'bg-emerald-600', activeBorder: 'border-emerald-500' },
  DI: { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200', badgeBg: 'bg-amber-600', activeBorder: 'border-amber-500' },
  SI: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', badgeBg: 'bg-rose-600', activeBorder: 'border-rose-500' },
  RL: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', badgeBg: 'bg-indigo-600', activeBorder: 'border-indigo-500' },
  ASQ: { bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200', badgeBg: 'bg-cyan-600', activeBorder: 'border-cyan-500' },
};

const ALL_TYPES: QuestionType[] = ['RA', 'RS', 'GD', 'DI', 'SI', 'RL', 'ASQ'];

export default function QuestionTypesClient() {
  const { questionTypeConfigs, updateQuestionTypeConfig, resetQuestionTypeConfigs } = useAcademic();

  const [selectedType, setSelectedType] = useState<QuestionType>('RA');
  const [savedSuccess, setSavedSuccess] = useState(false);

  const activeConfig: QuestionTypeConfig =
    questionTypeConfigs?.[selectedType] ||
    DEFAULT_QUESTION_TYPE_CONFIGS[selectedType] ||
    DEFAULT_QUESTION_TYPE_CONFIGS.RA;
  const typeStyle = TYPE_LIGHT_THEME[selectedType] || TYPE_LIGHT_THEME.RA;

  const handleFieldChange = (field: keyof QuestionTypeConfig, value: any) => {
    updateQuestionTypeConfig(selectedType, { [field]: value });
  };

  const handleSaveAll = () => {
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const totalAiFocus =
    (activeConfig?.focus_pronunciation ?? 0) +
    (activeConfig?.focus_fluency ?? 0) +
    (activeConfig?.focus_content ?? 0) +
    (activeConfig?.focus_grammar_lexical ?? 0);

  const isAiFocusValid = totalAiFocus === 100;

  return (
    <div className="w-full space-y-6">
      {/* 1. Top Header Banner */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shadow-xs">
              <Sliders className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                  Cấu hình Quy chuẩn Dạng bài thi Speaking
                </h1>
                <span className="bg-blue-50 text-blue-700 border border-blue-200 text-xs px-2.5 py-0.5 rounded-full font-semibold">
                  Ban Học thuật · Master Settings
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Thiết lập thông số thời lượng mặc định, quy chuẩn dữ liệu bắt buộc và trọng tâm AI chấm điểm cho từng dạng đề thi.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => {
                if (confirm('Khôi phục toàn bộ 7 dạng bài về quy chuẩn khảo thí mặc định?')) {
                  resetQuestionTypeConfigs();
                }
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 transition-colors shadow-xs"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              <span>Khôi phục Mặc định</span>
            </button>

            <button
              onClick={handleSaveAll}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-all"
            >
              <Save className="w-4 h-4" />
              <span>Lưu Cấu hình</span>
            </button>
          </div>
        </div>

        {savedSuccess && (
          <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-semibold flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Đã lưu thành công quy chuẩn cấu hình! Mọi câu hỏi tạo mới và ma trận đề sẽ tự động kế thừa thông số này.</span>
          </div>
        )}
      </div>

      {/* 2. Selector Tabs for 7 Question Types */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {ALL_TYPES.map((type) => {
          const cfg = questionTypeConfigs?.[type] || DEFAULT_QUESTION_TYPE_CONFIGS[type];
          const style = TYPE_LIGHT_THEME[type] || TYPE_LIGHT_THEME.RA;
          const isSelected = selectedType === type;
          if (!cfg) return null;

          return (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
              className={`p-3.5 rounded-2xl border text-left transition-all ${
                isSelected
                  ? 'bg-white border-blue-500 ring-2 ring-blue-100 shadow-sm'
                  : 'bg-white border-slate-200/90 hover:border-slate-300 hover:bg-slate-50/60 shadow-xs'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span
                  className={`px-2 py-0.5 rounded-md text-xs font-mono font-bold border ${style.bg} ${style.text} ${style.border}`}
                >
                  {type}
                </span>
                <span
                  className={`w-2 h-2 rounded-full ${
                    cfg.is_active ? 'bg-emerald-500' : 'bg-slate-300'
                  }`}
                  title={cfg.is_active ? 'Đang mở sử dụng' : 'Tạm ngưng'}
                />
              </div>

              <div className="font-bold text-xs text-slate-900 truncate">
                {cfg.name}
              </div>
              <div className="text-[11px] text-slate-500 truncate mt-0.5">
                {cfg.vietnamese_name}
              </div>

              <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                <span>{cfg.default_prep_time}s prep</span>
                <span>{cfg.default_response_time}s resp</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* 3. Detailed Configuration Panel for Selected Type */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-6">
        {/* Selected Type Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <span
              className={`px-3 py-1.5 rounded-xl text-sm font-bold border flex items-center gap-2 ${typeStyle.bg} ${typeStyle.text} ${typeStyle.border}`}
            >
              <span className={`w-2.5 h-2.5 rounded-full ${typeStyle.badgeBg}`} />
              <span>{activeConfig.code} · {activeConfig.name}</span>
            </span>
            <div>
              <h2 className="text-base font-bold text-slate-900">{activeConfig.vietnamese_name}</h2>
              <p className="text-xs text-slate-500">{activeConfig.description}</p>
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer p-2 px-3 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-colors self-start sm:self-auto">
            <input
              type="checkbox"
              checked={activeConfig.is_active}
              onChange={(e) => handleFieldChange('is_active', e.target.checked)}
              className="rounded text-blue-600 focus:ring-0 w-4 h-4 cursor-pointer"
            />
            <span className="text-xs font-semibold text-slate-700">
              {activeConfig.is_active ? 'Đang mở cho kỳ thi' : 'Tạm khóa dạng đề'}
            </span>
          </label>
        </div>

        {/* 3 Form Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Column 1: Timing & Quotas */}
          <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
              <Clock className="w-4 h-4 text-blue-600" />
              <span>1. Thời lượng & Định mức Chuẩn</span>
            </div>

            {/* Default Prep Time */}
            <div>
              <div className="flex justify-between items-center text-xs mb-1">
                <label className="font-semibold text-slate-700">Thời gian Chuẩn bị mặc định (Prep):</label>
                <span className="font-mono font-bold text-blue-700">{activeConfig.default_prep_time} giây</span>
              </div>
              <input
                type="range"
                min={1}
                max={60}
                value={activeConfig.default_prep_time}
                onChange={(e) => handleFieldChange('default_prep_time', Number(e.target.value))}
                className="w-full accent-blue-600 cursor-pointer"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Khoảng cho phép: {activeConfig.min_prep_time}s – {activeConfig.max_prep_time}s
              </p>
            </div>

            {/* Default Response Time */}
            <div>
              <div className="flex justify-between items-center text-xs mb-1">
                <label className="font-semibold text-slate-700">Thời gian Trả lời mặc định (Resp):</label>
                <span className="font-mono font-bold text-blue-700">{activeConfig.default_response_time} giây</span>
              </div>
              <input
                type="range"
                min={10}
                max={120}
                value={activeConfig.default_response_time}
                onChange={(e) => handleFieldChange('default_response_time', Number(e.target.value))}
                className="w-full accent-blue-600 cursor-pointer"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Khoảng cho phép: {activeConfig.min_response_time}s – {activeConfig.max_response_time}s
              </p>
            </div>

            {/* Recommended question count */}
            <div className="pt-2 border-t border-slate-200">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Số câu khuyến nghị trong 1 đề thi:
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={activeConfig.recommended_question_count}
                  onChange={(e) => handleFieldChange('recommended_question_count', Number(e.target.value))}
                  className="w-20 bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-blue-500"
                />
                <span className="text-xs text-slate-500">câu / đề</span>
              </div>
            </div>
          </div>

          {/* Column 2: Input Requirements & Validation */}
          <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
              <FileCheck2 className="w-4 h-4 text-emerald-600" />
              <span>2. Quy chuẩn Bắt buộc khi Tạo câu hỏi</span>
            </div>

            <div className="space-y-2.5">
              {/* Requires Image */}
              <label className="flex items-center justify-between p-2.5 bg-white border border-slate-200 rounded-xl hover:border-slate-300 transition-colors cursor-pointer">
                <div className="flex items-center gap-2 text-xs font-medium text-slate-800">
                  <ImageIcon className="w-4 h-4 text-amber-600" />
                  <span>Bắt buộc có Hình ảnh / Biểu đồ</span>
                </div>
                <input
                  type="checkbox"
                  checked={activeConfig.requires_image}
                  onChange={(e) => handleFieldChange('requires_image', e.target.checked)}
                  className="rounded text-blue-600 focus:ring-0 w-4 h-4 cursor-pointer"
                />
              </label>

              {/* Requires Audio Prompt */}
              <label className="flex items-center justify-between p-2.5 bg-white border border-slate-200 rounded-xl hover:border-slate-300 transition-colors cursor-pointer">
                <div className="flex items-center gap-2 text-xs font-medium text-slate-800">
                  <Volume2 className="w-4 h-4 text-blue-600" />
                  <span>Bắt buộc có File Âm thanh Audio Prompt</span>
                </div>
                <input
                  type="checkbox"
                  checked={activeConfig.requires_audio_prompt}
                  onChange={(e) => handleFieldChange('requires_audio_prompt', e.target.checked)}
                  className="rounded text-blue-600 focus:ring-0 w-4 h-4 cursor-pointer"
                />
              </label>

              {/* Requires Audio Script */}
              <label className="flex items-center justify-between p-2.5 bg-white border border-slate-200 rounded-xl hover:border-slate-300 transition-colors cursor-pointer">
                <div className="flex items-center gap-2 text-xs font-medium text-slate-800">
                  <FileText className="w-4 h-4 text-purple-600" />
                  <span>Bắt buộc có Kịch bản âm thanh Script</span>
                </div>
                <input
                  type="checkbox"
                  checked={activeConfig.requires_audio_script}
                  onChange={(e) => handleFieldChange('requires_audio_script', e.target.checked)}
                  className="rounded text-blue-600 focus:ring-0 w-4 h-4 cursor-pointer"
                />
              </label>

              {/* Requires Key Points */}
              <label className="flex items-center justify-between p-2.5 bg-white border border-slate-200 rounded-xl hover:border-slate-300 transition-colors cursor-pointer">
                <div className="flex items-center gap-2 text-xs font-medium text-slate-800">
                  <KeyRound className="w-4 h-4 text-emerald-600" />
                  <span>Bắt buộc nhập Luận điểm AI chấm (Key Points)</span>
                </div>
                <input
                  type="checkbox"
                  checked={activeConfig.requires_key_points}
                  onChange={(e) => handleFieldChange('requires_key_points', e.target.checked)}
                  className="rounded text-blue-600 focus:ring-0 w-4 h-4 cursor-pointer"
                />
              </label>
            </div>

            {/* Word Limits */}
            <div className="pt-2 border-t border-slate-200">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Giới hạn độ dài đề bài (Số từ):
              </label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[11px] text-slate-500">Tối thiểu:</span>
                  <input
                    type="number"
                    value={activeConfig.min_prompt_words}
                    onChange={(e) => handleFieldChange('min_prompt_words', Number(e.target.value))}
                    className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1 text-xs font-mono font-semibold"
                  />
                </div>
                <div>
                  <span className="text-[11px] text-slate-500">Tối đa:</span>
                  <input
                    type="number"
                    value={activeConfig.max_prompt_words}
                    onChange={(e) => handleFieldChange('max_prompt_words', Number(e.target.value))}
                    className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1 text-xs font-mono font-semibold"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Column 3: AI Focus Weights */}
          <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
                <Sparkles className="w-4 h-4 text-purple-600" />
                <span>3. Trọng tâm AI Chấm điểm (%)</span>
              </div>
              <span
                className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full ${
                  isAiFocusValid
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                }`}
              >
                {totalAiFocus}% / 100%
              </span>
            </div>

            {/* Pronunciation Focus */}
            <div>
              <div className="flex justify-between items-center text-xs mb-1">
                <span className="font-semibold text-slate-700">Phát âm chuẩn (Pronunciation):</span>
                <span className="font-mono font-bold text-slate-900">{activeConfig.focus_pronunciation}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={activeConfig.focus_pronunciation}
                onChange={(e) => handleFieldChange('focus_pronunciation', Number(e.target.value))}
                className="w-full accent-blue-600 cursor-pointer"
              />
            </div>

            {/* Fluency Focus */}
            <div>
              <div className="flex justify-between items-center text-xs mb-1">
                <span className="font-semibold text-slate-700">Độ trôi chảy & Ngữ điệu (Fluency):</span>
                <span className="font-mono font-bold text-slate-900">{activeConfig.focus_fluency}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={activeConfig.focus_fluency}
                onChange={(e) => handleFieldChange('focus_fluency', Number(e.target.value))}
                className="w-full accent-purple-600 cursor-pointer"
              />
            </div>

            {/* Content Focus */}
            <div>
              <div className="flex justify-between items-center text-xs mb-1">
                <span className="font-semibold text-slate-700">Nội dung & Luận điểm (Content):</span>
                <span className="font-mono font-bold text-slate-900">{activeConfig.focus_content}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={activeConfig.focus_content}
                onChange={(e) => handleFieldChange('focus_content', Number(e.target.value))}
                className="w-full accent-emerald-600 cursor-pointer"
              />
            </div>

            {/* Grammar / Lexical Focus */}
            <div>
              <div className="flex justify-between items-center text-xs mb-1">
                <span className="font-semibold text-slate-700">Ngữ pháp & Từ vựng (Grammar/Lexical):</span>
                <span className="font-mono font-bold text-slate-900">{activeConfig.focus_grammar_lexical}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={activeConfig.focus_grammar_lexical}
                onChange={(e) => handleFieldChange('focus_grammar_lexical', Number(e.target.value))}
                className="w-full accent-amber-600 cursor-pointer"
              />
            </div>

            {!isAiFocusValid && (
              <p className="text-[11px] text-rose-600 font-medium bg-rose-50 p-2 rounded-lg border border-rose-200">
                ⚠️ Tổng tỷ lệ trọng tâm đang là {totalAiFocus}%. Cần điều chỉnh để bằng đúng 100%!
              </p>
            )}
          </div>
        </div>
      </div>

      {/* 4. Comparative Overview Table */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-blue-600" />
            <h3 className="text-base font-bold text-slate-900">
              Bảng Tổng hợp Quy chuẩn 6 Dạng bài thi Speaking
            </h3>
          </div>
          <span className="text-xs text-slate-500">Đối chiếu trực quan toàn bộ hệ thống</span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase tracking-wider font-bold">
                <th className="py-3 px-4">Dạng bài</th>
                <th className="py-3 px-4 text-center">Thời gian Chuẩn bị</th>
                <th className="py-3 px-4 text-center">Thời gian Trả lời</th>
                <th className="py-3 px-4 text-center">Yêu cầu Ảnh (Image)</th>
                <th className="py-3 px-4 text-center">Yêu cầu Audio</th>
                <th className="py-3 px-4 text-center">Yêu cầu Key Points</th>
                <th className="py-3 px-4 text-center">Trọng tâm AI Chấm</th>
                <th className="py-3 px-4 text-center">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {ALL_TYPES.map((t) => {
                const c = questionTypeConfigs[t];
                const style = TYPE_LIGHT_THEME[t];
                return (
                  <tr key={t} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded font-mono font-bold text-xs border ${style.bg} ${style.text} ${style.border}`}>
                          {t}
                        </span>
                        <div>
                          <p className="font-bold text-slate-900">{c.name}</p>
                          <p className="text-[10px] text-slate-500">{c.vietnamese_name}</p>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4 text-center font-mono text-slate-700">
                      {c.default_prep_time}s
                    </td>

                    <td className="py-3 px-4 text-center font-mono text-slate-700">
                      {c.default_response_time}s
                    </td>

                    <td className="py-3 px-4 text-center">
                      {c.requires_image ? (
                        <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full font-bold text-[10px]">Bắt buộc</span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">—</span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-center">
                      {c.requires_audio_prompt ? (
                        <span className="text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full font-bold text-[10px]">Bắt buộc</span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">—</span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-center">
                      {c.requires_key_points ? (
                        <span className="text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-full font-bold text-[10px]">Bắt buộc</span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">—</span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-center text-[11px]">
                      <span className="text-slate-700 font-mono">
                        P:{c.focus_pronunciation}% · F:{c.focus_fluency}% · C:{c.focus_content}%
                        {c.focus_grammar_lexical > 0 ? ` · G:${c.focus_grammar_lexical}%` : ''}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-center">
                      <span
                        className={`text-[11px] px-2 py-0.5 rounded-full font-bold border ${
                          c.is_active
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-slate-100 text-slate-500 border-slate-200'
                        }`}
                      >
                        {c.is_active ? 'Kích hoạt' : 'Tạm khóa'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
