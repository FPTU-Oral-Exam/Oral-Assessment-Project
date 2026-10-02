'use client';

import { useState, useEffect } from 'react';
import { FileText, Plus, Search, Loader2, Award } from 'lucide-react';

interface Rubric {
  id: number;
  name: string;
  description: string | null;
  course_name: string;
  course_id: number;
  total_score: number;
  created_at: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function RubricsPage() {
  const [rubrics, setRubrics] = useState<Rubric[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchRubrics = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`${API_BASE_URL}/admin/courses/workspace`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch rubrics: ${response.status}`);
      }

      const data = await response.json();
      // Extract rubrics from workspace data if available
      const workspaces = data.workspaces || data.courses || [];
      const extractedRubrics: Rubric[] = [];

      workspaces.forEach((workspace: any) => {
        if (workspace.rubrics && Array.isArray(workspace.rubrics)) {
          workspace.rubrics.forEach((rubric: any) => {
            extractedRubrics.push({
              id: rubric.id,
              name: rubric.name,
              description: rubric.description || null,
              course_name: workspace.name || workspace.course_name || 'N/A',
              course_id: workspace.id || workspace.course_id,
              total_score: rubric.total_score || 0,
              created_at: rubric.created_at || new Date().toISOString(),
            });
          });
        }
      });

      setRubrics(extractedRubrics);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load rubrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRubrics();
  }, []);

  const handleCreateRubric = () => {
    alert('Tính năng tạo Rubric mới đang được phát triển. Vui lòng liên hệ quản trị viên.');
  };

  const filteredRubrics = rubrics.filter((rubric) => {
    const query = searchQuery.toLowerCase();
    return (
      rubric.name.toLowerCase().includes(query) ||
      rubric.course_name.toLowerCase().includes(query) ||
      (rubric.description?.toLowerCase().includes(query) ?? false)
    );
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-900">Tiêu chí Rubric</h1>
        <button
          onClick={handleCreateRubric}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg font-semibold text-sm hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Tạo Rubric mới
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="text"
          placeholder="Tìm kiếm rubric..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        />
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
          <span className="ml-3 text-slate-600">Đang tải danh sách rubric...</span>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-red-700 text-sm">{error}</p>
          <button
            onClick={fetchRubrics}
            className="mt-2 text-sm text-red-600 hover:text-red-800 font-semibold"
          >
            Thử lại
          </button>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && filteredRubrics.length === 0 && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 text-center">
          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-slate-700">
            {searchQuery ? 'Không tìm thấy rubric phù hợp' : 'Chưa có rubric nào'}
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            {searchQuery
              ? 'Thử tìm kiếm với từ khóa khác.'
              : 'Bắt đầu bằng cách tạo rubric đầu tiên cho môn học của bạn.'}
          </p>
        </div>
      )}

      {/* Rubric Cards Grid */}
      {!loading && !error && filteredRubrics.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRubrics.map((rubric) => (
            <div
              key={rubric.id}
              className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{rubric.name}</h3>
                    <p className="text-xs text-slate-500">{rubric.course_name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-indigo-600">
                  <Award className="w-4 h-4" />
                  <span className="text-xs font-bold">{rubric.total_score}</span>
                </div>
              </div>
              {rubric.description && (
                <p className="mt-3 text-xs text-slate-600 line-clamp-2">{rubric.description}</p>
              )}
              <p className="mt-3 text-[10px] text-slate-400">
                Tạo: {new Date(rubric.created_at).toLocaleDateString('vi-VN')}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
