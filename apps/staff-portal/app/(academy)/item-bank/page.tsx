import React from 'react';
import ItemBankClient from './ItemBankClient';
import { AcademicProvider } from '@/context/AcademicContext';

export const metadata = {
  title: 'Ngân hàng Đề thi & Câu hỏi PTE · OralAI Academic',
  description: 'Quản lý ngân hàng câu hỏi khảo thí vấn đáp 6 dạng chuẩn PTE',
};

export default function ItemBankPage() {
  return (
    <AcademicProvider>
      <ItemBankClient />
    </AcademicProvider>
  );
}
