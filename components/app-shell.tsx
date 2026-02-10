'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { clsx } from 'clsx';

const navItems = [
  { label: 'Dashboard', href: '/app/dashboard' },
  { label: 'Campaigns', href: '/app/campaigns' },
  { label: 'Admin', href: '/app/admin/users' },
];

export function AppShell({
  children,
  user,
}: {
  children: React.ReactNode;
  user: { name: string; email: string; orgName: string };
}) {
  const pathname = usePathname();

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <aside className="w-56 bg-brand-900 text-white flex flex-col">
        <div className="p-4 border-b border-brand-800">
          <h1 className="text-lg font-bold">FarmIntel</h1>
          <p className="text-xs text-brand-300 mt-0.5">{user.orgName}</p>
        </div>

        <nav className="flex-1 p-2 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                'block rounded-md px-3 py-2 text-sm font-medium transition-colors',
                pathname.startsWith(item.href)
                  ? 'bg-brand-700 text-white'
                  : 'text-brand-200 hover:bg-brand-800 hover:text-white'
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-brand-800">
          <p className="text-sm font-medium truncate">{user.name}</p>
          <p className="text-xs text-brand-300 truncate">{user.email}</p>
          <button
            onClick={() => signOut({ callbackUrl: '/' })}
            className="mt-2 text-xs text-brand-400 hover:text-white transition-colors"
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto bg-gray-50">
        {children}
      </main>
    </div>
  );
}
