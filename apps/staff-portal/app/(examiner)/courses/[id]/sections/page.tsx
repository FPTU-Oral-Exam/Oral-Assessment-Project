import { requireRole } from '@/lib/auth';
import SectionsClient from './SectionsClient';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function SectionsPage({ params }: PageProps) {
  await requireRole(['EXAMINER', 'SYSTEM_ADMIN']);
  const { id } = await params;

  return <SectionsClient courseId={id} />;
}
