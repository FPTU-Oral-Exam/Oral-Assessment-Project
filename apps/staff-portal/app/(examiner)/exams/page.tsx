import { requireRole } from '@/lib/auth';

export default async function ExamsPage() {
  await requireRole(['EXAMINER']);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Quản lý kỳ thi</h1>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg">
          Tạo kỳ thi mới
        </button>
      </div>
      <p className="text-gray-600">Danh sách kỳ thi sẽ hiển thị ở đây...</p>
    </div>
  );
}
