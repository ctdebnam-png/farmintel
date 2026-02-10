import { requireUser } from '@/lib/session';
import { AppShell } from '@/components/app-shell';
import { SessionProvider } from 'next-auth/react';

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  return (
    <SessionProvider>
      <AppShell
        user={{
          name: user.name,
          email: user.email,
          orgName: user.orgName,
        }}
      >
        {children}
      </AppShell>
    </SessionProvider>
  );
}
