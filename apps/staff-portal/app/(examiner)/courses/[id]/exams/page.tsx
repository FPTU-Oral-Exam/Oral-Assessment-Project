import { requireRole } from '@/lib/auth';
import ExamSlotsClient from './ExamSlotsClient';

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ examId?: string }>;
}

export default async function ExamSlotsPage({ params, searchParams }: PageProps) {
  await requireRole(['EXAMINER', 'SYSTEM_ADMIN']);
  const { id } = await params;
  const sp = searchParams ? await searchParams : {};
  return <ExamSlotsClient courseId={id} initialExamId={sp.examId} />;
}

