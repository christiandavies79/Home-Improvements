import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';

const STATUS_LABELS: Record<string, string> = {
  not_started: 'Not Started',
  planning: 'Planning',
  in_progress: 'In Progress',
  almost_done: 'Almost Done',
  complete: 'Complete',
};

const PRIORITY_COLORS: Record<string, string> = {
  low: 'bg-sage-100 text-sage-700',
  medium: 'bg-cream-300 text-yellow-800',
  high: 'bg-orange-100 text-orange-700',
  urgent: 'bg-red-100 text-red-700',
};

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [recentProjects, setRecentProjects] = useState<any[]>([]);
  const [activity, setActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.stats(),
      api.projects.list(),
      api.projects.activity(),
    ]).then(([s, p, a]) => {
      setStats(s);
      setRecentProjects(p.slice(0, 6));
      setActivity(a.slice(0, 10));
    }).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-10 h-10 border-4 border-terra-200 border-t-terra-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div>
        <h1 className="font-display text-2xl font-bold text-gray-800">
          Hey {user?.displayName}!
        </h1>
        <p className="text-gray-500 mt-1">Here's what's happening with your home projects</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Active" value={stats?.activeProjects || 0} color="terra" />
        <StatCard label="Completed" value={stats?.completedProjects || 0} color="sage" />
        <StatCard
          label="Budget"
          value={`$${(stats?.totalBudget || 0).toLocaleString()}`}
          color="warm"
        />
        <StatCard
          label="Spent"
          value={`$${(stats?.totalSpent || 0).toLocaleString()}`}
          color="cream"
        />
      </div>

      {/* Spaces Overview */}
      {stats?.bySpace?.length > 0 && (
        <div className="card">
          <h2 className="font-display text-lg font-bold text-gray-800 mb-3">By Room</h2>
          <div className="space-y-2">
            {stats.bySpace.map((space: any) => (
              <div key={space.name} className="flex items-center gap-3">
                <span className="text-sm text-gray-600 w-32 truncate">{space.name}</span>
                <div className="flex-1 bg-warm-100 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-terra-400 h-full rounded-full transition-all"
                    style={{ width: `${space.count > 0 ? (space.completed / space.count) * 100 : 0}%` }}
                  />
                </div>
                <span className="text-xs text-gray-500 w-16 text-right">
                  {space.completed}/{space.count}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-6">
        {/* Recent Projects */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-lg font-bold text-gray-800">Recent Projects</h2>
            <Link to="/projects" className="text-sm text-terra-600 hover:text-terra-700 font-medium">
              View all
            </Link>
          </div>
          {recentProjects.length === 0 ? (
            <div className="card text-center py-8">
              <p className="text-gray-500 mb-3">No projects yet</p>
              <Link to="/projects/new" className="btn-primary inline-block text-sm">
                Create your first project
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {recentProjects.map(project => (
                <Link key={project.id} to={`/projects/${project.id}`} className="card block hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-medium text-gray-800 truncate">{project.title}</h3>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {project.spaceName || 'No space'} &middot; {STATUS_LABELS[project.status]}
                      </p>
                    </div>
                    <span className={`badge shrink-0 ${PRIORITY_COLORS[project.priority]}`}>
                      {project.priority}
                    </span>
                  </div>
                  {project.estimatedBudget > 0 && (
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex-1 bg-warm-100 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-sage-400 h-full rounded-full"
                          style={{ width: `${Math.min(100, (project.spentBudget / project.estimatedBudget) * 100)}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500">
                        ${project.spentBudget}/${project.estimatedBudget}
                      </span>
                    </div>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Activity Feed */}
        <div>
          <h2 className="font-display text-lg font-bold text-gray-800 mb-3">Recent Activity</h2>
          {activity.length === 0 ? (
            <div className="card text-center py-8">
              <p className="text-gray-500">No activity yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {activity.map(item => (
                <div key={item.id} className="card py-3">
                  <div className="flex items-start gap-3">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                      style={{ backgroundColor: item.avatarColor || '#C2603A' }}
                    >
                      {item.userName?.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm text-gray-700">
                        <span className="font-medium">{item.userName}</span>{' '}
                        {item.details || item.action}
                      </p>
                      {item.projectTitle && (
                        <Link
                          to={`/projects/${item.projectId}`}
                          className="text-xs text-terra-600 hover:underline"
                        >
                          {item.projectTitle}
                        </Link>
                      )}
                      <p className="text-xs text-gray-400 mt-0.5">
                        {formatTimeAgo(item.createdAt)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  const colorMap: Record<string, string> = {
    terra: 'bg-terra-50 border-terra-200',
    sage: 'bg-sage-50 border-sage-200',
    warm: 'bg-warm-50 border-warm-200',
    cream: 'bg-cream-50 border-cream-200',
  };

  return (
    <div className={`rounded-xl border p-4 ${colorMap[color] || colorMap.warm}`}>
      <p className="text-2xl font-display font-bold text-gray-800">{value}</p>
      <p className="text-xs text-gray-500 mt-1">{label}</p>
    </div>
  );
}

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}
