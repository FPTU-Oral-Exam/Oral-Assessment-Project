'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShieldAlert, ArrowLeft, LogOut, UserCheck } from 'lucide-react';
import { useUser } from '@/hooks/useUser';

export default function UnauthorizedPage() {
  const router = useRouter();
  const { user } = useUser();

  const handleLogout = () => {
    document.cookie = 'user=; path=/; max-age=0; SameSite=Lax';
    window.location.href = '/login';
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-900 px-4 py-12">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden text-center">
        {/* Header Icon */}
        <div className="bg-gradient-to-r from-rose-500 to-amber-600 p-8 text-white">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/10 rounded-2xl backdrop-blur-sm mb-3 border border-white/20 shadow-inner">
            <ShieldAlert className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Quyền truy cập bị từ chối</h1>
          <p className="text-rose-100 text-sm mt-1 font-medium">403 Forbidden - Role Permission Required</p>
        </div>

        {/* Content Body */}
        <div className="p-8 space-y-6">
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 text-left">
            <p className="text-xs uppercase font-bold text-slate-400 tracking-wider mb-1">Tài khoản hiện tại</p>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-slate-800 text-sm">{user?.name || user?.username || 'Chưa xác định'}</p>
                <p className="text-xs text-slate-500">Vai trò: <span className="font-medium text-blue-600">{user?.roles?.join(', ') || 'N/A'}</span></p>
              </div>
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <UserCheck className="w-4 h-4" />
              </div>
            </div>
          </div>

          <p className="text-sm text-slate-600 leading-relaxed text-left">
            Bạn không có quyền truy cập vào đường dẫn vừa yêu cầu.
            <br /><br />
            <strong>Gợi ý phân quyền OralAI:</strong>
            <br />• <strong>Giám thị / Khảo thí</strong> (Quản lý ca thi, Lịch thi, Thí sinh): Đăng nhập bằng tài khoản role <code>EXAMINER</code> (ví dụ: <code>examiner1</code>).
            <br />• <strong>Giảng viên chấm thi</strong> (Môn học, Rubric, Chấm bài): Đăng nhập bằng tài khoản role <code>TEACHER</code> (ví dụ: <code>teacher1</code>).
            <br />• <strong>Quản trị viên</strong>: Đăng nhập bằng tài khoản <code>admin</code>.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
            <Link
              href="/dashboard"
              className="w-full sm:w-1/2 flex items-center justify-center gap-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-all shadow-md shadow-blue-500/20"
            >
              <ArrowLeft className="w-4 h-4" />
              Về Dashboard
            </Link>
            <button
              onClick={handleLogout}
              className="w-full sm:w-1/2 flex items-center justify-center gap-2 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold transition-all"
            >
              <LogOut className="w-4 h-4" />
              Đổi tài khoản khác
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
