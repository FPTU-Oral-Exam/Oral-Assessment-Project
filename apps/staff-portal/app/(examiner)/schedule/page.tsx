import { requireRole } from '@/lib/auth';
import ScheduleClient from './ScheduleClient';

export default async function SchedulePage() {
  await requireRole(['EXAMINER', 'SYSTEM_ADMIN']);

  return <ScheduleClient />;
}
