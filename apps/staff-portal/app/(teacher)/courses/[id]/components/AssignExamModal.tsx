'use client';

import { useState, useEffect } from 'react';
import {
  Users,
  Search,
  CheckSquare,
  Square,
  X,
  Send,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  GraduationCap,
} from 'lucide-react';
import { api } from '@/lib/api';

interface Candidate {
  id: string;
  username: string;
  name: string;
  status: string;
  section_code: string;
}

interface AssignExamModalProps {
  courseId: string;
  examId: string;
  examName: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function AssignExamModal({
  courseId,
  examId,
  examName,
  onClose,
  onSuccess,
}: AssignExamModalProps) {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const fetchCandidates = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await api<Candidate[]>(`/admin/courses/${courseId}/students?detail=true`);
        setCandidates(data || []);
        // By default, select all active candidates
        const allIds = new Set((data || []).filter((c) => c.status === 'ACTIVE').map((c) => c.id));
        setSelectedIds(allIds);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Không thể tải danh sách thí sinh');
      } finally {
        setLoading(false);
      }
    };
    fetchCandidates();
  }, [courseId]);

  const filteredCandidates = candidates.filter(
    (c) =>
      c.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.name && c.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (c.section_code && c.section_code.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleToggleSelectAll = () => {
    if (selectedIds.size === filteredCandidates.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredCandidates.map((c) => c.id)));
    }
  };

  const handleToggleStudent = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const handleAssign = async () => {
    if (selectedIds.size === 0) {
      alert('Vui lòng chọn ít nhất một thí sinh để giao đề thi.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      await api(`/admin/exams/${examId}/assign`, {
        method: 'POST',
        body: JSON.stringify({
          student_ids: Array.from(selectedIds),
        }),
      });

      setSuccessMessage(`Đã giao đề thành công cho ${selectedIds.size} thí sinh!`);
      setTimeout(() => {
        if (onSuccess) onSuccess();
        onClose();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi khi giao đề thi');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold">
              <Send className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-base">Giao Đề thi cho Thí sinh</h3>
              <p className="text-[11px] text-slate-500 font-medium truncate max-w-sm">
                Đề: <span className="text-slate-800 font-semibold">{examName}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Search bar & Selection controls */}
          <div className="flex items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Tìm thí sinh hoặc lớp..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <button
              type="button"
              onClick={handleToggleSelectAll}
              className="text-xs font-semibold text-slate-700 hover:text-emerald-700 flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors whitespace-nowrap"
            >
              {selectedIds.size === filteredCandidates.length && filteredCandidates.length > 0 ? (
                <>
                  <CheckSquare className="w-3.5 h-3.5 text-emerald-600" />
                  Bỏ chọn tất cả
                </>
              ) : (
                <>
                  <Square className="w-3.5 h-3.5" />
                  Chọn tất cả ({filteredCandidates.length})
                </>
              )}
            </button>
          </div>

          {/* Candidate Table / List */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden max-h-72 overflow-y-auto">
            {loading ? (
              <div className="py-12 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" />
                Đang tải danh sách thí sinh...
              </div>
            ) : filteredCandidates.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                <GraduationCap className="w-8 h-8 text-slate-300 mx-auto mb-1.5" />
                Không tìm thấy thí sinh nào
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredCandidates.map((c) => {
                  const isChecked = selectedIds.has(c.id);
                  return (
                    <div
                      key={c.id}
                      onClick={() => handleToggleStudent(c.id)}
                      className={`flex items-center justify-between p-3 cursor-pointer text-xs transition-colors ${
                        isChecked ? 'bg-emerald-50/50' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${
                            isChecked
                              ? 'bg-emerald-600 border-emerald-600 text-white'
                              : 'border-slate-300 bg-white'
                          }`}
                        >
                          {isChecked && <CheckSquare className="w-3.5 h-3.5" />}
                        </div>
                        <div>
                          <div className="font-mono font-bold text-slate-900">{c.username}</div>
                          <div className="text-[11px] text-slate-500">{c.name || '—'}</div>
                        </div>
                      </div>

                      <div>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          {c.section_code || 'Mặc định'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1">
            <span>
              Đã chọn: <strong className="text-emerald-700">{selectedIds.size}</strong> / {candidates.length} thí sinh
            </span>
            <span className="italic">Thí sinh sẽ lập tức thấy bài thi trong Student App</span>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-2.5 bg-slate-50/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
          >
            Đóng
          </button>
          <button
            type="button"
            onClick={handleAssign}
            disabled={submitting || selectedIds.size === 0}
            className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm flex items-center gap-1.5"
          >
            <Send className="w-4 h-4" />
            <span>{submitting ? 'Đang giao...' : `Giao cho ${selectedIds.size} thí sinh`}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
