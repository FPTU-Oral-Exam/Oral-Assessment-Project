'use client';

import React, { useState } from 'react';
import {
  HelpCircle,
  Clock,
  Sparkles,
  Layers,
  CheckCircle2,
  AlertTriangle,
  X,
  Save,
} from 'lucide-react';

interface SyncScopeConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (syncExisting: boolean) => Promise<void> | void;
  typeCode: string;
  typeName: string;
  newPrepTime: number;
  newResponseTime: number;
  questionCount: number;
  isSaving: boolean;
}

export default function SyncScopeConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  typeCode,
  typeName,
  newPrepTime,
  newResponseTime,
  questionCount,
  isSaving,
}: SyncScopeConfirmDialogProps) {
  const [syncExisting, setSyncExisting] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full overflow-hidden animate-in zoom-in-95">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Xác nhận Cập nhật Thời lượng thi
              </h3>
              <p className="text-xs text-slate-500">
                Dạng bài: <strong className="text-blue-700 font-mono">{typeCode}</strong> · {typeName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSaving}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Timing preview badge */}
          <div className="flex items-center justify-between p-3.5 bg-blue-50/70 border border-blue-100 rounded-xl text-xs">
            <span className="font-semibold text-blue-900">Thông số mới thiết lập:</span>
            <div className="flex items-center gap-3 font-mono font-bold text-blue-700">
              <span>Chuẩn bị: {newPrepTime}s</span>
              <span>•</span>
              <span>Trả lời: {newResponseTime}s</span>
            </div>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed font-medium">
            Vui lòng chọn phạm vi áp dụng thời lượng thi mới này cho hệ thống:
          </p>

          {/* Scope Options */}
          <div className="space-y-2.5">
            {/* Option 1: Only new questions */}
            <label
              onClick={() => setSyncExisting(false)}
              className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                !syncExisting
                  ? 'bg-blue-50/50 border-blue-500 ring-2 ring-blue-100 shadow-xs'
                  : 'bg-white border-slate-200 hover:bg-slate-50'
              }`}
            >
              <input
                type="radio"
                name="sync_scope"
                checked={!syncExisting}
                onChange={() => setSyncExisting(false)}
                className="mt-0.5 text-blue-600 focus:ring-0 cursor-pointer"
              />
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-900">
                    Chỉ áp dụng cho câu hỏi tạo mới & đề thi sinh mới
                  </span>
                  <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] px-1.5 py-0.2 rounded font-bold">
                    Khuyến nghị
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Bảo lưu nguyên vẹn thời lượng riêng của các câu hỏi cũ đã soạn trước đây trong Ngân hàng đề.
                </p>
              </div>
            </label>

            {/* Option 2: Sync all existing questions */}
            <label
              onClick={() => setSyncExisting(true)}
              className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                syncExisting
                  ? 'bg-amber-50/60 border-amber-500 ring-2 ring-amber-100 shadow-xs'
                  : 'bg-white border-slate-200 hover:bg-slate-50'
              }`}
            >
              <input
                type="radio"
                name="sync_scope"
                checked={syncExisting}
                onChange={() => setSyncExisting(true)}
                className="mt-0.5 text-amber-600 focus:ring-0 cursor-pointer"
              />
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-900">
                    Đồng bộ cập nhật luôn cho toàn bộ câu hỏi cũ trong kho
                  </span>
                  <span className="bg-amber-100 text-amber-800 text-[10px] px-1.5 py-0.2 rounded font-mono font-bold">
                    {questionCount} câu hỏi
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Tự động ghi đè thời gian Prep ({newPrepTime}s) và Resp ({newResponseTime}s) cho toàn bộ {questionCount} câu hỏi dạng <strong className="font-mono">{typeCode}</strong> đang lưu trong cơ sở dữ liệu.
                </p>
              </div>
            </label>
          </div>

          {syncExisting && questionCount > 0 && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                Toàn bộ {questionCount} câu hỏi dạng <strong>{typeCode}</strong> sẽ được điều chỉnh đồng loạt theo thời lượng mới này.
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
          >
            Hủy bỏ
          </button>
          <button
            type="button"
            onClick={() => onConfirm(syncExisting)}
            disabled={isSaving}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Đang lưu...' : 'Xác nhận & Lưu'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
