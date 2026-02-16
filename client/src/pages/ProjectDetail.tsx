import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';

const STATUS_LABELS: Record<string, string> = {
  not_started: 'Not Started',
  planning: 'Planning',
  in_progress: 'In Progress',
  almost_done: 'Almost Done',
  complete: 'Complete',
};

const STATUS_STEPS = ['not_started', 'planning', 'in_progress', 'almost_done', 'complete'];

const PRIORITY_COLORS: Record<string, string> = {
  low: 'bg-sage-100 text-sage-700 border-sage-200',
  medium: 'bg-cream-300 text-yellow-800 border-yellow-200',
  high: 'bg-orange-100 text-orange-700 border-orange-200',
  urgent: 'bg-red-100 text-red-700 border-red-200',
};

const TIME_LABELS: Record<string, string> = {
  few_hours: 'A few hours',
  weekend: 'Weekend project',
  one_week: 'About a week',
  two_weeks: 'Two weeks',
  month: 'A month',
  multi_month: 'Multi-month project',
};

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [project, setProject] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [spaces, setSpaces] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [uploadType, setUploadType] = useState('general');
  const [lightboxPhoto, setLightboxPhoto] = useState<string | null>(null);

  // Edit form state
  const [editForm, setEditForm] = useState<any>({});

  const load = async () => {
    try {
      const [p, u, s] = await Promise.all([
        api.projects.get(id!),
        api.auth.users(),
        api.spaces.list(),
      ]);
      setProject(p);
      setUsers(u);
      setSpaces(s);
      setEditForm({
        title: p.title,
        description: p.description,
        spaceId: p.spaceId || '',
        priority: p.priority,
        status: p.status,
        assignedTo: p.assignedTo || '',
        estimatedBudget: p.estimatedBudget || '',
        spentBudget: p.spentBudget || '',
        timeEstimate: p.timeEstimate || '',
        dueDate: p.dueDate || '',
        tags: p.tags?.join(', ') || '',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const handleSave = async () => {
    await api.projects.update(id!, {
      ...editForm,
      spaceId: editForm.spaceId || null,
      assignedTo: editForm.assignedTo || null,
      estimatedBudget: editForm.estimatedBudget ? parseFloat(editForm.estimatedBudget) : 0,
      spentBudget: editForm.spentBudget ? parseFloat(editForm.spentBudget) : 0,
      dueDate: editForm.dueDate || null,
      tags: editForm.tags.split(',').map((t: string) => t.trim()).filter(Boolean),
    });
    setEditing(false);
    load();
  };

  const handleStatusChange = async (newStatus: string) => {
    await api.projects.update(id!, { status: newStatus });
    load();
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this project?')) return;
    await api.projects.delete(id!);
    navigate('/projects');
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    await api.projects.uploadPhotos(id!, Array.from(files), uploadType);
    load();
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDeletePhoto = async (photoId: string) => {
    if (!confirm('Delete this photo?')) return;
    await api.projects.deletePhoto(id!, photoId);
    load();
  };

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    await api.projects.addComment(id!, commentText.trim());
    setCommentText('');
    load();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-10 h-10 border-4 border-terra-200 border-t-terra-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!project) {
    return <div className="text-center py-20 text-gray-500">Project not found</div>;
  }

  const currentStep = STATUS_STEPS.indexOf(project.status);

  return (
    <div className="space-y-6">
      {/* Lightbox */}
      {lightboxPhoto && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setLightboxPhoto(null)}
        >
          <img src={lightboxPhoto} className="max-w-full max-h-full object-contain rounded-lg" alt="" />
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <button onClick={() => navigate(-1)} className="text-sm text-gray-500 hover:text-gray-700 mb-2 flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          {editing ? (
            <input
              type="text"
              className="input text-xl font-display font-bold"
              value={editForm.title}
              onChange={e => setEditForm({ ...editForm, title: e.target.value })}
            />
          ) : (
            <h1 className="font-display text-2xl font-bold text-gray-800">{project.title}</h1>
          )}
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {project.spaceName && (
              <span className="text-sm text-gray-500">{project.spaceName}</span>
            )}
            <span className={`badge ${PRIORITY_COLORS[project.priority]}`}>
              {project.priority}
            </span>
            <span className="text-sm text-gray-400">
              Added by {project.creatorName}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            to={`/projects/${id}/design-board`}
            className="btn-secondary text-sm"
          >
            Design Board
          </Link>
          {editing ? (
            <>
              <button className="btn-primary text-sm" onClick={handleSave}>Save</button>
              <button className="btn-ghost text-sm" onClick={() => setEditing(false)}>Cancel</button>
            </>
          ) : (
            <button className="btn-ghost text-sm" onClick={() => setEditing(true)}>Edit</button>
          )}
        </div>
      </div>

      {/* Progress Steps */}
      <div className="card">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Progress</h3>
        <div className="flex items-center gap-1">
          {STATUS_STEPS.map((step, i) => (
            <button
              key={step}
              onClick={() => handleStatusChange(step)}
              className={`flex-1 py-2 px-1 text-xs font-medium rounded-lg text-center transition-colors ${
                i <= currentStep
                  ? 'bg-terra-500 text-white'
                  : 'bg-warm-100 text-gray-500 hover:bg-warm-200'
              }`}
            >
              <span className="hidden sm:inline">{STATUS_LABELS[step]}</span>
              <span className="sm:hidden">{i + 1}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="sm:col-span-2 space-y-6">
          {/* Description */}
          <div className="card">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Description</h3>
            {editing ? (
              <textarea
                className="input min-h-[100px] resize-y"
                value={editForm.description}
                onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                rows={4}
              />
            ) : (
              <p className="text-gray-600 whitespace-pre-wrap">
                {project.description || 'No description yet'}
              </p>
            )}
          </div>

          {/* Photos */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-700">Photos ({project.photos?.length || 0})</h3>
              <div className="flex items-center gap-2">
                <select
                  className="select text-xs w-auto"
                  value={uploadType}
                  onChange={e => setUploadType(e.target.value)}
                >
                  <option value="general">General</option>
                  <option value="before">Before</option>
                  <option value="during">During</option>
                  <option value="after">After</option>
                  <option value="inspiration">Inspiration</option>
                </select>
                <button
                  className="btn-secondary text-xs"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Upload
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept="image/*"
                  multiple
                  onChange={handlePhotoUpload}
                />
              </div>
            </div>

            {project.photos?.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {project.photos.map((photo: any) => (
                  <div key={photo.id} className="relative group">
                    <img
                      src={photo.filePath}
                      alt={photo.caption || 'Project photo'}
                      className="w-full h-32 object-cover rounded-lg cursor-pointer"
                      onClick={() => setLightboxPhoto(photo.filePath)}
                    />
                    <div className="absolute top-1 left-1">
                      <span className="badge bg-black/50 text-white text-[10px]">
                        {photo.photoType}
                      </span>
                    </div>
                    <button
                      onClick={() => handleDeletePhoto(photo.id)}
                      className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                    >
                      x
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 text-center py-6">
                No photos yet. Upload some to track progress!
              </p>
            )}
          </div>

          {/* Comments */}
          <div className="card">
            <h3 className="text-sm font-medium text-gray-700 mb-3">
              Comments ({project.comments?.length || 0})
            </h3>

            {project.comments?.length > 0 && (
              <div className="space-y-3 mb-4">
                {project.comments.map((comment: any) => (
                  <div key={comment.id} className="flex gap-3">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                      style={{ backgroundColor: comment.avatarColor }}
                    >
                      {comment.userName.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-800">{comment.userName}</span>
                        <span className="text-xs text-gray-400">
                          {new Date(comment.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-0.5">{comment.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <form onSubmit={handleComment} className="flex gap-2">
              <input
                type="text"
                className="input text-sm flex-1"
                placeholder="Add a comment..."
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
              />
              <button type="submit" className="btn-primary text-sm" disabled={!commentText.trim()}>
                Post
              </button>
            </form>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Details */}
          <div className="card space-y-3">
            <h3 className="text-sm font-medium text-gray-700">Details</h3>

            {editing ? (
              <>
                <div>
                  <label className="label text-xs">Space</label>
                  <select
                    className="select text-sm"
                    value={editForm.spaceId}
                    onChange={e => setEditForm({ ...editForm, spaceId: e.target.value })}
                  >
                    <option value="">None</option>
                    {spaces.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label text-xs">Priority</label>
                  <select
                    className="select text-sm"
                    value={editForm.priority}
                    onChange={e => setEditForm({ ...editForm, priority: e.target.value })}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                <div>
                  <label className="label text-xs">Assigned To</label>
                  <select
                    className="select text-sm"
                    value={editForm.assignedTo}
                    onChange={e => setEditForm({ ...editForm, assignedTo: e.target.value })}
                  >
                    <option value="">Unassigned</option>
                    {users.map(u => <option key={u.id} value={u.id}>{u.displayName}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label text-xs">Due Date</label>
                  <input
                    type="date"
                    className="input text-sm"
                    value={editForm.dueDate}
                    onChange={e => setEditForm({ ...editForm, dueDate: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label text-xs">Time Estimate</label>
                  <select
                    className="select text-sm"
                    value={editForm.timeEstimate}
                    onChange={e => setEditForm({ ...editForm, timeEstimate: e.target.value })}
                  >
                    <option value="">None</option>
                    {Object.entries(TIME_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label text-xs">Tags</label>
                  <input
                    type="text"
                    className="input text-sm"
                    value={editForm.tags}
                    onChange={e => setEditForm({ ...editForm, tags: e.target.value })}
                    placeholder="comma-separated"
                  />
                </div>
              </>
            ) : (
              <dl className="space-y-2 text-sm">
                <DetailRow label="Assigned to" value={project.assigneeName || 'Unassigned'} />
                <DetailRow label="Due date" value={project.dueDate ? new Date(project.dueDate).toLocaleDateString() : 'None'} />
                <DetailRow label="Time estimate" value={TIME_LABELS[project.timeEstimate] || 'Not set'} />
                {project.tags?.length > 0 && (
                  <div>
                    <dt className="text-gray-500 text-xs">Tags</dt>
                    <dd className="flex flex-wrap gap-1 mt-1">
                      {project.tags.map((tag: string) => (
                        <span key={tag} className="badge bg-warm-100 text-gray-600">{tag}</span>
                      ))}
                    </dd>
                  </div>
                )}
              </dl>
            )}
          </div>

          {/* Budget */}
          <div className="card">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Budget</h3>
            {editing ? (
              <div className="space-y-2">
                <div>
                  <label className="label text-xs">Estimated ($)</label>
                  <input
                    type="number"
                    className="input text-sm"
                    value={editForm.estimatedBudget}
                    onChange={e => setEditForm({ ...editForm, estimatedBudget: e.target.value })}
                    min="0"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="label text-xs">Spent ($)</label>
                  <input
                    type="number"
                    className="input text-sm"
                    value={editForm.spentBudget}
                    onChange={e => setEditForm({ ...editForm, spentBudget: e.target.value })}
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>
            ) : (
              <>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-500">Estimated</span>
                  <span className="font-medium">${(project.estimatedBudget || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-500">Spent</span>
                  <span className="font-medium">${(project.spentBudget || 0).toLocaleString()}</span>
                </div>
                {project.estimatedBudget > 0 && (
                  <>
                    <div className="bg-warm-100 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          project.spentBudget > project.estimatedBudget ? 'bg-red-400' : 'bg-sage-400'
                        }`}
                        style={{ width: `${Math.min(100, (project.spentBudget / project.estimatedBudget) * 100)}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-400 mt-1 text-right">
                      ${(project.estimatedBudget - project.spentBudget).toLocaleString()} remaining
                    </p>
                  </>
                )}
              </>
            )}
          </div>

          {/* Danger Zone */}
          <div className="card border-red-200">
            <button
              className="btn-danger text-sm w-full"
              onClick={handleDelete}
            >
              Delete Project
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-gray-500">{label}</dt>
      <dd className="text-gray-800 font-medium">{value}</dd>
    </div>
  );
}
