import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/session';
import { getRun } from '@/lib/data/runs';
import { listZones } from '@/lib/data/zones';
import dynamic from 'next/dynamic';

const ZoneMap = dynamic(() => import('@/components/zone-map'), { ssr: false });

export default async function MapPage({
  params,
}: {
  params: { id: string };
}) {
  await requireUser();
  const run = await getRun(params.id);
  if (!run) notFound();

  const zones = await listZones(run.id);

  const zoneData = zones.map((z) => ({
    id: z.id,
    zone_id: z.zone_id,
    zone_name: z.zone_name,
    geometry: z.geometry,
    parcel_count: z.parcel_count,
    score_total: z.score_total,
    score_components: z.score_components,
  }));

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-gray-200 bg-white flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href={`/app/runs/${run.id}`}
            className="text-sm text-brand-600 hover:text-brand-700"
          >
            &larr; Back to Run
          </Link>
          <h1 className="text-lg font-bold text-gray-900">Zone Map</h1>
          <span className="text-sm text-gray-500">{zones.length} zones</span>
        </div>
        <Link
          href={`/app/runs/${run.id}/zones`}
          className="rounded-md bg-gray-100 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-200 transition-colors"
        >
          Table View
        </Link>
      </div>

      <div className="flex-1 relative">
        {zones.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500">No zones with geometry data. Run the pipeline with a boundaries file.</p>
          </div>
        ) : (
          <ZoneMap zones={zoneData} runId={run.id} />
        )}
      </div>

      {/* Legend */}
      <div className="p-3 border-t border-gray-200 bg-white flex items-center gap-4 text-xs text-gray-500">
        <span>Score:</span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-green-600" /> High
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-lime-600" /> Medium-High
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-yellow-500" /> Medium
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-red-500" /> Low
        </span>
      </div>
    </div>
  );
}
