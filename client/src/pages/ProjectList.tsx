import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';

const STATUS_LABELS: Record<string, string> = {
  not_started: 'Not Started',
  planning: 'Planning',
  in_progress: 'In Progress',
  almost_done: 'Almost Done',
  complete: 'Complete',
};

const STATUS_COLORS: Record<string, string> = {
  not_started: 'bg-gray-100 text-gray-600',
  planning: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-terra-100 text-terra-700',
  almost_done: 'bg-warm-200 text-warm-800',
  complete: 'bg-sage-100 text-sage-700',
};

const PRIORITY_COLORS: Record<string, string> = {
  low: 'bg-sage-100 text-sage-700',
  medium: 'bg-cream-300 text-yellow-800',
  high: 'bg-orange-100 text-orange-700',
  urgent: 'bg-red-100 text-red-700',
};

export default function ProjectList() {
  const [projects, setProjects] = useState<any[]>([]);
  const [spaces, setSpaces] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterSpace, setFilterSpace] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    Promise.all([api.projects.list(), api.spaces.list()])
      .then(([p, s]) => { setProjects(p); setSpaces(s); })
      .finally(() => setLoading(false));
  }, []);

  const filtered = projects.filter(p => {
    if (filterSpace && p.spaceId !== filterSpace) return false;
    if (filterStatus && p.status !== filterStatus) return false;
    if (filterPriority && p.priority !== filterPriority) return false;
    if (searchQuery && !p.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-10 h-10 border-4 border-terra-200 border-t-terra-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-gray-800">Projects</h1>
        <Link to="/projects/new" className="btn-primary text-sm hidden sm:flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Project
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <input
          type="text"
          className="input max-w-xs text-sm"
          placeholder="Search projects..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
        <select
          className="select text-sm w-auto"
          value={filterSpace}
          onChange={e => setFilterSpace(e.target.value)}
        >
          <option value="">All Spaces</option>
          {spaces.map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        <select
          className="select text-sm w-auto"
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
        >
          <option value="">All Statuses</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <select
          className="select text-sm w-auto"
          value={filterPriority}
          onChange={e => setFilterPriority(e.target.value)}
        >
          <option value="">All Priorities</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="urgent">Urgent</option>
        </select>
      </div>

      {/* Project Grid */}
      {filtered.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-500 mb-3">
            {projects.length === 0 ? 'No projects yet' : 'No projects match your filters'}
          </p>
          {projects.length === 0 && (
            <Link to="/projects/new" className="btn-primary inline-block text-sm">
              Create your first project
            </Link>
          )}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(project => (
            <Link
              key={project.id}
              to={`/projects/${project.id}`}
              className="card hover:shadow-md transition-all group"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="font-semibold text-gray-800 group-hover:text-terra-600 transition-colors truncate">
                  {project.title}
                </h3>
                <span className={`badge shrink-0 ${PRIORITY_COLORS[project.priority]}`}>
                  {project.priority}
                </span>
              </div>

              {project.description && (
                <p className="text-sm text-gray-500 line-clamp-2 mb-2">{project.description}</p>
              )}

              <div className="flex items-center gap-2 flex-wrap mb-2">
                <span className={`badge text-xs ${STATUS_COLORS[project.status]}`}>
                  {STATUS_LABELS[project.status]}
                </span>
                {project.spaceName && (
                  <span className="text-xs text-gray-500">{project.spaceName}</span>
                )}
              </div>

              <div className="flex items-center justify-between text-xs text-gray-400">
                <div className="flex items-center gap-2">
                  {project.assigneeName && (
                    <span className="flex items-center gap-1">
                      <span
                        className="w-4 h-4 rounded-full inline-block text-white text-[10px] flex items-center justify-center font-bold"
                        style={{ backgroundColor: project.assigneeColor || '#ccc' }}
                      >
                        {project.assigneeName.charAt(0)}
                      </span>
                      {project.assigneeName}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {project.photoCount > 0 && <span>{project.photoCount} photos</span>}
                  {project.boardItemCount > 0 && <span>{project.boardItemCount} ideas</span>}
                </div>
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
                    ${project.spentBudget.toLocaleString()} / ${project.estimatedBudget.toLocaleString()}
                  </span>
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
