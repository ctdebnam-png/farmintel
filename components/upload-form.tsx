'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';

export function UploadForm({
  runId,
  kind,
  label,
  accept,
}: {
  runId: string;
  kind: string;
  label: string;
  accept: string;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  async function handleUpload(file: File) {
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('runId', runId);
    formData.append('kind', kind);

    try {
      const res = await fetch('/api/uploads', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Upload failed');
      } else {
        router.refresh();
      }
    } catch {
      alert('Upload failed');
    } finally {
      setUploading(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleUpload(file);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      onClick={() => fileRef.current?.click()}
      className={`rounded-lg border-2 border-dashed p-6 text-center cursor-pointer transition-colors ${
        dragOver
          ? 'border-brand-400 bg-brand-50'
          : 'border-gray-300 bg-white hover:border-gray-400'
      }`}
    >
      <input
        ref={fileRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        className="hidden"
      />
      <p className="text-sm font-medium text-gray-700">{label}</p>
      <p className="text-xs text-gray-400 mt-1">
        {uploading ? 'Uploading...' : 'Drop file or click to select'}
      </p>
    </div>
  );
}
