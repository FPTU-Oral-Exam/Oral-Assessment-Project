import { requireRole } from '@/lib/auth';
import CourseDetailClient from './CourseDetailClient';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function CourseDetailPage({ params }: PageProps) {
  await requireRole(['EXAMINER', 'SYSTEM_ADMIN']);
  const { id } = await params;

  return <CourseDetailClient courseId={id} />;
}
