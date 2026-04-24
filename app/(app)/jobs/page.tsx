import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { listJobsForUser, listClientsForUser } from "@/lib/jobs";
import { usd, fmtDate, STATUS_ORDER, STATUS_LABEL, type JobStatus } from "@/lib/format";

export const metadata = { title: "Jobs · AppraiseOS" };

type Search = { q?: string; status?: string; client?: string };

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const user = await requireUser();
  const [allJobs, clients] = await Promise.all([
    listJobsForUser(user.id),
    listClientsForUser(user.id),
  ]);
  const { q = "", status = "", client = "" } = await searchParams;

  // Client-side-style filtering done server-side against the full list.
  // For real scale (§9.1) this becomes a paginated DB query.
  const needle = q.trim().toLowerCase();
  const jobs = allJobs.filter((j) => {
    if (status && j.status !== status) return false;
    if (client && j.clientId !== client) return false;
    if (needle) {
      const hay = [
        j.subjectAddress, j.subjectCity, j.subjectState, j.subjectZip,
        j.borrowerName ?? "", j.loanNumber ?? "", j.formType,
      ].join(" ").toLowerCase();
      if (!hay.includes(needle)) return false;
    }
    return true;
  });

  const grouped = STATUS_ORDER.map((s) => ({ s, jobs: jobs.filter((j) => j.status === s) }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold">Jobs</h1>
        <Link href="/jobs/new" className="btn-primary">New job</Link>
      </div>

      <form className="card card-body grid md:grid-cols-4 gap-3" action="/jobs">
        <input
          className="input md:col-span-2"
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search address, borrower, loan #…"
          aria-label="Search jobs"
        />
        <select className="input" name="status" defaultValue={status} aria-label="Filter by status">
          <option value="">All statuses</option>
          {STATUS_ORDER.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
        </select>
        <select className="input" name="client" defaultValue={client} aria-label="Filter by client">
          <option value="">All clients</option>
          {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <div className="md:col-span-4 flex items-center gap-2">
          <button type="submit" className="btn-secondary">Apply</button>
          {(q || status || client) && (
            <Link href="/jobs" className="btn-ghost">Clear</Link>
          )}
          <span className="text-sm text-gray-500 ml-auto">
            {jobs.length} of {allJobs.length} jobs
          </span>
        </div>
      </form>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {grouped.filter((g) => g.jobs.length > 0).map(({ s, jobs }) => (
          <div key={s} className="card">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <span className={`status-${s}`}>{STATUS_LABEL[s]}</span>
              <span className="text-xs text-gray-500">{jobs.length}</span>
            </div>
            <ul className="divide-y divide-gray-100">
              {jobs.map((j) => (
                <li key={j.id}>
                  <Link href={`/jobs/${j.id}`} className="block p-3 hover:bg-gray-50 focus-visible:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500">
                    <div className="text-sm font-medium truncate">{j.subjectAddress}</div>
                    <div className="text-xs text-gray-600 truncate">{j.subjectCity}, {j.subjectState}</div>
                    <div className="mt-1 flex justify-between text-xs text-gray-500">
                      <span>{j.formType}</span>
                      <span>{usd(j.feeCents)}</span>
                    </div>
                    {j.dueAt && (
                      <div className="text-xs text-gray-500 mt-0.5">Due {fmtDate(j.dueAt)}</div>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
        {allJobs.length === 0 && (
          <div className="col-span-full card card-body text-center text-gray-600 py-12">
            <p className="mb-3">You don't have any jobs yet.</p>
            <Link href="/jobs/new" className="btn-primary inline-flex">Create your first job</Link>
          </div>
        )}
        {allJobs.length > 0 && jobs.length === 0 && (
          <div className="col-span-full card card-body text-center text-gray-600 py-8">
            <p className="mb-2">No jobs match these filters.</p>
            <Link href="/jobs" className="text-brand-600 hover:underline">Clear filters</Link>
          </div>
        )}
      </div>
    </div>
  );
}
