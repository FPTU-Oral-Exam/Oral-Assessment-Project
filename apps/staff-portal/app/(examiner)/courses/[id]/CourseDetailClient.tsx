'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Users, BookOpen, BarChart3, Loader2, Check } from 'lucide-react';
import { toast } from 'sonner';

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

type TabType = 'sections' | 'enrollments' | 'exams' | 'results';

export default function CourseDetailClient({ courseId }: { courseId: string }) {
  const router = useRouter();
  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('sections');

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

  useEffect(() => { fetchCourse(); }, [fetchCourse]);

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
    { id: 'sections' as TabType, label: 'Lớp học', icon: Users },
    { id: 'enrollments' as TabType, label: 'Sinh viên', icon: Users },
    { id: 'exams' as TabType, label: 'Đề thi', icon: BookOpen },
    { id: 'results' as TabType, label: 'Kết quả', icon: BarChart3 },
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
          Quay lại
        </button>

        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {course.code} — {course.name}
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              {course.teacher ? `GV: ${course.teacher.name}` : 'Chưa gán giảng viên'}
            </p>
          </div>
          <span className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold border ${
            course.status === 'ACTIVE'
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-slate-100 text-slate-600 border-slate-200'
          }`}>
            <span className="inline-flex items-center gap-1">
              {course.status === 'ACTIVE' && <Check className="w-3 h-3" />}
              {course.status === 'ACTIVE' ? 'Hoạt động' : course.status}
            </span>
          </span>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 py-3 px-4 text-sm font-semibold border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'sections' && <SectionsTab courseId={courseId} />}
        {activeTab === 'enrollments' && <EnrollmentsTab courseId={courseId} />}
        {activeTab === 'exams' && <ExamsTab courseId={courseId} />}
        {activeTab === 'results' && <ResultsTab courseId={courseId} />}
      </div>
    </div>
  );
}

// Inline imports to avoid issues
import SectionsTab from './sections/SectionsClient';
import EnrollmentsTab from './enrollments/EnrollmentsClient';
import ExamsTab from './exams/ExamListClient';

function ResultsTab({ courseId }: { courseId: string }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
      <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
        <BarChart3 className="w-8 h-8 text-slate-400" />
      </div>
      <h3 className="text-lg font-bold text-slate-700">Kết quả thi vấn đáp</h3>
      <p className="text-sm text-slate-500 mt-2">
        Xem kết quả và xuất báo cáo theo từng ca thi.
      </p>
      <Link
        href="/results"
        className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl transition"
      >
        <BarChart3 className="w-4 h-4" />
        Xem tất cả kết quả
      </Link>
    </div>
  );
}
