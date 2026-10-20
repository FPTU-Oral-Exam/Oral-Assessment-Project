import React from 'react';
import { QuestionTypesManager } from '@/components/academic';

export const metadata = {
  title: 'Cấu hình Dạng bài Speaking | OralAI Staff Portal',
  description: 'Quản lý quy chuẩn 4 dạng câu hỏi thi vấn đáp học thuật ENTs / Oral Assessment FPTU',
};

export default function QuestionTypesPage() {
  return <QuestionTypesManager />;
}
