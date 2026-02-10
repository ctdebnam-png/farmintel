import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { storage } from '@/lib/storage';
import { createUpload } from '@/lib/data/uploads';
import { getRun } from '@/lib/data/runs';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  const runId = formData.get('runId') as string;
  const kind = formData.get('kind') as string;

  if (!file || !runId || !kind) {
    return NextResponse.json({ error: 'Missing file, runId, or kind' }, { status: 400 });
  }

  if (!['parcels', 'transfers', 'boundaries'].includes(kind)) {
    return NextResponse.json({ error: 'Invalid kind' }, { status: 400 });
  }

  const run = await getRun(runId);
  if (!run) {
    return NextResponse.json({ error: 'Run not found' }, { status: 404 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const ext = file.name.split('.').pop() || 'bin';
  const storageName = `${runId}/${kind}_${crypto.randomUUID().slice(0, 8)}.${ext}`;

  await storage.save(storageName, buffer);

  const upload = await createUpload({
    runId,
    kind,
    filename: file.name,
    mime: file.type || undefined,
    size: buffer.length,
    storagePath: storageName,
  });

  return NextResponse.json(upload);
}
