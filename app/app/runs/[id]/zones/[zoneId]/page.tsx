import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/session';
import { getRun } from '@/lib/data/runs';
import { getZone, getZoneParcels } from '@/lib/data/zones';

export default async function ZoneDetailPage({
  params,
}: {
  params: { id: string; zoneId: string };
}) {
  await requireUser();
  const run = await getRun(params.id);
  if (!run) notFound();

  const zone = await getZone(params.zoneId);
  if (!zone) notFound();

  const parcels = await getZoneParcels(run.id, params.zoneId);

  const components = (typeof zone.score_components === 'string'
    ? JSON.parse(zone.score_components)
    : zone.score_components) as Record<string, any>;

  return (
    <div className="p-6 max-w-6xl">
      <div className="mb-6">
        <Link
          href={`/app/runs/${run.id}/zones`}
          className="text-sm text-brand-600 hover:text-brand-700"
        >
          &larr; Back to Zones
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">
          {zone.zone_name || zone.zone_id}
        </h1>
      </div>

      {/* Score Breakdown */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="text-2xl font-bold text-brand-600">{zone.score_total.toFixed(1)}</div>
          <div className="text-xs text-gray-500">Total Score</div>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="text-lg font-semibold text-gray-900">
            {components.tenure?.toFixed(1) ?? '-'}
          </div>
          <div className="text-xs text-gray-500">Tenure</div>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="text-lg font-semibold text-gray-900">
            {components.transfer_density?.toFixed(1) ?? '-'}
          </div>
          <div className="text-xs text-gray-500">Transfer Density</div>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="text-lg font-semibold text-gray-900">
            {components.owner_occupancy?.toFixed(1) ?? '-'}
          </div>
          <div className="text-xs text-gray-500">Absentee Rate</div>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="text-lg font-semibold text-gray-900">
            {components.value_band?.toFixed(1) ?? '-'}
          </div>
          <div className="text-xs text-gray-500">Value Band Fit</div>
        </div>
      </div>

      {components.reason && (
        <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 mb-6 text-sm text-blue-800">
          {components.reason}
        </div>
      )}

      {/* Export Buttons */}
      <div className="flex gap-3 mb-6">
        <a
          href={`/api/exports/${run.id}/csv?zone=${zone.zone_id}`}
          className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
        >
          Export CSV (Mail Merge)
        </a>
        <a
          href={`/api/exports/${run.id}/kml?zone=${zone.zone_id}`}
          className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
        >
          Export KML
        </a>
        <a
          href={`/api/exports/${run.id}/pdf?zone=${zone.zone_id}`}
          className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
        >
          Export PDF Summary
        </a>
      </div>

      {/* Parcel Drill-Down */}
      <h2 className="text-lg font-semibold text-gray-900 mb-3">
        Parcels ({parcels.length})
      </h2>

      {parcels.length === 0 ? (
        <p className="text-gray-500 text-sm">No parcels found in this zone.</p>
      ) : (
        <div className="rounded-lg border border-gray-200 bg-white overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-3 py-2 text-left font-medium text-gray-500">Parcel ID</th>
                <th className="px-3 py-2 text-left font-medium text-gray-500">Owner</th>
                <th className="px-3 py-2 text-left font-medium text-gray-500">Situs Address</th>
                <th className="px-3 py-2 text-left font-medium text-gray-500">Mailing Address</th>
                <th className="px-3 py-2 text-right font-medium text-gray-500">Assessed Value</th>
                <th className="px-3 py-2 text-left font-medium text-gray-500">Last Sale</th>
              </tr>
            </thead>
            <tbody>
              {parcels.map((p: any) => (
                <tr key={p.id} className="border-b border-gray-100">
                  <td className="px-3 py-2 font-mono text-xs text-gray-600">
                    {p.parcel_id}
                  </td>
                  <td className="px-3 py-2 text-gray-900">{p.owner_name}</td>
                  <td className="px-3 py-2 text-gray-600 text-xs">
                    {[p.situs_address, p.city, p.state, p.zip].filter(Boolean).join(', ')}
                  </td>
                  <td className="px-3 py-2 text-gray-600 text-xs">
                    {[p.mailing_address, p.mailing_city, p.mailing_state, p.mailing_zip].filter(Boolean).join(', ')}
                  </td>
                  <td className="px-3 py-2 text-right text-gray-600">
                    {p.assessed_value ? `$${Number(p.assessed_value).toLocaleString()}` : '-'}
                  </td>
                  <td className="px-3 py-2 text-gray-500 text-xs">
                    {p.last_sale_date || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
