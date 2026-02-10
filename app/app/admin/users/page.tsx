import { requireUser } from '@/lib/session';
import { query, execute } from '@/lib/db';
import { redirect } from 'next/navigation';
import crypto from 'crypto';

function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
}

export default async function AdminUsersPage() {
  const user = await requireUser();

  if (user.role !== 'admin') {
    redirect('/app/dashboard');
  }

  const members = await query(
    `SELECT u.id, u.email, u.name, m.role, m.created_at
     FROM memberships m
     JOIN users u ON u.id = m.user_id
     WHERE m.org_id = $1
     ORDER BY m.created_at`,
    [user.orgId]
  );

  async function handleInvite(formData: FormData) {
    'use server';
    const u = await requireUser();
    if (u.role !== 'admin') return;

    const email = formData.get('email') as string;
    const name = formData.get('name') as string;
    const role = (formData.get('role') as string) || 'member';
    const password = formData.get('password') as string;

    if (!email || !password) return;

    const salt = crypto.randomBytes(16).toString('hex');
    const hash = hashPassword(password, salt);

    // Create user
    const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
    let userId: string;
    if (existing.length > 0) {
      userId = existing[0].id;
    } else {
      const result = await query(
        `INSERT INTO users (email, name, password_hash, password_salt) VALUES ($1, $2, $3, $4) RETURNING id`,
        [email, name || null, hash, salt]
      );
      userId = result[0].id;
    }

    // Create membership
    await execute(
      `INSERT INTO memberships (user_id, org_id, role) VALUES ($1, $2, $3) ON CONFLICT (user_id, org_id) DO UPDATE SET role = $3`,
      [userId, u.orgId, role]
    );

    redirect('/app/admin/users');
  }

  async function handleRemove(formData: FormData) {
    'use server';
    const u = await requireUser();
    if (u.role !== 'admin') return;
    const memberId = formData.get('userId') as string;
    if (memberId === u.id) return; // Cannot remove self
    await execute(
      'DELETE FROM memberships WHERE user_id = $1 AND org_id = $2',
      [memberId, u.orgId]
    );
    redirect('/app/admin/users');
  }

  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Team Members</h1>

      {/* Current Members */}
      <div className="rounded-lg border border-gray-200 bg-white mb-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="px-4 py-3 text-left font-medium text-gray-500">Name</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Email</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Role</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {members.map((m: any) => (
              <tr key={m.id} className="border-b border-gray-100">
                <td className="px-4 py-3 text-gray-900">{m.name || '-'}</td>
                <td className="px-4 py-3 text-gray-600">{m.email}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    m.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {m.role}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  {m.id !== user.id && (
                    <form action={handleRemove} className="inline">
                      <input type="hidden" name="userId" value={m.id} />
                      <button type="submit" className="text-xs text-red-500 hover:text-red-700">
                        Remove
                      </button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Member */}
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Add Team Member</h2>
        <form action={handleInvite} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500">Email</label>
              <input
                name="email"
                type="email"
                required
                className="mt-1 block w-full rounded border border-gray-300 px-3 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500">Name</label>
              <input
                name="name"
                className="mt-1 block w-full rounded border border-gray-300 px-3 py-1.5 text-sm"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500">Password</label>
              <input
                name="password"
                type="password"
                required
                className="mt-1 block w-full rounded border border-gray-300 px-3 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500">Role</label>
              <select
                name="role"
                className="mt-1 block w-full rounded border border-gray-300 px-3 py-1.5 text-sm"
              >
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
          <button
            type="submit"
            className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 transition-colors"
          >
            Add Member
          </button>
        </form>
      </div>
    </div>
  );
}
