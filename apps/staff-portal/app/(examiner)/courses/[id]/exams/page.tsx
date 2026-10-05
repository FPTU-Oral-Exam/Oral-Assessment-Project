import { requireRole } from '@/lib/auth';
import ExamSlotsClient from './ExamSlotsClient';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ExamSlotsPage({ params }: PageProps) {
  await requireRole(['EXAMINER', 'SYSTEM_ADMIN']);
  const { id } = await params;
  return <ExamSlotsClient examId={id} />;
}
