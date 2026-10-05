import { requireRole } from '@/lib/auth';
import SlotResultsClient from './SlotResultsClient';

interface PageProps {
  params: Promise<{ slot_id: string }>;
}

export default async function SlotResultsPage({ params }: PageProps) {
  await requireRole(['EXAMINER']);
  const { slot_id } = await params;
  return <SlotResultsClient slotId={slot_id} />;
}
