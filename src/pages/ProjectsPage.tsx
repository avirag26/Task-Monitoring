import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Columns3, Plus, Trash2, X, ZoomIn, ZoomOut } from 'lucide-react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import type { Project, Task, TaskStatus } from '../types';
import { StatusSelect } from '../components/StatusBadge';

type DraftTask = Partial<Task> & { task: string };
type ColumnKind = 'date' | 'text' | 'link' | 'status' | 'custom';

interface ResolvedColumn {
  label: string;
  kind: ColumnKind;
  field?: keyof Task;
}

const DEFAULT_COLUMNS = [
  'Date',
  'Task',
  'URL',
  'Content Completion Date',
  'Content Status',
  'Content Doc',
  'Design Completion Date',
  'Design Status',
  'Figma Link',
  'Expected Completion Date',
  'Final Review & Approval Date',
  'Final Status',
  'Comments',
];

/** Map known column labels (and short aliases) to task fields. */
const BUILTIN_COLUMNS: Record<
  string,
  { field: keyof Task; kind: ColumnKind }
> = {
  Date: { field: 'date', kind: 'date' },
  Task: { field: 'task', kind: 'text' },
  URL: { field: 'url', kind: 'link' },
  'Content Completion Date': { field: 'contentCompletionDate', kind: 'date' },
  'Content Completion': { field: 'contentCompletionDate', kind: 'date' },
  'Content Status': { field: 'contentStatus', kind: 'status' },
  'Content Doc': { field: 'contentDoc', kind: 'link' },
  'Design Completion Date': { field: 'designCompletionDate', kind: 'date' },
  'Design Completion': { field: 'designCompletionDate', kind: 'date' },
  'Design Status': { field: 'designStatus', kind: 'status' },
  'Figma Link': { field: 'figmaLink', kind: 'link' },
  'Expected Completion Date': { field: 'expectedCompletionDate', kind: 'date' },
  'Expected Completion': { field: 'expectedCompletionDate', kind: 'date' },
  'Final Review & Approval Date': {
    field: 'finalReviewApprovalDate',
    kind: 'date',
  },
  'Final Review & Approval': { field: 'finalReviewApprovalDate', kind: 'date' },
  'Final Status': { field: 'finalStatus', kind: 'status' },
  Comments: { field: 'comments', kind: 'text' },
};

function resolveColumn(label: string): ResolvedColumn {
  const builtin = BUILTIN_COLUMNS[label];
  if (builtin) {
    return { label, kind: builtin.kind, field: builtin.field };
  }
  return { label, kind: 'custom' };
}

const emptyDraft = (): DraftTask => ({
  task: '',
  date: new Date().toISOString().slice(0, 10),
  contentStatus: 'not_started',
  designStatus: 'not_started',
  finalStatus: 'not_started',
});

