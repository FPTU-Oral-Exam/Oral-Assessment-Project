'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUser } from '@/hooks/useUser';
import {
  LayoutDashboard,
  Users,
  Settings,
  FileText,
  ClipboardList,
  Calendar,
  GraduationCap,
  CheckCircle,
  BookOpen,
  Award,
  Radio,
  Sparkles,
} from 'lucide-react';

const menuItems: Record<string, { href: string; label: string; icon: typeof LayoutDashboard }[]> = {
  SYSTEM_ADMIN: [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/users', label: 'Quản lý người dùng', icon: Users },
    { href: '/settings', label: 'Cấu hình hệ thống', icon: Settings },
    { href: '/audit', label: 'Nhật ký kiểm toán', icon: FileText },
  ],

  EXAMINER: [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/semester', label: 'Quản lý học kỳ', icon: Calendar },
    { href: '/courses', label: 'Quản lý môn học', icon: BookOpen },
    { href: '/exams', label: 'Quản lý kỳ thi', icon: ClipboardList },
    { href: '/schedule', label: 'Lịch thi vấn đáp', icon: Calendar },
    { href: '/proctor', label: 'Coi thi & Giám sát', icon: Radio },
    { href: '/students', label: 'Danh sách thí sinh', icon: GraduationCap },
    { href: '/results', label: 'Phê duyệt kết quả', icon: CheckCircle },
  ],
  TEACHER: [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/courses', label: 'Môn học phụ trách', icon: BookOpen },
    { href: '/proctor', label: 'Coi thi & Giám sát', icon: Radio },
    { href: '/grading', label: 'Đánh giá & Chấm bài', icon: Award },
  ],
};

export default function Sidebar() {
  const { user } = useUser();
  const pathname = usePathname();

  if (!user) return null;

  // Merge menus for users with multiple roles
  const items = user.roles.flatMap(role => menuItems[role] || []);
  const uniqueItems = items.filter((item, index, self) =>
    index === self.findIndex(t => t.href === item.href)
  );

  return (
    <aside className="w-64 bg-slate-900 text-slate-100 flex flex-col h-full border-r border-slate-800 flex-shrink-0 select-none">
      {/* Brand Header */}
      <div className="h-16 px-6 flex items-center gap-3 border-b border-slate-800/80 bg-slate-950/40">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-base font-bold tracking-tight text-white leading-tight">OralAI</h1>
          <p className="text-[11px] font-medium text-slate-400">Staff Portal 2026</p>
        </div>
      </div>

      {/* Nav Menu */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
          Điều hướng chính
        </div>
        {uniqueItems.map(item => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-semibold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <item.icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer Role Badge */}
      <div className="p-4 border-t border-slate-800/80 bg-slate-950/30">
        <div className="flex items-center gap-2.5">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-medium text-slate-300">
            {user.roles.includes('SYSTEM_ADMIN')
              ? 'Quản trị hệ thống'
              : user.roles.includes('EXAMINER')
              ? 'Cán bộ Khảo thí'
              : 'Giảng viên Chấm thi'}
          </span>
        </div>
      </div>
    </aside>
  );
}
