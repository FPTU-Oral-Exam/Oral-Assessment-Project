import { requireRole } from '@/lib/auth';
import SectionsClient from './SectionsClient';

interface PageProps {
  params: { id: string };
}

export default async function SectionsPage({ params }: PageProps) {
  await requireRole(['EXAMINER']);

  return <SectionsClient courseId={params.id} />;
}
