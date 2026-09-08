import { FormEvent, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function LoginPage() {
  const { login, user, loading } = useAuth();
  const navigate = useNavigate();
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
      await login(email, password);
      navigate('/');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || 'Login failed';
      setError(Array.isArray(msg) ? msg.join(', ') : msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="animate-fade-up w-full max-w-md">
        <p className="font-display text-3xl font-semibold text-pine-deep">
          Welcome back
        </p>
        <p className="mt-2 text-slate-ink/70">
          Sign in to your project task sheet dashboard.
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
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
          <p className="text-center text-sm text-slate-ink/70">
            No account?{' '}
            <Link to="/register" className="text-pine underline">
              Create one
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
