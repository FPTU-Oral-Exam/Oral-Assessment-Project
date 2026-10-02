import { requireUser } from '@/lib/auth';

export default async function DashboardPage() {
  const user = await requireUser();

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      <div className="bg-white p-6 rounded-lg shadow">
        <p>Xin chào, <strong>{user.name}</strong></p>
        <p className="text-gray-600 mt-2">Vai trò: {user.roles.join(', ')}</p>
      </div>
    </div>
  );
}
