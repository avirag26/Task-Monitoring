import { useEffect, useState, type FormEvent } from 'react';
import { UserPlus, Trash2 } from 'lucide-react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import type { Member, MemberRole, Project } from '../types';

export function PeoplePage() {
  const { workspaceOwnerId, isOwner, refreshMe } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<MemberRole>('editor');
  const [allProjects, setAllProjects] = useState(true);
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);

  const load = async () => {
    if (!workspaceOwnerId) return;
    setLoading(true);
    try {
      const [membersRes, projectsRes] = await Promise.all([
        api.get<Member[]>('/members', { params: { workspaceOwnerId } }),
        api.get<Project[]>('/projects', { params: { workspaceOwnerId } }),
      ]);
      setMembers(membersRes.data);
      setProjects(projectsRes.data);
    } catch {
      setError('Failed to load people');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [workspaceOwnerId]);

  const toggleProject = (id: string) => {
    setSelectedProjectIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    );
  };

  const invite = async (e: FormEvent) => {
    e.preventDefault();
    if (!isOwner) return;
    setError('');

    if (!allProjects && selectedProjectIds.length === 0) {
      setError('Select at least one project, or choose All projects');
      return;
    }

    try {
      await api.post('/members', {
        email,
        role,
        workspaceOwnerId,
        projectIds: allProjects ? [] : selectedProjectIds,
      });
      setEmail('');
      setRole('editor');
      setAllProjects(true);
      setSelectedProjectIds([]);
      await load();
      await refreshMe();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || 'Invite failed';
      setError(Array.isArray(msg) ? msg.join(', ') : String(msg));
    }
  };

  const updateMember = async (
    id: string,
    payload: { role?: MemberRole; projectIds?: string[] },
  ) => {
    if (!isOwner) return;
    await api.patch(`/members/${id}`, payload);
    await load();
    setEditingId(null);
  };

  const remove = async (id: string) => {
    if (!isOwner || !confirm('Remove this person?')) return;
    await api.delete(`/members/${id}`);
    await load();
  };

  const startEditAccess = (m: Member) => {
    setEditingId(m.id);
    if (m.projectsAccess?.all || !m.projectIds?.length) {
      setAllProjects(true);
      setSelectedProjectIds([]);
    } else {
      setAllProjects(false);
      setSelectedProjectIds([...(m.projectIds || [])]);
    }
  };

  return (
    <div className="animate-fade-up mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold text-pine-deep">
          People & Roles
        </h1>
        <p className="mt-1 text-sm text-slate-ink/70">
          Invite by email, set editor/viewer, and choose which projects they can
          see or edit.
        </p>
      </div>

      {isOwner && (
        <form
          onSubmit={invite}
          className="rounded-2xl border border-line bg-white/85 p-5 shadow-sm"
        >
          <div className="flex items-center gap-2 text-sm font-medium">
            <UserPlus size={16} />
            Invite someone
          </div>
          {error && (
            <p className="mt-3 rounded-md bg-coral/15 px-3 py-2 text-sm text-coral">
              {error}
            </p>
          )}
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <input
              type="email"
              required
              placeholder="shalet@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 rounded-md border border-line px-3 py-2 text-sm"
            />
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as MemberRole)}
              className="cursor-pointer rounded-md border border-line px-3 py-2 text-sm"
            >
              <option value="editor">Editor — can edit tasks</option>
              <option value="viewer">Viewer — view only</option>
            </select>
          </div>

          <div className="mt-4 rounded-xl border border-line bg-fog/60 p-4">
            <p className="text-sm font-medium text-ink">
              Project access
            </p>
            <p className="mt-1 text-xs text-slate-ink/60">
              Choose what they can {role === 'editor' ? 'edit' : 'see'}.
            </p>

            <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={allProjects}
                onChange={(e) => {
                  setAllProjects(e.target.checked);
                  if (e.target.checked) setSelectedProjectIds([]);
                }}
                className="cursor-pointer accent-pine"
              />
              All projects
            </label>

            {!allProjects && (
              <ul className="mt-3 space-y-2">
                {projects.map((p) => (
                  <li key={p.id}>
                    <label className="flex cursor-pointer items-center gap-2 rounded-md border border-line bg-white px-3 py-2 text-sm hover:bg-mist/50">
                      <input
                        type="checkbox"
                        checked={selectedProjectIds.includes(p.id)}
                        onChange={() => toggleProject(p.id)}
                        className="cursor-pointer accent-pine"
                      />
                      <span className="font-medium">{p.name}</span>
                      <span className="text-xs text-slate-ink/50">
                        {role === 'editor' ? 'can edit' : 'can view'}
                      </span>
                    </label>
                  </li>
                ))}
                {projects.length === 0 && (
                  <li className="text-sm text-slate-ink/60">
                    No projects yet. Create a project first, then invite people.
                  </li>
                )}
              </ul>
            )}
          </div>

          <button
            type="submit"
            className="mt-4 cursor-pointer rounded-md bg-pine px-4 py-2 text-sm font-medium text-white hover:bg-pine-deep"
          >
            Invite
          </button>
          <p className="mt-3 text-xs text-slate-ink/60">
            They sign up (or log in) with that email to access your workspace.
          </p>
        </form>
      )}

      {!isOwner && (
        <p className="rounded-xl border border-line bg-white/70 px-4 py-3 text-sm text-slate-ink/70">
          Only the workspace owner can manage people.
        </p>
      )}

      <section className="rounded-2xl border border-line bg-white/85 p-5">
        <h2 className="font-display text-xl font-semibold">Team</h2>
        {loading ? (
          <p className="mt-4 text-sm text-slate-ink/60">Loading…</p>
        ) : (
          <ul className="mt-4 divide-y divide-line/70">
            {members.map((m) => (
              <li key={m.id} className="space-y-3 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{m.email}</p>
                    <p className="text-xs text-slate-ink/60">
                      {m.userId
                        ? `Linked${m.user?.name ? ` · ${m.user.name}` : ''}`
                        : 'Pending signup'}
                    </p>
                    <p className="mt-1.5 text-xs text-slate-ink/80">
                      {m.projectsAccess?.all
                        ? 'Access: All projects'
                        : `Access: ${
                            m.projectsAccess?.projects
                              .map((p) => p.name)
                              .join(', ') || 'No projects'
                          }`}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {isOwner ? (
                      <select
                        value={m.role}
                        onChange={(e) =>
                          updateMember(m.id, {
                            role: e.target.value as MemberRole,
                          })
                        }
                        className="cursor-pointer rounded-md border border-line px-2 py-1.5 text-sm"
                      >
                        <option value="editor">Editor</option>
                        <option value="viewer">Viewer</option>
                      </select>
                    ) : (
                      <span className="rounded-md bg-mist px-2 py-1 text-xs capitalize">
                        {m.role}
                      </span>
                    )}
                    {isOwner && (
                      <>
                        <button
                          type="button"
                          onClick={() =>
                            editingId === m.id
                              ? setEditingId(null)
                              : startEditAccess(m)
                          }
                          className="cursor-pointer rounded-md border border-line px-2 py-1.5 text-sm hover:bg-fog"
                        >
                          {editingId === m.id ? 'Cancel' : 'Edit access'}
                        </button>
                        <button
                          type="button"
                          onClick={() => remove(m.id)}
                          className="cursor-pointer rounded-md border border-coral/30 p-2 text-coral hover:bg-coral/10"
                        >
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {isOwner && editingId === m.id && (
                  <div className="rounded-xl border border-line bg-fog/50 p-3">
                    <label className="flex cursor-pointer items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={allProjects}
                        onChange={(e) => {
                          setAllProjects(e.target.checked);
                          if (e.target.checked) setSelectedProjectIds([]);
                        }}
                        className="cursor-pointer accent-pine"
                      />
                      All projects
                    </label>
                    {!allProjects && (
                      <ul className="mt-2 space-y-1.5">
                        {projects.map((p) => (
                          <li key={p.id}>
                            <label className="flex cursor-pointer items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                checked={selectedProjectIds.includes(p.id)}
                                onChange={() => toggleProject(p.id)}
                                className="cursor-pointer accent-pine"
                              />
                              {p.name}
                            </label>
                          </li>
                        ))}
                      </ul>
                    )}
                    <button
                      type="button"
                      onClick={() =>
                        updateMember(m.id, {
                          projectIds: allProjects ? [] : selectedProjectIds,
                        })
                      }
                      className="mt-3 cursor-pointer rounded-md bg-pine px-3 py-1.5 text-sm text-white hover:bg-pine-deep"
                    >
                      Save access
                    </button>
                  </div>
                )}
              </li>
            ))}
            {members.length === 0 && (
              <li className="py-6 text-sm text-slate-ink/60">
                No one invited yet. Add an editor or viewer by email.
              </li>
            )}
          </ul>
        )}
      </section>
    </div>
  );
}
