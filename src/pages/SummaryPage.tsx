import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import type { DashboardSummary } from '../types';
import { StatusBadge } from '../components/StatusBadge';

export function SummaryPage() {
  const { workspaceOwnerId } = useAuth();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!workspaceOwnerId) return;
    setLoading(true);
    api
      .get<DashboardSummary>('/dashboard/summary', {
        params: { workspaceOwnerId },
      })
      .then((res) => setSummary(res.data))
      .finally(() => setLoading(false));
  }, [workspaceOwnerId]);

  if (loading) return <p className="text-slate-ink/70">Loading summary…</p>;
  if (!summary) return <p>No summary available.</p>;

  const cards = [
    { label: 'Projects', value: summary.totals.projects },
    { label: 'Total tasks', value: summary.totals.tasks },
    { label: 'Pending', value: summary.totals.pending },
    { label: 'Fully completed', value: summary.totals.completed },
  ];

  return (
    <div className="animate-fade-up space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold text-pine-deep">
          Final Summary
        </h1>
        <p className="mt-1 text-sm text-slate-ink/70">
          Pending work across all projects at a glance.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c, i) => (
          <div
            key={c.label}
            style={{ animationDelay: `${i * 60}ms` }}
            className="animate-slide-in rounded-2xl border border-line bg-white/80 px-5 py-4"
          >
            <p className="text-xs uppercase tracking-wide text-slate-ink/60">
              {c.label}
            </p>
            <p className="mt-2 font-display text-3xl font-semibold text-ink">
              {c.value}
            </p>
          </div>
        ))}
      </div>

      <section className="rounded-2xl border border-line bg-white/85 p-5">
        <h2 className="font-display text-xl font-semibold">By project</h2>
        <div className="mt-4 space-y-3">
          {summary.byProject.map((p) => (
            <div
              key={p.projectId}
              className="flex flex-wrap items-center justify-between gap-3 border-b border-line/60 pb-3 last:border-0"
            >
              <div>
                <p className="font-medium">{p.projectName}</p>
                <p className="text-xs text-slate-ink/60">
                  {p.completed} done · {p.pending} pending · {p.total} total
                </p>
              </div>
              <div className="h-2 w-40 overflow-hidden rounded-full bg-mist">
                <div
                  className="h-full rounded-full bg-sea"
                  style={{
                    width: `${p.total ? (p.completed / p.total) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
          ))}
          {summary.byProject.length === 0 && (
            <p className="text-sm text-slate-ink/60">No projects yet.</p>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-line bg-white/85 p-5">
        <h2 className="font-display text-xl font-semibold">Pending tasks</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wide text-slate-ink/60">
                <th className="pb-2 pr-3">Project</th>
                <th className="pb-2 pr-3">Task</th>
                <th className="pb-2 pr-3">Content</th>
                <th className="pb-2 pr-3">Design</th>
                <th className="pb-2 pr-3">Final</th>
                <th className="pb-2">Expected</th>
              </tr>
            </thead>
            <tbody>
              {summary.pendingTasks.map((t) => (
                <tr key={t.id} className="border-t border-line/70">
                  <td className="py-3 pr-3 text-slate-ink/80">{t.projectName}</td>
                  <td className="py-3 pr-3 font-medium">{t.task}</td>
                  <td className="py-3 pr-3">
                    <StatusBadge status={t.contentStatus} />
                  </td>
                  <td className="py-3 pr-3">
                    <StatusBadge status={t.designStatus} />
                  </td>
                  <td className="py-3 pr-3">
                    <StatusBadge status={t.finalStatus} />
                  </td>
                  <td className="py-3">{t.expectedCompletionDate || '—'}</td>
                </tr>
              ))}
              {summary.pendingTasks.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-ink/60">
                    All caught up — no pending tasks.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-sm">
          <Link to="/" className="text-pine underline">
            Back to project sheets
          </Link>
        </p>
      </section>
    </div>
  );
}
