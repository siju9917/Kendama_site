"use client";
import { useEffect } from "react";
import Link from "next/link";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Sentry.captureException would go here once wired.
    console.error("unhandled", error);
  }, [error]);
  return (
    <html lang="en">
      <body className="min-h-screen grid place-items-center bg-gray-50 p-6">
        <div className="max-w-md w-full rounded-lg bg-white shadow-sm border border-gray-200 p-6 space-y-4">
          <h1 className="text-xl font-semibold">Something went wrong.</h1>
          <p className="text-sm text-gray-600">
            The page hit an unexpected error. You can try again, or head back to the dashboard.
          </p>
          {error.digest && (
            <p className="text-xs text-gray-400 font-mono">ref: {error.digest}</p>
          )}
          <div className="flex gap-2 pt-2">
            <button onClick={reset} className="inline-flex items-center rounded-md px-3 py-2 text-sm font-medium bg-brand-600 text-white hover:bg-brand-700">Try again</button>
            <Link href="/dashboard" className="inline-flex items-center rounded-md px-3 py-2 text-sm font-medium bg-white text-gray-800 border border-gray-300 hover:bg-gray-50">Dashboard</Link>
          </div>
        </div>
      </body>
    </html>
  );
}
