import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

export default async function Home() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  return (
    <main className="min-h-screen bg-gradient-to-b from-brand-50 to-white">
      <header className="mx-auto max-w-6xl px-6 pt-12 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded bg-brand-600 grid place-items-center text-white font-bold">A</div>
          <span className="font-semibold text-lg">AppraiseOS</span>
        </div>
        <nav className="flex items-center gap-3">
          <Link className="btn-ghost" href="/login">Log in</Link>
          <Link className="btn-primary" href="/signup">Start free</Link>
        </nav>
      </header>

      <section className="mx-auto max-w-6xl px-6 pt-20 pb-16">
        <h1 className="text-5xl font-bold tracking-tight text-gray-900 max-w-3xl">
          The modern workbench for residential appraisers.
        </h1>
        <p className="mt-6 text-lg text-gray-700 max-w-2xl">
          Orders, inspections, comparables, URAR reports, and invoicing — in one workflow.
          From assignment to signed PDF in half the time.
        </p>
        <div className="mt-10 flex gap-4">
          <Link className="btn-primary" href="/signup">Create account</Link>
          <Link className="btn-secondary" href="/login">I already have one</Link>
        </div>

        <div className="mt-20 grid md:grid-cols-3 gap-6">
          {[
            { t: "Field-first inspection", d: "Room checklists, photo capture, measurements that auto-roll up to GLA." },
            { t: "Comparables grid", d: "Side-by-side with live adjustment math and Fannie-guideline flags." },
            { t: "Signed URAR in one click", d: "Deterministic PDF rendering with a full USPAP workfile preserved per job." },
          ].map((f) => (
            <div key={f.t} className="card card-body">
              <h3 className="font-semibold text-gray-900">{f.t}</h3>
              <p className="mt-2 text-sm text-gray-600">{f.d}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
