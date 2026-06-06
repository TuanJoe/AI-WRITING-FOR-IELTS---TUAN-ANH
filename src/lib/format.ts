// Shared formatting helpers for the UI.

export function formatUsd(value: number): string {
  return `$${value.toLocaleString("en-US", {
    minimumFractionDigits: value < 1 ? 4 : 2,
    maximumFractionDigits: value < 1 ? 6 : 2,
  })}`;
}

export function formatVnd(value: number): string {
  return `${Math.round(value).toLocaleString("vi-VN")} ₫`;
}

export function formatNumber(value: number): string {
  return value.toLocaleString("en-US");
}

export function formatDate(value: string | Date): string {
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toLocaleString("en-GB", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Tailwind colour classes for an IELTS band score. */
export function bandColor(band: number): string {
  if (band >= 8) return "bg-emerald-100 text-emerald-800";
  if (band >= 6.5) return "bg-brand-100 text-brand-800";
  if (band >= 5) return "bg-amber-100 text-amber-800";
  return "bg-red-100 text-red-800";
}

export function statusColor(status: string): string {
  switch (status) {
    case "COMPLETED":
    case "SUCCESS":
    case "PUBLISHED":
      return "bg-emerald-100 text-emerald-800";
    case "PROCESSING":
    case "PENDING":
    case "TESTING":
      return "bg-amber-100 text-amber-800";
    case "FAILED":
      return "bg-red-100 text-red-800";
    case "DRAFT":
      return "bg-slate-100 text-slate-700";
    case "DEPRECATED":
    case "ARCHIVED":
      return "bg-slate-100 text-slate-500";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

export function severityColor(severity: string): string {
  switch (severity.toUpperCase()) {
    case "HIGH":
      return "bg-red-100 text-red-800";
    case "MEDIUM":
      return "bg-amber-100 text-amber-800";
    default:
      return "bg-slate-100 text-slate-700";
  }
}
