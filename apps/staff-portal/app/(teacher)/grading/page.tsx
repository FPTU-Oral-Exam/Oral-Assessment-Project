'use client';

import { useState, useEffect } from 'react';
import { Search, Loader2, Play, Filter } from 'lucide-react';

type ResultStatus = 'PENDING' | 'REVIEW_REQUIRED' | 'APPROVED' | 'REJECTED';

interface GradingResult {
  id: number;
  student_name: string;
  student_id: string;
  exam_name: string;
  exam_id: number;
  ai_score: number | null;
  status: ResultStatus;
  session_id: number;
  created_at: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const STATUS_CONFIG: Record<ResultStatus, { label: string; bgColor: string; textColor: string }> = {
  PENDING: {
    label: 'Chờ xử lý',
    bgColor: 'bg-yellow-50',
    textColor: 'text-yellow-700 border-yellow-200',
  },
  REVIEW_REQUIRED: {
    label: 'Cần xem xét',
    bgColor: 'bg-orange-50',
    textColor: 'text-orange-700 border-orange-200',
  },
  APPROVED: {
    label: 'Đã duyệt',
    bgColor: 'bg-emerald-50',
    textColor: 'text-emerald-700 border-emerald-200',
  },
  REJECTED: {
    label: 'Từ chối',
    bgColor: 'bg-red-50',
    textColor: 'text-red-700 border-red-200',
  },
};

export default function GradingPage() {
  const [results, setResults] = useState<GradingResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ResultStatus | 'ALL'>('ALL');

  const fetchResults = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`${API_BASE_URL}/admin/results`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch results: ${response.status}`);
      }

      const data = await response.json();
      const resultsList: GradingResult[] = [];

      // Handle various response structures
      if (Array.isArray(data)) {
        resultsList.push(...data);
      } else if (data.results && Array.isArray(data.results)) {
        resultsList.push(...data.results);
      } else if (data.data && Array.isArray(data.data)) {
        resultsList.push(...data.data);
      }

      setResults(resultsList);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load grading results');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResults();
  }, []);

  const handlePlayAudio = (sessionId: number) => {
    alert(`Phát lại audio cho session ID: ${sessionId}. Tính năng đang được phát triển.`);
  };

  const filteredResults = results.filter((result) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      result.student_name.toLowerCase().includes(query) ||
      result.student_id.toLowerCase().includes(query) ||
      result.exam_name.toLowerCase().includes(query);

    const matchesStatus = statusFilter === 'ALL' || result.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-900">Đánh giá & Chấm bài</h1>
      </div>

      {/* Filters Row */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search Bar */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm kiếm theo tên sinh viên, mã sinh viên, tên bài thi..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Status Filter */}
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as ResultStatus | 'ALL')}
            className="pl-9 pr-8 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white appearance-none cursor-pointer"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="PENDING">Chờ xử lý</option>
            <option value="REVIEW_REQUIRED">Cần xem xét</option>
            <option value="APPROVED">Đã duyệt</option>
            <option value="REJECTED">Từ chối</option>
          </select>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          <span className="ml-3 text-slate-600">Đang tải kết quả đánh giá...</span>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-red-700 text-sm">{error}</p>
          <button
            onClick={fetchResults}
            className="mt-2 text-sm text-red-600 hover:text-red-800 font-semibold"
          >
            Thử lại
          </button>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && filteredResults.length === 0 && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 text-center">
          <h3 className="text-lg font-semibold text-slate-700">
            {searchQuery || statusFilter !== 'ALL'
              ? 'Không tìm thấy kết quả phù hợp'
              : 'Chưa có kết quả đánh giá nào'}
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            {searchQuery || statusFilter !== 'ALL'
              ? 'Thử điều chỉnh bộ lọc tìm kiếm.'
              : 'Kết quả đánh giá sẽ xuất hiện sau khi sinh viên hoàn thành bài thi.'}
          </p>
        </div>
      )}

      {/* Results Table */}
      {!loading && !error && filteredResults.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-600">
                    Sinh viên
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-600">
                    Bài thi
                  </th>
                  <th className="text-center px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-600">
                    Điểm AI
                  </th>
                  <th className="text-center px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-600">
                    Trạng thái
                  </th>
                  <th className="text-center px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-600">
                    Hành động
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredResults.map((result) => {
                  const statusConfig = STATUS_CONFIG[result.status] || STATUS_CONFIG.PENDING;
                  return (
                    <tr key={result.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{result.student_name}</p>
                          <p className="text-xs text-slate-500 font-mono">{result.student_id}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-slate-700">{result.exam_name}</p>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-sm font-bold text-slate-900">
                          {result.ai_score !== null ? result.ai_score.toFixed(1) : '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-flex px-2.5 py-1 text-xs font-semibold rounded-full border ${statusConfig.bgColor} ${statusConfig.textColor}`}
                        >
                          {statusConfig.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handlePlayAudio(result.session_id)}
                          className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                          title="Phát lại audio"
                        >
                          <Play className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
