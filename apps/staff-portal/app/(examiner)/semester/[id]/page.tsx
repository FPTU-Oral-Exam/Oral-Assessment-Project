import { requireRole } from '@/lib/auth';
import SemesterDetailClient from './SemesterDetailClient';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function SemesterDetailPage({ params }: PageProps) {
  await requireRole(['EXAMINER', 'SYSTEM_ADMIN']);
  const { id } = await params;
  return <SemesterDetailClient semesterId={id} />;
}
