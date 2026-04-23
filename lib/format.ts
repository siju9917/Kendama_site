export function usd(cents: number | null | undefined) {
  if (cents == null) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(cents / 100);
}

export function usdPrecise(cents: number | null | undefined) {
  if (cents == null) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

export function fmtDate(d: Date | number | null | undefined) {
  if (!d) return "—";
  const date = d instanceof Date ? d : new Date(d);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function fmtDateTime(d: Date | number | null | undefined) {
  if (!d) return "—";
  const date = d instanceof Date ? d : new Date(d);
  return date.toLocaleString("en-US", {
    month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
  });
}

export function daysUntil(d: Date | number | null | undefined) {
  if (!d) return null;
  const date = d instanceof Date ? d : new Date(d);
  const ms = date.getTime() - Date.now();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

export function inputDate(d: Date | number | null | undefined): string {
  if (!d) return "";
  const date = d instanceof Date ? d : new Date(d);
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function inputDateTime(d: Date | number | null | undefined): string {
  if (!d) return "";
  const date = d instanceof Date ? d : new Date(d);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export const STATUS_ORDER = [
  "NEW",
  "SCHEDULED",
  "INSPECTED",
  "DRAFTING",
  "IN_REVIEW",
  "DELIVERED",
  "PAID",
  "ARCHIVED",
] as const;

export type JobStatus = typeof STATUS_ORDER[number];

export const STATUS_LABEL: Record<JobStatus, string> = {
  NEW: "New",
  SCHEDULED: "Scheduled",
  INSPECTED: "Inspected",
  DRAFTING: "Drafting",
  IN_REVIEW: "In review",
  DELIVERED: "Delivered",
  PAID: "Paid",
  ARCHIVED: "Archived",
};
