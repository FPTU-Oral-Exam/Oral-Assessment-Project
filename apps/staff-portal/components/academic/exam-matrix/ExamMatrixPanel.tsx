'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  ClipboardList,
  Save,
  Plus,
  Trash2,
  Dice5,
  Layers,
  Clock,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Award,
  Loader2,
  RefreshCw,
  FolderPlus,
} from 'lucide-react';
import { useAcademic } from '@/context/AcademicContext';
import {
  ExamBlueprintMatrix,
  ExamMatrixRule,
  QuestionType,
  QUESTION_TYPES_META,
  GeneratedSampleExam,
  StockHealthStatus,
} from '@/types/academic';
import StockHealthIndicator from './StockHealthIndicator';
import SampleExamPreviewModal from './SampleExamPreviewModal';

const SPEAKING_TYPES: QuestionType[] = [
  'GENERAL_INTERVIEW',
  'PICTURE_DESCRIPTION',
  'TOPIC_MONOLOGUE',
  'DEEP_DISCUSSION',
];

const TYPE_LIGHT_THEME: Record<
  QuestionType,
  { bg: string; text: string; border: string; badgeBg: string }
> = {
  GENERAL_INTERVIEW: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', badgeBg: 'bg-emerald-600' },
  PICTURE_DESCRIPTION: { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200', badgeBg: 'bg-amber-600' },
  TOPIC_MONOLOGUE: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', badgeBg: 'bg-indigo-600' },
  DEEP_DISCUSSION: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', badgeBg: 'bg-purple-600' },
};

const DEFAULT_RULE_SPECS: Record<QuestionType, { count: number; weight: number }> = {
  GENERAL_INTERVIEW: { count: 2, weight: 20 },
  PICTURE_DESCRIPTION: { count: 1, weight: 20 },
  TOPIC_MONOLOGUE: { count: 1, weight: 30 },
  DEEP_DISCUSSION: { count: 2, weight: 30 },
};

export default function ExamMatrixPanel() {
  const {
    questions,
    matrices,
    activeMatrix,
    setActiveMatrixId,
    updateMatrix,
    addMatrix,
    deleteMatrix,
    getStockHealth,
    generateSampleExam,
    rubrics,
    questionTypeConfigs,
  } = useAcademic();

  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [rules, setRules] = useState<ExamMatrixRule[]>([]);
  const [matrixName, setMatrixName] = useState('');
  const [matrixCode, setMatrixCode] = useState('');
  const [matrixDesc, setMatrixDesc] = useState('');
  const [rubricId, setRubricId] = useState('');
  const [easyRatio, setEasyRatio] = useState(30);
  const [mediumRatio, setMediumRatio] = useState(50);
  const [hardRatio, setHardRatio] = useState(20);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [generatingSample, setGeneratingSample] = useState(false);

  // Sample Exam modal state
  const [sampleExam, setSampleExam] = useState<GeneratedSampleExam | null>(null);
  const [stockHealth, setStockHealth] = useState<StockHealthStatus[]>([]);

  // Khởi tạo rules mẫu mặc định cho 6 dạng bài Speaking
  const createDefaultRules = () => {
    return SPEAKING_TYPES.map((t) => {
      const meta = QUESTION_TYPES_META[t];
      const cfg = questionTypeConfigs?.[t];
      const spec = DEFAULT_RULE_SPECS[t];
      return {
        type: t,
        question_count: spec?.count ?? 1,
        weight_percentage: spec?.weight ?? 0,
        prep_time: cfg?.default_prep_time ?? meta.defaultPrepTime,
        response_time: cfg?.default_response_time ?? meta.defaultResponseTime,
        target_difficulty: 'MEDIUM' as const,
      };
    });
  };

  // Đồng bộ form khi activeMatrix thay đổi hoặc khi chuyển chế độ
  useEffect(() => {
    if (isCreatingNew) {
      setMatrixCode(`ENTS-MATRIX-${Date.now().toString().slice(-4)}`);
      setMatrixName('Ma trận Đề thi Mới');
      setMatrixDesc('Cấu hình phân bổ 4 dạng bài Speaking chuẩn ENTs FPTU');
      setRubricId(rubrics[0]?.id || '');
      setRules(createDefaultRules());
      setEasyRatio(30);
      setMediumRatio(50);
      setHardRatio(20);
      setErrorMsg(null);
      return;
    }

    if (activeMatrix) {
      setMatrixName(activeMatrix.name);
      setMatrixCode(activeMatrix.code);
      setMatrixDesc(activeMatrix.description || '');
      setRubricId(activeMatrix.rubric_id || rubrics[0]?.id || '');
      setEasyRatio(activeMatrix.difficulty_ratio?.easy ?? 30);
      setMediumRatio(activeMatrix.difficulty_ratio?.medium ?? 50);
      setHardRatio(activeMatrix.difficulty_ratio?.hard ?? 20);

      // Đảm bảo đủ 6 dạng bài Speaking
      const mergedRules: ExamMatrixRule[] = SPEAKING_TYPES.map((t) => {
        const existing = activeMatrix.rules?.find((r) => r.type === t);
        if (existing) {
          return {
            ...existing,
            question_count: Number(existing.question_count) || 0,
            weight_percentage: Number(existing.weight_percentage) || 0,
          };
        }
        const meta = QUESTION_TYPES_META[t];
        const cfg = questionTypeConfigs?.[t];
        return {
          type: t,
          question_count: 0,
          weight_percentage: 0,
          prep_time: cfg?.default_prep_time ?? meta.defaultPrepTime,
          response_time: cfg?.default_response_time ?? meta.defaultResponseTime,
          target_difficulty: 'MEDIUM' as const,
        };
      });
      setRules(mergedRules);
      setErrorMsg(null);
    } else {
      // Khi kho ma trận hoàn toàn rỗng
      setIsCreatingNew(true);
    }
  }, [activeMatrix, isCreatingNew, rubrics, questionTypeConfigs]);

  // Tải Stock Health
  useEffect(() => {
    if (!activeMatrix || isCreatingNew) {
      setStockHealth([]);
      return;
    }
    getStockHealth(activeMatrix.id)
      .then(setStockHealth)
      .catch((err) => {
        console.error('Failed to load stock health:', err);
      });
  }, [activeMatrix, isCreatingNew, questions]);

  // Cập nhật giá trị rule của một dạng bài
  const handleRuleChange = (
    type: QuestionType,
    field: keyof ExamMatrixRule,
    value: number | string
  ) => {
    setErrorMsg(null);
    setRules((prev) => {
      const exists = prev.some((r) => r.type === type);
      if (!exists) {
        const meta = QUESTION_TYPES_META[type];
        const cfg = questionTypeConfigs?.[type];
        const newRule: ExamMatrixRule = {
          type,
          question_count: field === 'question_count' ? Number(value) : 0,
          weight_percentage: field === 'weight_percentage' ? Number(value) : 0,
          prep_time: cfg?.default_prep_time ?? meta.defaultPrepTime,
          response_time: cfg?.default_response_time ?? meta.defaultResponseTime,
          target_difficulty: 'MEDIUM',
          [field]: value,
        };
        return [...prev, newRule];
      }
      return prev.map((r) => (r.type === type ? { ...r, [field]: value } : r));
    });
  };

  // Nút tạo mới ma trận
  const handleStartCreateNew = () => {
    setIsCreatingNew(true);
  };

  // Nút hủy tạo mới
  const handleCancelCreateNew = () => {
    if (matrices.length > 0) {
      setIsCreatingNew(false);
      if (!activeMatrix && matrices[0]) {
        setActiveMatrixId(matrices[0].id);
      }
    }
  };

  // Lưu ma trận (Hỗ trợ cả tạo mới và cập nhật)
  const handleSave = async () => {
    setErrorMsg(null);

    const trimmedCode = matrixCode.trim();
    const trimmedName = matrixName.trim();

    if (!trimmedCode) {
      setErrorMsg('Vui lòng nhập Mã ma trận đề thi (ví dụ: ENTS-STD-SPEAKING)');
      return;
    }
    if (!trimmedName) {
      setErrorMsg('Vui lòng nhập Tên ma trận đề thi');
      return;
    }

    const cleanedRules: ExamMatrixRule[] = SPEAKING_TYPES.map((t) => {
      const found = rules.find((r) => r.type === t);
      const meta = QUESTION_TYPES_META[t];
      const cfg = questionTypeConfigs?.[t];
      return {
        type: t,
        question_count: Math.max(0, Number(found?.question_count) || 0),
        weight_percentage: Math.max(0, Number(found?.weight_percentage) || 0),
        prep_time: Number(found?.prep_time ?? cfg?.default_prep_time ?? meta.defaultPrepTime),
        response_time: Number(found?.response_time ?? cfg?.default_response_time ?? meta.defaultResponseTime),
        target_difficulty: found?.target_difficulty ?? 'MEDIUM',
      };
    });

    const totalQ = cleanedRules.reduce((sum, r) => sum + r.question_count, 0);
    const totalSec = cleanedRules.reduce(
      (sum, r) => sum + (r.prep_time + r.response_time) * r.question_count,
      0
    );
    const estDuration = Math.round(totalSec / 60);

    const payload = {
      name: trimmedName,
      code: trimmedCode,
      description: matrixDesc.trim(),
      rubric_id: rubricId || undefined,
      rules: cleanedRules,
      total_questions: totalQ,
      estimated_duration: estDuration,
      is_active: true,
      difficulty_ratio: {
        easy: Number(easyRatio) || 30,
        medium: Number(mediumRatio) || 50,
        hard: Number(hardRatio) || 20,
      },
    };

    setIsSaving(true);
    try {
      if (isCreatingNew || !activeMatrix) {
        await addMatrix(payload);
        setIsCreatingNew(false);
      } else {
        await updateMatrix(activeMatrix.id, payload);
      }

      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    } catch (err: any) {
      console.error('Failed to save matrix:', err);
      const detail =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        err?.message ||
        'Có lỗi xảy ra khi lưu cấu hình ma trận';
      setErrorMsg(typeof detail === 'string' ? detail : JSON.stringify(detail));
    } finally {
      setIsSaving(false);
    }
  };

  // Xóa ma trận hiện tại
  const handleDelete = async () => {
    if (!activeMatrix) return;
    const confirm = window.confirm(
      `Bạn có chắc chắn muốn xóa ma trận "${activeMatrix.name}" (${activeMatrix.code}) không?`
    );
    if (!confirm) return;

    try {
      await deleteMatrix(activeMatrix.id);
      setIsCreatingNew(false);
    } catch (err: any) {
      console.error('Failed to delete matrix:', err);
      setErrorMsg('Không thể xóa ma trận đề thi này');
    }
  };

  // Sinh đề thử nghiệm
  const handleGenerateSample = async () => {
    if (isCreatingNew || !activeMatrix) {
      setErrorMsg('Vui lòng bấm "Lưu Cấu hình Ma trận" trước khi sinh đề thử nghiệm');
      return;
    }

    setGeneratingSample(true);
    setErrorMsg(null);
    try {
      const generated = await generateSampleExam(activeMatrix.id);
      setSampleExam(generated);
    } catch (err: any) {
      console.error('Failed to generate sample:', err);
      const detail =
        err?.response?.data?.detail ||
        err?.message ||
        'Không thể sinh đề thi thử nghiệm (có thể do kho đề chưa đủ câu hỏi đã duyệt)';
      setErrorMsg(typeof detail === 'string' ? detail : JSON.stringify(detail));
    } finally {
      setGeneratingSample(false);
    }
  };

  const handleReRoll = async () => {
    if (!activeMatrix) return;
    setGeneratingSample(true);
    try {
      const generated = await generateSampleExam(activeMatrix.id);
      setSampleExam(generated);
    } catch (err: any) {
      console.error('Failed to re-roll sample:', err);
    } finally {
      setGeneratingSample(false);
    }
  };

  // Tính toán tổng số liệu
  const totalQuestions = rules.reduce((sum, r) => sum + (Number(r.question_count) || 0), 0);
  const totalSeconds = rules.reduce(
    (sum, r) => sum + (Number(r.prep_time) + Number(r.response_time)) * (Number(r.question_count) || 0),
    0
  );
  const totalMinutes = Math.round(totalSeconds / 60);
  const totalWeight = rules.reduce((sum, r) => sum + (Number(r.weight_percentage) || 0), 0);
  const totalDifficultyRatio = Number(easyRatio) + Number(mediumRatio) + Number(hardRatio);

  return (
    <div className="w-full space-y-6">
      {/* Top Header & Matrix Switcher */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-200 shadow-xs">
                <ClipboardList className="w-5 h-5" />
              </span>
              <div>
                <h1 className="text-xl font-bold text-slate-900">
                  Thiết lập Ma trận Đề thi (Exam Matrix Blueprint)
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Quy định cấu trúc số lượng câu hỏi, thời lượng và tỷ lệ phân bổ của 4 dạng đề thi Speaking chuẩn ENTs FPTU
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Bộ chọn Ma trận */}
            <div className="flex items-center gap-2">
              <select
                value={isCreatingNew ? 'NEW' : activeMatrix?.id || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === 'NEW') {
                    setIsCreatingNew(true);
                  } else {
                    setIsCreatingNew(false);
                    setActiveMatrixId(val);
                  }
                }}
                className="bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 px-3 py-2 rounded-xl focus:border-blue-500 focus:bg-white focus:outline-none cursor-pointer max-w-[260px] truncate"
              >
                {matrices.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.code})
                  </option>
                ))}
                <option value="NEW">+ Tạo Ma trận Đề thi Mới...</option>
              </select>

              {!isCreatingNew && (
                <button
                  type="button"
                  onClick={handleStartCreateNew}
                  className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-all shadow-xs"
                  title="Tạo Ma trận Mới"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tạo Mới</span>
                </button>
              )}

              {isCreatingNew && matrices.length > 0 && (
                <button
                  type="button"
                  onClick={handleCancelCreateNew}
                  className="px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-all"
                >
                  Quay lại
                </button>
              )}

              {!isCreatingNew && matrices.length > 1 && (
                <button
                  type="button"
                  onClick={handleDelete}
                  className="p-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 border border-rose-200 transition-all"
                  title="Xóa ma trận này"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Nút Sinh Đề Thử Nghiệm */}
            <button
              type="button"
              onClick={handleGenerateSample}
              disabled={generatingSample || isSaving}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-amber-50 text-amber-800 border border-amber-300 hover:bg-amber-100 transition-all shadow-xs disabled:opacity-50 cursor-pointer"
            >
              {generatingSample ? (
                <Loader2 className="w-4 h-4 text-amber-600 animate-spin" />
              ) : (
                <Dice5 className="w-4 h-4 text-amber-600" />
              )}
              <span>🎲 Sinh Đề Thử Nghiệm</span>
            </button>
          </div>
        </div>

        {/* Thông báo lỗi nếu có */}
        {errorMsg && (
          <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-2 text-xs text-rose-700 font-semibold animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Matrix Metadata Form */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-5">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Mã Ma trận:
            </label>
            <input
              type="text"
              value={matrixCode}
              onChange={(e) => setMatrixCode(e.target.value)}
              placeholder="VD: ENTS-STD-SPEAKING"
              className="w-full bg-slate-50 border border-slate-200 text-xs font-mono font-bold text-slate-900 px-3 py-2 rounded-xl focus:border-blue-500 focus:bg-white focus:outline-none"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Tên Ma trận Đề thi:
            </label>
            <input
              type="text"
              value={matrixName}
              onChange={(e) => setMatrixName(e.target.value)}
              placeholder="VD: Ma trận Chuẩn ENTs Speaking (4 Dạng bài)"
              className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-900 px-3 py-2 rounded-xl focus:border-blue-500 focus:bg-white focus:outline-none font-semibold"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Mô tả cấu trúc đề:
            </label>
            <input
              type="text"
              value={matrixDesc}
              onChange={(e) => setMatrixDesc(e.target.value)}
              placeholder="VD: Cấu trúc ma trận chuẩn 4 dạng bài Speaking ENTs FPTU (General Interview, Picture Description, Topic Monologue, Deep Discussion)..."
              className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-700 px-3 py-2 rounded-xl focus:border-blue-500 focus:bg-white focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Gắn Tiêu chuẩn Rubrics:
            </label>
            <select
              value={rubricId}
              onChange={(e) => setRubricId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-800 font-semibold px-3 py-2 rounded-xl focus:border-blue-500 focus:bg-white focus:outline-none cursor-pointer"
            >
              {rubrics.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Stock Health Validator Widget */}
      {!isCreatingNew && stockHealth.length > 0 && (
        <StockHealthIndicator healthList={stockHealth} />
      )}

      {/* Interactive 6-Row Rule Matrix Table */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-blue-600" />
            <h2 className="text-base font-bold text-slate-900">
              Phân bổ 6 Dạng Bài thi Speaking
            </h2>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono flex-wrap">
            <span className="text-slate-600">
              Tổng số câu: <strong className="text-slate-900 text-sm">{totalQuestions}</strong> câu
            </span>
            <span className="text-slate-600">
              Thời lượng thi: <strong className="text-slate-900 text-sm">~{totalMinutes}</strong> phút ({totalSeconds}s)
            </span>
            <span
              className={`px-2.5 py-0.5 rounded-full font-bold ${
                totalWeight === 100
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-rose-50 text-rose-700 border border-rose-200'
              }`}
            >
              Trọng số: {totalWeight}% {totalWeight !== 100 && '(Cần đủ 100%)'}
            </span>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase tracking-wider font-bold">
                <th className="py-3 px-4">Dạng bài Speaking</th>
                <th className="py-3 px-4 text-center">Số lượng câu</th>
                <th className="py-3 px-4 text-center">Trọng số (%)</th>
                <th className="py-3 px-4 text-right">Tổng thời gian</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {SPEAKING_TYPES.map((t) => {
                const meta = QUESTION_TYPES_META[t];
                const typeStyle = TYPE_LIGHT_THEME[t] || TYPE_LIGHT_THEME.GENERAL_INTERVIEW;
                const cfg = questionTypeConfigs?.[t];
                const rule = rules.find((r) => r.type === t) || {
                  type: t,
                  question_count: 0,
                  prep_time: cfg?.default_prep_time ?? meta.defaultPrepTime,
                  response_time: cfg?.default_response_time ?? meta.defaultResponseTime,
                  target_difficulty: 'MEDIUM' as const,
                  weight_percentage: 0,
                };

                const subtotal = (rule.prep_time + rule.response_time) * (rule.question_count || 0);

                return (
                  <tr key={t} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs border ${typeStyle.bg} ${typeStyle.text} ${typeStyle.border}`}
                        >
                          {t}
                        </span>
                        <div>
                          <p className="font-bold text-slate-900 text-xs">{meta.name}</p>
                          <p className="text-[10px] text-slate-500 font-mono">
                            {rule.prep_time}s prep · {rule.response_time}s resp
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4 text-center">
                      <input
                        type="number"
                        min={0}
                        max={30}
                        value={rule.question_count}
                        onChange={(e) =>
                          handleRuleChange(
                            t,
                            'question_count',
                            Math.max(0, parseInt(e.target.value) || 0)
                          )
                        }
                        className="w-16 bg-slate-50 border border-slate-200 text-slate-900 font-mono font-bold px-2 py-1.5 rounded-lg text-center focus:border-blue-500 focus:bg-white focus:outline-none"
                      />
                    </td>

                    <td className="py-3 px-4 text-center">
                      <div className="inline-flex items-center gap-1">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={rule.weight_percentage}
                          onChange={(e) =>
                            handleRuleChange(
                              t,
                              'weight_percentage',
                              Math.max(0, parseFloat(e.target.value) || 0)
                            )
                          }
                          className="w-16 bg-slate-50 border border-slate-200 text-blue-700 font-mono font-bold px-2 py-1.5 rounded-lg text-center focus:border-blue-500 focus:bg-white focus:outline-none"
                        />
                        <span className="text-slate-500">%</span>
                      </div>
                    </td>

                    <td className="py-3 px-4 font-mono text-slate-600 font-semibold text-right">
                      {subtotal} giây
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Tùy chỉnh Độ khó mục tiêu */}
        <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700">Tỷ lệ Độ khó mục tiêu:</span>
            {totalDifficultyRatio !== 100 && (
              <span className="text-rose-600 font-bold font-mono">
                (Tổng: {totalDifficultyRatio}%, cần 100%)
              </span>
            )}
          </div>

          <div className="flex items-center gap-4 flex-wrap">
            <label className="flex items-center gap-1.5 font-semibold text-emerald-800">
              <span>Dễ:</span>
              <input
                type="number"
                min={0}
                max={100}
                value={easyRatio}
                onChange={(e) => setEasyRatio(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-14 bg-white border border-emerald-300 text-emerald-800 font-mono font-bold px-2 py-1 rounded-lg text-center focus:outline-none"
              />
              <span>%</span>
            </label>

            <label className="flex items-center gap-1.5 font-semibold text-amber-800">
              <span>Vừa:</span>
              <input
                type="number"
                min={0}
                max={100}
                value={mediumRatio}
                onChange={(e) => setMediumRatio(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-14 bg-white border border-amber-300 text-amber-800 font-mono font-bold px-2 py-1 rounded-lg text-center focus:outline-none"
              />
              <span>%</span>
            </label>

            <label className="flex items-center gap-1.5 font-semibold text-rose-800">
              <span>Khó:</span>
              <input
                type="number"
                min={0}
                max={100}
                value={hardRatio}
                onChange={(e) => setHardRatio(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-14 bg-white border border-rose-300 text-rose-800 font-mono font-bold px-2 py-1 rounded-lg text-center focus:outline-none"
              />
              <span>%</span>
            </label>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="mt-6 flex items-center justify-between flex-wrap gap-3">
          {savedSuccess ? (
            <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Đã lưu ma trận thành công!</span>
            </span>
          ) : (
            <span className="text-xs text-slate-500">
              Lưu thay đổi ma trận trước khi sinh đề mẫu hoặc gán vào ca thi.
            </span>
          )}

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-1.5 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-xs transition-all disabled:opacity-50 cursor-pointer"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>{isCreatingNew ? 'Tạo Mới Ma trận' : 'Lưu Cấu hình Ma trận'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Sample Exam Modal */}
      <SampleExamPreviewModal
        exam={sampleExam}
        onClose={() => setSampleExam(null)}
        onReRoll={handleReRoll}
      />
    </div>
  );
}
