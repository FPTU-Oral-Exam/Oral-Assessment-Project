'use client';

import { useState, useEffect } from 'react';
import { Users, Search, RefreshCw, AlertCircle, ShieldCheck, GraduationCap } from 'lucide-react';
import { examinerService } from '@/services';

interface Candidate {
  id: string;
  username: string;
  name: string;
  status: string;
  section_code: string;
}

interface CandidateRosterPanelProps {
  courseId: string;
}

export default function CandidateRosterPanel({ courseId }: CandidateRosterPanelProps) {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSection, setSelectedSection] = useState<string>('ALL');

  const fetchCandidates = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await examinerService.getCandidates(courseId);
      // Map from examiner service format to local Candidate type
      const candidateList: Candidate[] = (data.candidates || []).map((c: any) => ({
        id: c.id,
        username: c.roll_number || c.username || '',
        name: c.full_name || c.name || '',
        status: c.eligibility_status || 'UNKNOWN',
        section_code: c.batch_name || 'Mặc định',
      }));
      setCandidates(candidateList);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải danh sách thí sinh');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCandidates();
  }, [courseId]);

  // Unique sections
  const sections = Array.from(new Set(candidates.map((c) => c.section_code || 'Mặc định'))).filter(Boolean);

  const filteredCandidates = candidates.filter((c) => {
    const matchesSearch =
      c.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.name && c.name.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesSection = selectedSection === 'ALL' || (c.section_code || 'Mặc định') === selectedSection;
    return matchesSearch && matchesSection;
  });

  return (
    <div className="space-y-6">
      {/* Header card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">
                Danh sách Thí sinh dự thi ({candidates.length})
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Danh sách sinh viên đủ điều kiện dự thi do Phòng Khảo thí nhập vào hệ thống.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={fetchCandidates}
          disabled={loading}
          className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Làm mới
        </button>
      </div>

      {/* Notice info */}
      <div className="bg-amber-50/80 border border-amber-200/80 rounded-2xl p-4 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-900 leading-relaxed">
          <strong>Quy định Khảo thí (BR-031):</strong> Phòng Khảo thí chịu trách nhiệm phê duyệt tư cách dự thi và nhập danh sách sinh viên qua Excel. Giảng viên phụ trách môn học có quyền xem danh sách này và phát đề thi đã công bố (Publish) cho thí sinh tại tab <strong>03 · Bài thi & Giao bài</strong>.
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm theo MSSV hoặc Họ tên..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs text-slate-500 whitespace-nowrap font-medium">Lớp học phần:</span>
          <select
            value={selectedSection}
            onChange={(e) => setSelectedSection(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          >
            <option value="ALL">Tất cả lớp ({candidates.length})</option>
            {sections.map((sec) => (
              <option key={sec} value={sec}>
                {sec} ({candidates.filter((c) => (c.section_code || 'Mặc định') === sec).length})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table view */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="text-center py-16 text-slate-500 text-xs">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-500 mb-2" />
            Đang tải danh sách thí sinh...
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-600 text-xs">
            <AlertCircle className="w-6 h-6 mx-auto mb-2 text-red-500" />
            {error}
          </div>
        ) : filteredCandidates.length === 0 ? (
          <div className="text-center py-16 px-4">
            <GraduationCap className="w-12 h-12 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-700">Chưa có thí sinh nào</p>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              {searchTerm || selectedSection !== 'ALL'
                ? 'Không tìm thấy thí sinh phù hợp với bộ lọc hiện tại.'
                : 'Phòng Khảo thí chưa tải lên danh sách sinh viên dự thi cho môn học này.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3.5 w-12 text-center">STT</th>
                  <th className="px-5 py-3.5">Mã số sinh viên</th>
                  <th className="px-5 py-3.5">Họ và tên</th>
                  <th className="px-5 py-3.5">Lớp học phần</th>
                  <th className="px-5 py-3.5 text-center">Trạng thái dự thi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCandidates.map((c, idx) => (
                  <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                    <td className="px-5 py-3 font-mono font-bold text-slate-900">{c.username}</td>
                    <td className="px-5 py-3 text-slate-800 font-medium">{c.name || '—'}</td>
                    <td className="px-5 py-3">
                      <span className="px-2.5 py-0.5 rounded-lg bg-blue-50 text-blue-700 font-mono font-bold text-[11px] border border-blue-100">
                        {c.section_code || 'Mặc định'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Đủ điều kiện
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
