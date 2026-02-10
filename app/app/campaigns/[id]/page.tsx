import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { requireUser } from '@/lib/session';
import { getCampaign, updateCampaignWeights } from '@/lib/data/campaigns';
import { listRuns, createRun } from '@/lib/data/runs';

export default async function CampaignPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await requireUser();
  const campaign = await getCampaign(params.id, user.orgId);
  if (!campaign) notFound();

  const runs = await listRuns(campaign.id);

  async function handleNewRun(formData: FormData) {
    'use server';
    const u = await requireUser();
    const c = await getCampaign(params.id, u.orgId);
    if (!c) return;
    const run = await createRun({
      campaignId: c.id,
      name: (formData.get('name') as string) || undefined,
    });
    redirect(`/app/runs/${run.id}`);
  }

  async function handleUpdateWeights(formData: FormData) {
    'use server';
    const u = await requireUser();
    await updateCampaignWeights(params.id, u.orgId, {
      weight_tenure: parseFloat(formData.get('weight_tenure') as string) || 0.25,
      weight_transfer_density: parseFloat(formData.get('weight_transfer_density') as string) || 0.2,
      weight_owner_occupancy: parseFloat(formData.get('weight_owner_occupancy') as string) || 0.25,
      weight_value_band: parseFloat(formData.get('weight_value_band') as string) || 0.2,
      penalty_renter: parseFloat(formData.get('penalty_renter') as string) || 0.1,
    });
    redirect(`/app/campaigns/${params.id}`);
  }

  return (
    <div className="p-6 max-w-5xl">
      <div className="mb-6">
        <Link href="/app/dashboard" className="text-sm text-brand-600 hover:text-brand-700">
          &larr; Dashboard
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">{campaign.name}</h1>
        <p className="text-sm text-gray-500 mt-1">
          {campaign.county ? `${campaign.county}, ${campaign.state}` : 'No county set'} &middot;{' '}
          {campaign.goal_type} &middot; {campaign.geography_type?.replace('_', ' ')}
        </p>
      </div>

      {/* Scoring Weights */}
      <div className="rounded-lg border border-gray-200 bg-white p-4 mb-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Scoring Weights</h2>
        <form action={handleUpdateWeights} className="grid grid-cols-5 gap-3">
          <div>
            <label className="block text-xs text-gray-500">Tenure</label>
            <input
              name="weight_tenure"
              type="number"
              step="0.01"
              min="0"
              max="1"
              defaultValue={campaign.weight_tenure}
              className="mt-1 block w-full rounded border border-gray-300 px-2 py-1 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500">Transfer Density</label>
            <input
              name="weight_transfer_density"
              type="number"
              step="0.01"
              min="0"
              max="1"
              defaultValue={campaign.weight_transfer_density}
              className="mt-1 block w-full rounded border border-gray-300 px-2 py-1 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500">Owner Occupancy</label>
            <input
              name="weight_owner_occupancy"
              type="number"
              step="0.01"
              min="0"
              max="1"
              defaultValue={campaign.weight_owner_occupancy}
              className="mt-1 block w-full rounded border border-gray-300 px-2 py-1 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500">Value Band</label>
            <input
              name="weight_value_band"
              type="number"
              step="0.01"
              min="0"
              max="1"
              defaultValue={campaign.weight_value_band}
              className="mt-1 block w-full rounded border border-gray-300 px-2 py-1 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500">Renter Penalty</label>
            <input
              name="penalty_renter"
              type="number"
              step="0.01"
              min="0"
              max="1"
              defaultValue={campaign.penalty_renter}
              className="mt-1 block w-full rounded border border-gray-300 px-2 py-1 text-sm"
            />
          </div>
          <div className="col-span-5">
            <button
              type="submit"
              className="rounded bg-gray-100 px-3 py-1 text-sm text-gray-700 hover:bg-gray-200 transition-colors"
            >
              Update Weights
            </button>
          </div>
        </form>
      </div>

      {/* Runs */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Runs</h2>
        <form action={handleNewRun} className="flex gap-2">
          <input
            name="name"
            placeholder="Run name (optional)"
            className="rounded border border-gray-300 px-3 py-1.5 text-sm"
          />
          <button
            type="submit"
            className="rounded-md bg-brand-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-brand-700 transition-colors"
          >
            New Run
          </button>
        </form>
      </div>

      {runs.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center">
          <p className="text-gray-500">No runs yet. Create one to get started.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {runs.map((r) => (
            <Link
              key={r.id}
              href={`/app/runs/${r.id}`}
              className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-3 hover:border-brand-300 transition-colors"
            >
              <div>
                <span className="font-medium text-gray-900">
                  {r.name || `Run ${r.id.slice(0, 8)}`}
                </span>
                <span className="ml-3 text-sm text-gray-500">
                  {r.parcel_count ?? 0} parcels &middot; {r.zone_count ?? 0} zones
                </span>
              </div>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  r.status === 'complete'
                    ? 'bg-green-100 text-green-700'
                    : r.status === 'running'
                    ? 'bg-blue-100 text-blue-700'
                    : r.status === 'error'
                    ? 'bg-red-100 text-red-700'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {r.status}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
