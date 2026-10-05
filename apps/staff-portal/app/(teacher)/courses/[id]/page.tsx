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
  const isAdmin = roles.includes('SYSTEM_ADMIN');

  // Explicit view query param override
  if (sp.view === 'examiner' && (isExaminer || isAdmin)) {
    return <CourseDetailClient courseId={id} />;
  }
  if (sp.view === 'teacher' && (isTeacher || isAdmin)) {
    return <CourseWorkspaceClient courseId={id} />;
  }

  // Examiner-specific view
  if ((isExaminer && !isTeacher) || (isAdmin && !isTeacher)) {
    return <CourseDetailClient courseId={id} />;
  }

  // Default: Teacher CourseWorkspaceClient (for teachers, dual-role teachers, etc.)
  return <CourseWorkspaceClient courseId={id} />;
}

