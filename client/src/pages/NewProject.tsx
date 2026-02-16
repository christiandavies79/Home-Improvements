import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';

export default function NewProject() {
  const navigate = useNavigate();
  const [spaces, setSpaces] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [spaceId, setSpaceId] = useState('');
  const [priority, setPriority] = useState('medium');
  const [assignedTo, setAssignedTo] = useState('');
  const [estimatedBudget, setEstimatedBudget] = useState('');
  const [timeEstimate, setTimeEstimate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([api.spaces.list(), api.auth.users()])
      .then(([s, u]) => { setSpaces(s); setUsers(u); });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const tags = tagsInput
        .split(',')
        .map(t => t.trim())
        .filter(Boolean);

      const result = await api.projects.create({
        title: title.trim(),
        description: description.trim(),
        spaceId: spaceId || null,
        priority,
        assignedTo: assignedTo || null,
        estimatedBudget: estimatedBudget ? parseFloat(estimatedBudget) : 0,
        timeEstimate,
        dueDate: dueDate || null,
        tags,
      });

      navigate(`/projects/${result.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to create project');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="font-display text-2xl font-bold text-gray-800 mb-6">New Project</h1>

      <form onSubmit={handleSubmit} className="card space-y-5">
        {error && (
          <div className="bg-red-50 text-red-600 px-4 py-2 rounded-lg text-sm">{error}</div>
        )}

        <div>
          <label className="label" htmlFor="title">Project Title *</label>
          <input
            id="title"
            type="text"
            className="input"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="e.g., Renovate master bathroom"
            autoFocus
            required
          />
        </div>

        <div>
          <label className="label" htmlFor="description">Description</label>
          <textarea
            id="description"
            className="input min-h-[80px] resize-y"
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="What needs to be done? Any notes or context..."
            rows={3}
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="space">Space / Room</label>
            <select
              id="space"
              className="select"
              value={spaceId}
              onChange={e => setSpaceId(e.target.value)}
            >
              <option value="">Select a space</option>
              {spaces.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label" htmlFor="priority">Priority</label>
            <select
              id="priority"
              className="select"
              value={priority}
              onChange={e => setPriority(e.target.value)}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="assignedTo">Assign To</label>
            <select
              id="assignedTo"
              className="select"
              value={assignedTo}
              onChange={e => setAssignedTo(e.target.value)}
            >
              <option value="">Unassigned</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.displayName}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label" htmlFor="dueDate">Due Date</label>
            <input
              id="dueDate"
              type="date"
              className="input"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
            />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="budget">Estimated Budget ($)</label>
            <input
              id="budget"
              type="number"
              className="input"
              value={estimatedBudget}
              onChange={e => setEstimatedBudget(e.target.value)}
              placeholder="0.00"
              min="0"
              step="0.01"
            />
          </div>

          <div>
            <label className="label" htmlFor="timeEstimate">Time Estimate</label>
            <select
              id="timeEstimate"
              className="select"
              value={timeEstimate}
              onChange={e => setTimeEstimate(e.target.value)}
            >
              <option value="">Select estimate</option>
              <option value="few_hours">A few hours</option>
              <option value="weekend">Weekend project</option>
              <option value="one_week">About a week</option>
              <option value="two_weeks">Two weeks</option>
              <option value="month">A month</option>
              <option value="multi_month">Multi-month project</option>
            </select>
          </div>
        </div>

        <div>
          <label className="label" htmlFor="tags">Tags</label>
          <input
            id="tags"
            type="text"
            className="input"
            value={tagsInput}
            onChange={e => setTagsInput(e.target.value)}
            placeholder="DIY, needs contractor, waiting on materials (comma-separated)"
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" className="btn-ghost" onClick={() => navigate(-1)}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Creating...' : 'Create Project'}
          </button>
        </div>
      </form>
    </div>
  );
}
