'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Sliders,
  Save,
  RotateCcw,
  Clock,
  Lock,
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
  GENERAL_INTERVIEW: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', badgeBg: 'bg-emerald-600' },
  PICTURE_DESCRIPTION: { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200', badgeBg: 'bg-amber-600' },
  TOPIC_MONOLOGUE: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', badgeBg: 'bg-indigo-600' },
  DEEP_DISCUSSION: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', badgeBg: 'bg-purple-600' },
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
  const [selectedType, setSelectedType] = useState<string>('GENERAL_INTERVIEW');

  // Active configuration from context
  const activeConfig: QuestionTypeConfig =
    questionTypeConfigs[selectedType] ||
    (DEFAULT_QUESTION_TYPE_CONFIGS as Record<string, QuestionTypeConfig>)[selectedType] ||
    DEFAULT_QUESTION_TYPE_CONFIGS.GENERAL_INTERVIEW;

  const typeStyle = TYPE_LIGHT_THEME[selectedType] || DEFAULT_THEME;

  // Local form inputs (instant, smooth interaction without network lag)
  const [localPrepTime, setLocalPrepTime] = useState<number>(activeConfig.default_prep_time);
  const [localResponseTime, setLocalResponseTime] = useState<number>(activeConfig.default_response_time);

  // Sync local inputs whenever selectedType or loaded config changes
  useEffect(() => {
    if (activeConfig) {
      setLocalPrepTime(activeConfig.default_prep_time);
      setLocalResponseTime(activeConfig.default_response_time);
    }
  }, [selectedType, activeConfig.default_prep_time, activeConfig.default_response_time]);

  // Modals & Dialogs state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSyncDialogOpen, setIsSyncDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccessMessage, setSavedSuccessMessage] = useState<string | null>(null);

  // Local question count for selected type
  const questionCount =
    activeConfig?.question_count ??
    questions.filter((q) => q.type === selectedType).length;

  const handleConfirmSave = async (syncExisting: boolean) => {
    try {
      setIsSaving(true);
      await updateQuestionTypeConfig(
        selectedType,
        {
          name: activeConfig.name,
          vietnamese_name: activeConfig.vietnamese_name,
          description: activeConfig.description,
          default_prep_time: Number(localPrepTime),
          default_response_time: Number(localResponseTime),
          is_active: activeConfig.is_active ?? true,
          recommended_question_count: activeConfig.recommended_question_count || 2,
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

          {/* Action Buttons (Đã tinh giản: chỉ giữ nút Khôi phục và Thêm mới, nút Lưu đặt ở Cột 1) */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
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
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white shadow-xs transition-colors"
            >
              <PlusCircle className="w-4 h-4 text-slate-300" />
              <span>+ Thêm Dạng bài mới</span>
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
              type="button"
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
        {/* Selected Type Header (Đã loại bỏ nút 'Đang mở cho kỳ thi') */}
        <div className="flex items-center justify-between gap-3 pb-5 border-b border-slate-100">
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
        </div>

        {/* 2 Balanced Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Column 1: Editable Timing */}
          <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-5 space-y-5 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
                  <Clock className="w-4 h-4 text-blue-600" />
                  <span>1. Điều chỉnh Thời lượng thi (Thiết lập động)</span>
                </div>
                <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded-full">
                  Được phép chỉnh sửa
                </span>
              </div>

              {/* Default Prep Time (Bỏ thanh gạt slider, chỉ giữ input số chuẩn xác) */}
              <div className="bg-white p-4 rounded-xl border border-slate-200/80 space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <label className="font-semibold text-slate-700">
                    Thời gian Chuẩn bị mặc định (Prep Time):
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min={0}
                      max={180}
                      value={localPrepTime}
                      onChange={(e) => setLocalPrepTime(Math.max(0, Number(e.target.value)))}
                      className="w-20 text-center font-mono font-bold text-sm text-blue-700 bg-slate-50 border border-slate-200 rounded-lg py-1 px-2 focus:outline-none focus:border-blue-500 focus:bg-white transition-colors"
                    />
                    <span className="text-xs text-slate-500 font-medium">giây</span>
                  </div>
                </div>
                <p className="text-[11px] text-slate-400">
                  Khoảng khuyến nghị: 0s – 60s (Thí sinh quan sát đề bài trước khi ghi âm)
                </p>
              </div>

              {/* Default Response Time (Bỏ thanh gạt slider, chỉ giữ input số chuẩn xác) */}
              <div className="bg-white p-4 rounded-xl border border-slate-200/80 space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <label className="font-semibold text-slate-700">
                    Thời gian Trả lời mặc định (Response Time):
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min={5}
                      max={300}
                      value={localResponseTime}
                      onChange={(e) => setLocalResponseTime(Math.max(1, Number(e.target.value)))}
                      className="w-20 text-center font-mono font-bold text-sm text-blue-700 bg-slate-50 border border-slate-200 rounded-lg py-1 px-2 focus:outline-none focus:border-blue-500 focus:bg-white transition-colors"
                    />
                    <span className="text-xs text-slate-500 font-medium">giây</span>
                  </div>
                </div>
                <p className="text-[11px] text-slate-400">
                  Khoảng khuyến nghị: 10s – 90s (Thời lượng mic mở để sinh viên phát biểu)
                </p>
              </div>
            </div>

            {/* DUY NHẤT 1 NÚT LƯU CẤU HÌNH (Đã bỏ nút lặp ở header và bỏ ô số câu khuyến nghị) */}
            <div className="pt-4 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setIsSyncDialogOpen(true)}
                disabled={isSaving}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? 'Đang lưu...' : 'Lưu Cấu hình Thời lượng'}</span>
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
        newPrepTime={localPrepTime}
        newResponseTime={localResponseTime}
        questionCount={questionCount}
        isSaving={isSaving}
      />
    </div>
  );
}
