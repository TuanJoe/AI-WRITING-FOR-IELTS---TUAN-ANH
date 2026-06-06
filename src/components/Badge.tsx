export function Badge({
  children,
  className = "bg-slate-100 text-slate-700",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <span className={`badge ${className}`}>{children}</span>;
}
