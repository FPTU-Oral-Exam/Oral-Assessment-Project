'use client';

import { useUser } from '@/hooks/useUser';
import { LogOut, User as UserIcon, Shield } from 'lucide-react';

export default function Header() {
  const { user } = useUser();

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // Ignore network errors on logout
    }
    // Clear user cookie
    document.cookie = 'user=; path=/; max-age=0; SameSite=Lax';
    window.location.href = '/login';
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200/80 flex items-center justify-between px-6 shadow-xs select-none">
      <div className="flex items-center gap-2">
        <Shield className="w-4 h-4 text-blue-600" />
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          FPT University &bull; AI Oral Assessment
        </span>
      </div>

      <div className="flex items-center gap-4">
        {/* User Info Capsule */}
        <div className="flex items-center gap-3 pl-3 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-full">
          <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
            <UserIcon className="w-4 h-4" />
          </div>
          <div className="flex flex-col text-left">
            <span className="text-xs font-bold text-slate-800 leading-tight">
              {user?.name || user?.username || 'Cán bộ'}
            </span>
            <span className="text-[10px] text-slate-500 font-medium leading-none">
              @{user?.username}
            </span>
          </div>
        </div>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          title="Đăng xuất khỏi hệ thống"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-red-600 hover:bg-red-50 border border-slate-200 hover:border-red-200 transition-colors cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Đăng xuất</span>
        </button>
      </div>
    </header>
  );
}
