'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function RunPipelineButton({
  runId,
  currentStatus,
}: {
  runId: string;
  currentStatus: string;
}) {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState('');

  async function handleRun() {
    setRunning(true);
    setMessage('');
    try {
      const res = await fetch(`/api/pipeline/${runId}`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error || 'Pipeline failed');
      } else {
        setMessage('Pipeline complete');
        router.refresh();
      }
    } catch {
      setMessage('Pipeline request failed');
    } finally {
      setRunning(false);
    }
  }

  const isRunning = currentStatus === 'running' || running;

  return (
    <div>
      <button
        onClick={handleRun}
        disabled={isRunning}
        className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50 transition-colors"
      >
        {isRunning ? 'Running Pipeline...' : currentStatus === 'complete' ? 'Re-run Pipeline' : 'Run Pipeline'}
      </button>
      {message && (
        <p className={`mt-2 text-sm ${message.includes('fail') ? 'text-red-600' : 'text-green-600'}`}>
          {message}
        </p>
      )}
    </div>
  );
}
