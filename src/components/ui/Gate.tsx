import { useEffect, useState, type ReactNode } from 'react';

/** Shows a skeleton briefly so content can animate in rather than pop. */
export default function Gate({ ms = 350, skeleton, children }: { ms?: number; skeleton: ReactNode; children: ReactNode }) {
  const [ready, setReady] = useState(false);
  useEffect(() => { const t = setTimeout(() => setReady(true), ms); return () => clearTimeout(t); }, [ms]);
  return <>{ready ? children : skeleton}</>;
}
export const ChartSkeleton = () => <div className="skeleton h-[calc(100dvh-12.5rem)] min-h-[540px] !rounded-3xl" aria-busy="true" aria-label="Loading chart" />;
export const CardsSkeleton = () => (
  <div className="space-y-5" aria-busy="true">
    <div className="skeleton h-56" />
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton h-44" />)}</div>
  </div>
);
