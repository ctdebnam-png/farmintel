import { query, queryOne } from '../db';

export interface Upload {
  id: string;
  run_id: string;
  kind: string;
  filename: string;
  mime: string | null;
  size: number | null;
  storage_path: string;
  uploaded_at: string;
}

export async function listUploads(runId: string): Promise<Upload[]> {
  return query<Upload>(
    'SELECT * FROM uploads WHERE run_id = $1 ORDER BY uploaded_at DESC',
    [runId]
  );
}

export async function getUpload(id: string): Promise<Upload | null> {
  return queryOne<Upload>('SELECT * FROM uploads WHERE id = $1', [id]);
}

export async function createUpload(data: {
  runId: string;
  kind: string;
  filename: string;
  mime?: string;
  size?: number;
  storagePath: string;
}): Promise<Upload> {
  const rows = await query<Upload>(
    `INSERT INTO uploads (run_id, kind, filename, mime, size, storage_path)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [data.runId, data.kind, data.filename, data.mime ?? null, data.size ?? null, data.storagePath]
  );
  return rows[0];
}
