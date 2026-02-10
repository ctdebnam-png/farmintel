import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/session';
import { getRun } from '@/lib/data/runs';
import { listUploads } from '@/lib/data/uploads';
import { UploadForm } from '@/components/upload-form';
import { RunPipelineButton } from '@/components/run-pipeline-button';

export default async function RunPage({
  params,
}: {
  params: { id: string };
}) {
  await requireUser();
  const run = await getRun(params.id);
  if (!run) notFound();

  const uploads = await listUploads(run.id);
  const hasParcelUpload = uploads.some((u) => u.kind === 'parcels');

  return (
    <div className="p-6 max-w-5xl">
      <div className="mb-6">
        <Link
          href={`/app/campaigns/${run.campaign_id}`}
          className="text-sm text-brand-600 hover:text-brand-700"
        >
          &larr; Back to Campaign
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">
          {run.name || `Run ${run.id.slice(0, 8)}`}
        </h1>
        <div className="flex items-center gap-3 mt-1">
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              run.status === 'complete'
                ? 'bg-green-100 text-green-700'
                : run.status === 'running'
                ? 'bg-blue-100 text-blue-700'
                : run.status === 'error'
                ? 'bg-red-100 text-red-700'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            {run.status}
          </span>
          <span className="text-sm text-gray-500">
            {run.parcel_count ?? 0} parcels &middot; {run.zone_count ?? 0} zones
          </span>
        </div>
      </div>

      {/* Upload Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <UploadForm runId={run.id} kind="parcels" label="Parcels CSV" accept=".csv" />
        <UploadForm runId={run.id} kind="transfers" label="Transfers CSV" accept=".csv" />
        <UploadForm runId={run.id} kind="boundaries" label="Boundaries GeoJSON" accept=".geojson,.json" />
      </div>

      {/* Uploaded Files */}
      {uploads.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-4 mb-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Uploaded Files</h2>
          <div className="space-y-2">
            {uploads.map((u) => (
              <div
                key={u.id}
                className="flex items-center justify-between text-sm"
              >
                <div>
                  <span className="inline-block rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 mr-2">
                    {u.kind}
                  </span>
                  <span className="text-gray-900">{u.filename}</span>
                </div>
                <span className="text-gray-400 text-xs">
                  {u.size ? `${Math.round(u.size / 1024)} KB` : ''}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pipeline Controls */}
      <div className="rounded-lg border border-gray-200 bg-white p-4 mb-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Pipeline</h2>
        {!hasParcelUpload ? (
          <p className="text-sm text-gray-500">Upload a parcels CSV to enable the pipeline.</p>
        ) : (
          <RunPipelineButton runId={run.id} currentStatus={run.status} />
        )}
      </div>

      {/* Output Links */}
      {run.status === 'complete' && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Link
            href={`/app/runs/${run.id}/zones`}
            className="rounded-lg border border-gray-200 bg-white p-4 text-center hover:border-brand-300 transition-colors"
          >
            <div className="text-lg font-semibold text-brand-600">{run.zone_count ?? 0}</div>
            <div className="text-sm text-gray-500">Ranked Zones</div>
          </Link>
          <Link
            href={`/app/runs/${run.id}/map`}
            className="rounded-lg border border-gray-200 bg-white p-4 text-center hover:border-brand-300 transition-colors"
          >
            <div className="text-lg font-semibold text-brand-600">Map</div>
            <div className="text-sm text-gray-500">Zone Map View</div>
          </Link>
          <a
            href={`/api/exports/${run.id}/csv`}
            className="rounded-lg border border-gray-200 bg-white p-4 text-center hover:border-brand-300 transition-colors"
          >
            <div className="text-lg font-semibold text-brand-600">CSV</div>
            <div className="text-sm text-gray-500">Mail Merge Export</div>
          </a>
          <a
            href={`/api/exports/${run.id}/kml`}
            className="rounded-lg border border-gray-200 bg-white p-4 text-center hover:border-brand-300 transition-colors"
          >
            <div className="text-lg font-semibold text-brand-600">KML</div>
            <div className="text-sm text-gray-500">Google My Maps</div>
          </a>
        </div>
      )}
    </div>
  );
}
