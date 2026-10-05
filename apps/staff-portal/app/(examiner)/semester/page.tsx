import { requireRole } from '@/lib/auth';
import SemesterListClient from './SemesterListClient';

export default async function SemesterPage() {
  await requireRole(['EXAMINER', 'SYSTEM_ADMIN']);

  return <SemesterListClient />;
}
