import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import api from '../lib/api';
import type { MeResponse, User, Workspace } from '../types';

interface AuthContextValue {
  user: User | null;
  me: MeResponse | null;
  loading: boolean;
  workspaceOwnerId: string | null;
  currentWorkspace: Workspace | null;
  canEdit: boolean;
  isOwner: boolean;
  setWorkspaceOwnerId: (id: string) => void;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshMe: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function pickDefaultWorkspace(data: MeResponse): string {
  if (data.defaultWorkspaceOwnerId) return data.defaultWorkspaceOwnerId;
  const shared = data.workspaces.find((w) => !w.isOwn);
  if (shared) return shared.ownerId;
  return data.workspaces[0]?.ownerId ?? data.id;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  });
  const [me, setMe] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [workspaceOwnerId, setWorkspaceOwnerId] = useState<string | null>(
    () => localStorage.getItem('workspaceOwnerId'),
  );

  const refreshMe = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setMe(null);
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const { data } = await api.get<MeResponse>('/users/me');
      setMe(data);
      setUser({
        id: data.id,
        email: data.email,
        name: data.name,
        autoDailyReportEnabled: data.autoDailyReportEnabled,
        autoDailyReportTo: data.autoDailyReportTo,
        autoDailyReportCc: data.autoDailyReportCc,
      });
      localStorage.setItem(
        'user',
        JSON.stringify({ id: data.id, email: data.email, name: data.name }),
      );

      const stillValid =
        workspaceOwnerId &&
        data.workspaces.some((w) => w.ownerId === workspaceOwnerId);

      if (!stillValid) {
        const next = pickDefaultWorkspace(data);
        setWorkspaceOwnerId(next);
        localStorage.setItem('workspaceOwnerId', next);
      }
    } catch {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUser(null);
      setMe(null);
    } finally {
      setLoading(false);
    }
  }, [workspaceOwnerId]);

  useEffect(() => {
    refreshMe();
  }, []);

  const applySession = async (accessToken: string, authUser: User) => {
    localStorage.setItem('token', accessToken);
    localStorage.setItem('user', JSON.stringify(authUser));
    setUser(authUser);

    const { data } = await api.get<MeResponse>('/users/me');
    setMe(data);
    const next = pickDefaultWorkspace(data);
    setWorkspaceOwnerId(next);
    localStorage.setItem('workspaceOwnerId', next);
    setLoading(false);
  };

  const login = async (email: string, password: string) => {
    const { data } = await api.post('/auth/login', { email, password });
    await applySession(data.accessToken, data.user);
  };

  const register = async (name: string, email: string, password: string) => {
    const { data } = await api.post('/auth/register', {
      name,
      email,
      password,
    });
    await applySession(data.accessToken, data.user);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('workspaceOwnerId');
    setUser(null);
    setMe(null);
    setWorkspaceOwnerId(null);
  };

  const handleSetWorkspace = (id: string) => {
    setWorkspaceOwnerId(id);
    localStorage.setItem('workspaceOwnerId', id);
  };

  const currentWorkspace = useMemo(() => {
    if (!me || !workspaceOwnerId) return null;
    return me.workspaces.find((w) => w.ownerId === workspaceOwnerId) ?? null;
  }, [me, workspaceOwnerId]);

  const canEdit =
    currentWorkspace?.role === 'owner' || currentWorkspace?.role === 'editor';
  const isOwner =
    currentWorkspace?.role === 'owner' || currentWorkspace?.isOwn === true;

  const value: AuthContextValue = {
    user,
    me,
    loading,
    workspaceOwnerId,
    currentWorkspace,
    canEdit: !!canEdit,
    isOwner: !!isOwner,
    setWorkspaceOwnerId: handleSetWorkspace,
    login,
    register,
    logout,
    refreshMe,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
