import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';

export default function Settings() {
  const { user, refreshUser } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [spaces, setSpaces] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Profile form
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [profileMsg, setProfileMsg] = useState('');

  // New user form
  const [newUsername, setNewUsername] = useState('');
  const [newUserDisplay, setNewUserDisplay] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserMsg, setNewUserMsg] = useState('');

  // New space form
  const [newSpaceName, setNewSpaceName] = useState('');
  const [spaceMsg, setSpaceMsg] = useState('');

  useEffect(() => {
    Promise.all([api.auth.users(), api.spaces.list()])
      .then(([u, s]) => { setUsers(u); setSpaces(s); })
      .finally(() => setLoading(false));
  }, []);

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMsg('');
    try {
      const data: any = {};
      if (displayName !== user?.displayName) data.displayName = displayName;
      if (newPassword) {
        data.currentPassword = currentPassword;
        data.newPassword = newPassword;
      }
      if (Object.keys(data).length === 0) {
        setProfileMsg('No changes to save');
        return;
      }
      await api.auth.updateUser(user!.id, data);
      await refreshUser();
      setCurrentPassword('');
      setNewPassword('');
      setProfileMsg('Profile updated!');
    } catch (err: any) {
      setProfileMsg(`Error: ${err.message}`);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setNewUserMsg('');
    try {
      await api.auth.register({
        username: newUsername,
        password: newUserPassword,
        displayName: newUserDisplay,
      });
      setNewUsername('');
      setNewUserDisplay('');
      setNewUserPassword('');
      setNewUserMsg('User created!');
      const u = await api.auth.users();
      setUsers(u);
    } catch (err: any) {
      setNewUserMsg(`Error: ${err.message}`);
    }
  };

  const handleCreateSpace = async (e: React.FormEvent) => {
    e.preventDefault();
    setSpaceMsg('');
    try {
      await api.spaces.create({ name: newSpaceName });
      setNewSpaceName('');
      const s = await api.spaces.list();
      setSpaces(s);
      setSpaceMsg('Space created!');
    } catch (err: any) {
      setSpaceMsg(`Error: ${err.message}`);
    }
  };

  const handleDeleteSpace = async (spaceId: string) => {
    if (!confirm('Delete this space? Projects in this space will become unassigned.')) return;
    await api.spaces.delete(spaceId);
    const s = await api.spaces.list();
    setSpaces(s);
  };

  const AVATAR_COLORS = [
    '#C2603A', '#7D8B55', '#4A7C8B', '#8B6A4A', '#6B4A8B',
    '#8B4A6B', '#4A8B6B', '#8B7D4A', '#4A6B8B', '#8B4A4A',
  ];

  const handleColorChange = async (color: string) => {
    await api.auth.updateUser(user!.id, { avatarColor: color });
    refreshUser();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-10 h-10 border-4 border-terra-200 border-t-terra-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <h1 className="font-display text-2xl font-bold text-gray-800">Settings</h1>

      {/* Profile */}
      <section className="card">
        <h2 className="font-display text-lg font-bold text-gray-800 mb-4">Your Profile</h2>
        <form onSubmit={handleProfileUpdate} className="space-y-4">
          <div className="flex items-center gap-4 mb-4">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center text-white text-xl font-bold"
              style={{ backgroundColor: user?.avatarColor }}
            >
              {user?.displayName?.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-medium text-gray-800">{user?.displayName}</p>
              <p className="text-sm text-gray-500">@{user?.username}</p>
            </div>
          </div>

          {/* Avatar color picker */}
          <div>
            <label className="label">Avatar Color</label>
            <div className="flex gap-2 flex-wrap">
              {AVATAR_COLORS.map(color => (
                <button
                  key={color}
                  type="button"
                  onClick={() => handleColorChange(color)}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${
                    user?.avatarColor === color ? 'border-gray-800 scale-110' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="label">Display Name</label>
            <input
              type="text"
              className="input"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Current Password</label>
              <input
                type="password"
                className="input"
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                placeholder="Required to change password"
              />
            </div>
            <div>
              <label className="label">New Password</label>
              <input
                type="password"
                className="input"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="Leave blank to keep current"
              />
            </div>
          </div>

          {profileMsg && (
            <p className={`text-sm ${profileMsg.startsWith('Error') ? 'text-red-600' : 'text-sage-600'}`}>
              {profileMsg}
            </p>
          )}

          <button type="submit" className="btn-primary text-sm">Save Profile</button>
        </form>
      </section>

      {/* Users (admin only) */}
      {user?.isAdmin && (
        <section className="card">
          <h2 className="font-display text-lg font-bold text-gray-800 mb-4">Household Members</h2>

          <div className="space-y-2 mb-4">
            {users.map(u => (
              <div key={u.id} className="flex items-center gap-3 py-2">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
                  style={{ backgroundColor: u.avatarColor }}
                >
                  {u.displayName.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-800">
                    {u.displayName}
                    {u.isAdmin && <span className="text-xs text-terra-500 ml-2">Admin</span>}
                  </p>
                  <p className="text-xs text-gray-500">@{u.username}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-warm-100 pt-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Add Household Member</h3>
            <form onSubmit={handleCreateUser} className="space-y-3">
              <div className="grid sm:grid-cols-3 gap-3">
                <input
                  type="text"
                  className="input text-sm"
                  placeholder="Display Name"
                  value={newUserDisplay}
                  onChange={e => setNewUserDisplay(e.target.value)}
                  required
                />
                <input
                  type="text"
                  className="input text-sm"
                  placeholder="Username"
                  value={newUsername}
                  onChange={e => setNewUsername(e.target.value)}
                  required
                />
                <input
                  type="password"
                  className="input text-sm"
                  placeholder="Password"
                  value={newUserPassword}
                  onChange={e => setNewUserPassword(e.target.value)}
                  required
                />
              </div>
              {newUserMsg && (
                <p className={`text-sm ${newUserMsg.startsWith('Error') ? 'text-red-600' : 'text-sage-600'}`}>
                  {newUserMsg}
                </p>
              )}
              <button type="submit" className="btn-secondary text-sm">Add Member</button>
            </form>
          </div>
        </section>
      )}

      {/* Spaces */}
      <section className="card">
        <h2 className="font-display text-lg font-bold text-gray-800 mb-4">Spaces / Rooms</h2>

        <div className="space-y-2 mb-4">
          {spaces.map(s => (
            <div key={s.id} className="flex items-center justify-between py-1">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-800">{s.name}</span>
                <span className="text-xs text-gray-400">({s.projectCount} projects)</span>
              </div>
              {s.projectCount === 0 && (
                <button
                  onClick={() => handleDeleteSpace(s.id)}
                  className="text-xs text-red-400 hover:text-red-600"
                >
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>

        <form onSubmit={handleCreateSpace} className="flex gap-2">
          <input
            type="text"
            className="input text-sm flex-1"
            placeholder="New space name (e.g., Attic)"
            value={newSpaceName}
            onChange={e => setNewSpaceName(e.target.value)}
            required
          />
          <button type="submit" className="btn-secondary text-sm">Add Space</button>
        </form>
        {spaceMsg && (
          <p className={`text-sm mt-2 ${spaceMsg.startsWith('Error') ? 'text-red-600' : 'text-sage-600'}`}>
            {spaceMsg}
          </p>
        )}
      </section>
    </div>
  );
}
