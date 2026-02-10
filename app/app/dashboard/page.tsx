import Link from 'next/link';
import { requireUser } from '@/lib/session';
import { listCampaigns } from '@/lib/data/campaigns';

export default async function DashboardPage() {
  const user = await requireUser();
  const campaigns = await listCampaigns(user.orgId);

  return (
    <div className="p-6 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">
            Overview of your area farming campaigns
          </p>
        </div>
        <Link
          href="/app/campaigns/new"
          className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 transition-colors"
        >
          New Campaign
        </Link>
      </div>

      {campaigns.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 p-12 text-center">
          <p className="text-gray-500">No campaigns yet.</p>
          <Link
            href="/app/campaigns/new"
            className="mt-2 inline-block text-sm text-brand-600 hover:text-brand-700"
          >
            Create your first campaign
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {campaigns.map((c) => (
            <Link
              key={c.id}
              href={`/app/campaigns/${c.id}`}
              className="block rounded-lg border border-gray-200 bg-white p-4 hover:border-brand-300 hover:shadow-sm transition-all"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-gray-900">{c.name}</h2>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {c.county ? `${c.county}, ${c.state}` : 'No county set'} &middot;{' '}
                    {c.goal_type} &middot; {c.geography_type?.replace('_', ' ')}
                  </p>
                </div>
                <div className="text-right text-sm">
                  <span className="text-gray-500">
                    {c.run_count ?? 0} run{(c.run_count ?? 0) !== 1 ? 's' : ''}
                  </span>
                  {c.latest_run_status && (
                    <span
                      className={`ml-2 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                        c.latest_run_status === 'complete'
                          ? 'bg-green-100 text-green-700'
                          : c.latest_run_status === 'running'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {c.latest_run_status}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
