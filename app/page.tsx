import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="max-w-md text-center space-y-6">
        <h1 className="text-4xl font-bold tracking-tight text-brand-900">
          FarmIntel
        </h1>
        <p className="text-lg text-gray-600">
          Area Farming Intelligence for TD Realty Ohio
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/login"
            className="rounded-lg bg-brand-600 px-6 py-3 text-sm font-semibold text-white shadow hover:bg-brand-700 transition-colors"
          >
            Sign In
          </Link>
        </div>
      </div>
    </main>
  );
}
