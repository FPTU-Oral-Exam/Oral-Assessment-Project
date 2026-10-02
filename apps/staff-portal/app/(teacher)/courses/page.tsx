import { requireRole } from '@/lib/auth';

export default async function CoursesPage() {
  await requireRole(['TEACHER']);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Quản lý môn học</h1>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg">
          Tạo môn học mới
        </button>
      </div>
      <p className="text-gray-600">Danh sách môn học sẽ hiển thị ở đây...</p>
    </div>
  );
}
