import CourseWorkspaceClient from './CourseWorkspaceClient';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function CourseDetailPage({ params }: PageProps) {
  const { id } = await params;
  return <CourseWorkspaceClient courseId={id} />;
}
