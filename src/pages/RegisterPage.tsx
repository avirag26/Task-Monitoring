import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function RegisterPage() {
  const { register, user, loading } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!loading && user) return <Navigate to="/" replace />;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await register(name, email, password);
      navigate('/');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || 'Registration failed';
      setError(Array.isArray(msg) ? msg.join(', ') : msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="animate-fade-up w-full max-w-md">
        <p className="font-display text-3xl font-semibold text-pine-deep">
          Create your workspace
        </p>
        <p className="mt-2 text-slate-ink/70">
          Register with your name — your dashboard will use it.
        </p>

        <form
          onSubmit={onSubmit}
          className="mt-8 space-y-4 rounded-2xl border border-line bg-white/80 p-6 shadow-sm backdrop-blur"
        >
          {error && (
            <p className="rounded-md bg-coral/15 px-3 py-2 text-sm text-coral">
              {error}
            </p>
          )}
          <label className="block text-sm">
            <span className="mb-1 block text-slate-ink/80">Name</span>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md border border-line px-3 py-2 outline-none focus:border-sea"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-slate-ink/80">Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-line px-3 py-2 outline-none focus:border-sea"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-slate-ink/80">Password</span>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-line px-3 py-2 outline-none focus:border-sea"
            />
          </label>
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-md bg-pine py-2.5 text-sm font-medium text-white hover:bg-pine-deep disabled:opacity-60"
          >
            {submitting ? 'Creating…' : 'Create account'}
          </button>
          <p className="text-center text-sm text-slate-ink/70">
            Already have an account?{' '}
            <Link to="/login" className="text-pine underline">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
