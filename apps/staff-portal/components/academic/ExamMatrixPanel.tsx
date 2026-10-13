'use client';

import React, { useState, useEffect } from 'react';
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

const TYPE_LIGHT_THEME: Record<
  QuestionType,
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

export default function ExamMatrixPanel() {
  const {
    questions,
    matrices,
    activeMatrix,
    setActiveMatrixId,
    updateMatrix,
    addMatrix,
    getStockHealth,
    generateSampleExam,
    rubrics,
    questionTypeConfigs,
  } = useAcademic();

  const [rules, setRules] = useState<ExamMatrixRule[]>([]);
  const [matrixName, setMatrixName] = useState('');
  const [matrixCode, setMatrixCode] = useState('');
  const [matrixDesc, setMatrixDesc] = useState('');
  const [rubricId, setRubricId] = useState('');
  const [easyRatio, setEasyRatio] = useState(30);
  const [mediumRatio, setMediumRatio] = useState(50);
  const [hardRatio, setHardRatio] = useState(20);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [generatingSample, setGeneratingSample] = useState(false);

  // Sample Exam modal state
  const [sampleExam, setSampleExam] = useState<GeneratedSampleExam | null>(null);

  useEffect(() => {
    if (activeMatrix) {
      setMatrixName(activeMatrix.name);
      setMatrixCode(activeMatrix.code);
      setMatrixDesc(activeMatrix.description || '');
      setRubricId(activeMatrix.rubric_id || '');
      setRules([...activeMatrix.rules]);
      setEasyRatio(activeMatrix.difficulty_ratio?.easy ?? 30);
      setMediumRatio(activeMatrix.difficulty_ratio?.medium ?? 50);
      setHardRatio(activeMatrix.difficulty_ratio?.hard ?? 20);
    }
  }, [activeMatrix]);

  const handleRuleChange = (
    type: QuestionType,
    field: keyof ExamMatrixRule,
    value: number | string
  ) => {
    setRules((prev) =>
      prev.map((r) => (r.type === type ? { ...r, [field]: value } : r))
    );
  };

  const handleSave = () => {
    if (!activeMatrix) return;

    updateMatrix(activeMatrix.id, {
      name: matrixName,
      code: matrixCode,
      description: matrixDesc,
      rubric_id: rubricId,
      rules,
      difficulty_ratio: {
        easy: Number(easyRatio),
        medium: Number(mediumRatio),
        hard: Number(hardRatio),
      },
    });

    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleGenerateSample = async () => {
    if (!activeMatrix) return;
    setGeneratingSample(true);
    try {
      const generated = await generateSampleExam(activeMatrix.id);
      setSampleExam(generated);
    } catch (err) {
      console.error('Failed to generate sample:', err);
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
    } catch (err) {
      console.error('Failed to re-roll sample:', err);
    } finally {
      setGeneratingSample(false);
    }
  };

  const [stockHealth, setStockHealth] = useState<StockHealthStatus[]>([]);

  useEffect(() => {
    if (!activeMatrix) return;
    getStockHealth(activeMatrix.id).then(setStockHealth).catch(console.error);
  }, [activeMatrix, questions]);

  // Totals calculations
  const totalQuestions = rules.reduce((sum, r) => sum + r.question_count, 0);
  const totalSeconds = rules.reduce(
    (sum, r) => sum + (r.prep_time + r.response_time) * r.question_count,
    0
  );
  const totalMinutes = Math.round(totalSeconds / 60);
  const totalWeight = rules.reduce((sum, r) => sum + r.weight_percentage, 0);

  return (
    <div className="w-full space-y-6">
      {/* Top Header & Switcher */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-200 shadow-xs">
                <ClipboardList className="w-5 h-5" />
              </span>
              <h1 className="text-xl font-bold text-slate-900">
                Thiết lập Ma trận Đề thi (Exam Matrix Blueprint)
              </h1>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Quy định cấu trúc số lượng câu hỏi, thời lượng và tỷ lệ phân bổ của 6 dạng đề thi Speaking chuẩn PTE/Oral
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <select
              value={activeMatrix?.id || ''}
              onChange={(e) => setActiveMatrixId(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 px-3 py-2 rounded-xl focus:border-blue-500 focus:bg-white focus:outline-none cursor-pointer"
            >
              {matrices.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.code})
                </option>
              ))}
            </select>

            <button
              onClick={handleGenerateSample}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-amber-50 text-amber-800 border border-amber-300 hover:bg-amber-100 transition-all shadow-xs"
            >
              <Dice5 className="w-4 h-4 text-amber-600" />
              <span>🎲 Sinh Đề Thử Nghiệm</span>
            </button>
          </div>
        </div>

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
      <StockHealthIndicator healthList={stockHealth} />

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
              {(['RA', 'RS', 'GD', 'DI', 'SI', 'RL'] as QuestionType[]).map((t) => {
                const meta = QUESTION_TYPES_META[t];
                const typeStyle = TYPE_LIGHT_THEME[t] || TYPE_LIGHT_THEME.RA;
                const cfg = questionTypeConfigs?.[t];
                const rule = rules.find((r) => r.type === t) || {
                  type: t,
                  question_count: 0,
                  prep_time: cfg?.default_prep_time ?? meta.defaultPrepTime,
                  response_time: cfg?.default_response_time ?? meta.defaultResponseTime,
                  target_difficulty: 'MEDIUM' as const,
                  weight_percentage: 0,
                };

                const subtotal = (rule.prep_time + rule.response_time) * rule.question_count;

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
                        max={20}
                        value={rule.question_count}
                        onChange={(e) =>
                          handleRuleChange(t, 'question_count', Number(e.target.value))
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
                            handleRuleChange(t, 'weight_percentage', Number(e.target.value))
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

        {/* Difficulty Distribution Summary */}
        <div className="mt-4 p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between flex-wrap gap-2 text-xs text-slate-600">
          <span className="font-bold text-slate-700">Tỷ lệ Độ khó mục tiêu (chỉnh ở Cấu hình Dạng bài):</span>
          <span className="font-mono">
            Dễ: <strong className="text-emerald-700">{easyRatio}%</strong> · Vừa: <strong className="text-amber-700">{mediumRatio}%</strong> · Khó: <strong className="text-rose-700">{hardRatio}%</strong>
          </span>
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
              onClick={handleSave}
              className="flex items-center gap-1.5 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-xs transition-all"
            >
              <Save className="w-4 h-4" />
              <span>Lưu Cấu hình Ma trận</span>
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
