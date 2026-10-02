import { requireUser } from '@/lib/auth';
import Link from 'next/link';
import {
  BookOpen,
  FileCheck2,
  Users,
  Award,
  Sparkles,
  Server,
  Database,
  Radio,
  ArrowRight,
} from 'lucide-react';

export default async function DashboardPage() {
  const user = await requireUser();

  const isTeacher = user.roles.includes('TEACHER');
  const isExaminer = user.roles.includes('EXAMINER');
  const isAdmin = user.roles.includes('SYSTEM_ADMIN');

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-8 text-white shadow-xl">
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-semibold text-white mb-4 border border-white/20">
            <Sparkles className="w-3.5 h-3.5" />
            <span>OralAI Assessment System v2.0</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">
            Xin chào, {user.name || user.username}!
          </h1>
          <p className="mt-2 text-blue-100 text-sm max-w-2xl leading-relaxed">
            Chào mừng bạn đến với Cổng điều hành thi vấn đáp thông minh. Hệ thống đã đồng bộ toàn bộ pipeline STT PhoWhisper và công cụ đối chiếu Rubric tự động.
          </p>
        </div>

        {/* Decorative background shapes */}
        <div className="absolute right-0 top-0 -mt-10 -mr-10 w-64 h-64 rounded-full bg-white/10 blur-2xl pointer-events-none" />
        <div className="absolute right-40 bottom-0 -mb-10 w-48 h-48 rounded-full bg-indigo-400/20 blur-xl pointer-events-none" />
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Môn học phụ trách</span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <BookOpen className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-2xl font-bold text-slate-900">4</span>
            <span className="text-xs text-emerald-600 font-semibold ml-2">Đang hoạt động</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Bài thi cần duyệt</span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <FileCheck2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-2xl font-bold text-slate-900">12</span>
            <span className="text-xs text-amber-600 font-semibold ml-2">Chờ giảng viên xem</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Thí sinh đã thi</span>
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-2xl font-bold text-slate-900">128</span>
            <span className="text-xs text-purple-600 font-semibold ml-2">Sinh viên</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Điểm trung bình AI</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Award className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-2xl font-bold text-slate-900">7.8</span>
            <span className="text-xs text-slate-400 font-medium ml-1">/ 10.0</span>
          </div>
        </div>
      </div>

      {/* Quick Actions & System Pipeline Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Links Column */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <h2 className="text-base font-bold text-slate-900">Thao tác nhanh cho {isTeacher ? 'Giảng viên' : isExaminer ? 'Khảo thí' : 'Quản trị viên'}</h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {isTeacher && (
              <>
                <Link
                  href="/courses"
                  className="flex items-center justify-between p-4 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/40 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                      <BookOpen className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-600">Quản lý Môn học</h3>
                      <p className="text-xs text-slate-500">Xem và nạp giáo trình RAG</p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 group-hover:text-blue-600 transition-all" />
                </Link>

                <Link
                  href="/rubrics"
                  className="flex items-center justify-between p-4 rounded-xl border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/40 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
                      <Award className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600">Khung Rubric</h3>
                      <p className="text-xs text-slate-500">Barem tiêu chuẩn chấm thi</p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 group-hover:text-indigo-600 transition-all" />
                </Link>
              </>
            )}

            {isExaminer && (
              <>
                <Link
                  href="/exams"
                  className="flex items-center justify-between p-4 rounded-xl border border-slate-200 hover:border-purple-400 hover:bg-purple-50/40 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center">
                      <FileCheck2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 group-hover:text-purple-600">Kỳ thi vấn đáp</h3>
                      <p className="text-xs text-slate-500">Quản lý danh sách ca thi</p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 group-hover:text-purple-600 transition-all" />
                </Link>
              </>
            )}

            {isAdmin && (
              <>
                <Link
                  href="/users"
                  className="flex items-center justify-between p-4 rounded-xl border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/40 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                      <Users className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 group-hover:text-emerald-600">Quản lý Người dùng</h3>
                      <p className="text-xs text-slate-500">Phân quyền 4 vai trò</p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 group-hover:text-emerald-600 transition-all" />
                </Link>
              </>
            )}
          </div>
        </div>

        {/* AI Infrastructure Status Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Radio className="w-4 h-4 text-emerald-500 animate-pulse" />
            <span>Hạ tầng AI & Storage</span>
          </h2>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
              <div className="flex items-center gap-2.5">
                <Server className="w-4 h-4 text-slate-500" />
                <span className="text-xs font-semibold text-slate-700">PhoWhisper Celery Worker</span>
              </div>
              <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                ACTIVE
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
              <div className="flex items-center gap-2.5">
                <Database className="w-4 h-4 text-slate-500" />
                <span className="text-xs font-semibold text-slate-700">MinIO S3 Audio Storage</span>
              </div>
              <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                PORT 9001
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
              <div className="flex items-center gap-2.5">
                <Database className="w-4 h-4 text-slate-500" />
                <span className="text-xs font-semibold text-slate-700">PostgreSQL pgvector</span>
              </div>
              <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                768-DIM
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
