import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { listJobsForUser } from "@/lib/jobs";
import { usd, fmtDate, STATUS_ORDER, STATUS_LABEL, type JobStatus } from "@/lib/format";

export default async function JobsPage() {
  const user = await requireUser();
  const jobs = await listJobsForUser(user.id);

  const grouped = STATUS_ORDER.map((s) => ({ s, jobs: jobs.filter((j) => j.status === s) }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold">Jobs</h1>
        <Link href="/jobs/new" className="btn-primary">New job</Link>
      </div>

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
                  <Link href={`/jobs/${j.id}`} className="block p-3 hover:bg-gray-50">
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
        {jobs.length === 0 && (
          <div className="col-span-full card card-body text-center text-gray-600">
            <p className="mb-3">You don't have any jobs yet.</p>
            <Link href="/jobs/new" className="btn-primary inline-flex">Create your first job</Link>
          </div>
        )}
      </div>
    </div>
  );
}
