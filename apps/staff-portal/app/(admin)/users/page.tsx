import { requireRole } from '@/lib/auth';
import { api } from '@oralai/shared';

export default async function UsersPage() {
  await requireRole(['SYSTEM_ADMIN']);

  const users = await api<any[]>('/api/admin/users');

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Quản lý người dùng</h1>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg">
          Thêm người dùng
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-medium">Tên đăng nhập</th>
              <th className="px-6 py-3 text-left text-sm font-medium">Họ tên</th>
              <th className="px-6 py-3 text-left text-sm font-medium">Vai trò</th>
              <th className="px-6 py-3 text-left text-sm font-medium">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id} className="border-t">
                <td className="px-6 py-4">{user.username}</td>
                <td className="px-6 py-4">{user.name}</td>
                <td className="px-6 py-4">{user.role}</td>
                <td className="px-6 py-4">
                  <button className="text-blue-600 hover:underline">Sửa</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
