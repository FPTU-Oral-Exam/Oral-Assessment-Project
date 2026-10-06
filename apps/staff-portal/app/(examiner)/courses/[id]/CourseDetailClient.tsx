'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Users,
  Loader2,
  Check,
  CalendarDays,
} from 'lucide-react';
import { toast } from 'sonner';

import ExamsTab from './exams/ExamListClient';
import CandidatesTab from './candidates/CandidatesClient';

interface CourseDetail {
  id: string;
  name: string;
  code: string;
  description: string;
  status: string;
  semester_id: string;
  teacher?: { id: string; name: string } | null;
  section_count: number;
}

type TabType = 'candidates' | 'exams';

export default function CourseDetailClient({ courseId }: { courseId: string }) {
  const router = useRouter();
  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('candidates');

  const fetchCourse = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/examiner/courses/${courseId}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error(`Lỗi server: ${res.status}`);
      const data = await res.json();
      setCourse(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải thông tin môn học');
      toast.error('Không thể tải thông tin môn học');
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    fetchCourse();
  }, [fetchCourse]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-3">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        <div className="text-slate-500 font-medium text-sm">Đang tải thông tin môn học...</div>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-3">
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
          <p className="text-sm font-semibold text-red-900">{error || 'Không tìm thấy môn học'}</p>
          <button
            onClick={() => router.push('/semester')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-semibold"
          >
            Quay lại
          </button>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'candidates' as TabType, label: 'Danh sách sinh viên', icon: Users },
    { id: 'exams' as TabType, label: 'Quản lý kỳ thi', icon: CalendarDays },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <button
          onClick={() => router.push('/semester')}
          className="inline-flex items-center gap-1.5 text-slate-600 hover:text-slate-900 text-sm font-medium mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Quay lại danh sách học kỳ
        </button>

        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs font-bold bg-blue-100 text-blue-800 px-2.5 py-1 rounded-md">
                {course.code}
              </span>
              <h1 className="text-2xl font-bold text-slate-900">
                {course.name}
              </h1>
            </div>
            <p className="text-sm text-slate-500 mt-1.5">
              {course.teacher ? `Giảng viên phụ trách: ${course.teacher.name}` : 'Chưa chỉ định giảng viên phụ trách môn'}
              {course.description ? ` • ${course.description}` : ''}
            </p>
          </div>
          <span className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold border ${
            course.status === 'ACTIVE'
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-slate-100 text-slate-600 border-slate-200'
          }`}>
            <span className="inline-flex items-center gap-1">
              {course.status === 'ACTIVE' && <Check className="w-3 h-3" />}
              {course.status === 'ACTIVE' ? 'Đang hoạt động' : course.status}
            </span>
          </span>
        </div>
      </div>

      {/* Tab Navigation (Chỉ 2 tab: Danh sách sinh viên & Quản lý kỳ thi) */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-2 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 py-3 px-5 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'text-blue-600' : 'text-slate-400'}`} />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'candidates' && <CandidatesTab courseId={courseId} />}
        {activeTab === 'exams' && <ExamsTab courseId={courseId} />}
      </div>
    </div>
  );
}
