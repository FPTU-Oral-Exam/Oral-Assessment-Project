import React from 'react';
import ItemBankClient from './ItemBankClient';
import { AcademicProvider } from '@/context/AcademicContext';

export const metadata = {
  title: 'Ngân hàng Đề thi & Câu hỏi ENTs · OralAI Academic',
  description: 'Quản lý ngân hàng câu hỏi khảo thí vấn đáp 4 dạng chuẩn ENTs FPTU',
};

export default function ItemBankPage() {
  return (
    <AcademicProvider>
      <ItemBankClient />
    </AcademicProvider>
  );
}
