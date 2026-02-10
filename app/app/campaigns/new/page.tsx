import { requireUser } from '@/lib/session';
import { createCampaign } from '@/lib/data/campaigns';
import { redirect } from 'next/navigation';

export default async function NewCampaignPage() {
  const user = await requireUser();

  async function handleCreate(formData: FormData) {
    'use server';
    const u = await requireUser();
    const campaign = await createCampaign({
      orgId: u.orgId,
      name: formData.get('name') as string,
      county: (formData.get('county') as string) || undefined,
      state: (formData.get('state') as string) || undefined,
      geographyType: (formData.get('geography_type') as string) || 'block_group',
      goalType: (formData.get('goal_type') as string) || 'seller',
      createdBy: u.id,
    });
    redirect(`/app/campaigns/${campaign.id}`);
  }

  return (
    <div className="p-6 max-w-lg">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">New Campaign</h1>

      <form action={handleCreate} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Campaign Name
          </label>
          <input
            name="name"
            required
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
            placeholder="e.g. Franklin County Sellers Q1 2025"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">County</label>
            <input
              name="county"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
              placeholder="e.g. Franklin"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">State</label>
            <input
              name="state"
              maxLength={2}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
              placeholder="OH"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Geography Type
          </label>
          <select
            name="geography_type"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
          >
            <option value="block_group">Census Block Group</option>
            <option value="tract">Census Tract</option>
            <option value="neighborhood">Neighborhood</option>
            <option value="zip">ZIP Code</option>
            <option value="custom">Custom Boundary</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Goal Type</label>
          <select
            name="goal_type"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
          >
            <option value="seller">Seller Prospecting</option>
            <option value="buyer">Buyer Prospecting</option>
            <option value="mixed">Mixed</option>
          </select>
        </div>

        <button
          type="submit"
          className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 transition-colors"
        >
          Create Campaign
        </button>
      </form>
    </div>
  );
}
