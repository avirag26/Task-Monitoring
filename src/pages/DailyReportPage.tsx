import { useEffect, useState, type FormEvent } from 'react';
import { format, parseISO } from 'date-fns';
import { Clock, Mail, Save, Sparkles } from 'lucide-react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import type { DailyReport, MeResponse } from '../types';

export function DailyReportPage() {
  const { workspaceOwnerId, refreshMe, me } = useAuth();
  const [today, setToday] = useState<DailyReport | null>(null);
  const [history, setHistory] = useState<DailyReport[]>([]);
  const [generatedSummary, setGeneratedSummary] = useState('');
  const [emailTo, setEmailTo] = useState('');
  const [emailCc, setEmailCc] = useState('');
  const [autoEnabled, setAutoEnabled] = useState(false);
  const [autoTo, setAutoTo] = useState('');
  const [autoCc, setAutoCc] = useState('');
  const [saving, setSaving] = useState(false);
  const [savingAuto, setSavingAuto] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [todayRes, listRes, meRes] = await Promise.all([
        api.get<DailyReport | null>('/daily-reports/today'),
        api.get<DailyReport[]>('/daily-reports'),
        api.get<MeResponse>('/users/me'),
      ]);
      setToday(todayRes.data);
      setGeneratedSummary(
        todayRes.data?.generatedSummary || todayRes.data?.content || '',
      );
      setHistory(listRes.data);
      setAutoEnabled(!!meRes.data.autoDailyReportEnabled);
      setAutoTo((meRes.data.autoDailyReportTo || []).join(', '));
      setAutoCc((meRes.data.autoDailyReportCc || []).join(', '));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const onGenerate = async () => {
    setGenerating(true);
    setMessage('');
    setError('');
    try {
      const { data } = await api.get<{
        generatedSummary: string;
        activityCount: number;
      }>('/daily-reports/generate', {
        params: { workspaceOwnerId },
      });
      setGeneratedSummary(data.generatedSummary);
      setMessage(
        data.activityCount > 0
          ? `Generated from ${data.activityCount} task${data.activityCount === 1 ? '' : 's'}.`
          : 'No task activity found for today.',
      );
    } catch {
      setError('Could not generate summary.');
    } finally {
      setGenerating(false);
    }
  };

  const onSave = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!generatedSummary.trim()) {
      setError('Generate a summary first.');
      return;
    }
    setSaving(true);
    setMessage('');
    setError('');
    try {
      const { data } = await api.post<DailyReport>('/daily-reports', {
        generatedSummary: generatedSummary.trim(),
        comments: '',
        content: generatedSummary.trim(),
      });
      setToday(data);
      setGeneratedSummary(data.generatedSummary || data.content || '');
      setMessage('Saved today’s report.');
      await load();
    } catch {
      setError('Could not save report.');
    } finally {
      setSaving(false);
    }
  };

  const onSendEmail = async () => {
    if (!emailTo.trim()) {
      setError('Enter at least one To email address.');
      return;
    }
    if (!generatedSummary.trim()) {
      setError('Generate a summary before sending.');
      return;
    }
    setSending(true);
    setMessage('');
    setError('');
    try {
      const { data } = await api.post<{
        sent: boolean;
        to: string[];
        cc: string[];
      }>('/daily-reports/send-email', {
        to: emailTo,
        cc: emailCc || undefined,
        generatedSummary: generatedSummary.trim(),
        comments: '',
        content: generatedSummary.trim(),
      });
      setMessage(
        `Email sent to ${data.to.join(', ')}${
          data.cc?.length ? ` (cc: ${data.cc.join(', ')})` : ''
        }.`,
      );
      await load();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string | string[] } } })
          ?.response?.data?.message || 'Could not send email.';
      setError(Array.isArray(msg) ? msg.join(', ') : String(msg));
    } finally {
      setSending(false);
    }
  };

  const onSaveAutoSettings = async () => {
    setSavingAuto(true);
    setMessage('');
    setError('');
    try {
      await api.patch('/users/me/auto-report', {
        autoDailyReportEnabled: autoEnabled,
        autoDailyReportTo: autoTo,
        autoDailyReportCc: autoCc,
      });
      await refreshMe();
      setMessage(
        autoEnabled
          ? 'Auto-send enabled — emails at 6:10 PM daily.'
          : 'Auto-send disabled.',
      );
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string | string[] } } })
          ?.response?.data?.message || 'Could not save auto-send settings.';
      setError(Array.isArray(msg) ? msg.join(', ') : String(msg));
    } finally {
      setSavingAuto(false);
    }
  };

  if (loading) return <p className="text-slate-ink/70">Loading reports…</p>;

  return (
    <div className="animate-fade-up space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold text-pine-deep">
            Daily Report
          </h1>
          <p className="mt-1 text-sm text-slate-ink/70">
            {format(new Date(), 'EEEE, MMMM d yyyy')} · Generate, save, or email
            today’s work
          </p>
        </div>
        {(message || error) && (
          <p className={`text-sm ${error ? 'text-coral' : 'text-sea'}`}>
            {error || message}
          </p>
        )}
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        {/* Left — summary */}
        <section className="flex min-h-[520px] flex-col rounded-2xl border border-line bg-white/90 p-5 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-xl font-semibold text-ink">
                Today’s summary
              </h2>
              <p className="text-xs text-slate-ink/60">
                Built from your task activity — edit before saving
              </p>
            </div>
            <button
              type="button"
              onClick={onGenerate}
              disabled={generating}
              className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-sea px-4 py-2 text-sm font-medium text-white hover:bg-pine disabled:opacity-60"
            >
              <Sparkles size={16} />
              {generating ? 'Generating…' : 'Generate'}
            </button>
          </div>

          <textarea
            value={generatedSummary}
            onChange={(e) => setGeneratedSummary(e.target.value)}
            placeholder='Click “Generate” to build a summary from what you completed or updated today…'
            className="min-h-[360px] flex-1 resize-none rounded-xl border border-line bg-fog/40 px-4 py-3 text-sm leading-relaxed outline-none focus:border-sea"
          />

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onSave()}
              disabled={saving}
              className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-pine px-4 py-2.5 text-sm font-medium text-white hover:bg-pine-deep disabled:opacity-60"
            >
              <Save size={15} />
              {saving ? 'Saving…' : today ? 'Update report' : 'Save report'}
            </button>
          </div>
        </section>

        {/* Right — email + auto */}
        <div className="flex flex-col gap-5">
          <section className="rounded-2xl border border-line bg-white/90 p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-pine/10 text-pine">
                  <Clock size={16} />
                </span>
                <div>
                  <h2 className="text-sm font-semibold text-ink">
                    Auto-send 6:10 PM
                  </h2>
                  <p className="text-xs text-slate-ink/60">India time · daily</p>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={autoEnabled}
                onClick={() => setAutoEnabled((v) => !v)}
                className={`relative h-7 w-12 cursor-pointer rounded-full transition ${
                  autoEnabled ? 'bg-pine' : 'bg-line'
                }`}
              >
                <span
                  className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition ${
                    autoEnabled ? 'left-[22px]' : 'left-0.5'
                  }`}
                />
              </button>
            </div>

            <div className="space-y-3">
              <label className="block text-sm">
                <span className="mb-1 block text-xs text-slate-ink/70">To</span>
                <input
                  type="text"
                  value={autoTo}
                  onChange={(e) => setAutoTo(e.target.value)}
                  placeholder="manager@company.com"
                  className="w-full rounded-md border border-line bg-fog/30 px-3 py-2 text-sm outline-none focus:border-sea"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-xs text-slate-ink/70">CC</span>
                <input
                  type="text"
                  value={autoCc}
                  onChange={(e) => setAutoCc(e.target.value)}
                  placeholder="optional@company.com"
                  className="w-full rounded-md border border-line bg-fog/30 px-3 py-2 text-sm outline-none focus:border-sea"
                />
              </label>
            </div>

            <button
              type="button"
              onClick={onSaveAutoSettings}
              disabled={savingAuto}
              className="mt-4 w-full cursor-pointer rounded-md border border-line bg-white px-3 py-2 text-sm font-medium hover:bg-fog disabled:opacity-60"
            >
              {savingAuto ? 'Saving…' : 'Save auto settings'}
            </button>
            <p className="mt-2 text-xs text-slate-ink/55">
              {me?.autoDailyReportEnabled || autoEnabled
                ? 'Status: will send automatically at 6:10 PM'
                : 'Status: disabled'}
            </p>
          </section>

          <section className="flex flex-1 flex-col rounded-2xl border border-line bg-gradient-to-b from-white to-fog/60 p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sea/15 text-pine">
                <Mail size={16} />
              </span>
              <div>
                <h2 className="text-sm font-semibold text-ink">Send now</h2>
                <p className="text-xs text-slate-ink/60">
                  Email the current summary
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <label className="block text-sm">
                <span className="mb-1 block text-xs text-slate-ink/70">To</span>
                <input
                  type="text"
                  value={emailTo}
                  onChange={(e) => setEmailTo(e.target.value)}
                  placeholder="team@company.com"
                  className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm outline-none focus:border-sea"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-xs text-slate-ink/70">CC</span>
                <input
                  type="text"
                  value={emailCc}
                  onChange={(e) => setEmailCc(e.target.value)}
                  placeholder="optional@company.com"
                  className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm outline-none focus:border-sea"
                />
              </label>
            </div>

            <p className="mt-2 text-xs text-slate-ink/50">
              Separate multiple emails with commas
            </p>

            <button
              type="button"
              onClick={onSendEmail}
              disabled={sending}
              className="mt-auto inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-md bg-pine px-4 py-2.5 text-sm font-medium text-white hover:bg-pine-deep disabled:opacity-60"
            >
              <Mail size={15} />
              {sending ? 'Sending…' : 'Send email'}
            </button>
          </section>
        </div>
      </div>

      <section className="rounded-2xl border border-line bg-white/90 p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold">History</h2>
          <span className="text-xs text-slate-ink/55">
            {history.length} report{history.length === 1 ? '' : 's'}
          </span>
        </div>

        {history.length === 0 ? (
          <p className="py-6 text-sm text-slate-ink/60">No reports yet.</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {history.map((r, i) => (
              <article
                key={r.id}
                style={{ animationDelay: `${i * 40}ms` }}
                className="animate-slide-in rounded-xl border border-line bg-fog/30 p-4"
              >
                <p className="text-xs font-medium uppercase tracking-wide text-slate-ink/60">
                  {format(parseISO(r.date), 'EEE, MMM d yyyy')}
                </p>
                <p className="mt-2 line-clamp-6 whitespace-pre-wrap text-sm leading-relaxed text-ink">
                  {r.generatedSummary || r.content}
                </p>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
