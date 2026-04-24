import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen grid place-items-center p-6">
      <div className="card w-full max-w-md card-body text-center space-y-3">
        <h1 className="text-2xl font-semibold">Not found</h1>
        <p className="text-sm text-gray-600">
          The page or record you were looking for doesn't exist, or you don't have access to it.
        </p>
        <div className="pt-2">
          <Link href="/dashboard" className="btn-primary">Go to dashboard</Link>
        </div>
      </div>
    </main>
  );
}