export function ProjectsPage() {
  const { workspaceOwnerId, canEdit } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [newProjectName, setNewProjectName] = useState('');
  const [showAddProject, setShowAddProject] = useState(false);
  const [draft, setDraft] = useState<DraftTask>(emptyDraft());
  const [showAddTask, setShowAddTask] = useState(false);
  const [showColumns, setShowColumns] = useState(false);
  const [columnDraft, setColumnDraft] = useState<string[]>([]);
  const [newColumn, setNewColumn] = useState('');
  const [error, setError] = useState('');
  const [zoom, setZoom] = useState(100);

  const active = projects.find((p) => p.id === activeId) ?? null;

  const columns = useMemo(() => {
    const labels =
      active?.customColumns && active.customColumns.length > 0
        ? active.customColumns
        : DEFAULT_COLUMNS;
    return labels.map(resolveColumn);
  }, [active?.customColumns]);

  const load = async () => {
    if (!workspaceOwnerId) return;
    setLoading(true);
    try {
      const { data } = await api.get<Project[]>('/projects', {
        params: { workspaceOwnerId },
      });
      setProjects(data);
      if (!activeId && data.length) setActiveId(data[0].id);
      if (activeId && !data.find((p) => p.id === activeId)) {
        setActiveId(data[0]?.id ?? null);
      }
    } catch {
      setError('Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [workspaceOwnerId]);

  const createProject = async () => {
    if (!newProjectName.trim() || !canEdit) return;
    const { data } = await api.post<Project>('/projects', {
      name: newProjectName.trim(),
      workspaceOwnerId,
    });
    setProjects((prev) => [...prev, { ...data, tasks: [] }]);
    setActiveId(data.id);
    setNewProjectName('');
    setShowAddProject(false);
  };

  const deleteProject = async (id: string) => {
    if (!canEdit || !confirm('Delete this project and all its tasks?')) return;
    await api.delete(`/projects/${id}`);
    setProjects((prev) => prev.filter((p) => p.id !== id));
    if (activeId === id) setActiveId(null);
  };

  const addTask = async () => {
    if (!active || !draft.task.trim() || !canEdit) return;
    const { data } = await api.post<Task>('/tasks', {
      projectId: active.id,
      ...draft,
    });
    setProjects((prev) =>
      prev.map((p) =>
        p.id === active.id
          ? { ...p, tasks: [...(p.tasks || []), data] }
          : p,
      ),
    );
    setDraft(emptyDraft());
    setShowAddTask(false);
  };

  const deleteTask = async (id: string) => {
    if (!canEdit || !confirm('Delete this task?')) return;
    await api.delete(`/tasks/${id}`);
    setProjects((prev) =>
      prev.map((p) => ({
        ...p,
        tasks: (p.tasks || []).filter((t) => t.id !== id),
      })),
    );
  };

  const openColumns = () => {
    if (!active) return;
    setColumnDraft(
      active.customColumns?.length ? [...active.customColumns] : [...DEFAULT_COLUMNS],
    );
    setNewColumn('');
    setShowColumns(true);
  };

  const saveColumns = async () => {
    if (!active || !canEdit) return;
    const cleaned = columnDraft.map((c) => c.trim()).filter(Boolean);
    if (!cleaned.length) {
      setError('Keep at least one column');
      return;
    }
    try {
      const { data } = await api.patch<Project>(`/projects/${active.id}`, {
        customColumns: cleaned,
      });
      setProjects((prev) =>
        prev.map((p) =>
          p.id === active.id
            ? { ...p, ...data, tasks: p.tasks, customColumns: cleaned }
            : p,
        ),
      );
      setShowColumns(false);
      setError('');
    } catch {
      setError('Failed to save columns');
    }
  };

  const updateCell = async (
    taskId: string,
    field: keyof Task,
    value: string,
  ) => {
    if (!canEdit) return;
    const { data } = await api.patch<Task>(`/tasks/${taskId}`, {
      [field]: value || null,
    });
    setProjects((prev) =>
      prev.map((p) => ({
        ...p,
        tasks: (p.tasks || []).map((t) => (t.id === taskId ? data : t)),
      })),
    );
  };

  const updateCustomField = async (
    task: Task,
    columnLabel: string,
    value: string,
  ) => {
    if (!canEdit) return;
    const customFields = {
      ...(task.customFields || {}),
      [columnLabel]: value,
    };
    const { data } = await api.patch<Task>(`/tasks/${task.id}`, {
      customFields,
    });
    setProjects((prev) =>
      prev.map((p) => ({
        ...p,
        tasks: (p.tasks || []).map((t) => (t.id === task.id ? data : t)),
      })),
    );
  };

  if (loading) {
    return <p className="text-slate-ink/70">Loading projects…</p>;
  }

  return (
    <div className="animate-fade-up space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold text-pine-deep">
            Project Sheets
          </h1>
          <p className="mt-1 text-sm text-slate-ink/70">
            Track content, design, and final review across projects.
          </p>
        </div>
        {canEdit && (
          <button
            type="button"
            onClick={() => setShowAddProject(true)}
            className="inline-flex items-center gap-2 rounded-md bg-pine px-4 py-2 text-sm font-medium text-white hover:bg-pine-deep"
          >
            <Plus size={16} />
            Add project
          </button>
        )}
      </div>

      {error && (
        <p className="rounded-md bg-coral/15 px-3 py-2 text-sm text-coral">
          {error}
        </p>
      )}

      {showAddProject && (
        <div className="flex flex-wrap gap-2 rounded-xl border border-line bg-white/80 p-4">
          <input
            autoFocus
            placeholder="e.g. CureandWellness, Dtameris OS"
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && createProject()}
            className="min-w-[240px] flex-1 rounded-md border border-line px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={createProject}
            className="rounded-md bg-pine px-4 py-2 text-sm text-white"
          >
            Create
          </button>
          <button
            type="button"
            onClick={() => setShowAddProject(false)}
            className="rounded-md border border-line px-3 py-2 text-sm"
          >
            Cancel
          </button>
        </div>
      )}

      {projects.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-white/50 px-6 py-16 text-center">
          <p className="font-display text-xl text-pine-deep">No projects yet</p>
          <p className="mt-2 text-sm text-slate-ink/70">
            Add projects like CureandWellness or Dtameris OS to start your sheet.
          </p>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {projects.map((p, i) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setActiveId(p.id)}
                style={{ animationDelay: `${i * 40}ms` }}
                className={`animate-slide-in rounded-md px-4 py-2 text-sm font-medium transition ${
                  activeId === p.id
                    ? 'bg-pine text-white'
                    : 'border border-line bg-white text-slate-ink hover:bg-mist'
                }`}
              >
                {p.name}
                <span className="ml-2 opacity-70">
                  ({p.tasks?.length ?? 0})
                </span>
              </button>
            ))}
          </div>

          {active && (
            <section className="overflow-hidden rounded-2xl border border-line bg-white/85 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
                <div>
                  <h2 className="font-display text-xl font-semibold text-ink">
                    {active.name}
                  </h2>
                  <p className="text-xs text-slate-ink/60">
                    {active.tasks?.length ?? 0} tasks · {columns.length} columns
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="inline-flex items-center gap-1 rounded-md border border-line bg-fog/40 p-1">
                    <button
                      type="button"
                      title="Zoom out"
                      onClick={() => setZoom((z) => Math.max(50, z - 10))}
                      className="cursor-pointer rounded p-1.5 hover:bg-white"
                    >
                      <ZoomOut size={15} />
                    </button>
                    <button
                      type="button"
                      title="Reset zoom"
                      onClick={() => setZoom(100)}
                      className="min-w-[52px] cursor-pointer rounded px-1 py-1 text-xs font-medium hover:bg-white"
                    >
                      {zoom}%
                    </button>
                    <button
                      type="button"
                      title="Zoom in"
                      onClick={() => setZoom((z) => Math.min(140, z + 10))}
                      className="cursor-pointer rounded p-1.5 hover:bg-white"
                    >
                      <ZoomIn size={15} />
                    </button>
                    <button
                      type="button"
                      title="Fit width"
                      onClick={() => setZoom(70)}
                      className="cursor-pointer rounded px-2 py-1 text-xs hover:bg-white"
                    >
                      Fit
                    </button>
                  </div>
                  {canEdit && (
                    <>
                      <button
                        type="button"
                        onClick={openColumns}
                        className="inline-flex items-center gap-2 rounded-md border border-line px-3 py-2 text-sm hover:bg-fog"
                      >
                        <Columns3 size={15} />
                        Customize columns
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDraft(emptyDraft());
                          setShowAddTask(true);
                        }}
                        className="inline-flex items-center gap-2 rounded-md bg-sea px-3 py-2 text-sm font-medium text-white hover:bg-pine"
                      >
                        <Plus size={15} />
                        Add task
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteProject(active.id)}
                        className="inline-flex items-center gap-2 rounded-md border border-coral/40 px-3 py-2 text-sm text-coral hover:bg-coral/10"
                      >
                        <Trash2 size={15} />
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="sheet-scroll max-h-[70vh] overflow-auto">
                <div
                  className="origin-top-left"
                  style={{ zoom: zoom / 100 }}
                >
                  <table className="w-full border-separate border-spacing-0 text-left text-sm">
                    <thead className="sticky top-0 z-20">
                      <tr className="bg-fog text-xs uppercase tracking-wide text-slate-ink/70 shadow-sm">
                        {columns.map((col, idx) => (
                          <th
                            key={`${col.label}-${idx}`}
                            className="whitespace-nowrap border-b border-line bg-fog px-3 py-3 font-semibold"
                            style={{ minWidth: idx === 1 ? 180 : 120 }}
                          >
                            {col.label}
                          </th>
                        ))}
                        {canEdit && (
                          <th className="whitespace-nowrap border-b border-line bg-fog px-3 py-3">
                            Actions
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {(active.tasks || []).map((t) => (
                        <tr
                          key={t.id}
                          className="bg-white hover:bg-fog/50"
                        >
                          {columns.map((col, idx) => (
                            <td
                              key={`${t.id}-${col.label}-${idx}`}
                              className={`border-b border-line/70 px-3 py-2 align-middle ${
                                idx === 1 ? 'font-medium' : ''
                              }`}
                              style={{ minWidth: idx === 1 ? 180 : 120 }}
                            >
                              <ColumnCell
                                column={col}
                                task={t}
                                canEdit={canEdit}
                                onUpdateField={(field, value) =>
                                  updateCell(t.id, field, value)
                                }
                                onUpdateCustom={(label, value) =>
                                  updateCustomField(t, label, value)
                                }
                              />
                            </td>
                          ))}
                          {canEdit && (
                            <td className="border-b border-line/70 px-3 py-2">
                              <button
                                type="button"
                                onClick={() => deleteTask(t.id)}
                                className="cursor-pointer text-coral hover:underline"
                              >
                                Delete
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                      {(active.tasks || []).length === 0 && (
                        <tr>
                          <td
                            colSpan={columns.length + (canEdit ? 1 : 0)}
                            className="px-4 py-10 text-center text-slate-ink/60"
                          >
                            No tasks yet.{' '}
                            {canEdit ? 'Add your first task.' : ''}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          )}
        </>
      )}

      {showAddTask && (
        <Modal title="Add task" onClose={() => setShowAddTask(false)}>
          <TaskForm draft={draft} setDraft={setDraft} onSave={addTask} />
        </Modal>
      )}

      {showColumns && (
        <Modal
          title="Customize sheet columns"
          onClose={() => setShowColumns(false)}
        >
          <div className="space-y-3">
            <p className="text-sm text-slate-ink/70">
              Add, rename, reorder, or remove columns. Changes apply to this
              project sheet immediately after save.
            </p>
            <ul className="space-y-2">
              {columnDraft.map((col, idx) => (
                <li
                  key={`col-edit-${idx}`}
                  className="flex items-center gap-2 rounded-md border border-line px-3 py-2"
                >
                  <span className="w-5 text-xs text-slate-ink/40">{idx + 1}</span>
                  <input
                    value={col}
                    onChange={(e) => {
                      const next = [...columnDraft];
                      next[idx] = e.target.value;
                      setColumnDraft(next);
                    }}
                    className="flex-1 border-none bg-transparent outline-none"
                  />
                  <button
                    type="button"
                    title="Move up"
                    disabled={idx === 0}
                    onClick={() => {
                      if (idx === 0) return;
                      const next = [...columnDraft];
                      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
                      setColumnDraft(next);
                    }}
                    className="cursor-pointer px-1 text-xs text-slate-ink/60 disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    title="Move down"
                    disabled={idx === columnDraft.length - 1}
                    onClick={() => {
                      if (idx >= columnDraft.length - 1) return;
                      const next = [...columnDraft];
                      [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
                      setColumnDraft(next);
                    }}
                    className="cursor-pointer px-1 text-xs text-slate-ink/60 disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    title="Remove column"
                    onClick={() =>
                      setColumnDraft(columnDraft.filter((_, i) => i !== idx))
                    }
                    className="cursor-pointer rounded p-1 hover:bg-coral/10"
                  >
                    <X size={16} className="text-coral" />
                  </button>
                </li>
              ))}
            </ul>
            <div className="flex gap-2">
              <input
                value={newColumn}
                onChange={(e) => setNewColumn(e.target.value)}
                placeholder="New column name"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (!newColumn.trim()) return;
                    setColumnDraft([...columnDraft, newColumn.trim()]);
                    setNewColumn('');
                  }
                }}
                className="flex-1 rounded-md border border-line px-3 py-2 text-sm"
              />
              <button
                type="button"
                onClick={() => {
                  if (!newColumn.trim()) return;
                  setColumnDraft([...columnDraft, newColumn.trim()]);
                  setNewColumn('');
                }}
                className="cursor-pointer rounded-md border border-line px-3 py-2 text-sm hover:bg-fog"
              >
                Add
              </button>
            </div>
            <button
              type="button"
              onClick={saveColumns}
              className="w-full cursor-pointer rounded-md bg-pine py-2 text-sm text-white hover:bg-pine-deep"
            >
              Save columns
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function ColumnCell({
  column,
  task,
  canEdit,
  onUpdateField,
  onUpdateCustom,
}: {
  column: ResolvedColumn;
  task: Task;
  canEdit: boolean;
  onUpdateField: (field: keyof Task, value: string) => void;
  onUpdateCustom: (label: string, value: string) => void;
}) {
  if (column.kind === 'custom' || !column.field) {
    const value = task.customFields?.[column.label] ?? '';
    if (!canEdit) return <span>{value || '—'}</span>;
    return (
      <input
        value={value}
        onChange={(e) => onUpdateCustom(column.label, e.target.value)}
        className="min-w-[120px] rounded border border-transparent bg-transparent px-1 py-1 hover:border-line focus:border-sea"
      />
    );
  }

  const field = column.field;
  const raw = task[field];

  if (column.kind === 'date') {
    return (
      <DateCell
        canEdit={canEdit}
        value={(raw as string | null) || null}
        onChange={(v) => onUpdateField(field, v)}
      />
    );
  }

  if (column.kind === 'link') {
    return (
      <LinkOrInput
        canEdit={canEdit}
        value={(raw as string | null) || null}
        onChange={(v) => onUpdateField(field, v)}
      />
    );
  }

  if (column.kind === 'status') {
    return (
      <StatusSelect
        value={(raw as TaskStatus) || 'not_started'}
        onChange={(v) => onUpdateField(field, v)}
        disabled={!canEdit}
      />
    );
  }

  if (!canEdit) return <span>{(raw as string) || '—'}</span>;
  return (
    <input
      value={(raw as string) || ''}
      onChange={(e) => onUpdateField(field, e.target.value)}
      className="w-full min-w-[140px] rounded border border-transparent bg-transparent px-1 py-1 hover:border-line focus:border-sea"
    />
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ margin: 0 }}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <button
        type="button"
        aria-label="Close overlay"
        className="absolute inset-0 cursor-pointer bg-ink/45"
        onClick={onClose}
      />
      <div className="relative z-10 mx-auto my-auto max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-lg font-semibold">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="cursor-pointer rounded-md p-1.5 text-slate-ink/70 hover:bg-mist hover:text-ink"
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}

function TaskForm({
  draft,
  setDraft,
  onSave,
}: {
  draft: DraftTask;
  setDraft: (d: DraftTask) => void;
  onSave: () => void;
}) {
  return (
    <div className="space-y-3">
      <Field
        label="Task"
        value={draft.task}
        onChange={(v) => setDraft({ ...draft, task: v })}
      />
      <Field
        label="Date"
        type="date"
        value={draft.date || ''}
        onChange={(v) => setDraft({ ...draft, date: v })}
      />
      <Field
        label="URL"
        value={draft.url || ''}
        onChange={(v) => setDraft({ ...draft, url: v })}
      />
      <Field
        label="Content Doc"
        value={draft.contentDoc || ''}
        onChange={(v) => setDraft({ ...draft, contentDoc: v })}
      />
      <Field
        label="Figma Link"
        value={draft.figmaLink || ''}
        onChange={(v) => setDraft({ ...draft, figmaLink: v })}
      />
      <Field
        label="Expected Completion"
        type="date"
        value={draft.expectedCompletionDate || ''}
        onChange={(v) => setDraft({ ...draft, expectedCompletionDate: v })}
      />
      <Field
        label="Comments"
        value={draft.comments || ''}
        onChange={(v) => setDraft({ ...draft, comments: v })}
      />
      <button
        type="button"
        onClick={onSave}
        className="w-full cursor-pointer rounded-md bg-pine py-2.5 text-sm font-medium text-white"
      >
        Save task
      </button>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-slate-ink/70">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-line px-3 py-2"
      />
    </label>
  );
}

function LinkOrInput({
  canEdit,
  value,
  onChange,
}: {
  canEdit: boolean;
  value: string | null;
  onChange: (v: string) => void;
}) {
  if (!canEdit) {
    return value ? (
      <a
        href={value}
        target="_blank"
        rel="noreferrer"
        className="text-pine underline"
      >
        Open
      </a>
    ) : (
      <span>—</span>
    );
  }
  return (
    <input
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder="https://"
      className="min-w-[140px] rounded border border-transparent bg-transparent px-1 py-1 hover:border-line focus:border-sea"
    />
  );
}

function DateCell({
  canEdit,
  value,
  onChange,
}: {
  canEdit: boolean;
  value: string | null;
  onChange: (v: string) => void;
}) {
  if (!canEdit) return <span>{value || '—'}</span>;
  return (
    <input
      type="date"
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      className="rounded border border-transparent bg-transparent px-1 py-1 hover:border-line focus:border-sea"
    />
  );
}
