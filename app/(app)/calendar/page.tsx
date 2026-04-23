import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { listJobsForUser } from "@/lib/jobs";
import { fmtDate } from "@/lib/format";

export default async function CalendarPage() {
  const user = await requireUser();
  const jobs = await listJobsForUser(user.id);

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startDow = firstOfMonth.getDay();

  type Day = { date: Date; inThisMonth: boolean; events: { type: "inspection" | "due"; job: typeof jobs[number] }[] };
  const cells: Day[] = [];
  for (let i = 0; i < startDow; i++) {
    const d = new Date(year, month, 1 - (startDow - i));
    cells.push({ date: d, inThisMonth: false, events: [] });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ date: new Date(year, month, d), inThisMonth: true, events: [] });
  }
  while (cells.length % 7 !== 0) {
    const last = cells[cells.length - 1].date;
    const next = new Date(last);
    next.setDate(next.getDate() + 1);
    cells.push({ date: next, inThisMonth: false, events: [] });
  }

  for (const j of jobs) {
    const match = (ts: Date | null | undefined, type: "inspection" | "due") => {
      if (!ts) return;
      const target = ts instanceof Date ? ts : new Date(ts);
      const cell = cells.find(
        (c) =>
          c.date.getFullYear() === target.getFullYear() &&
          c.date.getMonth() === target.getMonth() &&
          c.date.getDate() === target.getDate()
      );
      if (cell) cell.events.push({ type, job: j });
    };
    match(j.inspectionAt, "inspection");
    match(j.dueAt, "due");
  }

  const monthName = firstOfMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const today = new Date();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold">Calendar</h1>
        <div className="text-sm text-gray-600">{monthName}</div>
      </div>
      <div className="card overflow-hidden">
        <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-600">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div key={d} className="p-2 text-center">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((cell, i) => {
            const isToday =
              cell.date.getFullYear() === today.getFullYear() &&
              cell.date.getMonth() === today.getMonth() &&
              cell.date.getDate() === today.getDate();
            return (
              <div
                key={i}
                className={
                  "min-h-[88px] border-b border-r border-gray-100 p-1.5 text-xs " +
                  (cell.inThisMonth ? "bg-white" : "bg-gray-50 text-gray-400")
                }
              >
                <div className={"flex justify-end " + (isToday ? "text-brand-700 font-bold" : "")}>
                  {cell.date.getDate()}
                </div>
                <div className="mt-1 space-y-0.5">
                  {cell.events.map((ev, j) => (
                    <Link
                      key={j}
                      href={`/jobs/${ev.job.id}`}
                      className={
                        "block truncate rounded px-1 py-0.5 " +
                        (ev.type === "inspection"
                          ? "bg-blue-100 text-blue-900"
                          : "bg-amber-100 text-amber-900")
                      }
                      title={`${ev.type === "inspection" ? "Inspection" : "Due"}: ${ev.job.subjectAddress}`}
                    >
                      {ev.type === "inspection" ? "Insp:" : "Due:"} {ev.job.subjectAddress}
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="card">
        <div className="card-body border-b border-gray-100">
          <h2 className="font-semibold">All upcoming dates</h2>
        </div>
        <ul className="divide-y divide-gray-100">
          {jobs
            .flatMap((j) => [
              j.inspectionAt && { type: "Inspection", at: j.inspectionAt, job: j },
              j.dueAt && { type: "Due", at: j.dueAt, job: j },
            ])
            .filter((x): x is { type: string; at: Date; job: typeof jobs[number] } => !!x && x.at.getTime() >= now.getTime() - 86400000)
            .sort((a, b) => a.at.getTime() - b.at.getTime())
            .slice(0, 10)
            .map((ev, i) => (
              <li key={i} className="p-3 flex justify-between">
                <Link href={`/jobs/${ev.job.id}`} className="hover:underline">
                  <span className="font-medium">{ev.type}</span>: {ev.job.subjectAddress}
                </Link>
                <span className="text-sm text-gray-600">{fmtDate(ev.at)}</span>
              </li>
            ))}
        </ul>
      </div>
    </div>
  );
}
