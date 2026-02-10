import { auth } from './auth';
import { queryOne } from './db';
import { redirect } from 'next/navigation';

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  orgId: string;
  orgName: string;
  role: string;
}

export async function requireUser(): Promise<SessionUser> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/login');
  }

  const membership = await queryOne<{
    org_id: string;
    org_name: string;
    role: string;
  }>(
    `SELECT m.org_id, o.name as org_name, m.role
     FROM memberships m
     JOIN organizations o ON o.id = m.org_id
     WHERE m.user_id = $1
     LIMIT 1`,
    [session.user.id]
  );

  if (!membership) {
    redirect('/login');
  }

  return {
    id: session.user.id,
    email: session.user.email ?? '',
    name: session.user.name ?? '',
    orgId: membership.org_id,
    orgName: membership.org_name,
    role: membership.role,
  };
}
