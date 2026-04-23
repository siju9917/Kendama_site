import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { listJobsForUser } from "@/lib/jobs";
import { usd, fmtDate, daysUntil, STATUS_LABEL, type JobStatus } from "@/lib/format";

export default async function Dashboard() {
  const user = await requireUser();
  const jobs = await listJobsForUser(user.id);

  const now = Date.now();
  const openJobs = jobs.filter((j) => j.status !== "PAID" && j.status !== "ARCHIVED");
  const dueSoon = openJobs.filter((j) => j.dueAt && j.dueAt.getTime() - now < 1000 * 60 * 60 * 24 * 7);
  const overdue = openJobs.filter((j) => j.dueAt && j.dueAt.getTime() < now);
  const delivered = jobs.filter((j) => j.status === "DELIVERED");
  const unpaidCents = jobs
    .filter((j) => j.status === "DELIVERED")
    .reduce((sum, j) => sum + j.feeCents, 0);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Welcome back, {user.name.split(" ")[0]}</h1>
          <p className="text-gray-600 mt-1">Here's what's on your plate this week.</p>
        </div>
        <Link href="/jobs/new" className="btn-primary">New job</Link>
      </div>

      <div className="grid md:grid-cols-4 gap-4">
        <Stat label="Open jobs" value={openJobs.length} />
        <Stat label="Due this week" value={dueSoon.length} accent={dueSoon.length ? "amber" : "default"} />
        <Stat label="Overdue" value={overdue.length} accent={overdue.length ? "red" : "default"} />
        <Stat label="A/R (delivered, unpaid)" value={usd(unpaidCents)} />
      </div>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Due this week</h2>
          <Link href="/jobs" className="text-sm text-brand-600 hover:underline">All jobs →</Link>
        </div>
        {dueSoon.length === 0 ? (
          <div className="card card-body text-sm text-gray-600">Nothing due in the next 7 days.</div>
        ) : (
          <div className="card divide-y divide-gray-100">
            {dueSoon.map((j) => {
              const days = daysUntil(j.dueAt);
              const isLate = days !== null && days < 0;
              return (
                <Link
                  key={j.id}
                  href={`/jobs/${j.id}`}
                  className="flex items-center justify-between p-4 hover:bg-gray-50"
                >
                  <div>
                    <div className="font-medium">{j.subjectAddress}</div>
                    <div className="text-sm text-gray-600">
                      {j.subjectCity}, {j.subjectState} {j.subjectZip} · Form {j.formType}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`status-${j.status as JobStatus}`}>{STATUS_LABEL[j.status as JobStatus]}</div>
                    <div className={"text-sm mt-1 " + (isLate ? "text-red-600" : "text-gray-600")}>
                      {fmtDate(j.dueAt)} {days !== null && <>({days < 0 ? `${-days}d late` : `${days}d`})</>}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">Recently delivered</h2>
        {delivered.length === 0 ? (
          <div className="card card-body text-sm text-gray-600">No delivered reports yet.</div>
        ) : (
          <div className="card divide-y divide-gray-100">
            {delivered.slice(0, 5).map((j) => (
              <Link key={j.id} href={`/jobs/${j.id}`} className="flex items-center justify-between p-4 hover:bg-gray-50">
                <div>
                  <div className="font-medium">{j.subjectAddress}</div>
                  <div className="text-sm text-gray-600">Delivered {fmtDate(j.deliveredAt)}</div>
                </div>
                <div className="text-right font-medium">{usd(j.feeCents)}</div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value, accent = "default" }: { label: string; value: string | number; accent?: "default" | "amber" | "red" }) {
  const tone =
    accent === "amber" ? "text-amber-700" : accent === "red" ? "text-red-700" : "text-gray-900";
  return (
    <div className="card card-body">
      <div className="text-xs uppercase tracking-wide text-gray-500">{label}</div>
      <div className={"mt-1 text-2xl font-semibold " + tone}>{value}</div>
    </div>
  );
}
