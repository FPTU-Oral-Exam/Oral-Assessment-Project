'use client';

import { useUser } from '@/hooks/useUser';
import { LogOut, User } from 'lucide-react';

export default function Header() {
  const { user } = useUser();

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  };

  return (
    <header className="h-16 bg-white border-b flex items-center justify-between px-6">
      <div className="text-sm text-gray-500">
        {/* Breadcrumb could go here */}
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <User size={20} />
          <span className="font-medium">{user?.name || user?.username}</span>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-gray-600 hover:text-red-600"
        >
          <LogOut size={20} />
        </button>
      </div>
    </header>
  );
}
