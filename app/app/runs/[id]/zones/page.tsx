import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/session';
import { getRun } from '@/lib/data/runs';
import { listZones } from '@/lib/data/zones';

export default async function ZonesPage({
  params,
}: {
  params: { id: string };
}) {
  await requireUser();
  const run = await getRun(params.id);
  if (!run) notFound();

  const zones = await listZones(run.id);

  return (
    <div className="p-6 max-w-6xl">
      <div className="mb-6">
        <Link
          href={`/app/runs/${run.id}`}
          className="text-sm text-brand-600 hover:text-brand-700"
        >
          &larr; Back to Run
        </Link>
        <div className="flex items-center justify-between mt-2">
          <h1 className="text-2xl font-bold text-gray-900">Ranked Zones</h1>
          <Link
            href={`/app/runs/${run.id}/map`}
            className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 transition-colors"
          >
            View Map
          </Link>
        </div>
      </div>

      {zones.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center">
          <p className="text-gray-500">No zones scored yet. Run the pipeline first.</p>
        </div>
      ) : (
        <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-4 py-3 text-left font-medium text-gray-500">Rank</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Zone</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">Score</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">Parcels</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">Med. Home Value</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">Owner Occ.</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Top Reason</th>
              </tr>
            </thead>
            <tbody>
              {zones.map((z, i) => {
                const components = (typeof z.score_components === 'string'
                  ? JSON.parse(z.score_components)
                  : z.score_components) as Record<string, any>;
                const cd = (typeof (z as any).census_data === 'string'
                  ? JSON.parse((z as any).census_data)
                  : (z as any).census_data) as Record<string, any> | null;
                return (
                  <tr
                    key={z.id}
                    className="border-b border-gray-100 hover:bg-gray-50"
                  >
                    <td className="px-4 py-3 font-medium text-gray-400">
                      {i + 1}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/app/runs/${run.id}/zones/${z.id}`}
                        className="font-medium text-brand-600 hover:text-brand-700"
                      >
                        {z.zone_name || z.zone_id}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">
                      {z.score_total.toFixed(1)}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600">
                      {z.parcel_count}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600">
                      {cd?.median_home_value ? `$${Number(cd.median_home_value).toLocaleString()}` : '-'}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600">
                      {cd?.owner_occupancy_rate != null ? `${(cd.owner_occupancy_rate * 100).toFixed(0)}%` : '-'}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs max-w-xs truncate">
                      {components.reason || '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
