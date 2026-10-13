import React from 'react';
import ExamMatrixClient from './ExamMatrixClient';
import { AcademicProvider } from '@/context/AcademicContext';

export const metadata = {
  title: 'Ma trận Đề thi & Ra đề · OralAI Academic',
  description: 'Cấu hình ma trận đề thi khảo thí 6 dạng PTE và thẩm định sức khỏe kho đề',
};

export default function ExamMatrixPage() {
  return (
    <AcademicProvider>
      <ExamMatrixClient />
    </AcademicProvider>
  );
}
