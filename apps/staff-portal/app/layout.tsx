import type { Metadata } from 'next';
import { UserProvider } from '@/hooks/useUser';
import { getUser } from '@/lib/auth';
import PortalShell from '@/components/PortalShell';
import './globals.css';

export const metadata: Metadata = {
  title: 'Staff Portal - OralAI',
  description: 'AI Oral Assessment Platform for Teachers and Examiners',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();

  return (
    <html lang="vi">
      <body className="antialiased bg-slate-50 text-slate-900 min-h-screen">
        <UserProvider user={user}>
          <PortalShell>{children}</PortalShell>
        </UserProvider>
      </body>
    </html>
  );
}
