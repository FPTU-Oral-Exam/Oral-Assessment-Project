import { getUser } from '@/lib/auth';
import CourseWorkspaceClient from './CourseWorkspaceClient';
import CourseDetailClient from '@/app/(examiner)/courses/[id]/CourseDetailClient';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function CourseDetailPage({ params }: PageProps) {
  const { id } = await params;
  const user = await getUser();

  const isExaminerOrAdmin = user?.roles?.some(r => r === 'EXAMINER' || r === 'SYSTEM_ADMIN');

  if (isExaminerOrAdmin) {
    return <CourseDetailClient courseId={id} />;
  }

  return <CourseWorkspaceClient courseId={id} />;
}
