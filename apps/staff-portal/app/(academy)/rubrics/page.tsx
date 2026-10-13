import React from 'react';
import RubricsClient from './RubricsClient';
import { AcademicProvider } from '@/context/AcademicContext';

export const metadata = {
  title: 'Tiêu chuẩn Rubrics · OralAI Academic',
  description: 'Quản lý bộ tiêu chuẩn Rubrics chấm điểm vấn đáp đa chiều theo chuẩn PTE',
};

export default function RubricsPage() {
  return (
    <AcademicProvider>
      <RubricsClient />
    </AcademicProvider>
  );
}
