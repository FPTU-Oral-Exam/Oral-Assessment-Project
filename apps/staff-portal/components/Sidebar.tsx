'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUser } from '@/hooks/useUser';
import { LayoutDashboard, Users, Settings, FileText, ClipboardList, Calendar, GraduationCap, CheckCircle, BookOpen, Star } from 'lucide-react';

const menuItems: Record<string, { href: string; label: string; icon: typeof LayoutDashboard }[]> = {
  SYSTEM_ADMIN: [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/users', label: 'Người dùng', icon: Users },
    { href: '/settings', label: 'Cấu hình', icon: Settings },
    { href: '/audit', label: 'Nhật ký', icon: FileText },
  ],
  EXAMINER: [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/exams', label: 'Kỳ thi', icon: ClipboardList },
    { href: '/schedule', label: 'Lịch thi', icon: Calendar },
    { href: '/students', label: 'Sinh viên', icon: GraduationCap },
    { href: '/results', label: 'Kết quả', icon: CheckCircle },
  ],
  TEACHER: [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/courses', label: 'Môn học', icon: BookOpen },
    { href: '/rubrics', label: 'Rubric', icon: FileText },
    { href: '/grading', label: 'Chấm bài', icon: Star },
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
    <aside className="w-64 bg-gray-900 text-white">
      <div className="p-4 border-b border-gray-800">
        <h1 className="text-xl font-bold">OralAI</h1>
        <p className="text-sm text-gray-400">Staff Portal</p>
      </div>
      <nav className="p-4">
        {uniqueItems.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg mb-2 transition-colors ${
              pathname === item.href
                ? 'bg-blue-600 text-white'
                : 'text-gray-300 hover:bg-gray-800'
            }`}
          >
            <item.icon size={20} />
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
