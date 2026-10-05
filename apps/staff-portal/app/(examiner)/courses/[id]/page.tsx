import { requireRole } from '@/lib/auth';
import CourseDetailClient from './CourseDetailClient';

interface PageProps {
  params: { id: string };
}

export default async function CourseDetailPage({ params }: PageProps) {
  await requireRole(['EXAMINER']);

  return <CourseDetailClient courseId={params.id} />;
}
