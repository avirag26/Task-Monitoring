export type MemberRole = 'owner' | 'editor' | 'viewer';

export type TaskStatus =
  | 'not_started'
  | 'in_progress'
  | 'completed'
  | 'blocked'
  | 'pending_review';

export interface User {
  id: string;
  email: string;
  name: string;
  autoDailyReportEnabled?: boolean;
  autoDailyReportTo?: string[] | null;
  autoDailyReportCc?: string[] | null;
}

export interface Workspace {
  ownerId: string;
  ownerName: string;
  ownerEmail: string;
  role: MemberRole | 'owner';
  isOwn: boolean;
}

export interface MeResponse extends User {
  workspaces: Workspace[];
  defaultWorkspaceOwnerId?: string;
}

export interface Task {
  id: string;
  projectId: string;
  date: string | null;
  task: string;
  url: string | null;
  contentCompletionDate: string | null;
  contentStatus: TaskStatus;
  contentDoc: string | null;
  designCompletionDate: string | null;
  designStatus: TaskStatus;
  figmaLink: string | null;
  expectedCompletionDate: string | null;
  finalReviewApprovalDate: string | null;
  finalStatus: TaskStatus;
  comments: string | null;
  customFields: Record<string, string> | null;
  sortOrder: number;
}

export interface Project {
  id: string;
  name: string;
  description: string | null;
  sortOrder: number;
  ownerId: string;
  customColumns: string[] | null;
  tasks?: Task[];
}

export interface Member {
  id: string;
  workspaceOwnerId: string;
  email: string;
  role: MemberRole;
  userId: string | null;
  user?: User | null;
  projectIds?: string[] | null;
  projectsAccess?: {
    all: boolean;
    projects: { id: string; name: string }[];
  };
}

export interface DailyReport {
  id: string;
  userId: string;
  date: string;
  content: string;
  generatedSummary?: string | null;
  comments?: string | null;
}

export interface DashboardSummary {
  totals: {
    projects: number;
    tasks: number;
    pending: number;
    completed: number;
  };
  byProject: Array<{
    projectId: string;
    projectName: string;
    total: number;
    pending: number;
    completed: number;
    pendingTasks: Array<{
      id: string;
      task: string;
      contentStatus: TaskStatus;
      designStatus: TaskStatus;
      finalStatus: TaskStatus;
      expectedCompletionDate: string | null;
    }>;
  }>;
  pendingTasks: Array<{
    id: string;
    task: string;
    projectName: string;
    projectId: string;
    contentStatus: TaskStatus;
    designStatus: TaskStatus;
    finalStatus: TaskStatus;
    expectedCompletionDate: string | null;
    date: string | null;
  }>;
}

export const STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: 'not_started', label: 'Not Started' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'pending_review', label: 'Pending Review' },
  { value: 'completed', label: 'Completed' },
  { value: 'blocked', label: 'Blocked' },
];

export const STATUS_LABEL: Record<TaskStatus, string> = {
  not_started: 'Not Started',
  in_progress: 'In Progress',
  pending_review: 'Pending Review',
  completed: 'Completed',
  blocked: 'Blocked',
};
