import { requireRole } from '@/lib/auth';
import { AcademicProvider } from '@/context/AcademicContext';
import QuestionTypesClient from './QuestionTypesClient';

export const metadata = {
  title: 'Cấu hình Dạng bài Speaking | OralAI Staff Portal',
  description: 'Quản lý quy chuẩn 4 dạng câu hỏi thi vấn đáp học thuật ENTs / Oral Assessment FPTU',
};

export default async function QuestionTypesPage() {
  await requireRole(['ACADEMY', 'SYSTEM_ADMIN']);

  return (
    <AcademicProvider>
      <QuestionTypesClient />
    </AcademicProvider>
  );
}
