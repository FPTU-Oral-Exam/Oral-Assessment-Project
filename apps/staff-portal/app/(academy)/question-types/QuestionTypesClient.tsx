'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Sliders,
  Save,
  RotateCcw,
  Clock,
  FileCheck2,
  Lock,
  Layers,
  CheckCircle2,
  Volume2,
  Image as ImageIcon,
  KeyRound,
  FileText,
  PlusCircle,
  Database,
  ExternalLink,
  Info,
} from 'lucide-react';
import { useAcademic } from '@/context/AcademicContext';
import { QuestionTypeConfig, DEFAULT_QUESTION_TYPE_CONFIGS } from '@/types/academic';
import CreateQuestionTypeModal from '@/components/academic/CreateQuestionTypeModal';
import SyncScopeConfirmDialog from '@/components/academic/SyncScopeConfirmDialog';

const TYPE_LIGHT_THEME: Record<
  string,
  { bg: string; text: string; border: string; badgeBg: string }
> = {
  RA: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', badgeBg: 'bg-blue-600' },
  RS: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', badgeBg: 'bg-purple-600' },
  GD: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', badgeBg: 'bg-emerald-600' },
  DI: { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200', badgeBg: 'bg-amber-600' },
  SI: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', badgeBg: 'bg-rose-600' },
  RL: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', badgeBg: 'bg-indigo-600' },
  ASQ: { bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200', badgeBg: 'bg-cyan-600' },
};

const DEFAULT_THEME = {
  bg: 'bg-slate-50',
  text: 'text-slate-700',
  border: 'border-slate-200',
  badgeBg: 'bg-slate-600',
};

export default function QuestionTypesClient() {
  const {
    questionTypeConfigs,
    questions,
    updateQuestionTypeConfig,
    resetQuestionTypeConfigs,
  } = useAcademic();

  const allTypeKeys = Object.keys(questionTypeConfigs);
  const [selectedType, setSelectedType] = useState<string>('RA');

  // Modals & Dialogs state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSyncDialogOpen, setIsSyncDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccessMessage, setSavedSuccessMessage] = useState<string | null>(null);

  // Active configuration
  const activeConfig: QuestionTypeConfig =
    questionTypeConfigs[selectedType] ||
    (DEFAULT_QUESTION_TYPE_CONFIGS as Record<string, QuestionTypeConfig>)[selectedType] ||
    DEFAULT_QUESTION_TYPE_CONFIGS.RA;

  const typeStyle = TYPE_LIGHT_THEME[selectedType] || DEFAULT_THEME;

  // Local question count for selected type (combine backend metric or context fallback)
  const questionCount =
    activeConfig?.question_count ??
    questions.filter((q) => q.type === selectedType).length;

  const handleFieldChange = (field: keyof QuestionTypeConfig, value: any) => {
    updateQuestionTypeConfig(selectedType, { [field]: value }, false);
  };

  const handleConfirmSave = async (syncExisting: boolean) => {
    try {
      setIsSaving(true);
      await updateQuestionTypeConfig(
        selectedType,
        {
          default_prep_time: activeConfig.default_prep_time,
          default_response_time: activeConfig.default_response_time,
          is_active: activeConfig.is_active,
          recommended_question_count: activeConfig.recommended_question_count,
        },
        syncExisting
      );

      setIsSyncDialogOpen(false);
      setSavedSuccessMessage(
        syncExisting
          ? `Đã lưu thời lượng và đồng bộ thành công cho ${questionCount} câu hỏi dạng ${selectedType} trong kho đề!`
          : `Đã lưu thời lượng chuẩn cho dạng ${selectedType}! Áp dụng cho các câu hỏi và đề thi tạo mới.`
      );
      setTimeout(() => setSavedSuccessMessage(null), 3500);
    } catch (err) {
      console.error('[QuestionTypesClient] Save failed:', err);
      alert('Không thể lưu cấu hình. Vui lòng thử lại.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* 1. Top Header Banner */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
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
                Thiết lập thông số thời lượng mặc định và quy chuẩn dữ liệu bắt buộc cho từng dạng đề thi.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => {
                if (confirm('Khôi phục toàn bộ dạng bài về quy chuẩn khảo thí mặc định?')) {
                  resetQuestionTypeConfigs();
                }
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 transition-colors shadow-xs"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              <span>Khôi phục Mặc định</span>
            </button>

            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white shadow-xs transition-colors"
            >
              <PlusCircle className="w-4 h-4 text-slate-300" />
              <span>+ Thêm Dạng bài mới</span>
            </button>

            <button
              onClick={() => setIsSyncDialogOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-all"
            >
              <Save className="w-4 h-4" />
              <span>Lưu Cấu hình</span>
            </button>
          </div>
        </div>

        {savedSuccessMessage && (
          <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-semibold flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{savedSuccessMessage}</span>
          </div>
        )}
      </div>

      {/* 2. Selector Tabs for Question Types */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {allTypeKeys.map((typeKey) => {
          const cfg = questionTypeConfigs[typeKey];
          const style = TYPE_LIGHT_THEME[typeKey] || DEFAULT_THEME;
          const isSelected = selectedType === typeKey;
          if (!cfg) return null;

          return (
            <button
              key={typeKey}
              onClick={() => setSelectedType(typeKey)}
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
                  {typeKey}
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

      {/* 3. Detailed Configuration Panel (2 Balanced Columns) */}
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

        {/* 2 Balanced Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Column 1: Editable Timing & Quotas */}
          <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-5 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
                <Clock className="w-4 h-4 text-blue-600" />
                <span>1. Điều chỉnh Thời lượng thi (Thiết lập động)</span>
              </div>
              <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded-full">
                Được phép chỉnh sửa
              </span>
            </div>

            {/* Default Prep Time */}
            <div className="bg-white p-4 rounded-xl border border-slate-200/80 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <label className="font-semibold text-slate-700">
                  Thời gian Chuẩn bị mặc định (Prep Time):
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min={0}
                    max={120}
                    value={activeConfig.default_prep_time}
                    onChange={(e) => handleFieldChange('default_prep_time', Number(e.target.value))}
                    className="w-16 text-center font-mono font-bold text-blue-700 border border-slate-200 rounded-lg py-0.5 text-xs focus:outline-none focus:border-blue-500"
                  />
                  <span className="text-xs text-slate-500 font-medium">giây</span>
                </div>
              </div>
              <input
                type="range"
                min={0}
                max={120}
                value={activeConfig.default_prep_time}
                onChange={(e) => handleFieldChange('default_prep_time', Number(e.target.value))}
                className="w-full accent-blue-600 cursor-pointer"
              />
              <p className="text-[11px] text-slate-400">
                Khoảng khuyến nghị: 0s – 60s (Thí sinh quan sát đề bài trước khi ghi âm)
              </p>
            </div>

            {/* Default Response Time */}
            <div className="bg-white p-4 rounded-xl border border-slate-200/80 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <label className="font-semibold text-slate-700">
                  Thời gian Trả lời mặc định (Response Time):
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min={5}
                    max={180}
                    value={activeConfig.default_response_time}
                    onChange={(e) => handleFieldChange('default_response_time', Number(e.target.value))}
                    className="w-16 text-center font-mono font-bold text-blue-700 border border-slate-200 rounded-lg py-0.5 text-xs focus:outline-none focus:border-blue-500"
                  />
                  <span className="text-xs text-slate-500 font-medium">giây</span>
                </div>
              </div>
              <input
                type="range"
                min={5}
                max={180}
                value={activeConfig.default_response_time}
                onChange={(e) => handleFieldChange('default_response_time', Number(e.target.value))}
                className="w-full accent-blue-600 cursor-pointer"
              />
              <p className="text-[11px] text-slate-400">
                Khoảng khuyến nghị: 10s – 90s (Thời lượng mic mở để sinh viên phát biểu)
              </p>
            </div>

            {/* Recommended question count & Save action */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-200">
              <div>
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

              <button
                onClick={() => setIsSyncDialogOpen(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors self-end"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Lưu Thời lượng này</span>
              </button>
            </div>
          </div>

          {/* Column 2: Frozen Data Specifications & Bank Metrics */}
          <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
                <Lock className="w-4 h-4 text-amber-600" />
                <span>2. Đặc tả Quy chuẩn Đã khóa (Locked Standards)</span>
              </div>
              <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                <Lock className="w-2.5 h-2.5" />
                <span>Đóng băng</span>
              </span>
            </div>

            <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-[11px] text-amber-900 leading-relaxed flex items-start gap-2">
              <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                Quy chuẩn cấu trúc dữ liệu đã được khóa cố định nhằm bảo toàn 100% tính toàn vẹn của ngân hàng câu hỏi. Để áp dụng quy cách khác, vui lòng dùng nút <strong>"+ Thêm Dạng bài mới"</strong>.
              </span>
            </div>

            {/* 4 Frozen Tiles */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Image tile */}
              <div className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-amber-600" />
                  <span className="text-xs font-medium text-slate-800">Hình ảnh / Biểu đồ</span>
                </div>
                {activeConfig.requires_image ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Bắt buộc
                  </span>
                ) : (
                  <span className="text-[10px] font-medium text-slate-400">Không yêu cầu</span>
                )}
              </div>

              {/* Audio Prompt tile */}
              <div className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Volume2 className="w-4 h-4 text-blue-600" />
                  <span className="text-xs font-medium text-slate-800">Audio Prompt</span>
                </div>
                {activeConfig.requires_audio_prompt ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                    Bắt buộc
                  </span>
                ) : (
                  <span className="text-[10px] font-medium text-slate-400">Không yêu cầu</span>
                )}
              </div>

              {/* Audio Script tile */}
              <div className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-purple-600" />
                  <span className="text-xs font-medium text-slate-800">Kịch bản Script</span>
                </div>
                {activeConfig.requires_audio_script ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                    Bắt buộc
                  </span>
                ) : (
                  <span className="text-[10px] font-medium text-slate-400">Không yêu cầu</span>
                )}
              </div>

              {/* Key Points tile */}
              <div className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-medium text-slate-800">Luận điểm Key Points</span>
                </div>
                {activeConfig.requires_key_points ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Bắt buộc
                  </span>
                ) : (
                  <span className="text-[10px] font-medium text-slate-400">Không yêu cầu</span>
                )}
              </div>
            </div>

            {/* Bank Metrics Box */}
            <div className="mt-3 p-4 bg-white border border-slate-200 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
                  <Database className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">
                    Dữ liệu Kho Ngân hàng Đề
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Đang có <strong className="text-blue-700 font-mono">{questionCount}</strong> câu hỏi thuộc dạng bài này
                  </div>
                </div>
              </div>

              <Link
                href={`/item-bank?type=${selectedType}`}
                className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors"
              >
                <span>Xem kho đề</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Comparative Overview Table */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-blue-600" />
            <h3 className="text-base font-bold text-slate-900">
              Bảng Tổng hợp Quy chuẩn Toàn bộ Dạng bài thi Speaking
            </h3>
          </div>
          <span className="text-xs text-slate-500">Đối chiếu trực quan quy chuẩn toàn hệ thống</span>
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
                <th className="py-3 px-4 text-center">Yêu cầu Script</th>
                <th className="py-3 px-4 text-center">Yêu cầu Key Points</th>
                <th className="py-3 px-4 text-center">Số câu trong kho</th>
                <th className="py-3 px-4 text-center">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {allTypeKeys.map((t) => {
                const c = questionTypeConfigs[t];
                const style = TYPE_LIGHT_THEME[t] || DEFAULT_THEME;
                if (!c) return null;
                const countInBank =
                  c.question_count ?? questions.filter((q) => q.type === t).length;

                return (
                  <tr
                    key={t}
                    onClick={() => setSelectedType(t)}
                    className={`cursor-pointer transition-colors ${
                      selectedType === t ? 'bg-blue-50/40' : 'hover:bg-slate-50/70'
                    }`}
                  >
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

                    <td className="py-3 px-4 text-center font-mono text-slate-700 font-bold">
                      {c.default_prep_time}s
                    </td>

                    <td className="py-3 px-4 text-center font-mono text-slate-700 font-bold">
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
                      {c.requires_audio_script ? (
                        <span className="text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-full font-bold text-[10px]">Bắt buộc</span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">—</span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-center">
                      {c.requires_key_points ? (
                        <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full font-bold text-[10px]">Bắt buộc</span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">—</span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-center font-mono text-slate-700">
                      <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-semibold text-[11px]">
                        {countInBank} câu
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

      {/* 5. Modals & Dialogs */}
      <CreateQuestionTypeModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={(newCode) => {
          setSelectedType(newCode);
          setSavedSuccessMessage(`Đã tạo thành công dạng bài mới [${newCode}]!`);
          setTimeout(() => setSavedSuccessMessage(null), 3500);
        }}
      />

      <SyncScopeConfirmDialog
        isOpen={isSyncDialogOpen}
        onClose={() => setIsSyncDialogOpen(false)}
        onConfirm={handleConfirmSave}
        typeCode={selectedType}
        typeName={activeConfig.name}
        newPrepTime={activeConfig.default_prep_time}
        newResponseTime={activeConfig.default_response_time}
        questionCount={questionCount}
        isSaving={isSaving}
      />
    </div>
  );
}
