'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Upload,
  Users,
  Search,
  Loader2,
  AlertCircle,
  X,
  FileSpreadsheet,
  Download,
  CheckCircle,
  XCircle,
  UserCheck,
  UserX,
} from 'lucide-react';
import { toast } from 'sonner';
import type {
  CandidateStats,
  CourseCandidate as Candidate,
  ImportResult,
} from '@oralai/shared';

export default function CandidatesClient({ courseId }: { courseId: string }) {
  const [stats, setStats] = useState<CandidateStats | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [eligibilityFilter, setEligibilityFilter] = useState<string>('');
  const [allocationFilter, setAllocationFilter] = useState<string>('');

  // Import modal
  const [showImportModal, setShowImportModal] = useState(false);
  const [importing, setImporting] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`/api/examiner/courses/${courseId}/detail`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error(`Lỗi server: ${res.status}`);
      const data = await res.json();
      setStats(data.stats);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  }, [courseId]);

  // Fetch candidates
  const fetchCandidates = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (eligibilityFilter) params.set('eligibility_status', eligibilityFilter);
      if (allocationFilter) params.set('allocation_status', allocationFilter);
      if (search) params.set('search', search);

      const res = await fetch(`/api/examiner/courses/${courseId}/candidates?${params}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error(`Lỗi server: ${res.status}`);
      const data = await res.json();
      setCandidates(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải danh sách thí sinh');
      toast.error('Không thể tải danh sách thí sinh');
    } finally {
      setLoading(false);
    }
  }, [courseId, eligibilityFilter, allocationFilter, search]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    fetchCandidates();
  }, [fetchCandidates]);

  // Filter candidates client-side for search
  const filteredCandidates = useMemo(() => {
    if (!search.trim()) return candidates;
    const q = search.toLowerCase().trim();
    return candidates.filter(
      (c) =>
        c.roll_number.toLowerCase().includes(q) ||
        c.full_name.toLowerCase().includes(q)
    );
  }, [candidates, search]);

  // Handle file selection
  const handleFileChange = (file: File | null) => {
    if (file && !file.name.endsWith('.xlsx')) {
      toast.error('Chỉ hỗ trợ file .xlsx');
      setSelectedFile(null);
      return;
    }
    setSelectedFile(file);
    setImportResult(null);
  };

  // Handle drag and drop
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  // Import Excel
  const handleImport = async () => {
    if (!selectedFile) return;
    setImporting(true);
    setImportResult(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const res = await fetch(`/api/examiner/courses/${courseId}/candidates/import`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: 'Import thất bại' }));
        const errorMsg =
          err?.error?.message ||
          err?.detail?.message ||
          (typeof err?.detail === 'string' ? err.detail : null) ||
          err?.message ||
          'Import thất bại';
        throw new Error(errorMsg);
      }

      const result: ImportResult = await res.json();
      setImportResult(result);
      toast.success(`Đã import ${result.imported} thí sinh`);
      fetchStats();
      fetchCandidates();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Import thất bại');
    } finally {
      setImporting(false);
    }
  };

  // Download template
  const handleDownloadTemplate = () => {
    const headers = ['MSSV', 'Họ và tên', 'Trạng thái đủ điều kiện'];
    const sampleData = [
      ['SE203555', 'Nguyễn Văn A', 'ĐỦ ĐIỀU KIỆN'],
      ['SE203556', 'Trần Văn B', 'ĐỦ ĐIỀU KIỆN'],
      ['SE203557', 'Lê Thị C', 'CẤM THI'],
    ];

    const csv = [headers.join(','), ...sampleData.map((row) => row.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'template_danh_sach_thi_sinh.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    toast.success('Đã tải template CSV');
  };

  const statCards = stats
    ? [
        {
          label: 'Tổng số',
          value: stats.total,
          icon: Users,
          color: 'blue',
        },
        {
          label: 'Đủ điều kiện',
          value: stats.eligible,
          icon: CheckCircle,
          color: 'emerald',
        },
        {
          label: 'Cấm thi',
          value: stats.disqualified,
          icon: XCircle,
          color: 'red',
        },
        {
          label: 'Đã phân bổ',
          value: stats.assigned,
          icon: UserCheck,
          color: 'violet',
        },
        {
          label: 'Chưa phân bổ',
          value: stats.unassigned,
          icon: UserX,
          color: 'amber',
        },
      ]
    : [];

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          const colorMap: Record<string, string> = {
            blue: 'bg-blue-50 text-blue-700 border-blue-100',
            emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
            red: 'bg-red-50 text-red-700 border-red-100',
            violet: 'bg-violet-50 text-violet-700 border-violet-100',
            amber: 'bg-amber-50 text-amber-700 border-amber-100',
          };
          return (
            <div
              key={card.label}
              className={`rounded-2xl border p-4 ${colorMap[card.color]}`}
            >
              <div className="flex items-center gap-2 mb-2">
                <Icon className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider opacity-80">
                  {card.label}
                </span>
              </div>
              <p className="text-2xl font-bold">{card.value}</p>
            </div>
          );
        })}
      </div>

      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* Search */}
          <div className="relative flex-1 sm:flex-initial">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Tìm MSSV hoặc tên..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full sm:w-64 pl-9 pr-3.5 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Filters */}
          <select
            value={eligibilityFilter}
            onChange={(e) => setEligibilityFilter(e.target.value)}
            className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Tất cả điều kiện</option>
            <option value="ELIGIBLE">Đủ điều kiện</option>
            <option value="DISQUALIFIED">Cấm thi</option>
          </select>

          <select
            value={allocationFilter}
            onChange={(e) => setAllocationFilter(e.target.value)}
            className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Tất cả phân bổ</option>
            <option value="ASSIGNED">Đã phân bổ</option>
            <option value="UNASSIGNED">Chưa phân bổ</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadTemplate}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-sm rounded-xl transition"
          >
            <Download className="w-4 h-4" />
            Tải Template
          </button>
          <button
            onClick={() => setShowImportModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl transition"
          >
            <Upload className="w-4 h-4" />
            Import Excel
          </button>
        </div>
      </div>

      {/* Candidates Table */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 space-y-3">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          <div className="text-slate-500 font-medium text-sm">Đang tải danh sách thí sinh...</div>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-900">{error}</p>
          </div>
          <button onClick={fetchCandidates} className="text-xs text-red-600 hover:text-red-800 font-semibold whitespace-nowrap">
            Thử lại
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-slate-700">
                    MSSV
                  </th>
                  <th className="px-6 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-slate-700">
                    Họ và tên
                  </th>
                  <th className="px-6 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-slate-700">
                    Điều kiện dự thi
                  </th>
                  <th className="px-6 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-slate-700">
                    Phân bổ ca thi
                  </th>
                  <th className="px-6 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-slate-700">
                    Phòng thi
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredCandidates.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <Users className="w-10 h-10 text-slate-300" />
                        <p className="text-slate-500 text-sm">
                          {candidates.length === 0
                            ? 'Chưa có thí sinh nào trong danh sách dự thi'
                            : `Không tìm thấy thí sinh phù hợp với "${search}"`}
                        </p>
                        {candidates.length === 0 && (
                          <button
                            onClick={() => setShowImportModal(true)}
                            className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl transition"
                          >
                            <Upload className="w-4 h-4" />
                            Import danh sách đầu tiên
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredCandidates.map((candidate) => (
                    <tr key={candidate.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-900 font-mono">
                        {candidate.roll_number}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 font-medium">
                        {candidate.full_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-full border ${
                            candidate.eligibility_status === 'ELIGIBLE'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-red-50 text-red-700 border-red-200'
                          }`}
                        >
                          {candidate.eligibility_status === 'ELIGIBLE' ? (
                            <CheckCircle className="w-3 h-3" />
                          ) : (
                            <XCircle className="w-3 h-3" />
                          )}
                          {candidate.eligibility_status === 'ELIGIBLE' ? 'Đủ điều kiện' : 'Cấm thi'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-full border ${
                            candidate.allocation_status === 'ASSIGNED'
                              ? 'bg-violet-50 text-violet-700 border-violet-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}
                        >
                          {candidate.allocation_status === 'ASSIGNED' ? (
                            <UserCheck className="w-3 h-3" />
                          ) : (
                            <UserX className="w-3 h-3" />
                          )}
                          {candidate.allocation_status === 'ASSIGNED'
                            ? candidate.batch_name || 'Đã phân bổ'
                            : 'Chưa phân bổ'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 font-medium">
                        {candidate.slot_room || '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {!loading && candidates.length > 0 && (
            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-600">
              <p>
                Hiển thị <span className="font-bold text-slate-900">{filteredCandidates.length}</span> / {candidates.length} thí sinh
              </p>
              {(search || eligibilityFilter || allocationFilter) && (
                <button
                  onClick={() => {
                    setSearch('');
                    setEligibilityFilter('');
                    setAllocationFilter('');
                  }}
                  className="text-blue-600 hover:underline font-semibold"
                >
                  Xóa bộ lọc
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowImportModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-200">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Import danh sách thí sinh</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tải lên file Excel (.xlsx) với 3 cột: MSSV, Họ và tên, Trạng thái đủ điều kiện
                </p>
              </div>
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setSelectedFile(null);
                  setImportResult(null);
                }}
                className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4">
              {/* Template Download */}
              <div className="flex items-center justify-between bg-slate-50 rounded-xl p-3 border border-slate-200">
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="w-8 h-8 text-emerald-600" />
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Template CSV</p>
                    <p className="text-xs text-slate-500">Tải về và điền thông tin</p>
                  </div>
                </div>
                <button
                  onClick={handleDownloadTemplate}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-lg transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  Tải template
                </button>
              </div>

              {/* Drop Zone */}
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragActive(false);
                  const file = e.dataTransfer.files[0];
                  handleFileChange(file || null);
                }}
                className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-colors ${
                  dragActive
                    ? 'border-blue-500 bg-blue-50'
                    : selectedFile
                    ? 'border-emerald-400 bg-emerald-50'
                    : 'border-slate-300 bg-slate-50 hover:bg-slate-100'
                }`}
              >
                <input
                  type="file"
                  accept=".xlsx"
                  onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                {selectedFile ? (
                  <div className="flex flex-col items-center gap-2">
                    <FileSpreadsheet className="w-10 h-10 text-emerald-600" />
                    <p className="text-sm font-semibold text-slate-900">{selectedFile.name}</p>
                    <p className="text-xs text-slate-500">
                      {(selectedFile.size / 1024).toFixed(1)} KB
                    </p>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedFile(null);
                      }}
                      className="text-xs text-red-600 hover:underline font-semibold"
                    >
                      Xóa file
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="w-10 h-10 text-slate-400" />
                    <p className="text-sm font-semibold text-slate-700">
                      Kéo thả file .xlsx vào đây
                    </p>
                    <p className="text-xs text-slate-500">hoặc click để chọn file</p>
                  </div>
                )}
              </div>

              {/* Import Result */}
              {importResult && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle className="w-5 h-5 text-emerald-600" />
                    <h3 className="text-sm font-bold text-emerald-800">Import thành công!</h3>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="bg-white rounded-lg p-2">
                      <p className="text-lg font-bold text-emerald-700">{importResult.imported}</p>
                      <p className="text-xs text-emerald-600">Đã thêm</p>
                    </div>
                    <div className="bg-white rounded-lg p-2">
                      <p className="text-lg font-bold text-slate-700">{importResult.skipped}</p>
                      <p className="text-xs text-slate-500">Bỏ qua</p>
                    </div>
                    <div className="bg-white rounded-lg p-2">
                      <p className="text-lg font-bold text-emerald-700">{importResult.total_rows}</p>
                      <p className="text-xs text-emerald-600">Tổng số</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-3 p-5 border-t border-slate-200 bg-slate-50">
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setSelectedFile(null);
                  setImportResult(null);
                }}
                className="px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Đóng
              </button>
              <button
                onClick={handleImport}
                disabled={!selectedFile || importing}
                className="inline-flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-xs transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {importing && <Loader2 className="w-4 h-4 animate-spin" />}
                {importing ? 'Đang import...' : 'Import danh sách'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
