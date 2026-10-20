import React from 'react';
import { requireRole } from '@/lib/auth';
import { AcademicProvider } from '@/context/AcademicContext';

export const dynamic = 'force-dynamic';

export default async function AcademyRouteGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 1. Phân quyền tập trung cho toàn bộ phân hệ Khảo thí & Học thuật
  await requireRole(['SYSTEM_ADMIN', 'ACADEMY', 'TEACHER']);

  // 2. AcademicProvider duy nhất duy trì in-memory cache giữa các tab
  return (
    <AcademicProvider>
      <div className="w-full">
        {children}
      </div>
    </AcademicProvider>
  );
}
