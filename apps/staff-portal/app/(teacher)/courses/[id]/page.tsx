import { getUser } from '@/lib/auth';
import CourseWorkspaceClient from './CourseWorkspaceClient';
import CourseDetailClient from '@/app/(examiner)/courses/[id]/CourseDetailClient';

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ view?: string }>;
}

export default async function CourseDetailPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const sp = searchParams ? await searchParams : {};
  const user = await getUser();

  const roles = user?.roles || [];
  const isExaminer = roles.includes('EXAMINER');
  const isTeacher = roles.includes('TEACHER');

  // Allow explicitly switching view via query param ?view=examiner or ?view=teacher
  if (sp.view === 'examiner' && (isExaminer || roles.includes('SYSTEM_ADMIN'))) {
    return <CourseDetailClient courseId={id} />;
  }
  if (sp.view === 'teacher' && (isTeacher || roles.includes('SYSTEM_ADMIN'))) {
    return <CourseWorkspaceClient courseId={id} />;
  }

  // If examiner (and not teacher), show Examiner CourseDetailClient
  if (isExaminer && !isTeacher) {
    return <CourseDetailClient courseId={id} />;
  }

  // Default: show Teacher CourseWorkspaceClient (for teachers, admins)
  return <CourseWorkspaceClient courseId={id} />;
}

