import type { ReactNode } from "react";

type ListadoPanelProps = {
  /** Header completo. Si se define, ignora title/right. */
  header?: ReactNode;
  title?: ReactNode;
  right?: ReactNode;
  className?: string;
  bodyClassName?: string;
  children: ReactNode;
};

export function ListadoPanel({
  header,
  title,
  right,
  className = "",
  bodyClassName = "p-0",
  children,
}: ListadoPanelProps) {
  return (
    <section
      className={`flex h-full min-h-0 flex-col rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800 ${className}`}
    >
      {header ?? (
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-700">
          <h2 className="font-medium text-slate-800 dark:text-slate-200">{title}</h2>
          {right ? <div className="shrink-0">{right}</div> : null}
        </div>
      )}
      <div className={`flex min-h-0 flex-1 flex-col ${bodyClassName}`}>{children}</div>
    </section>
  );
}

