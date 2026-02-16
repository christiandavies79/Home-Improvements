import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/schema';
import { requireAuth, requireAdmin } from '../middleware/auth';

const router = Router();

const AVATAR_COLORS = [
  '#C2603A', '#7D8B55', '#4A7C8B', '#8B6A4A', '#6B4A8B',
  '#8B4A6B', '#4A8B6B', '#8B7D4A', '#4A6B8B', '#8B4A4A',
];

// Check if any users exist (for initial setup)
router.get('/setup-status', (_req: Request, res: Response) => {
  const db = getDb();
  const count = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
  res.json({ needsSetup: count.count === 0 });
});

// Register (first user becomes admin, subsequent users require admin)
router.post('/register', (req: Request, res: Response) => {
  const db = getDb();
  const { username, password, displayName } = req.body;

  if (!username || !password || !displayName) {
    res.status(400).json({ error: 'Username, password, and display name are required' });
    return;
  }

  if (username.length < 3 || username.length > 30) {
    res.status(400).json({ error: 'Username must be 3-30 characters' });
    return;
  }

  if (password.length < 4) {
    res.status(400).json({ error: 'Password must be at least 4 characters' });
    return;
  }

  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existing) {
    res.status(409).json({ error: 'Username already taken' });
    return;
  }

  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
  const isFirstUser = userCount.count === 0;

  // If not the first user, require admin session
  if (!isFirstUser && !req.session.userId) {
    res.status(401).json({ error: 'Only an admin can create new accounts' });
    return;
  }

  if (!isFirstUser && req.session.userId) {
    const currentUser = db.prepare('SELECT is_admin FROM users WHERE id = ?').get(req.session.userId) as { is_admin: number } | undefined;
    if (!currentUser?.is_admin) {
      res.status(403).json({ error: 'Only an admin can create new accounts' });
      return;
    }
  }

  const id = uuidv4();
  const passwordHash = bcrypt.hashSync(password, 10);
  const avatarColor = AVATAR_COLORS[userCount.count % AVATAR_COLORS.length];

  db.prepare(
    'INSERT INTO users (id, username, display_name, password_hash, avatar_color, is_admin) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(id, username, displayName, passwordHash, avatarColor, isFirstUser ? 1 : 0);

  // Auto-login the first user
  if (isFirstUser) {
    req.session.userId = id;
  }

  res.status(201).json({
    id,
    username,
    displayName,
    avatarColor,
    isAdmin: isFirstUser,
  });
});

// Login
router.post('/login', (req: Request, res: Response) => {
  const db = getDb();
  const { username, password } = req.body;

  if (!username || !password) {
    res.status(400).json({ error: 'Username and password are required' });
    return;
  }

  const user = db.prepare(
    'SELECT id, username, display_name, password_hash, avatar_color, is_admin FROM users WHERE username = ?'
  ).get(username) as any;

  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    res.status(401).json({ error: 'Invalid username or password' });
    return;
  }

  req.session.userId = user.id;

  res.json({
    id: user.id,
    username: user.username,
    displayName: user.display_name,
    avatarColor: user.avatar_color,
    isAdmin: !!user.is_admin,
  });
});

// Logout
router.post('/logout', (req: Request, res: Response) => {
  req.session.destroy(() => {
    res.json({ ok: true });
  });
});

// Get current user
router.get('/me', requireAuth, (req: Request, res: Response) => {
  const db = getDb();
  const user = db.prepare(
    'SELECT id, username, display_name, avatar_color, is_admin FROM users WHERE id = ?'
  ).get(req.session.userId!) as any;

  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  res.json({
    id: user.id,
    username: user.username,
    displayName: user.display_name,
    avatarColor: user.avatar_color,
    isAdmin: !!user.is_admin,
  });
});

// List all users
router.get('/users', requireAuth, (_req: Request, res: Response) => {
  const db = getDb();
  const users = db.prepare(
    'SELECT id, username, display_name, avatar_color, is_admin FROM users ORDER BY created_at'
  ).all() as any[];

  res.json(users.map(u => ({
    id: u.id,
    username: u.username,
    displayName: u.display_name,
    avatarColor: u.avatar_color,
    isAdmin: !!u.is_admin,
  })));
});

// Update user profile
router.put('/users/:id', requireAuth, (req: Request, res: Response) => {
  const db = getDb();
  const { id } = req.params;
  const { displayName, avatarColor, currentPassword, newPassword } = req.body;

  // Users can only update themselves (or admin can update anyone)
  const currentUser = db.prepare('SELECT is_admin FROM users WHERE id = ?').get(req.session.userId!) as any;
  if (id !== req.session.userId && !currentUser?.is_admin) {
    res.status(403).json({ error: 'Cannot update other users' });
    return;
  }

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as any;
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  if (displayName) {
    db.prepare('UPDATE users SET display_name = ? WHERE id = ?').run(displayName, id);
  }

  if (avatarColor) {
    db.prepare('UPDATE users SET avatar_color = ? WHERE id = ?').run(avatarColor, id);
  }

  if (newPassword) {
    if (id === req.session.userId && currentPassword) {
      if (!bcrypt.compareSync(currentPassword, user.password_hash)) {
        res.status(400).json({ error: 'Current password is incorrect' });
        return;
      }
    } else if (!currentUser?.is_admin) {
      res.status(400).json({ error: 'Current password required' });
      return;
    }
    const hash = bcrypt.hashSync(newPassword, 10);
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, id);
  }

  const updated = db.prepare(
    'SELECT id, username, display_name, avatar_color, is_admin FROM users WHERE id = ?'
  ).get(id) as any;

  res.json({
    id: updated.id,
    username: updated.username,
    displayName: updated.display_name,
    avatarColor: updated.avatar_color,
    isAdmin: !!updated.is_admin,
  });
});

export default router;
