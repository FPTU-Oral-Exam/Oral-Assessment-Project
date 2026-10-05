'use client';

import { useState, useEffect, useCallback } from 'react';
import { Trash2, Loader2, Users, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface Section {
  id: string;
  name: string;
  code: string;
  student_count: number;
}

interface Enrollment {
  id: string;
  student_id: string;
  username: string;
  name: string;
  status: string;
}

export default function EnrollmentsClient({ courseId }: { courseId: string }) {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingEnrollments, setLoadingEnrollments] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchSections = useCallback(async () => {
    try {
      const sectionsRes = await fetch(`/api/examiner/courses/${courseId}/sections`, {
        credentials: 'include',
      });
      if (!sectionsRes.ok) throw new Error(`Lỗi server: ${sectionsRes.status}`);
      const sectionsData = await sectionsRes.json();
      const sectionsList = Array.isArray(sectionsData) ? sectionsData : [];
      setSections(sectionsList);

      if (sectionsList.length > 0 && !selectedSection) {
        setSelectedSection(sectionsList[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải danh sách lớp');
    } finally {
      setLoading(false);
    }
  }, [courseId, selectedSection]);

  const fetchEnrollments = useCallback(async () => {
    if (!selectedSection) return;
    setLoadingEnrollments(true);
    try {
      const res = await fetch(`/api/examiner/sections/${selectedSection}/enrollments`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error(`Lỗi server: ${res.status}`);
      const data = await res.json();
      setEnrollments(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Không thể tải danh sách sinh viên');
    } finally {
      setLoadingEnrollments(false);
    }
  }, [selectedSection]);

  useEffect(() => { fetchSections(); }, [fetchSections]);
  useEffect(() => { fetchEnrollments(); }, [fetchEnrollments]);

  const handleDelete = async (enrollmentId: string) => {
    if (!confirm('Bạn có chắc muốn xóa sinh viên khỏi lớp?')) return;

    setDeleting(enrollmentId);
    try {
      const res = await fetch(`/api/examiner/enrollments/${enrollmentId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Xóa thất bại');
      toast.success('Đã xóa sinh viên');
      fetchEnrollments();
    } catch {
      toast.error('Xóa thất bại');
    } finally {
      setDeleting(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-3">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        <div className="text-slate-500 font-medium text-sm">Đang tải dữ liệu...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-red-900">{error}</p>
        </div>
        <button onClick={fetchSections} className="text-xs text-red-600 hover:text-red-800 font-semibold whitespace-nowrap">
          Thử lại
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Section Selector */}
      {sections.length > 0 && (
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">Chọn lớp</label>
          <select
            value={selectedSection || ''}
            onChange={(e) => setSelectedSection(e.target.value)}
            className="w-full max-w-xs px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {sections.map((s) => (
              <option key={s.id} value={s.id}>
                {s.code} — {s.name} ({s.student_count} SV)
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Empty Sections State */}
      {sections.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-bold text-slate-700">Chưa có lớp học nào</h3>
          <p className="text-sm text-slate-500 mt-2">
            Hãy tạo lớp học trước để quản lý sinh viên.
          </p>
        </div>
      )}

      {/* Enrollments Table */}
      {sections.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-700">
                    MSSV
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-700">
                    Họ tên
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-700">
                    Trạng thái
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-bold uppercase tracking-wider text-slate-700">
                    Hành động
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {loadingEnrollments ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center">
                      <Loader2 className="w-6 h-6 text-blue-600 animate-spin mx-auto" />
                    </td>
                  </tr>
                ) : enrollments.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-slate-500 text-sm">
                      Chưa có sinh viên trong lớp này
                    </td>
                  </tr>
                ) : (
                  enrollments.map((e) => (
                    <tr key={e.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-900 font-mono">
                        {e.username}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                        {e.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2.5 py-1 text-xs font-bold rounded-full border ${
                          e.status === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}>
                          {e.status === 'ACTIVE' ? 'Hoạt động' : e.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <button
                          onClick={() => handleDelete(e.id)}
                          disabled={deleting === e.id}
                          className="inline-flex items-center justify-center p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                          title="Xóa sinh viên"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {!loadingEnrollments && enrollments.length > 0 && (
            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50">
              <p className="text-sm text-slate-600 font-medium">
                Tổng cộng: <span className="text-blue-600 font-bold">{enrollments.length}</span> sinh viên
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
