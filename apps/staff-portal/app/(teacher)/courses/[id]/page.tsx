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
      const isAcademy = roles.includes('ACADEMY');
      const isExaminer = roles.includes('EXAMINER');
      const isTeacher = roles.includes('TEACHER');
      const isAdmin = roles.includes('SYSTEM_ADMIN');

      // Explicit view query param override
      if (sp.view === 'examiner' && (isExaminer || isAdmin)) {
        return <CourseDetailClient courseId={id} />;
      }
      if ((sp.view === 'academy' || sp.view === 'teacher') && (isAcademy || isTeacher || isAdmin)) {
        return <CourseWorkspaceClient courseId={id} />;
      }

      // Examiner-only role gets CourseDetailClient (shifts, classes, slots)
      if (isExaminer && !isAcademy && !isAdmin) {
        return <CourseDetailClient courseId={id} />;
      }

      // Default: Academy Workspace (LO, Rubric, Item Bank, Blueprint)
      return <CourseWorkspaceClient courseId={id} />;
    }

