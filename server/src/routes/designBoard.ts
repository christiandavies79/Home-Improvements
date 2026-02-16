import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { getDb, getUploadsDir } from '../db/schema';
import { requireAuth } from '../middleware/auth';

const router = Router();

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dir = getUploadsDir();
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `board_${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = /\.(jpg|jpeg|png|gif|webp|heic|heif)$/i;
    if (allowed.test(path.extname(file.originalname))) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

// Get design board items for a project
router.get('/:projectId/design-board', requireAuth, (req: Request, res: Response) => {
  const db = getDb();
  const items = db.prepare(`
    SELECT dbi.*, u.display_name as added_by_name, u.avatar_color
    FROM design_board_items dbi
    LEFT JOIN users u ON dbi.added_by = u.id
    WHERE dbi.project_id = ?
    ORDER BY dbi.created_at DESC
  `).all(req.params.projectId) as any[];

  // Get comments for each item
  const getComments = db.prepare(`
    SELECT dbc.*, u.display_name as user_name, u.avatar_color
    FROM design_board_comments dbc
    JOIN users u ON dbc.user_id = u.id
    WHERE dbc.board_item_id = ?
    ORDER BY dbc.created_at ASC
  `);

  res.json(items.map(item => ({
    id: item.id,
    projectId: item.project_id,
    itemType: item.item_type,
    title: item.title,
    content: item.content,
    url: item.url,
    filePath: item.file_path ? `/uploads/${path.basename(item.file_path)}` : '',
    addedBy: item.added_by,
    addedByName: item.added_by_name,
    avatarColor: item.avatar_color,
    createdAt: item.created_at,
    comments: (getComments.all(item.id) as any[]).map(c => ({
      id: c.id,
      userId: c.user_id,
      userName: c.user_name,
      avatarColor: c.avatar_color,
      text: c.comment_text,
      createdAt: c.created_at,
    })),
  })));
});

// Add a link to design board
router.post('/:projectId/design-board/link', requireAuth, (req: Request, res: Response) => {
  const db = getDb();
  const { title, url, content } = req.body;

  if (!url) {
    res.status(400).json({ error: 'URL is required' });
    return;
  }

  const id = uuidv4();
  db.prepare(`
    INSERT INTO design_board_items (id, project_id, item_type, title, content, url, added_by)
    VALUES (?, ?, 'link', ?, ?, ?, ?)
  `).run(id, req.params.projectId, title || '', content || '', url, req.session.userId);

  db.prepare('UPDATE projects SET updated_at = datetime(\'now\') WHERE id = ?').run(req.params.projectId);

  res.status(201).json({ id, itemType: 'link', title, url, content });
});

// Add a note to design board
router.post('/:projectId/design-board/note', requireAuth, (req: Request, res: Response) => {
  const db = getDb();
  const { title, content } = req.body;

  if (!content) {
    res.status(400).json({ error: 'Note content is required' });
    return;
  }

  const id = uuidv4();
  db.prepare(`
    INSERT INTO design_board_items (id, project_id, item_type, title, content, added_by)
    VALUES (?, ?, 'note', ?, ?, ?)
  `).run(id, req.params.projectId, title || '', content, req.session.userId);

  db.prepare('UPDATE projects SET updated_at = datetime(\'now\') WHERE id = ?').run(req.params.projectId);

  res.status(201).json({ id, itemType: 'note', title, content });
});

// Add a photo to design board
router.post('/:projectId/design-board/photo', requireAuth, upload.single('photo'), (req: Request, res: Response) => {
  const db = getDb();
  const file = req.file;
  const { title, content } = req.body;

  if (!file) {
    res.status(400).json({ error: 'No file uploaded' });
    return;
  }

  const id = uuidv4();
  db.prepare(`
    INSERT INTO design_board_items (id, project_id, item_type, title, content, file_path, added_by)
    VALUES (?, ?, 'photo', ?, ?, ?, ?)
  `).run(id, req.params.projectId, title || '', content || '', file.path, req.session.userId);

  db.prepare('UPDATE projects SET updated_at = datetime(\'now\') WHERE id = ?').run(req.params.projectId);

  res.status(201).json({
    id,
    itemType: 'photo',
    title,
    content,
    filePath: `/uploads/${file.filename}`,
  });
});

// Delete design board item
router.delete('/:projectId/design-board/:itemId', requireAuth, (req: Request, res: Response) => {
  const db = getDb();
  const item = db.prepare('SELECT * FROM design_board_items WHERE id = ? AND project_id = ?').get(
    req.params.itemId, req.params.projectId
  ) as any;

  if (!item) {
    res.status(404).json({ error: 'Item not found' });
    return;
  }

  if (item.file_path) {
    try { fs.unlinkSync(item.file_path); } catch {}
  }

  db.prepare('DELETE FROM design_board_items WHERE id = ?').run(req.params.itemId);
  res.json({ ok: true });
});

// Add comment to design board item
router.post('/:projectId/design-board/:itemId/comments', requireAuth, (req: Request, res: Response) => {
  const db = getDb();
  const { text } = req.body;

  if (!text) {
    res.status(400).json({ error: 'Comment text is required' });
    return;
  }

  const id = uuidv4();
  db.prepare('INSERT INTO design_board_comments (id, board_item_id, user_id, comment_text) VALUES (?, ?, ?, ?)').run(
    id, req.params.itemId, req.session.userId, text
  );

  const user = db.prepare('SELECT display_name, avatar_color FROM users WHERE id = ?').get(req.session.userId!) as any;

  res.status(201).json({
    id,
    userId: req.session.userId,
    userName: user.display_name,
    avatarColor: user.avatar_color,
    text,
    createdAt: new Date().toISOString(),
  });
});

export default router;
